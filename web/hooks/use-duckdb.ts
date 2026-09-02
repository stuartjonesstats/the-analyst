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

export type QueryRunResult = {
  columns: string[];
  rows: QueryRow[];
  displayedRows: number;
  totalRows: number;
  truncated: boolean;
  elapsedMs: number;
};

export type PublishedQueryTable = {
  table: string;
  fileName: string;
  rowCount: number;
  bytes: Uint8Array;
  createdAt: string;
};

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

function queryExpression(sql: string) {
  const trimmed = sql.trim().replace(/;+\s*$/, '');
  if (!trimmed) throw new Error('Write a query before publishing a workspace table.');
  if (!/^(select|with)\b/i.test(trimmed)) {
    throw new Error('Only SELECT and WITH queries can be published to the shared workspace.');
  }
  return trimmed;
}

function workspaceTableName(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]{1,47}$/.test(normalized)) {
    throw new Error('Use 2–48 lowercase letters, numbers, or underscores; start with a letter.');
  }
  return normalized;
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

  const run = useCallback(async (sql: string): Promise<QueryRunResult> => {
    const connection = connectionRef.current;
    if (!connection) throw new Error('The local query engine is still starting.');
    setStatus('running');
    setError(null);
    const started = performance.now();
    try {
      const reader = await connection.send(sql, true);
      let fields = reader.schema?.fields ?? [];
      let columns = fields.map((field) => field.name);
      let fieldTypes = Object.fromEntries(fields.map((field) => [field.name, field.type.toString()]));
      const rows: QueryRow[] = [];
      let totalRows = 0;

      for await (const batch of reader) {
        if (columns.length === 0) {
          fields = batch.schema.fields;
          columns = fields.map((field) => field.name);
          fieldTypes = Object.fromEntries(fields.map((field) => [field.name, field.type.toString()]));
        }
        totalRows += batch.numRows;
        if (rows.length >= 1000) continue;
        const remaining = 1000 - rows.length;
        const preview = batch.toArray().slice(0, remaining).map((row) =>
          Object.fromEntries(columns.map((column) => [column, serializable(row[column], fieldTypes[column])] as const)),
        );
        rows.push(...preview);
      }
      setStatus('ready');
      return {
        columns,
        rows,
        displayedRows: rows.length,
        totalRows,
        truncated: totalRows > rows.length,
        elapsedMs: Math.max(1, Math.round(performance.now() - started)),
      };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Query execution failed.';
      setError(message);
      setStatus('ready');
      throw new Error(message);
    }
  }, []);

  const publish = useCallback(async (sql: string, requestedName: string): Promise<PublishedQueryTable> => {
    const connection = connectionRef.current;
    const db = dbRef.current;
    if (!connection || !db) throw new Error('The local query engine is still starting.');
    const name = workspaceTableName(requestedName);
    const expression = queryExpression(sql);
    const fileName = `workspace_${name}.parquet`;
    setStatus('running');
    setError(null);
    try {
      await connection.query(`COPY (${expression}) TO '${fileName}' (FORMAT PARQUET, OVERWRITE TRUE)`);
      const countTable = await connection.query(`SELECT COUNT(*)::BIGINT AS row_count FROM (${expression}) AS published_query`);
      const countValue = countTable.toArray()[0]?.row_count;
      const rowCount = Number(typeof countValue === 'bigint' ? countValue : countValue ?? 0);
      const bytes = await db.copyFileToBuffer(fileName);
      setStatus('ready');
      return {
        table: `workspace.${name}`,
        fileName,
        rowCount,
        bytes,
        createdAt: new Date().toISOString(),
      };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The workspace table could not be published.';
      setError(message);
      setStatus('ready');
      throw new Error(message);
    }
  }, []);

  return { status, error, run, publish };
}
