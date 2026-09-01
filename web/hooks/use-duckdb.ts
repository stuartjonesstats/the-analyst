'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AsyncDuckDB,
  AsyncDuckDBConnection,
  DuckDBBundles,
} from '@duckdb/duckdb-wasm';

export type QueryValue = string | number | boolean | null;
export type QueryRow = Record<string, QueryValue>;

type EngineStatus = 'booting' | 'ready' | 'running' | 'error';

function serializable(value: unknown): QueryValue {
  if (value == null) return null;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function assertReadOnly(sql: string) {
  const withoutComments = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim()
    .toUpperCase();
  if (!/^(SELECT|WITH|EXPLAIN|DESCRIBE|SHOW)\b/.test(withoutComments)) {
    throw new Error('This workbench is read-only. Start with SELECT, WITH, EXPLAIN, DESCRIBE, or SHOW.');
  }
}

export function useDuckDB() {
  const dbRef = useRef<AsyncDuckDB | null>(null);
  const connectionRef = useRef<AsyncDuckDBConnection | null>(null);
  const [status, setStatus] = useState<EngineStatus>('booting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function boot() {
      try {
        const duckdb = await import('@duckdb/duckdb-wasm');
        const origin = window.location.origin;
        const bundles: DuckDBBundles = {
          mvp: {
            mainModule: `${origin}/vendor/duckdb/duckdb-mvp.wasm`,
            mainWorker: `${origin}/vendor/duckdb/duckdb-browser-mvp.worker.js`,
          },
        };
        const bundle = await duckdb.selectBundle(bundles);
        if (!bundle.mainWorker) throw new Error('No compatible DuckDB worker bundle was found.');
        const worker = new Worker(bundle.mainWorker);
        const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
        const db = new duckdb.AsyncDuckDB(logger, worker);
        await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

        await db.registerFileURL(
          'support_csat_response.parquet',
          `${origin}/data/support/csat_response.parquet`,
          duckdb.DuckDBDataProtocol.HTTP,
          false,
        );
        await db.registerFileURL(
          'support_ticket.parquet',
          `${origin}/data/support/ticket.parquet`,
          duckdb.DuckDBDataProtocol.HTTP,
          false,
        );
        await db.registerFileURL(
          'crm_account.parquet',
          `${origin}/data/crm/account.parquet`,
          duckdb.DuckDBDataProtocol.HTTP,
          false,
        );

        const connection = await db.connect();
        await connection.query(`
          CREATE SCHEMA IF NOT EXISTS support;
          CREATE SCHEMA IF NOT EXISTS crm;
          CREATE OR REPLACE VIEW support.csat_response AS
            SELECT * FROM read_parquet('support_csat_response.parquet');
          CREATE OR REPLACE VIEW support.ticket AS
            SELECT * FROM read_parquet('support_ticket.parquet');
          CREATE OR REPLACE VIEW crm.account AS
            SELECT * FROM read_parquet('crm_account.parquet');
        `);

        if (!active) {
          await connection.close();
          await db.terminate();
          return;
        }
        dbRef.current = db;
        connectionRef.current = connection;
        setStatus('ready');
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'The local query engine could not start.');
        setStatus('error');
      }
    }

    void boot();
    return () => {
      active = false;
      const connection = connectionRef.current;
      const db = dbRef.current;
      connectionRef.current = null;
      dbRef.current = null;
      if (connection) void connection.close();
      if (db) void db.terminate();
    };
  }, []);

  const run = useCallback(async (sql: string) => {
    assertReadOnly(sql);
    const connection = connectionRef.current;
    if (!connection) throw new Error('The local query engine is still starting.');
    setStatus('running');
    setError(null);
    const started = performance.now();
    try {
      const table = await connection.query(sql);
      const columns = table.schema.fields.map((field) => field.name);
      const rows = table.toArray().slice(0, 1000).map((row) =>
        Object.fromEntries(columns.map((column) => [column, serializable(row[column])] as const)),
      );
      setStatus('ready');
      return {
        columns,
        rows,
        displayedRows: rows.length,
        elapsedMs: Math.max(1, Math.round(performance.now() - started)),
      };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Query execution failed.';
      setError(message);
      setStatus('ready');
      throw new Error(message);
    }
  }, []);

  return { status, error, run };
}
