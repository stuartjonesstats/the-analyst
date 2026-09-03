'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BrainCircuit, ChevronRight, Download, Square, Trash2, X } from 'lucide-react';

import { useAdvisory } from '@/hooks/use-advisory';
import {
  ADVISORY_MODEL_ID,
  ADVISORY_POLICY_VERSION,
  ADVISORY_STARTERS,
  advisoryMessages,
  type AdvisoryBrief,
  type AdvisoryCatalogSource,
  type AdvisoryConsultation,
  type AdvisoryIntent,
  type AdvisoryPromptId,
  type AdvisoryRelationship,
  type AdvisoryRevealedMessage,
  type AdvisorySelection,
} from '@/lib/advisory';
import type { ScaffoldMode } from '@/lib/analyst-case';
import { sitePath } from '@/lib/site-path';

type PublicCatalogAsset = {
  fully_qualified_name: string;
  description: string;
  grain: string;
  primary_key: string[];
  columns: Array<{ name: string; type: string }>;
  quality_notes: string[];
};

type PublicRelationship = {
  from_table: string;
  from_columns: string[];
  to_table: string;
  to_columns: string[];
  cardinality: string;
  warning: string | null;
};

type AdvisoryDeskProps = {
  open: boolean;
  onClose: () => void;
  brief: AdvisoryBrief;
  tableNames: string[];
  promptRevision: string;
  persona: string;
  mode: ScaffoldMode;
  workflowStep: string;
  revealedMessages: AdvisoryRevealedMessage[];
  workspaceSelection: Omit<AdvisorySelection, 'sha256'> | null;
  activeError: string | null;
  consultations: AdvisoryConsultation[];
  onAppend: (consultation: AdvisoryConsultation) => void;
  workbenchBusy: boolean;
  onBusyChange: (busy: boolean) => void;
};

