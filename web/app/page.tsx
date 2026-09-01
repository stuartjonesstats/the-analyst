'use client';

import { useEffect, useState } from 'react';
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
  buildMondayCase,
  downloadAnalystCase,
  type EvidenceRecord,
} from '@/lib/analyst-case';
import { scenarios } from '@/lib/scenarios';

const defaultQuery = `SELECT
  survey_source_code, -- check the source
  scale_max,
  ROUND(AVG(score_raw), 2) AS mean_score,
  COUNT(*) AS responses,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS share_pct
FROM support.csat_response
GROUP BY 1, 2
ORDER BY responses DESC;`;

const defaultPython = `import pandas as pd
import matplotlib.pyplot as plt

csat = pd.read_parquet("/data/support/csat_response.parquet")

profile = (
    csat.groupby(["survey_source_code", "scale_max"])
        .agg(responses=("score_raw", "size"),
             mean_raw_score=("score_raw", "mean"),
             mean_normalized=("score_normalized", "mean"))
        .reset_index()
)

profile`;

const initialRows: QueryRow[] = [
  { survey_source_code: 'CARE_SURVEY', scale_max: 5, mean_score: 3, responses: 38_248, share_pct: 79.7 },
  { survey_source_code: 'LEGACY_SURVEY', scale_max: 10, mean_score: 6, responses: 9_752, share_pct: 20.3 },
];

const initialColumns = ['survey_source_code', 'scale_max', 'mean_score', 'responses', 'share_pct'];

const initialEvidence: EvidenceRecord[] = [
  {
    id: 'E-001',
    statement: 'Two survey scales coexist in the extract.',
    source: 'QUERY_01',
    state: 'verified',
    recordedAt: '2026-12-02T14:28:00.000Z',
  },
  {
    id: 'E-002',
    statement: 'Board figure may use unnormalized legacy scores.',
    source: 'WORKING NOTE',
    state: 'review',
    recordedAt: '2026-12-02T14:31:00.000Z',
  },
];

const caseTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: '2-digit',
  minute: '2-digit',
});

const workflow = [
  { seq: '01', label: 'Inbox', icon: Inbox, count: '3', active: false },
  { seq: '02', label: 'Investigate', icon: TerminalSquare, count: null, active: true },
  { seq: '03', label: 'Data register', icon: Database, count: null, active: false },
  { seq: '04', label: 'Evidence', icon: BookOpen, count: '2', active: false },
  { seq: '05', label: 'Handoff', icon: FileChartColumn, count: null, active: false },
];

const sources = [
  { table: 'support.csat_response', rows: '48,000', trust: 'REVIEW' },
  { table: 'support.ticket', rows: '100,000', trust: 'REVIEW' },
  { table: 'support.ticket_status_event', rows: '430,000', trust: 'VERIFIED' },
  { table: 'crm.account', rows: '65,000', trust: 'VERIFIED' },
];

