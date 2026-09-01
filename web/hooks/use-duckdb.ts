'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AsyncDuckDB,
  AsyncDuckDBConnection,
} from '@duckdb/duckdb-wasm';

import type { CaseDataFile } from '@/lib/case-definition';
import { sitePath } from '@/lib/site-path';

export type QueryValue = string | number | boolean | null;
export type QueryRow = Record<string, QueryValue>;

type EngineStatus = 'booting' | 'ready' | 'running' | 'error';

function serializable(value: unknown, typeName = ''): QueryValue {
  if (value == null) return null;
  if (/Timestamp/i.test(typeName) && (typeof value === 'number' || typeof value === 'bigint')) {
    const raw = Number(value);
    const milliseconds = Math.abs(raw) > 1e17 ? raw / 1_000_000 : Math.abs(raw) > 1e14 ? raw / 1_000 : raw;
    return new Date(milliseconds).toISOString();
  }
  if (/Date32/i.test(typeName) && typeof value === 'number') {
    return new Date(value * 86_400_000).toISOString().slice(0, 10);
  }
  if (/Date64/i.test(typeName) && (typeof value === 'number' || typeof value === 'bigint')) {
    return new Date(Number(value)).toISOString().slice(0, 10);
  }
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value, (_, nested) => typeof nested === 'bigint' ? Number(nested) : nested);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function useDuckDB(dataFiles: CaseDataFile[]) {
  const dbRef = useRef<AsyncDuckDB | null>(null);
  const connectionRef = useRef<AsyncDuckDBConnection | null>(null);
  const [status, setStatus] = useState<EngineStatus>('booting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function boot() {
      try {
        setStatus('booting');
        setError(null);
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

        for (const [index, source] of dataFiles.entries()) {
          await db.registerFileURL(
            `case_source_${index}.parquet`,
            `${origin}${sitePath(source.url)}`,
            duckdb.DuckDBDataProtocol.HTTP,
            false,
          );
        }

        const connection = await db.connect();
        for (const [index, source] of dataFiles.entries()) {
          const [schema, table, ...rest] = source.table.split('.');
          if (!schema || !table || rest.length > 0) {
            throw new Error(`Invalid case table name: ${source.table}`);
          }
          await connection.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(schema)}`);
          await connection.query(`
            CREATE OR REPLACE VIEW ${quoteIdentifier(schema)}.${quoteIdentifier(table)} AS
            SELECT * FROM read_parquet('case_source_${index}.parquet')
          `);
        }

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
  }, [dataFiles]);

  const run = useCallback(async (sql: string) => {
    const connection = connectionRef.current;
    if (!connection) throw new Error('The local query engine is still starting.');
    setStatus('running');
    setError(null);
    const started = performance.now();
    try {
      const table = await connection.query(sql);
      const columns = table.schema.fields.map((field) => field.name);
      const fieldTypes = Object.fromEntries(table.schema.fields.map((field) => [field.name, field.type.toString()]));
      const rows = table.toArray().slice(0, 1000).map((row) =>
        Object.fromEntries(columns.map((column) => [column, serializable(row[column], fieldTypes[column])] as const)),
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
