'use client';

import { useEffect, useState } from 'react';
import Editor, { type BeforeMount } from '@monaco-editor/react';
import {
  Bell,
  BookOpen,
  ChevronRight,
  CircleCheck,
  Clock3,
  Database,
  FileChartColumn,
  Inbox,
  Play,
  Search,
  ShieldCheck,
  TerminalSquare,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type QueryRow, useDuckDB } from '@/hooks/use-duckdb';

const defaultQuery = `SELECT
  survey_source_code, -- check the source
  scale_max,
  ROUND(AVG(score_raw), 2) AS mean_score,
  COUNT(*) AS responses,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS share_pct
FROM support.csat_response
GROUP BY 1, 2
ORDER BY responses DESC;`;

const initialRows: QueryRow[] = [
  { survey_source_code: 'CARE_SURVEY', scale_max: 5, mean_score: 3, responses: 38_248, share_pct: 79.7 },
  { survey_source_code: 'LEGACY_SURVEY', scale_max: 10, mean_score: 6, responses: 9_752, share_pct: 20.3 },
];

const initialColumns = ['survey_source_code', 'scale_max', 'mean_score', 'responses', 'share_pct'];

const navItems = [
  { label: 'Inbox', icon: Inbox, count: '3', active: true },
  { label: 'Investigation', icon: TerminalSquare, count: null, active: false },
  { label: 'Data catalog', icon: Database, count: null, active: false },
  { label: 'Evidence log', icon: BookOpen, count: '2', active: false },
  { label: 'Deliverable', icon: FileChartColumn, count: null, active: false },
];

