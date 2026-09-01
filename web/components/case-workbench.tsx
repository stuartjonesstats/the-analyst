'use client';

import { useEffect, useRef, useState } from 'react';
import Editor, { type BeforeMount } from '@monaco-editor/react';
import Image from 'next/image';
import {
  BookOpen,
  CircleCheck,
  Clock3,
  Database,
  Download,
  FileChartColumn,
  Inbox,
  PanelRightOpen,
  Play,
  Search,
  ShieldCheck,
  TerminalSquare,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SiteLink } from '@/components/site-link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type QueryRow, useDuckDB } from '@/hooks/use-duckdb';
import { type PythonRunResult, usePython } from '@/hooks/use-python';
import {
  buildAnalystCase,
  downloadAnalystCase,
  type EvidenceRecord,
} from '@/lib/analyst-case';
import { type CaseDefinition, formatRowCount } from '@/lib/case-definition';
import { caseDefinitions } from '@/lib/case-definitions';
import { migrateLegacyPythonWorksheet } from '@/lib/python-worksheet-migration';

const caseTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: '2-digit',
  minute: '2-digit',
});

type CaseWorkbenchProps = {
  definition: CaseDefinition;
  onSelectCase: (slug: string) => void;
};

type WorkspaceLanguage = 'sql' | 'python' | 'notes' | 'final';
type WorkflowStep = 'inbox' | 'investigate' | 'data-register' | 'evidence' | 'handoff';

