'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CaseDataFile } from '@/lib/case-definition';
import { sitePath } from '@/lib/site-path';

export type PythonStatus = 'idle' | 'booting' | 'loading_data' | 'ready' | 'running' | 'error';

export type PythonDataFile = {
  path: string;
  url: string;
  table: string;
  /** @deprecated Kept for compatibility with older cached workers. */
  label?: string;
};

export type PythonRunResult = {
  stdout: string[];
  stderr: string[];
  display: string;
  figures: string[];
  elapsedMs: number;
};

type PendingRun = {
  resolve: (result: PythonRunResult) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type PendingMount = {
  resolve: () => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

export function usePython(dataFiles: CaseDataFile[], packages: string[]) {
  const files = useMemo<PythonDataFile[]>(() => dataFiles.map((file) => ({
    path: file.pythonPath,
    url: sitePath(file.url),
    table: file.table,
    label: file.table,
  })), [dataFiles]);
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(new Map<string, PendingRun>());
  const pendingMountRef = useRef(new Map<string, PendingMount>());
  const readyRef = useRef<Promise<void> | null>(null);
  const [status, setStatus] = useState<PythonStatus>('idle');
  const [detail, setDetail] = useState('Python starts only when needed');
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    readyRef.current = null;
    for (const pending of pendingRef.current.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Python execution was stopped. The runtime has been reset.'));
    }
    pendingRef.current.clear();
    for (const pending of pendingMountRef.current.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Python was reset before the workspace table finished mounting.'));
    }
    pendingMountRef.current.clear();
    setStatus('idle');
    setDetail('Python runtime stopped');
  }, []);

  const start = useCallback(() => {
    if (readyRef.current) return readyRef.current;
    setError(null);
    setStatus('booting');

    const worker = new Worker(sitePath('/workers/python-worker.mjs'), { type: 'module' });
    workerRef.current = worker;
    const id = crypto.randomUUID();

    readyRef.current = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        workerRef.current = null;
        readyRef.current = null;
        setStatus('error');
        reject(new Error('Python took too long to start. Check the network and try again.'));
      }, 120_000);

      worker.onmessage = (event) => {
        const message = event.data;
        if (message.type === 'status') {
          setStatus(message.status);
          setDetail(message.detail || '');
          return;
        }
        if (message.type === 'initialized' && message.id === id) {
          clearTimeout(timeout);
          setStatus('ready');
          resolve();
          return;
        }
        if (message.type === 'workspace_mounted') {
          const pending = pendingMountRef.current.get(message.id);
          if (!pending) return;
          clearTimeout(pending.timeout);
          pendingMountRef.current.delete(message.id);
          pending.resolve();
          return;
        }
        if (message.type === 'result' || message.type === 'run_error' || message.type === 'fatal_error') {
          const pending = pendingRef.current.get(message.id);
          if (!pending) {
            if (message.type === 'fatal_error') {
              const pendingMount = pendingMountRef.current.get(message.id);
              if (pendingMount) {
                clearTimeout(pendingMount.timeout);
                pendingMountRef.current.delete(message.id);
                pendingMount.reject(new Error(message.error || 'Workspace table could not be mounted.'));
              }
              setError(message.error);
              setStatus('error');
            }
            return;
          }
          clearTimeout(pending.timeout);
          pendingRef.current.delete(message.id);
          if (message.type === 'result') {
            pending.resolve({
              stdout: message.stdout,
              stderr: message.stderr,
              display: message.display,
              figures: message.figures,
              elapsedMs: message.elapsedMs,
            });
          } else {
            pending.reject(new Error(message.error || 'Python execution failed.'));
          }
        }
      };

      worker.onerror = (event) => {
        clearTimeout(timeout);
        const message = event.message || 'Python worker failed to load.';
        setError(message);
        setStatus('error');
        readyRef.current = null;
        reject(new Error(message));
      };

      worker.postMessage({ type: 'init', id, files, packages });
    });

    return readyRef.current;
  }, [files, packages]);

  const run = useCallback(async (code: string) => {
    await start();
    const worker = workerRef.current;
    if (!worker) throw new Error('Python runtime is unavailable.');
    const id = crypto.randomUUID();
    setError(null);
    setStatus('running');

    return new Promise<PythonRunResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRef.current.delete(id);
        stop();
        reject(new Error('Python exceeded the two-minute execution limit and the runtime was reset.'));
      }, 120_000);
      pendingRef.current.set(id, { resolve, reject, timeout });
      worker.postMessage({ type: 'run', id, code, files, packages });
    });
  }, [files, packages, start, stop]);

  const mountWorkspaceTable = useCallback(async (table: string, bytes: Uint8Array) => {
    await start();
    const worker = workerRef.current;
    if (!worker) throw new Error('Python runtime is unavailable.');
    const id = crypto.randomUUID();
    const safeName = table.replace(/^workspace\./, '').replace(/[^a-z0-9_]/gi, '_').toLowerCase();
    const path = `/workspace/${safeName}.parquet`;
    setError(null);
    setStatus('loading_data');
    setDetail(`Publishing ${table} to Python`);

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingMountRef.current.delete(id);
        reject(new Error('The shared workspace table took too long to mount.'));
      }, 60_000);
      pendingMountRef.current.set(id, { resolve, reject, timeout });
      worker.postMessage({
        type: 'mount_workspace_table',
        id,
        table,
        path,
        bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        files,
        packages,
      });
    });
  }, [files, packages, start]);

  useEffect(() => () => stop(), [stop]);

  return { status, detail, error, start, run, stop, mountWorkspaceTable };
}