export default function Home() {
  const { status, error: engineError, run } = useDuckDB();
  const python = usePython();
  const [workspaceLanguage, setWorkspaceLanguage] = useState<'sql' | 'python' | 'notes'>('sql');
  const [query, setQuery] = useState(defaultQuery);
  const [pythonCode, setPythonCode] = useState(defaultPython);
  const [notes, setNotes] = useState('');
  const [pythonResult, setPythonResult] = useState<PythonRunResult | null>(null);
  const [pythonError, setPythonError] = useState<string | null>(null);
  const [columns, setColumns] = useState(initialColumns);
  const [rows, setRows] = useState<QueryRow[]>(initialRows);
  const [elapsedMs, setElapsedMs] = useState(84);
  const [sqlRunCount, setSqlRunCount] = useState(0);
  const [pythonRunCount, setPythonRunCount] = useState(0);
  const [sqlCapturedAt, setSqlCapturedAt] = useState<string | null>(null);
  const [pythonCapturedAt, setPythonCapturedAt] = useState<string | null>(null);
  const [lastSqlResult, setLastSqlResult] = useState<{ columns: string[]; rows: QueryRow[]; elapsedMs: number } | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>(initialEvidence);
  const [evidenceDraft, setEvidenceDraft] = useState('');
  const [evidenceComposerOpen, setEvidenceComposerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const evidenceCount = evidence.length;

  // Hydrate drafts after mount because browser storage is intentionally local-only.
  /* oxlint-disable react/react-compiler */
  useEffect(() => {
    const saved = window.localStorage.getItem('the-analyst:monday-scorecard:query');
    if (saved) setQuery(saved);
    const savedPython = window.localStorage.getItem('the-analyst:monday-scorecard:python');
    if (savedPython) setPythonCode(savedPython);
    const savedNotes = window.localStorage.getItem('the-analyst:monday-scorecard:notes');
    if (savedNotes) setNotes(savedNotes);
    const savedEvidence = window.localStorage.getItem('the-analyst:monday-scorecard:evidence');
    if (savedEvidence) {
      try {
        const parsed = JSON.parse(savedEvidence) as EvidenceRecord[];
        if (Array.isArray(parsed) && parsed.length > 0) setEvidence(parsed);
      } catch {
        // A damaged local draft should not prevent the workbench from opening.
      }
    }
  }, []);
  /* oxlint-enable react/react-compiler */

  useEffect(() => {
    window.localStorage.setItem('the-analyst:monday-scorecard:query', query);
  }, [query]);

  useEffect(() => {
    window.localStorage.setItem('the-analyst:monday-scorecard:python', pythonCode);
  }, [pythonCode]);

  useEffect(() => {
    window.localStorage.setItem('the-analyst:monday-scorecard:notes', notes);
  }, [notes]);

  useEffect(() => {
    window.localStorage.setItem('the-analyst:monday-scorecard:evidence', JSON.stringify(evidence));
  }, [evidence]);

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

  function selectLanguage(language: 'sql' | 'python' | 'notes') {
    setWorkspaceLanguage(language);
    if (language === 'python' && python.status === 'idle') {
      void python.start().catch((cause) => {
        setPythonError(cause instanceof Error ? cause.message : 'Python could not start.');
      });
    }
  }

  function addEvidence() {
    const statement = evidenceDraft.trim();
    if (!statement) return;
    const nextId = `E-${String(evidence.length + 1).padStart(3, '0')}`;
    setEvidence((records) => [...records, {
      id: nextId,
      statement,
      source: workspaceLanguage === 'sql' ? 'SQL WORKSHEET' : workspaceLanguage === 'python' ? 'PYTHON WORKSHEET' : 'SCRATCH NOTES',
      state: 'review',
      recordedAt: new Date().toISOString(),
    }]);
    setEvidenceDraft('');
    setEvidenceComposerOpen(false);
  }

  async function exportCase() {
    setIsExporting(true);
    try {
      const caseFile = await buildMondayCase({
        sql: query,
        python: pythonCode,
        notes,
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
        ? 'MOUNTING CASE DATA'
        : python.status === 'running'
          ? 'PYTHON RUNNING'
          : python.status === 'error'
            ? 'PYTHON ERROR'
            : 'PYTHON READY';
  const engineLabel = workspaceLanguage === 'sql' ? sqlEngineLabel : workspaceLanguage === 'python' ? pythonEngineLabel : 'LOCAL NOTES';
  const activeError = workspaceLanguage === 'sql'
    ? queryError || engineError
    : workspaceLanguage === 'python' ? pythonError || python.error : null;

  return (
    <main className="workbench-shell">
      <header className="system-bar">
        <div className="brand-lockup">
          <span className="brand-mark">MA</span>
          <div>
            <span className="brand-word">MERIDIAN</span>
            <span className="ml-2 font-mono text-[8px] tracking-[0.15em] text-[#78878e]">ANALYST DESK</span>
          </div>
        </div>
        <div className="system-breadcrumb">
          <span className="text-[#d4dcdd]">CASEWORK</span>
          <span>/</span>
          <span>CC-241202</span>
          <span className="hidden md:inline">/ CUSTOMER CARE</span>
        </div>
        <div className="operator-block">
          <div className="hidden items-center gap-2 lg:flex">
            <span className="signal-dot" />
            <span className="font-mono text-[9px] tracking-[0.08em] text-[#a5b0b4]">{engineLabel}</span>
          </div>
          <div className="border-l border-[#31414a] pl-3 text-right">
            <p className="font-mono text-[9px] tracking-[0.08em] text-[#dbe2e3]">J. LEE / OPS-07</p>
            <p className="font-mono text-[8px] text-[#74828a]">PRIVATE WORKSTATION</p>
          </div>
        </div>
      </header>

      <nav className="mobile-workflow" aria-label="Mobile workflow">
        {workflow.map(({ seq, label, active }) => (
          <button key={seq} className={active ? 'is-active' : ''}>
            <span>{seq}</span> {label}
          </button>
        ))}
      </nav>

      <div className="workbench-grid">
        <aside className="work-queue">
          <div className="queue-heading">
            <span>WORK QUEUE</span>
            <span>09 CASES</span>
          </div>
          <div className="current-case-block">
            <div className="case-code-line">
              <span>CC-241202</span>
              <span className="case-open-flag">OPEN</span>
            </div>
            <h1>The Monday Scorecard</h1>
            <p>Customer Care / Metrics dispute</p>
          </div>

          <nav className="workflow-list" aria-label="Case workflow">
            {workflow.map(({ seq, label, icon: Icon, count, active }) => (
              <button key={seq} className={active ? 'active' : ''}>
                <span className="workflow-seq">{seq}</span>
                <Icon aria-hidden="true" />
                <span>{label}</span>
                {count && <span className="workflow-count">{count}</span>}
              </button>
            ))}
          </nav>

          <div className="queue-register">
            <p className="queue-section-label">OTHER CASE FILES</p>
            {scenarios.slice(1).map((caseFile) => (
              <button key={caseFile.id} title="Case pack is being connected to the workbench">
                <span className="font-mono text-[9px] text-[#78878e]">{caseFile.id}</span>
                <span className="mt-1 block text-[11px] text-[#c5ced0]">{caseFile.title}</span>
                <span className="mt-1 block font-mono text-[8px] tracking-[0.08em] text-[#66757c]">
                  {caseFile.status.replaceAll('_', ' ').toUpperCase()}
                </span>
              </button>
            ))}
          </div>

          <div className="queue-footer">
            <div><span>CASE PROGRESS</span><strong>01 / 05</strong></div>
            <div className="progress-track"><span /></div>
            <p>Autosave / local device</p>
          </div>
        </aside>

        <section className="analysis-surface">
          <div className="case-command-strip">
            <div className="case-command-id">
              <span className="status-bar" />
              <span>CASE CC-241202</span>
              <strong>ACTIVE INVESTIGATION</strong>
            </div>
            <div className="case-command-facts">
              <span><b>PRIORITY</b> P1</span>
              <span><b>BUSINESS UNIT</b> CUSTOMER CARE</span>
              <span><b>DUE</b> 14:00 LOCAL</span>
            </div>
            <button className="ledger-trigger" onClick={() => setLedgerOpen(true)}>
              <PanelRightOpen /> CASE LEDGER <span>{evidenceCount}</span>
            </button>
          </div>

          <article className="briefing-document">
            <div className="briefing-fields">
              <dl>
                <div><dt>FROM</dt><dd>Talia Rivera / VP Customer Care</dd></div>
                <div><dt>RECEIVED</dt><dd>02 Dec / 08:05</dd></div>
                <div><dt>RESPONSE DUE</dt><dd>02 Dec / 14:00</dd></div>
                <div><dt>CHANNEL</dt><dd>Executive review packet</dd></div>
              </dl>
            </div>
            <div className="briefing-copy">
              <p className="document-kicker">REQUEST / METRIC RECONCILIATION</p>
              <h2>Reconcile two conflicting satisfaction figures.</h2>
              <p>
                The board packet says satisfaction improved to <strong>7.6</strong>, while the weekly dashboard says it fell to{' '}
                <strong>3.8</strong>. Provide one defensible headline measure and a short explanation before the 14:00 review.
              </p>
              <div className="decision-line">
                <span>DECISION STANDARD</span>
                <p>Prefer the better-supported sentence over the prettier number. State what the data cannot establish.</p>
              </div>
            </div>
          </article>

          <div className="analysis-workarea">
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
              <span className="ml-auto hidden sm:block">SESSION 241202-A</span>
            </div>

            <div className="editor-toolbar">
              <div className="worksheet-name">
                <TerminalSquare />
                {workspaceLanguage === 'sql' ? 'query_01.sql' : workspaceLanguage === 'python' ? 'analysis_01.py' : 'scratch_notes.md'}
                <span>MODIFIED</span>
              </div>
              <button aria-label="Search query"><Search /></button>
              <div className="engine-state">
                <span className={(workspaceLanguage === 'sql' ? status === 'error' : workspaceLanguage === 'python' && python.status === 'error') ? 'is-error' : ''} />
                {engineLabel}
              </div>
              {workspaceLanguage !== 'notes' && (
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

            {workspaceLanguage === 'notes' ? (
              <textarea
                className="notes-editor"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Record assumptions, open questions, definitions, and the reasoning you will need to defend in the handoff."
                spellCheck="true"
                aria-label="Scratch notes"
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
                  fontSize: 12,
                  lineHeight: 22,
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

            {workspaceLanguage !== 'notes' && <div className="result-pane">
              <div className="result-toolbar">
                <span>{workspaceLanguage === 'sql' ? 'RESULT SET / 01' : 'PYTHON OUTPUT / 01'}</span>
                <span>
                  {workspaceLanguage === 'sql'
                    ? `${rows.length} ROWS RETURNED`
                    : pythonResult
                      ? `${pythonResult.stdout.length} STDOUT LINES`
                      : python.detail.toUpperCase()}
                </span>
                <span>{workspaceLanguage === 'sql' ? elapsedMs : pythonResult?.elapsedMs ?? 0} MS</span>
                <span className="result-status">
                  <CircleCheck />
                  {workspaceLanguage === 'sql'
                    ? status === 'running' ? 'RUNNING' : 'COMPLETE'
                    : python.status === 'running' ? 'RUNNING' : python.status === 'ready' ? 'READY' : 'WAITING'}
                </span>
              </div>
              <div className="result-scroll">
                {workspaceLanguage === 'sql' ? (
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
                    {pythonResult?.figures.map((figure, index) => (
                      <Image key={`figure-${index}`} src={figure} alt={`Python output figure ${index + 1}`} width={1000} height={600} unoptimized />
                    ))}
                  </div>
                )}
              </div>
            </div>}
          </div>

          <footer className="trace-footer">
            <span><ShieldCheck /> COMPUTE: THIS BROWSER</span>
            <span>CATALOG SNAPSHOT: 15 JAN 2026</span>
            <span>QUERY STATE: SAVED</span>
            <span className="ml-auto">NO DATA UPLOADED</span>
            <SiteLink path="/teach" rel="nofollow">INSTRUCTOR NOTES</SiteLink>
          </footer>
        </section>

        <aside className={`case-ledger ${ledgerOpen ? 'is-open' : ''}`} aria-label="Case ledger">
          <button className="ledger-close" onClick={() => setLedgerOpen(false)} aria-label="Close case ledger"><X /></button>
          <div className="ledger-head">
            <p>CASE LEDGER / CC-241202</p>
            <div className="sla-block">
              <span><Clock3 /> RESPONSE WINDOW</span>
              <strong>04:29:18</strong>
              <small>REMAINING TO EXECUTIVE REVIEW</small>
            </div>
          </div>

          <section className="ledger-section">
            <div className="ledger-section-head"><span>SOURCE REGISTER</span><button>OPEN CATALOG</button></div>
            <div className="source-register">
              <div className="source-register-head"><span>TABLE</span><span>ROWS</span><span>STATE</span></div>
              {sources.map((source) => (
                <button key={source.table}>
                  <span>{source.table}</span>
                  <span>{source.rows}</span>
                  <strong className={source.trust === 'VERIFIED' ? 'verified' : 'review'}>{source.trust}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className="ledger-section evidence-section">
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

          <section className="ledger-section handoff-section">
            <div className="ledger-section-head"><span>REQUIRED HANDOFF</span><b>0 / 4</b></div>
            <ul>
              <li><span /> Reproducible analysis</li>
              <li><span /> Metric definition note</li>
              <li><span /> Updated scorecard</li>
              <li><span /> Executive response</li>
            </ul>
            <p>Completion records artifact presence only. Analytical judgment is reviewed by the instructor.</p>
            <button className="download-case" onClick={() => void exportCase()} disabled={isExporting}>
              <Download />
              <span>{isExporting ? 'PACKAGING CASE FILE' : 'DOWNLOAD SUBMISSION'}</span>
              <small>.ANALYSTCASE</small>
            </button>
            <p className="download-case-note">Includes SQL, Python, notes, evidence, captured outputs, hashes, and runtime versions. No account required.</p>
          </section>
        </aside>
        {ledgerOpen && <button className="ledger-scrim" onClick={() => setLedgerOpen(false)} aria-label="Close case ledger overlay" />}
      </div>
    </main>
  );
}