export function CaseWorkbench({ definition, onSelectCase }: CaseWorkbenchProps) {
  const { status, error: engineError, run } = useDuckDB(definition.dataFiles);
  const python = usePython(definition.dataFiles, definition.pythonPackages);
  const [workspaceLanguage, setWorkspaceLanguage] = useState<WorkspaceLanguage>('sql');
  const [query, setQuery] = useState(definition.defaultSql);
  const [pythonCode, setPythonCode] = useState(definition.defaultPython);
  const [notes, setNotes] = useState(definition.defaultNotes);
  const [finalBrief, setFinalBrief] = useState('');
  const [pythonResult, setPythonResult] = useState<PythonRunResult | null>(null);
  const [pythonError, setPythonError] = useState<string | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<QueryRow[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [sqlRunCount, setSqlRunCount] = useState(0);
  const [pythonRunCount, setPythonRunCount] = useState(0);
  const [sqlCapturedAt, setSqlCapturedAt] = useState<string | null>(null);
  const [pythonCapturedAt, setPythonCapturedAt] = useState<string | null>(null);
  const [lastSqlResult, setLastSqlResult] = useState<{ columns: string[]; rows: QueryRow[]; elapsedMs: number } | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>(definition.initialEvidence);
  const [evidenceDraft, setEvidenceDraft] = useState('');
  const [evidenceComposerOpen, setEvidenceComposerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<WorkflowStep>('investigate');
  const inboxRef = useRef<HTMLElement>(null);
  const investigateRef = useRef<HTMLDivElement>(null);
  const dataRegisterRef = useRef<HTMLElement>(null);
  const evidenceRef = useRef<HTMLElement>(null);
  const handoffRef = useRef<HTMLElement>(null);
  const evidenceCount = evidence.length;
  const workflow = [
    { id: 'inbox' as const, seq: '01', label: 'Inbox', icon: Inbox, count: null },
    { id: 'investigate' as const, seq: '02', label: 'Investigate', icon: TerminalSquare, count: null },
    { id: 'data-register' as const, seq: '03', label: 'Data register', icon: Database, count: null },
    { id: 'evidence' as const, seq: '04', label: 'Evidence', icon: BookOpen, count: String(evidenceCount) },
    { id: 'handoff' as const, seq: '05', label: 'Handoff', icon: FileChartColumn, count: null },
  ];
  const activeWorkflowIndex = workflow.findIndex(({ id }) => id === activeWorkflowStep);

  // Hydrate drafts after mount because browser storage is intentionally local-only.
  /* oxlint-disable react/react-compiler */
  useEffect(() => {
    const saved = window.localStorage.getItem(`${definition.persistenceKey}:query`);
    if (saved) setQuery(saved);
    const savedPython = window.localStorage.getItem(`${definition.persistenceKey}:python`);
    if (savedPython) {
      setPythonCode(migrateLegacyPythonWorksheet(savedPython, definition.dataFiles));
    }
    const savedNotes = window.localStorage.getItem(`${definition.persistenceKey}:notes`);
    if (savedNotes) setNotes(savedNotes);
    const savedFinalBrief = window.localStorage.getItem(`${definition.persistenceKey}:final`);
    if (savedFinalBrief) setFinalBrief(savedFinalBrief);
    const savedEvidence = window.localStorage.getItem(`${definition.persistenceKey}:evidence`);
    if (savedEvidence) {
      try {
        const parsed = JSON.parse(savedEvidence) as EvidenceRecord[];
        if (Array.isArray(parsed) && parsed.length > 0) setEvidence(parsed);
      } catch {
        // A damaged local draft should not prevent the workbench from opening.
      }
    }
    setHydrated(true);
  }, [definition.dataFiles, definition.persistenceKey]);
  /* oxlint-enable react/react-compiler */

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(`${definition.persistenceKey}:query`, query);
  }, [definition.persistenceKey, hydrated, query]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(`${definition.persistenceKey}:python`, pythonCode);
  }, [definition.persistenceKey, hydrated, pythonCode]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(`${definition.persistenceKey}:notes`, notes);
  }, [definition.persistenceKey, hydrated, notes]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(`${definition.persistenceKey}:final`, finalBrief);
  }, [definition.persistenceKey, finalBrief, hydrated]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(`${definition.persistenceKey}:evidence`, JSON.stringify(evidence));
  }, [definition.persistenceKey, evidence, hydrated]);

  const beforeMount: BeforeMount = (monaco) => {
    monaco.editor.defineTheme('meridian-sql', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword.sql', foreground: '88B9C8', fontStyle: 'bold' },
        { token: 'number.sql', foreground: 'E58A5E' },
        { token: 'string.sql', foreground: 'B7C899' },
        { token: 'comment.sql', foreground: '64757D', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background': '#111b22',
        'editor.foreground': '#d4dcdd',
        'editorLineNumber.foreground': '#43535c',
        'editorLineNumber.activeForeground': '#a8b4b7',
        'editor.selectionBackground': '#31536588',
        'editor.lineHighlightBackground': '#18262f',
        'editorCursor.foreground': '#e17a51',
        'editorIndentGuide.background1': '#273740',
      },
    });
  };

  async function runQuery() {
    setQueryError(null);
    try {
      const result = await run(query);
      setColumns(result.columns);
      setRows(result.rows);
      setElapsedMs(result.elapsedMs);
      setLastSqlResult({ columns: result.columns, rows: result.rows, elapsedMs: result.elapsedMs });
      setSqlCapturedAt(new Date().toISOString());
      setSqlRunCount((count) => count + 1);
    } catch (cause) {
      setQueryError(cause instanceof Error ? cause.message : 'Query execution failed.');
    }
  }

  async function runPython() {
    setPythonError(null);
    try {
      const result = await python.run(pythonCode);
      setPythonResult(result);
      setPythonCapturedAt(new Date().toISOString());
      setPythonRunCount((count) => count + 1);
    } catch (cause) {
      setPythonError(cause instanceof Error ? cause.message : 'Python execution failed.');
    }
  }

  function selectLanguage(language: WorkspaceLanguage) {
    setWorkspaceLanguage(language);
    if (language === 'python' && python.status === 'idle') {
      void python.start().catch((cause) => {
        setPythonError(cause instanceof Error ? cause.message : 'Python could not start.');
      });
    }
  }

  function openWorkflowStep(step: WorkflowStep) {
    setActiveWorkflowStep(step);

    if (step === 'inbox' || step === 'investigate') {
      setLedgerOpen(false);
      const target = step === 'inbox' ? inboxRef.current : investigateRef.current;
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setLedgerOpen(true);
    const target = step === 'data-register'
      ? dataRegisterRef.current
      : step === 'evidence'
        ? evidenceRef.current
        : handoffRef.current;
    window.requestAnimationFrame(() => target?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function addEvidence() {
    const statement = evidenceDraft.trim();
    if (!statement) return;
    const nextId = `E-${String(evidence.length + 1).padStart(3, '0')}`;
    setEvidence((records) => [...records, {
      id: nextId,
      statement,
      source: workspaceLanguage === 'sql'
        ? 'SQL WORKSHEET'
        : workspaceLanguage === 'python'
          ? 'PYTHON WORKSHEET'
          : workspaceLanguage === 'final'
            ? 'FINAL BRIEF'
            : 'SCRATCH NOTES',
      state: 'review',
      recordedAt: new Date().toISOString(),
    }]);
    setEvidenceDraft('');
    setEvidenceComposerOpen(false);
  }

  async function exportCase() {
    setIsExporting(true);
    try {
      const caseFile = await buildAnalystCase(definition, {
        sql: query,
        python: pythonCode,
        notes,
        finalBrief,
        evidence,
        sqlRunCount,
        pythonRunCount,
        sqlCapturedAt,
        pythonCapturedAt,
        sqlResult: lastSqlResult,
        pythonResult,
      });
      downloadAnalystCase(caseFile);
    } finally {
      setIsExporting(false);
    }
  }

  const sqlEngineLabel = status === 'booting'
    ? 'STARTING DUCKDB'
    : status === 'running'
      ? 'SQL QUERY RUNNING'
      : status === 'error'
        ? 'DUCKDB ERROR'
        : 'DUCKDB READY';
  const pythonEngineLabel = python.status === 'idle'
    ? 'PYTHON IDLE'
    : python.status === 'booting'
      ? 'STARTING PYTHON'
      : python.status === 'loading_data'
        ? 'MOUNTING ASSIGNMENT DATA'
        : python.status === 'running'
          ? 'PYTHON RUNNING'
          : python.status === 'error'
            ? 'PYTHON ERROR'
            : 'PYTHON READY';
  const engineLabel = workspaceLanguage === 'sql'
    ? sqlEngineLabel
    : workspaceLanguage === 'python'
      ? pythonEngineLabel
      : workspaceLanguage === 'final'
        ? 'HANDOFF DRAFT'
        : 'LOCAL NOTES';
  const activeError = workspaceLanguage === 'sql'
    ? queryError || engineError
    : workspaceLanguage === 'python' ? pythonError || python.error : null;

  return (
    <main className="workbench-shell">
      <header className="system-bar">
        <div className="brand-lockup">
          <div>
            <span className="brand-word">THE ANALYST</span>
            <span className="ml-2 font-mono text-[10px] tracking-[0.08em] text-[#a8b5ba]">MERIDIAN WORKBENCH</span>
          </div>
        </div>
        <div className="system-breadcrumb">
          <span className="text-[#d4dcdd]">ASSIGNMENTS</span>
          <span>/</span>
          <span>{definition.id}</span>
          <span className="hidden md:inline">/ {definition.businessUnit.toUpperCase()}</span>
        </div>
        <div className="operator-block">
          <div className="hidden items-center gap-2 lg:flex">
            <span className="signal-dot" />
            <span className="font-mono text-[11px] tracking-[0.04em] text-[#c0c9cc]">{engineLabel}</span>
          </div>
          <div className="border-l border-[#31414a] pl-3 text-right">
            <p className="font-mono text-[11px] tracking-[0.04em] text-[#edf1f2]">ANALYST / LOCAL-01</p>
            <p className="font-mono text-[10px] text-[#a8b5ba]">LOCAL SESSION / NO ACCOUNT</p>
          </div>
        </div>
      </header>

      <nav className="mobile-workflow" aria-label="Mobile workflow">
        {workflow.map(({ id, seq, label }) => (
          <button
            key={seq}
            type="button"
            className={id === activeWorkflowStep ? 'is-active' : ''}
            aria-current={id === activeWorkflowStep ? 'step' : undefined}
            onClick={() => openWorkflowStep(id)}
          >
            <span>{seq}</span> {label}
          </button>
        ))}
      </nav>

      <div className="workbench-grid">
        <aside className="work-queue">
          <div className="queue-heading">
            <span>WORK QUEUE</span>
            <span>{String(caseDefinitions.length).padStart(2, '0')} ASSIGNMENTS</span>
          </div>
          <div className="current-case-block">
            <div className="case-code-line">
              <span>{definition.id}</span>
              <span className="case-open-flag">OPEN</span>
            </div>
            <h1>{definition.title}</h1>
            <p>{definition.queueSubtitle}</p>
          </div>

          <nav className="workflow-list" aria-label="Assignment workflow">
            {workflow.map(({ id, seq, label, icon: Icon, count }) => (
              <button
                key={seq}
                type="button"
                className={id === activeWorkflowStep ? 'active' : ''}
                aria-current={id === activeWorkflowStep ? 'step' : undefined}
                onClick={() => openWorkflowStep(id)}
              >
                <span className="workflow-seq">{seq}</span>
                <Icon aria-hidden="true" />
                <span>{label}</span>
                {count && <span className="workflow-count">{count}</span>}
              </button>
            ))}
          </nav>

          <div className="queue-register">
            <p className="queue-section-label">OTHER ASSIGNMENTS</p>
            {caseDefinitions.filter((caseFile) => caseFile.slug !== definition.slug).map((caseFile) => (
              <button key={caseFile.id} onClick={() => onSelectCase(caseFile.slug)}>
                <span className="font-mono text-[10px] text-[#a8b5ba]">{caseFile.id}</span>
                <span className="mt-1 block text-[12px] text-[#e1e6e7]">{caseFile.title}</span>
                <span className="mt-1 block font-mono text-[10px] tracking-[0.04em] text-[#94a3a9]">
                  CONNECTED
                </span>
              </button>
            ))}
          </div>

          <div className="queue-footer">
            <div><span>ASSIGNMENT PROGRESS</span><strong>{String(activeWorkflowIndex + 1).padStart(2, '0')} / 05</strong></div>
            <div className="progress-track"><span style={{ width: `${(activeWorkflowIndex + 1) * 20}%` }} /></div>
            <p>Autosave / local device</p>
          </div>
        </aside>

        <section className="analysis-surface">
          <div className="case-command-strip">
            <div className="case-command-id">
              <span className="status-bar" />
              <span>ASSIGNMENT {definition.id}</span>
              <strong>ACTIVE ANALYSIS</strong>
            </div>
            <div className="case-command-facts">
              <span><b>PRIORITY</b> {definition.priority}</span>
              <span><b>BUSINESS UNIT</b> {definition.businessUnit.toUpperCase()}</span>
              <span><b>DUE</b> {definition.dueLabel}</span>
            </div>
            <button className="ledger-trigger" onClick={() => setLedgerOpen(true)}>
              <PanelRightOpen /> ASSIGNMENT RECORD <span>{evidenceCount}</span>
            </button>
          </div>

          <article className="briefing-document" ref={inboxRef}>
            <div className="briefing-fields">
              <dl>
                <div><dt>EMPLOYER</dt><dd>Meridian Living Systems</dd></div>
                <div><dt>YOUR ROLE</dt><dd>{definition.role}</dd></div>
                <div><dt>FROM</dt><dd>{definition.requester}</dd></div>
                <div><dt>RECEIVED</dt><dd>{definition.received}</dd></div>
                <div><dt>RESPONSE DUE</dt><dd>{definition.responseDue}</dd></div>
                <div><dt>CHANNEL</dt><dd>{definition.channel}</dd></div>
              </dl>
            </div>
            <div className="briefing-copy">
              <p className="document-kicker">{definition.requestKicker}</p>
              <h2>{definition.requestTitle}</h2>
              <p>{definition.requestBody}</p>
              <div className="decision-line">
                <span>DECISION STANDARD</span>
                <p>{definition.decisionStandard}</p>
              </div>
            </div>
          </article>

          <div className="analysis-workarea" ref={investigateRef}>
            <div className="workarea-tabs" role="tablist" aria-label="Investigation tools">
              <button
                className={workspaceLanguage === 'sql' ? 'active' : ''}
                role="tab"
                aria-selected={workspaceLanguage === 'sql'}
                onClick={() => selectLanguage('sql')}
              >
                SQL WORKSHEET
              </button>
              <button
                className={workspaceLanguage === 'python' ? 'active' : ''}
                role="tab"
                aria-selected={workspaceLanguage === 'python'}
                onClick={() => selectLanguage('python')}
              >
                PYTHON WORKSHEET
              </button>
              <button
                className={workspaceLanguage === 'notes' ? 'active' : ''}
                role="tab"
                aria-selected={workspaceLanguage === 'notes'}
                onClick={() => selectLanguage('notes')}
              >
                SCRATCH NOTES
              </button>
              <button
                className={workspaceLanguage === 'final' ? 'active' : ''}
                role="tab"
                aria-selected={workspaceLanguage === 'final'}
                onClick={() => selectLanguage('final')}
              >
                FINAL BRIEF
              </button>
              <span className="ml-auto hidden sm:block">SESSION {definition.sessionLabel}</span>
            </div>

            <div className="editor-toolbar">
              <div className="worksheet-name">
                <TerminalSquare />
                {workspaceLanguage === 'sql'
                  ? 'query_01.sql'
                  : workspaceLanguage === 'python'
                    ? 'analysis_01.py'
                    : workspaceLanguage === 'final'
                      ? 'final_brief.md'
                      : 'scratch_notes.md'}
                <span>MODIFIED</span>
              </div>
              <button aria-label="Search query"><Search /></button>
              <div className="engine-state">
                <span className={(workspaceLanguage === 'sql' ? status === 'error' : workspaceLanguage === 'python' && python.status === 'error') ? 'is-error' : ''} />
                {engineLabel}
              </div>
              {(workspaceLanguage === 'sql' || workspaceLanguage === 'python') && (
                <Button
                  size="sm"
                  className="run-control"
                  disabled={workspaceLanguage === 'sql'
                    ? status === 'booting' || status === 'running' || status === 'error'
                    : python.status === 'booting' || python.status === 'loading_data' || python.status === 'error'}
                  onClick={() => {
                    if (workspaceLanguage === 'python' && python.status === 'running') {
                      python.stop();
                      return;
                    }
                    void (workspaceLanguage === 'sql' ? runQuery() : runPython());
                  }}
                >
                  <Play data-icon="inline-start" />
                  {workspaceLanguage === 'python' && python.status === 'running'
                    ? 'STOP'
                    : workspaceLanguage === 'sql' && status === 'running'
                      ? 'RUNNING'
                      : 'EXECUTE'}
                </Button>
              )}
            </div>

            {workspaceLanguage === 'notes' || workspaceLanguage === 'final' ? (
              <textarea
                className={`notes-editor ${workspaceLanguage === 'final' ? 'final-brief-editor' : ''}`}
                value={workspaceLanguage === 'final' ? finalBrief : notes}
                onChange={(event) => {
                  if (workspaceLanguage === 'final') setFinalBrief(event.target.value);
                  else setNotes(event.target.value);
                }}
                placeholder={workspaceLanguage === 'final'
                  ? `Write the polished conclusion another person could act on.\n\nRecommendation or decision:\n\nEvidence that matters:\n\nUncertainty and limitations:\n\nRisks, owners, and next action:`
                  : 'Record assumptions, open questions, definitions, and the reasoning you will need to defend in the handoff.'}
                spellCheck="true"
                aria-label={workspaceLanguage === 'final' ? 'Final brief' : 'Scratch notes'}
              />
            ) : (
              <Editor
                height="258px"
                language={workspaceLanguage}
                theme="meridian-sql"
                value={workspaceLanguage === 'sql' ? query : pythonCode}
                beforeMount={beforeMount}
                onChange={(value) => {
                  if (workspaceLanguage === 'sql') setQuery(value ?? '');
                  else setPythonCode(value ?? '');
                }}
                options={{
                  accessibilitySupport: 'auto',
                  minimap: { enabled: false },
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontSize: 14,
                  lineHeight: 23,
                  lineNumbersMinChars: 3,
                  padding: { top: 12, bottom: 12 },
                  renderLineHighlight: 'line',
                  scrollBeyondLastLine: false,
                  wordWrap: 'off',
                }}
              />
            )}

            {activeError && (
              <div role="alert" className="query-alert">{activeError}</div>
            )}

            {(workspaceLanguage === 'sql' || workspaceLanguage === 'python') && <div className="result-pane">
              <div className="result-toolbar">
                <span>{workspaceLanguage === 'sql' ? 'RESULT SET / 01' : 'PYTHON OUTPUT / 01'}</span>
                <span>
                  {workspaceLanguage === 'sql'
                    ? sqlRunCount > 0 ? `${rows.length} ROWS RETURNED` : 'NOT YET EXECUTED'
                    : pythonResult
                      ? `${pythonResult.stdout.length} LINES / ${pythonResult.figures.length} FIGURES`
                      : python.detail.toUpperCase()}
                </span>
                <span>{workspaceLanguage === 'sql' ? sqlRunCount > 0 ? elapsedMs : 0 : pythonResult?.elapsedMs ?? 0} MS</span>
                <span className="result-status">
                  <CircleCheck />
                  {workspaceLanguage === 'sql'
                    ? status === 'running' ? 'RUNNING' : sqlRunCount > 0 ? 'COMPLETE' : 'WAITING'
                    : python.status === 'running' ? 'RUNNING' : python.status === 'ready' ? 'READY' : 'WAITING'}
                </span>
              </div>
              <div className="result-scroll">
                {workspaceLanguage === 'sql' ? (
                  columns.length > 0 ? (
                    <Table className="results-grid">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="row-index-head">#</TableHead>
                          {columns.map((heading) => <TableHead key={heading}>{heading}</TableHead>)}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            <TableCell className="row-index">{String(rowIndex + 1).padStart(2, '0')}</TableCell>
                            {columns.map((column, index) => (
                              <TableCell key={column} className={index === 0 ? 'key-cell' : ''}>
                                {row[column] == null ? <span className="null-cell">NULL</span> : String(row[column])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : <p className="python-empty">Execute the starter query to create the first evidence record.</p>
                ) : (
                  <div className="python-output">
                    {!pythonResult && (
                      <p className="python-empty">
                        {python.status === 'ready'
                          ? 'Runtime ready. Execute the worksheet to produce output.'
                          : python.detail}
                      </p>
                    )}
                    {pythonResult?.stdout.map((line, index) => <pre key={`stdout-${index}`}>{line}</pre>)}
                    {pythonResult?.stderr.map((line, index) => <pre className="stderr" key={`stderr-${index}`}>{line}</pre>)}
                    {pythonResult?.display && <pre className="python-display">{pythonResult.display}</pre>}
                    {pythonResult?.figures.length ? (
                      <section className="python-figures" aria-label="Python figures">
                        <div className="python-figures-head">FIGURES / {String(pythonResult.figures.length).padStart(2, '0')}</div>
                        {pythonResult.figures.map((figure, index) => (
                          <figure key={`figure-${index}`}>
                            <Image src={figure} alt={`Python output figure ${index + 1}`} width={1000} height={600} unoptimized />
                            <figcaption>FIGURE {String(index + 1).padStart(2, '0')} / GENERATED IN THIS BROWSER</figcaption>
                          </figure>
                        ))}
                      </section>
                    ) : null}
                  </div>
                )}
              </div>
            </div>}
          </div>

          <footer className="trace-footer">
            <span><ShieldCheck /> COMPUTE: THIS BROWSER</span>
            <span>CATALOG SNAPSHOT: {definition.catalogSnapshot}</span>
            <span>QUERY STATE: SAVED</span>
            <span className="ml-auto">NO DATA UPLOADED</span>
            <SiteLink path="/teach" rel="nofollow">INSTRUCTOR NOTES</SiteLink>
          </footer>
        </section>

        <aside className={`case-ledger ${ledgerOpen ? 'is-open' : ''}`} aria-label="Assignment record">
          <button className="ledger-close" onClick={() => setLedgerOpen(false)} aria-label="Close assignment record"><X /></button>
          <div className="ledger-head">
            <p>ASSIGNMENT RECORD / {definition.id}</p>
            <div className="sla-block">
              <span><Clock3 /> RESPONSE WINDOW</span>
              <strong>{definition.responseWindow}</strong>
              <small>REMAINING IN RESPONSE WINDOW</small>
            </div>
          </div>

          <section className="ledger-section" ref={dataRegisterRef}>
            <div className="ledger-section-head"><span>SOURCE REGISTER</span><SiteLink path="/data">OPEN CATALOG</SiteLink></div>
            <div className="source-register">
              <div className="source-register-head"><span>TABLE</span><span>ROWS</span><span>STATE</span></div>
              {definition.dataFiles.map((source) => (
                <button key={source.table} title={source.note}>
                  <span>{source.table}</span>
                  <span>{formatRowCount(source.rows)}</span>
                  <strong className={source.trust === 'VERIFIED' ? 'verified' : 'review'}>{source.trust}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className="ledger-section evidence-section" ref={evidenceRef}>
            <div className="ledger-section-head"><span>EVIDENCE REGISTER</span><b>{String(evidenceCount).padStart(2, '0')} ITEMS</b></div>
            <ol>
              {evidence.map((record) => (
                <li key={record.id}>
                  <span className="evidence-id">{record.id}</span>
                  <p>{record.statement}</p>
                  <small>{record.source} / {caseTimeFormatter.format(new Date(record.recordedAt))} / {record.state.toUpperCase()}</small>
                </li>
              ))}
            </ol>
            {evidenceComposerOpen ? (
              <div className="evidence-composer">
                <textarea
                  value={evidenceDraft}
                  onChange={(event) => setEvidenceDraft(event.target.value)}
                  placeholder="State one finding you can trace to the work."
                />
                <div>
                  <button onClick={() => setEvidenceComposerOpen(false)}>CANCEL</button>
                  <button onClick={addEvidence} disabled={!evidenceDraft.trim()}>RECORD</button>
                </div>
              </div>
            ) : (
              <button className="add-evidence" onClick={() => setEvidenceComposerOpen(true)}><span>+</span> APPEND EVIDENCE RECORD</button>
            )}
          </section>

          <section className="ledger-section handoff-section" ref={handoffRef}>
            <div className="ledger-section-head"><span>REQUIRED HANDOFF</span><b>0 / {definition.requiredArtifacts.length}</b></div>
            <ul>
              {definition.requiredArtifacts.map((artifact) => <li key={artifact}><span /> {artifact}</li>)}
            </ul>
            <p>Completion records artifact presence only. Analytical judgment is reviewed by the instructor.</p>
            <button className="download-case" onClick={() => void exportCase()} disabled={isExporting}>
              <Download />
              <span>{isExporting ? 'PACKAGING SUBMISSION' : 'DOWNLOAD SUBMISSION'}</span>
              <small>.ANALYSTCASE</small>
            </button>
            <p className="download-case-note">Includes SQL, Python, working notes, final brief, evidence, captured outputs, hashes, and runtime versions. No account required.</p>
          </section>
        </aside>
        {ledgerOpen && <button className="ledger-scrim" onClick={() => setLedgerOpen(false)} aria-label="Close assignment record overlay" />}
      </div>
    </main>
  );
}
