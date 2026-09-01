'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { sitePath } from '@/lib/site-path';

export type PythonStatus = 'idle' | 'booting' | 'loading_data' | 'ready' | 'running' | 'error';

export type PythonDataFile = {
  path: string;
  url: string;
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

const mondayFiles: PythonDataFile[] = [
  {
    path: '/data/support/csat_response.parquet',
    url: sitePath('/data/support/csat_response.parquet'),
    label: 'support.csat_response',
  },
  {
    path: '/data/support/ticket.parquet',
    url: sitePath('/data/support/ticket.parquet'),
    label: 'support.ticket',
  },
  {
    path: '/data/crm/account.parquet',
    url: sitePath('/data/crm/account.parquet'),
    label: 'crm.account',
  },
];

export function usePython() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(new Map<string, PendingRun>());
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
        if (message.type === 'result' || message.type === 'run_error' || message.type === 'fatal_error') {
          const pending = pendingRef.current.get(message.id);
          if (!pending) {
            if (message.type === 'fatal_error') {
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

      worker.postMessage({ type: 'init', id, files: mondayFiles });
    });

    return readyRef.current;
  }, []);

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
      worker.postMessage({ type: 'run', id, code, files: mondayFiles });
    });
  }, [start, stop]);

  useEffect(() => () => stop(), [stop]);

  return { status, detail, error, start, run, stop };
}