async function hashText(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function loadCatalogContext(tableNames: string[]) {
  const [catalogResponse, relationshipsResponse] = await Promise.all([
    fetch(sitePath('/data/catalog/data_catalog.json')),
    fetch(sitePath('/data/catalog/relationships.json')),
  ]);
  if (!catalogResponse.ok || !relationshipsResponse.ok) throw new Error('The public data register could not be loaded.');
  const catalog = await catalogResponse.json() as PublicCatalogAsset[];
  const relationships = await relationshipsResponse.json() as PublicRelationship[];
  const mounted = new Set(tableNames);
  const sources: AdvisoryCatalogSource[] = catalog
    .filter((asset) => mounted.has(asset.fully_qualified_name))
    .map((asset) => ({
      table: asset.fully_qualified_name,
      description: asset.description,
      grain: asset.grain,
      primaryKey: asset.primary_key,
      columns: asset.columns.map(({ name, type }) => ({ name, type })),
      qualityNotes: asset.quality_notes,
    }));
  const safeRelationships: AdvisoryRelationship[] = relationships
    .filter((relationship) => mounted.has(relationship.from_table) && mounted.has(relationship.to_table))
    .map((relationship) => ({
      fromTable: relationship.from_table,
      fromColumns: relationship.from_columns,
      toTable: relationship.to_table,
      toColumns: relationship.to_columns,
      cardinality: relationship.cardinality,
      warning: relationship.warning,
    }));
  if (sources.length !== tableNames.length) throw new Error('One or more mounted tables are missing from the public data register.');
  return { sources, relationships: safeRelationships };
}

export function AdvisoryDesk({
  open,
  onClose,
  brief,
  tableNames,
  promptRevision,
  persona,
  mode,
  workflowStep,
  revealedMessages,
  workspaceSelection,
  activeError,
  consultations,
  onAppend,
  workbenchBusy,
  onBusyChange,
}: AdvisoryDeskProps) {
  const runtime = useAdvisory();
  const [question, setQuestion] = useState('');
  const [starterId, setStarterId] = useState<AdvisoryPromptId | null>(null);
  const [includeWorkspace, setIncludeWorkspace] = useState(false);
  const [includeError, setIncludeError] = useState(false);
  const [catalog, setCatalog] = useState<{ sources: AdvisoryCatalogSource[]; relationships: AdvisoryRelationship[] } | null>(null);
  const [streamed, setStreamed] = useState('');
  const [deskError, setDeskError] = useState<string | null>(null);
  const interruptedRef = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) window.requestAnimationFrame(() => closeRef.current?.focus());
  }, [open]);

  useEffect(() => {
    onBusyChange(runtime.status === 'generating');
    return () => onBusyChange(false);
  }, [onBusyChange, runtime.status]);

  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape' && open && runtime.status !== 'generating') onClose();
    }
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onClose, open, runtime.status]);

  const latest = consultations.at(-1) ?? null;
  const selectedStarter = starterId ? ADVISORY_STARTERS.find((starter) => starter.id === starterId) ?? null : null;
  const contextLabels = useMemo(() => [
    'Assignment brief',
    '3-table data register',
    ...(revealedMessages.length ? [`${revealedMessages.length} revealed message${revealedMessages.length === 1 ? '' : 's'}`] : []),
    ...(includeWorkspace && workspaceSelection ? [workspaceSelection.label] : []),
    ...(includeError && activeError ? ['Current error'] : []),
  ], [activeError, includeError, includeWorkspace, revealedMessages.length, workspaceSelection]);

  function chooseStarter(id: AdvisoryPromptId) {
    const starter = ADVISORY_STARTERS.find((item) => item.id === id)!;
    setStarterId(id);
    setQuestion(starter.text);
    setDeskError(null);
    if (id === 'explain_error') {
      setIncludeWorkspace(Boolean(workspaceSelection));
      setIncludeError(Boolean(activeError));
    } else if (id === 'challenge_claim') {
      setIncludeWorkspace(Boolean(workspaceSelection && (workspaceSelection.kind === 'claim' || workspaceSelection.kind === 'note')));
    }
  }

  async function enableDesk() {
    setDeskError(null);
    try {
      const safeCatalog = catalog ?? await loadCatalogContext(tableNames);
      setCatalog(safeCatalog);
      await runtime.start();
    } catch (cause) {
      setDeskError(cause instanceof Error ? cause.message : 'The Advisory Desk could not start.');
    }
  }

  async function ask() {
    const trimmed = question.trim();
    if (!trimmed || !catalog || runtime.status !== 'ready') return;
    setDeskError(null);
    setStreamed('');
    interruptedRef.current = false;
    const askedAt = new Date().toISOString();
    const selections: AdvisorySelection[] = [];
    if (includeWorkspace && workspaceSelection?.text.trim()) {
      selections.push({ ...workspaceSelection, sha256: await hashText(workspaceSelection.text) });
    }
    if (includeError && activeError?.trim()) {
      selections.push({ kind: 'error', label: 'Current execution error', text: activeError, sha256: await hashText(activeError) });
    }
    const intent: AdvisoryIntent = starterId ?? 'freeform';
    const request = {
      promptRevision,
      intent,
      question: trimmed,
      brief,
      scaffoldMode: mode,
      workflowStep,
      sources: catalog.sources,
      relationships: catalog.relationships,
      revealedMessages,
      selections,
    };
    const started = performance.now();
    let answer = '';
    try {
      answer = await runtime.generate(advisoryMessages(request), (value) => {
        answer = value;
        setStreamed(value);
      });
      if (!answer.trim()) throw new Error('The local model returned no advice. Try the question again.');
      onAppend({
        id: crypto.randomUUID(),
        askedAt,
        completedAt: new Date().toISOString(),
        intent,
        origin: starterId ? 'starter' : 'freeform',
        starterId,
        starterEdited: Boolean(selectedStarter && selectedStarter.text !== trimmed),
        question: trimmed,
        scaffoldMode: mode,
        workflowStep,
        context: selections,
        revealedEventIds: revealedMessages.map((message) => message.id),
        response: answer,
        modelId: ADVISORY_MODEL_ID,
        promptRevision,
        policyVersion: ADVISORY_POLICY_VERSION,
        elapsedMs: Math.round(performance.now() - started),
        interrupted: interruptedRef.current,
      });
      setStreamed('');
    } catch (cause) {
      if (interruptedRef.current && answer.trim()) {
        onAppend({
          id: crypto.randomUUID(), askedAt, completedAt: new Date().toISOString(), intent,
          origin: starterId ? 'starter' : 'freeform', starterId,
          starterEdited: Boolean(selectedStarter && selectedStarter.text !== trimmed), question: trimmed,
          scaffoldMode: mode, workflowStep, context: selections,
          revealedEventIds: revealedMessages.map((message) => message.id), response: answer,
          modelId: ADVISORY_MODEL_ID, promptRevision, policyVersion: ADVISORY_POLICY_VERSION,
          elapsedMs: Math.round(performance.now() - started), interrupted: true,
        });
        setStreamed('');
      } else {
        setDeskError(cause instanceof Error ? cause.message : 'The consultation could not be completed.');
      }
    }
  }

  function stop() {
    interruptedRef.current = true;
    runtime.interrupt();
  }

  function closeDesk() {
    if (runtime.status === 'generating') stop();
    onClose();
  }

  if (!open) return null;

  const loaded = runtime.status === 'ready' || runtime.status === 'generating';
  const loading = runtime.status === 'checking' || runtime.status === 'loading';
  const visibleResponse = runtime.status === 'generating'
    ? streamed || 'Reviewing the supplied context…'
    : latest?.response ?? '';

  return <>
    <button className="advisory-scrim" onClick={closeDesk} aria-label="Close Meridian Advisory Desk" />
    <dialog open className="advisory-desk" aria-labelledby="advisory-title">
      <header className="advisory-head">
        <div><span>MERIDIAN ADVISORY DESK</span><h2 id="advisory-title">Senior analyst consultation</h2><p>{persona}</p></div>
        <button ref={closeRef} onClick={closeDesk} aria-label="Close Meridian Advisory Desk"><X /></button>
      </header>

      <p className="advisory-caution">Local experimental model. Treat its advice as something to verify.</p>

      {!loaded && <section className="advisory-start">
        <BrainCircuit aria-hidden="true" />
        <div><strong>Runs on this device</strong><p>The desk is optional. First use downloads about 1 GB; later visits use the browser cache.</p></div>
        <button onClick={() => void enableDesk()} disabled={loading}>{loading ? 'PREPARING DESK' : 'ENABLE LOCAL DESK'} <ChevronRight /></button>
        {loading && <div className="advisory-load"><span style={{ width: `${Math.round(runtime.progress * 100)}%` }} /><small>{runtime.detail}</small></div>}
        {(runtime.status === 'unsupported' || runtime.status === 'error') && <output className="advisory-runtime-error">{runtime.detail}</output>}
        {deskError && <p className="advisory-runtime-error" role="alert">{deskError}</p>}
      </section>}

      {!loaded && latest && <section className="advisory-response advisory-saved-response">
        <div className="advisory-section-label"><span>LAST RECORDED ADVISORY</span><b>{consultations.length} TOTAL</b></div>
        <p className="advisory-question">{latest.question}</p>
        <pre>{latest.response}</pre>
      </section>}

      {loaded && <div className="advisory-body">
        <section className="advisory-compose" aria-labelledby="advisory-compose-title">
          <div className="advisory-section-label"><span id="advisory-compose-title">START A CONSULTATION</span><b>EDIT BEFORE SENDING</b></div>
          <div className="advisory-starters">{ADVISORY_STARTERS.map((starter) => <button key={starter.id} className={starter.id === starterId ? 'is-active' : ''} onClick={() => chooseStarter(starter.id)}>{starter.label}</button>)}</div>
          <textarea value={question} onChange={(event) => {
            setQuestion(event.target.value);
            if (!starterId) setStarterId(null);
          }} placeholder="Ask a focused question about the assignment, an error, a claim, or your next check." aria-label="Question for the Advisory Desk" />
          <fieldset className="advisory-share"><legend>SHARE WITH THE DESK</legend>
            {workspaceSelection && <label><input type="checkbox" checked={includeWorkspace} onChange={(event) => setIncludeWorkspace(event.target.checked)} /> {workspaceSelection.label}</label>}
            {activeError && <label><input type="checkbox" checked={includeError} onChange={(event) => setIncludeError(event.target.checked)} /> Current error</label>}
          </fieldset>
          <div className="advisory-context" aria-label="Context included in consultation">{contextLabels.map((label) => <span key={label}>{label}</span>)}</div>
          {deskError && <p className="advisory-runtime-error" role="alert">{deskError}</p>}
          <div className="advisory-send-row">
            <small>{workbenchBusy ? 'Finish the running worksheet first.' : 'The desk receives no query-result rows.'}</small>
            {runtime.status === 'generating'
              ? <button className="advisory-stop" onClick={stop}><Square /> STOP</button>
              : <button className="advisory-send" onClick={() => void ask()} disabled={!question.trim() || workbenchBusy}>ASK THE DESK <ChevronRight /></button>}
          </div>
        </section>

        {(streamed || latest) && <section className="advisory-response" aria-live="polite">
          <div className="advisory-section-label"><span>ADVISORY / VERIFY BEFORE USE</span><b>{runtime.status === 'generating' ? 'WORKING' : 'RECORDED'}</b></div>
          <p className="advisory-question">{runtime.status === 'generating' ? question : latest?.question}</p>
          <pre>{visibleResponse}</pre>
        </section>}

        {consultations.length > 1 && <details className="advisory-history"><summary>CONSULTATION HISTORY <span>{consultations.length}</span></summary>
          {[...consultations].reverse().map((consultation) => <article key={consultation.id}><small>{new Date(consultation.completedAt).toLocaleString()} / {consultation.intent.replaceAll('_', ' ')}</small><strong>{consultation.question}</strong><pre>{consultation.response}</pre></article>)}
        </details>}
      </div>}

      {loaded && <footer className="advisory-footer">
        <span><Download /> MODEL CACHED LOCALLY</span>
        <button onClick={() => void runtime.unload()}>UNLOAD</button>
        <button onClick={() => { if (window.confirm('Delete the local Advisory Desk model download from this browser?')) void runtime.deleteDownload(); }}><Trash2 /> DELETE DOWNLOAD</button>
      </footer>}
    </dialog>
  </>;
}