export default function Home() {
  const { status, error: engineError, run } = useDuckDB();
  const [query, setQuery] = useState(defaultQuery);
  const [columns, setColumns] = useState(initialColumns);
  const [rows, setRows] = useState<QueryRow[]>(initialRows);
  const [elapsedMs, setElapsedMs] = useState(84);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [evidenceCount, setEvidenceCount] = useState(2);

  useEffect(() => {
    const saved = window.localStorage.getItem('the-analyst:monday-scorecard:query');
    if (saved) setQuery(saved);
    const savedEvidence = Number(window.localStorage.getItem('the-analyst:monday-scorecard:evidence-count'));
    if (savedEvidence > 0) setEvidenceCount(savedEvidence);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('the-analyst:monday-scorecard:query', query);
  }, [query]);

  const beforeMount: BeforeMount = (monaco) => {
    monaco.editor.defineTheme('analyst-sql', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword.sql', foreground: '7DD3FC' },
        { token: 'number.sql', foreground: 'FBBF24' },
        { token: 'comment.sql', foreground: '64748B', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background': '#101923',
        'editorLineNumber.foreground': '#3f5060',
        'editorLineNumber.activeForeground': '#94a3b8',
        'editor.selectionBackground': '#28526788',
        'editorCursor.foreground': '#7dd3fc',
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
    } catch (cause) {
      setQueryError(cause instanceof Error ? cause.message : 'Query execution failed.');
    }
  }

  function addEvidence() {
    const next = evidenceCount + 1;
    setEvidenceCount(next);
    window.localStorage.setItem('the-analyst:monday-scorecard:evidence-count', String(next));
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="flex h-14 items-center border-b border-navy-900 bg-navy-950 px-4 text-white md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-8 shrink-0 place-items-center border border-teal-300/40 bg-teal-300/10 text-teal-200">
            <span className="font-mono text-sm font-bold">A</span>
          </div>
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="font-semibold tracking-[-0.02em]">The Analyst</span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 sm:inline">
              Meridian workbench
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Badge className="hidden border-emerald-300/25 bg-emerald-300/10 font-mono text-[10px] uppercase tracking-[0.1em] text-emerald-200 lg:inline-flex">
            <span className="size-1.5 rounded-full bg-emerald-300" />
            Systems online
          </Badge>
          <Button aria-label="Notifications" variant="ghost" size="icon" className="text-slate-300 hover:bg-white/10 hover:text-white">
            <Bell />
          </Button>
          <div className="ml-1 hidden border-l border-white/15 pl-3 text-right sm:block">
            <p className="text-xs font-medium">Jordan Lee</p>
            <p className="font-mono text-[9px] uppercase tracking-wide text-slate-400">Operations analyst</p>
          </div>
          <div className="grid size-8 place-items-center rounded-full bg-amber-200 font-mono text-xs font-bold text-amber-950">
            JL
          </div>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-3.5rem)] grid-cols-1 md:grid-cols-[224px_minmax(0,1fr)] xl:grid-cols-[224px_minmax(0,1fr)_310px]">
        <aside className="hidden border-r border-border bg-sidebar md:flex md:flex-col">
          <div className="border-b border-border px-4 py-4">
            <p className="eyebrow">Current assignment</p>
            <button className="group mt-2 flex w-full items-start gap-2 text-left">
              <span className="mt-1.5 size-2 shrink-0 bg-primary" />
              <span>
                <span className="block text-sm font-semibold leading-5">The Monday Scorecard</span>
                <span className="mt-1 block text-xs leading-4 text-muted-foreground">Customer Care · Week 1</span>
              </span>
              <ChevronRight className="ml-auto mt-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <nav aria-label="Workspace" className="space-y-1 px-2 py-3">
            {navItems.map(({ label, icon: Icon, count, active }) => (
              <button
                key={label}
                className={`flex h-9 w-full items-center gap-3 px-2.5 text-sm transition-colors ${
                  active
                    ? 'border-l-2 border-primary bg-primary/8 font-medium text-foreground'
                    : 'border-l-2 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="size-4" />
                <span>{label}</span>
                {count && (
                  <span className="ml-auto grid min-w-5 place-items-center bg-muted px-1 font-mono text-[10px] text-muted-foreground">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-auto border-t border-border p-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Case progress</span>
              <span className="font-mono text-foreground">1 / 4</span>
            </div>
            <div className="h-1 bg-muted">
              <div className="h-full w-1/4 bg-primary" />
            </div>
            <p className="mt-3 text-[11px] leading-4 text-muted-foreground">Saved locally on this device.</p>
          </div>
        </aside>

        <section className="min-w-0 bg-[var(--workspace)]">
          <div className="border-b border-border bg-card px-4 py-4 sm:px-6">
            <div className="mx-auto max-w-[1040px]">
              <div className="flex items-center gap-2">
                <Badge className="rounded-none border-primary/25 bg-primary/8 font-mono text-[10px] uppercase tracking-[0.1em] text-primary">
                  Incoming request
                </Badge>
                <span className="font-mono text-[10px] text-muted-foreground">08:05 · MON 02 DEC</span>
              </div>
              <div className="mt-3 flex gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-950">TR</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <h1 className="font-semibold tracking-[-0.015em]">Talia Rivera</h1>
                    <span className="text-xs text-muted-foreground">VP, Customer Care</span>
                  </div>
                  <p className="message-copy mt-1 max-w-3xl text-[15px] leading-6 text-foreground/90">
                    The board packet says satisfaction improved to <strong>7.6</strong>, but my weekly dashboard says it fell to{' '}
                    <strong>3.8</strong>. I need one defensible number and a short explanation before the 2:00 review.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[1100px] p-3 sm:p-5">
            <div className="border border-border bg-card shadow-[0_18px_45px_rgb(15_23_42/10%)]">
              <div className="flex min-h-11 items-center border-b border-border px-3">
                <div className="flex h-11 items-center border-b-2 border-primary px-2 font-mono text-xs text-foreground">query_01.sql</div>
                <button className="ml-2 text-muted-foreground hover:text-foreground" aria-label="Search query">
                  <Search className="size-4" />
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
                    {status === 'booting' ? 'STARTING ENGINE' : status === 'running' ? 'QUERY RUNNING' : status === 'error' ? 'ENGINE ERROR' : 'DUCKDB · LOCAL'}
                  </span>
                  <Button
                    size="sm"
                    className="rounded-none px-3 font-mono text-[11px] uppercase tracking-[0.06em]"
                    disabled={status === 'booting' || status === 'running' || status === 'error'}
                    onClick={() => void runQuery()}
                  >
                    <Play data-icon="inline-start" /> {status === 'running' ? 'Running' : 'Run query'}
                  </Button>
                </div>
              </div>

              <Editor
                height="224px"
                language="sql"
                theme="analyst-sql"
                value={query}
                beforeMount={beforeMount}
                onChange={(value) => setQuery(value ?? '')}
                options={{
                  accessibilitySupport: 'auto',
                  minimap: { enabled: false },
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontSize: 13,
                  lineHeight: 24,
                  lineNumbersMinChars: 3,
                  padding: { top: 12, bottom: 12 },
                  renderLineHighlight: 'line',
                  scrollBeyondLastLine: false,
                  wordWrap: 'off',
                }}
              />

              {(queryError || engineError) && (
                <div role="alert" className="border-t border-red-200 bg-red-50 px-3 py-2 font-mono text-[11px] text-red-800">
                  {queryError || engineError}
                </div>
              )}

              <div className="border-t border-border">
                <div className="flex h-10 items-center gap-3 border-b border-border px-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-foreground">Results</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{rows.length} rows · {elapsedMs} ms</span>
                  <span aria-live="polite" className="ml-auto flex items-center gap-1.5 text-[11px] text-success">
                    <CircleCheck className="size-3.5" /> {status === 'running' ? 'Query running' : 'Query complete'}
                  </span>
                </div>
                <Table className="font-mono text-[11px]">
                  <TableHeader>
                    <TableRow className="bg-muted/45 hover:bg-muted/45">
                      {columns.map((heading) => (
                        <TableHead key={heading} className="h-9 px-3 text-[10px] uppercase tracking-[0.04em] text-muted-foreground">{heading}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, rowIndex) => (
                      <TableRow key={rowIndex} className="hover:bg-primary/5">
                        {columns.map((column, index) => (
                          <TableCell key={column} className={`px-3 ${index === 0 ? 'font-medium text-primary' : 'text-foreground/80'}`}>
                            {row[column] == null ? <span className="text-muted-foreground">NULL</span> : String(row[column])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              <span>Data remains in your browser.</span><span className="text-border">•</span><span>Catalog snapshot: 15 Jan 2026</span>
            </div>
          </div>
        </section>

        <aside className="hidden border-l border-border bg-sidebar xl:block">
          <div className="border-b border-border px-4 py-4">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Case file</p>
              <Badge variant="outline" className="rounded-none font-mono text-[10px] text-muted-foreground">90 MIN</Badge>
            </div>
            <h2 className="mt-2 text-sm font-semibold">Customer satisfaction conflict</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Reconcile two executive metrics without erasing the history that produced them.</p>
          </div>

          <div className="border-b border-border px-4 py-4">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Data neighborhood</p>
              <button className="text-[11px] text-primary hover:underline">Open catalog</button>
            </div>
            <div className="mt-3 space-y-2">
              {[
                ['support.csat_response', '48.0K', 'caution'],
                ['support.ticket', '100K', 'caution'],
                ['support.ticket_status_event', '430K', 'verified'],
                ['crm.account', '65.0K', 'verified'],
              ].map(([table, rows, status]) => (
                <button key={table} className="group flex w-full items-center gap-2 border border-border bg-card px-2.5 py-2 text-left hover:border-primary/35">
                  <Database className="size-3.5 text-muted-foreground group-hover:text-primary" />
                  <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-foreground/90">{table}</span>
                  <span className="font-mono text-[9px] text-muted-foreground">{rows}</span>
                  <span className={`size-1.5 rounded-full ${status === 'verified' ? 'bg-success' : 'bg-warning'}`} title={status} />
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Evidence log</p>
              <span className="font-mono text-[10px] text-muted-foreground">{evidenceCount} NOTES</span>
            </div>
            <ol className="mt-3 space-y-4 border-l border-border pl-4">
              <li className="relative">
                <span className="absolute -left-[19px] top-1 size-2 border border-primary bg-sidebar" />
                <p className="text-xs leading-5">Two survey scales coexist in the extract.</p>
                <p className="mt-1 font-mono text-[9px] text-muted-foreground">QUERY_01 · 09:28</p>
              </li>
              <li className="relative">
                <span className="absolute -left-[19px] top-1 size-2 border border-warning bg-sidebar" />
                <p className="text-xs leading-5">Board figure may use raw legacy scores.</p>
                <p className="mt-1 font-mono text-[9px] text-muted-foreground">WORKING NOTE · 09:31</p>
              </li>
            </ol>
            <button
              onClick={addEvidence}
              className="mt-4 flex w-full items-center gap-2 border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
            >
              <span className="text-primary">+</span> Add evidence
            </button>
          </div>

          <div className="mx-4 mt-2 border border-warning/35 bg-warning/8 p-3">
            <div className="flex items-center gap-2 text-amber-800">
              <Clock3 className="size-3.5" /><span className="font-mono text-[10px] uppercase tracking-[0.06em]">Deadline</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-foreground/80">Executive review begins in 4 hours 29 minutes.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
