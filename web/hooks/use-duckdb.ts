'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AsyncDuckDB,
  AsyncDuckDBConnection,
} from '@duckdb/duckdb-wasm';

import { sitePath } from '@/lib/site-path';

export type QueryValue = string | number | boolean | null;
export type QueryRow = Record<string, QueryValue>;

type EngineStatus = 'booting' | 'ready' | 'running' | 'error';

function serializable(value: unknown): QueryValue {
  if (value == null) return null;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value, (_, nested) => typeof nested === 'bigint' ? Number(nested) : nested);
  } catch {
    return Object.prototype.toString.call(value);
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
        const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
        if (!bundle.mainWorker) throw new Error('No compatible DuckDB worker bundle was found.');
        const workerUrl = URL.createObjectURL(
          new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' }),
        );
        const worker = new Worker(workerUrl);
        URL.revokeObjectURL(workerUrl);
        const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
        const db = new duckdb.AsyncDuckDB(logger, worker);
        await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

        await db.registerFileURL(
          'support_csat_response.parquet',
          `${origin}${sitePath('/data/support/csat_response.parquet')}`,
          duckdb.DuckDBDataProtocol.HTTP,
          false,
        );
        await db.registerFileURL(
          'support_ticket.parquet',
          `${origin}${sitePath('/data/support/ticket.parquet')}`,
          duckdb.DuckDBDataProtocol.HTTP,
          false,
        );
        await db.registerFileURL(
          'crm_account.parquet',
          `${origin}${sitePath('/data/crm/account.parquet')}`,
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
