'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatCompletionMessageParam, WebWorkerMLCEngine } from '@mlc-ai/web-llm';

import { ADVISORY_APP_CONFIG, ADVISORY_MODEL_ID } from '@/lib/advisory';

export type AdvisoryRuntimeStatus = 'idle' | 'checking' | 'loading' | 'ready' | 'generating' | 'unsupported' | 'error';

type NavigatorWithGpu = Navigator & {
  gpu?: { requestAdapter(options?: { powerPreference?: 'low-power' | 'high-performance' }): Promise<unknown> };
  deviceMemory?: number;
};

const MIN_FREE_STORAGE_BYTES = 1_200_000_000;

function mockRuntimeRequested() {
  return process.env.NODE_ENV === 'development'
    && new URLSearchParams(window.location.search).get('advisory') === 'mock';
}

function cleanModelText(value: string) {
  return value.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^\s+/, '');
}

export function useAdvisory() {
  const engineRef = useRef<WebWorkerMLCEngine | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const mockRef = useRef(false);
  const interruptRequestedRef = useRef(false);
  const [status, setStatus] = useState<AdvisoryRuntimeStatus>('idle');
  const [detail, setDetail] = useState('Not loaded');
  const [progress, setProgress] = useState(0);

  const unload = useCallback(async () => {
    engineRef.current?.interruptGenerate();
    try {
      if (engineRef.current) await engineRef.current.unload();
    } finally {
      workerRef.current?.terminate();
      workerRef.current = null;
      engineRef.current = null;
      mockRef.current = false;
      setProgress(0);
      setDetail('Not loaded');
      setStatus('idle');
    }
  }, []);

  useEffect(() => () => {
    engineRef.current?.interruptGenerate();
    void engineRef.current?.unload();
    workerRef.current?.terminate();
  }, []);

  const start = useCallback(async () => {
    if (status === 'ready' || status === 'loading' || status === 'generating') return true;
    setStatus('checking');
    setDetail('Checking this device');
    try {
      if (mockRuntimeRequested()) {
        mockRef.current = true;
        setStatus('loading');
        setDetail('Preparing local test model');
        setProgress(0.35);
        await new Promise((resolve) => window.setTimeout(resolve, 180));
        setProgress(1);
        setDetail('Local model ready');
        setStatus('ready');
        return true;
      }
      if (!window.isSecureContext) throw new Error('The Advisory Desk requires a secure browser connection.');
      const device = navigator as NavigatorWithGpu;
      if (!device.gpu) throw new Error('This browser does not provide WebGPU. The rest of the workbench is still available.');
      if (typeof device.deviceMemory === 'number' && device.deviceMemory < 8) {
        throw new Error('This device does not report enough memory for the local model. The rest of the workbench is still available.');
      }
      const adapter = await device.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!adapter) throw new Error('A compatible graphics adapter was not available. The rest of the workbench is still available.');
      if (navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota != null && estimate.usage != null && estimate.quota - estimate.usage < MIN_FREE_STORAGE_BYTES) {
          throw new Error('About 1.2 GB of browser storage is needed for the local model.');
        }
      }
      setStatus('loading');
      setDetail('Downloading local model · first use is about 1 GB');
      const webllm = await import('@mlc-ai/web-llm');
      const worker = new Worker(new URL('../workers/advisory-worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      engineRef.current = await webllm.CreateWebWorkerMLCEngine(worker, ADVISORY_MODEL_ID, {
        appConfig: ADVISORY_APP_CONFIG,
        initProgressCallback: (report) => {
          setProgress(Math.max(0, Math.min(1, report.progress)));
          setDetail(report.text || 'Preparing local model');
        },
      });
      setProgress(1);
      setDetail('Local model ready');
      setStatus('ready');
      return true;
    } catch (cause) {
      workerRef.current?.terminate();
      workerRef.current = null;
      engineRef.current = null;
      const message = cause instanceof Error ? cause.message : 'The local model could not start.';
      setDetail(message);
      setStatus(message.includes('still available') || message.includes('secure browser') || message.includes('browser storage') ? 'unsupported' : 'error');
      return false;
    }
  }, [status]);

  const generate = useCallback(async (
    messages: ChatCompletionMessageParam[],
    onText: (value: string) => void,
  ) => {
    if (status !== 'ready') throw new Error('Enable the Advisory Desk before asking a question.');
    setStatus('generating');
    setDetail('Reviewing the supplied context');
    interruptRequestedRef.current = false;
    let completed = false;
    try {
      if (mockRef.current) {
        const answer = 'READ\nThe request asks for one defensible headline, not merely a reconciled pair of raw averages.\n\nCONCERN\nDifferent scales and response coverage can make a clean comparison misleading.\n\nNEXT CHECK\nCompare normalized scores and response coverage by source and period at the declared cutoff.\n\nWHAT I MAY BE MISSING\nI have not inspected query results or the eligible cohort.';
        let assembled = '';
        for (const word of answer.split(' ')) {
          assembled += `${assembled ? ' ' : ''}${word}`;
          onText(assembled);
          await new Promise((resolve) => window.setTimeout(resolve, 8));
        }
        completed = true;
        return assembled;
      }
      const engine = engineRef.current;
      if (!engine) throw new Error('The local model is not loaded.');
      await engine.resetChat();
      const stream = await engine.chat.completions.create({
        messages,
        model: ADVISORY_MODEL_ID,
        stream: true,
        max_tokens: 160,
        temperature: 0.2,
        top_p: 0.9,
        seed: 17,
        extra_body: { enable_thinking: false },
      });
      let assembled = '';
      for await (const chunk of stream) {
        assembled += chunk.choices[0]?.delta?.content ?? '';
        onText(cleanModelText(assembled));
      }
      completed = true;
      return cleanModelText(assembled);
    } catch (cause) {
      if (interruptRequestedRef.current) {
        setDetail('Local model ready');
        setStatus('ready');
      } else {
        try { await engineRef.current?.unload(); } catch { /* Device loss can also break unload. */ }
        workerRef.current?.terminate();
        engineRef.current = null;
        workerRef.current = null;
        setDetail(cause instanceof Error ? cause.message : 'The local model could not complete the consultation.');
        setStatus('error');
      }
      throw cause;
    } finally {
      if (completed && !interruptRequestedRef.current && engineRef.current) {
        setDetail('Local model ready');
        setStatus('ready');
      }
    }
  }, [status]);

  const interrupt = useCallback(() => {
    interruptRequestedRef.current = true;
    engineRef.current?.interruptGenerate();
    setDetail('Local model ready');
    setStatus('ready');
  }, []);

  const deleteDownload = useCallback(async () => {
    await unload();
    const { deleteModelAllInfoInCache } = await import('@mlc-ai/web-llm');
    await deleteModelAllInfoInCache(ADVISORY_MODEL_ID, ADVISORY_APP_CONFIG);
    setDetail('Local model download removed');
  }, [unload]);

  return { status, detail, progress, start, generate, interrupt, unload, deleteDownload };
}
