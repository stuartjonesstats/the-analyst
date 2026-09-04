'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Editor, { type BeforeMount } from '@monaco-editor/react';
import Image from 'next/image';
import {
  ArrowRight,
  BookOpen,
  CircleCheck,
  Clock3,
  Database,
  Download,
  FilePlus2,
  FileChartColumn,
  FileText,
  Inbox,
  Link2,
  PanelRightOpen,
  Play,
  RotateCcw,
  ShieldCheck,
  TerminalSquare,
  Upload,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AiContextDialog } from '@/components/ai-context-dialog';
import { SiteLink } from '@/components/site-link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type QueryRow, type QueryRunResult, useDuckDB } from '@/hooks/use-duckdb';
import { type PythonRunResult, usePython } from '@/hooks/use-python';
import {
  buildAnalystCase,
  downloadAnalystCase,
  downloadPortfolioZip,
  parseAnalystCase,
  sha256,
  verifyWorkspaceHashes,
  type AnalystCaseFile,
  type EvidenceRecord,
  type LearnerIdentity,
  type PublishedTableRecord,
  type RunSnapshot,
  type ScaffoldMode,
  type WorkspaceFileDraft,
} from '@/lib/analyst-case';
import { type CaseDefinition, formatRowCount } from '@/lib/case-definition';
import { caseDefinitions } from '@/lib/case-definitions';
import { migrateLegacyPythonWorksheet } from '@/lib/python-worksheet-migration';
import { deleteWorkbenchRecord, loadWorkbenchRecord, saveWorkbenchRecord } from '@/lib/workbench-store';
import { eventsForAssignment, starterForMode } from '@/lib/workbench-modes';

const caseTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: '2-digit',
  minute: '2-digit',
});

type CaseWorkbenchProps = {
  definition: CaseDefinition;
  mode: ScaffoldMode;
  onSelectCase: (slug: string) => void;
  onSelectMode: (mode: ScaffoldMode) => void;
};

type WorkspaceLanguage = 'sql' | 'python' | 'notes' | 'final';
type WorkflowStep = 'inbox' | 'investigate' | 'data-register' | 'evidence' | 'handoff';

type StoredWorkbenchExtras = {
  identity: LearnerIdentity;
  artifacts: WorkspaceFileDraft[];
  runHistory: RunSnapshot[];
  publishedTables: PublishedTableRecord[];
  revealedEventIds: string[];
};

const blankIdentity: LearnerIdentity = {
  name: '', identifier: '', course: '', section: '', team: '', attempt: '1',
};

function artifactSlug(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 54) || 'artifact';
}

function languageForFile(file: File): WorkspaceFileDraft['language'] {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'sql') return 'sql';
  if (extension === 'py' || extension === 'ipynb') return 'python';
  if (extension === 'md' || extension === 'txt') return 'markdown';
  if (extension === 'csv' || extension === 'tsv') return 'csv';
  if (extension === 'json' || extension === 'jsonl') return 'json';
  if (file.type.startsWith('image/')) return 'image';
  return 'binary';
}

function fileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('The selected file could not be encoded.'));
    reader.onerror = () => reject(reader.error ?? new Error('The selected file could not be read.'));
    reader.readAsDataURL(file);
  });
}

export function CaseWorkbench({ definition, mode, onSelectCase, onSelectMode }: CaseWorkbenchProps) {
  const starter = useMemo(() => starterForMode(definition, mode), [definition, mode]);
  const storageKey = `${definition.persistenceKey}:${mode}`;
  const { status, error: engineError, run, publish } = useDuckDB(definition.dataFiles);
  const python = usePython(definition.dataFiles, definition.pythonPackages);
  const [workspaceLanguage, setWorkspaceLanguage] = useState<WorkspaceLanguage>('sql');
  const [query, setQuery] = useState(starter.sql);
  const [pythonCode, setPythonCode] = useState(starter.python);
  const [notes, setNotes] = useState(starter.notes);
  const [finalBrief, setFinalBrief] = useState('');
  const [pythonResult, setPythonResult] = useState<PythonRunResult | null>(null);
  const [pythonError, setPythonError] = useState<string | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<QueryRow[]>([]);
  const [sqlTotalRows, setSqlTotalRows] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [sqlRunCount, setSqlRunCount] = useState(0);
  const [pythonRunCount, setPythonRunCount] = useState(0);
  const [sqlCapturedAt, setSqlCapturedAt] = useState<string | null>(null);
  const [pythonCapturedAt, setPythonCapturedAt] = useState<string | null>(null);
  const [lastSqlResult, setLastSqlResult] = useState<QueryRunResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>(starter.evidence);
  const [evidenceDraft, setEvidenceDraft] = useState('');
  const [evidenceComposerOpen, setEvidenceComposerOpen] = useState(false);
  const [evidenceRunId, setEvidenceRunId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [aiContextOpen, setAiContextOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerIsOverlay, setLedgerIsOverlay] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading');
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<WorkflowStep>('inbox');
  const [identity, setIdentity] = useState<LearnerIdentity>(blankIdentity);
  const [artifacts, setArtifacts] = useState<WorkspaceFileDraft[]>([]);
  const [runHistory, setRunHistory] = useState<RunSnapshot[]>([]);
  const [publishedTables, setPublishedTables] = useState<PublishedTableRecord[]>([]);
  const [revealedEventIds, setRevealedEventIds] = useState<string[]>([]);
  const [artifactEditorLabel, setArtifactEditorLabel] = useState<string | null>(null);
  const [publishName, setPublishName] = useState('analysis_result');
  const [publishStatus, setPublishStatus] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);
  const aiContextTriggerRef = useRef<HTMLButtonElement>(null);
  const ledgerTriggerRef = useRef<HTMLButtonElement>(null);
  const workflowStageRef = useRef<HTMLDivElement>(null);
  const evidenceCount = evidence.length;
  const presentArtifactCount = definition.requiredArtifacts.filter((label) =>
    artifacts.some((artifact) => artifact.requiredArtifactLabel === label && artifact.content.length > 0),
  ).length;
  const workflow = [
    { id: 'inbox' as const, seq: '01', label: 'Inbox', icon: Inbox, count: null, detail: 'Read the request, operating context, deadline, and decision standard before touching the data.' },
    { id: 'data-register' as const, seq: '02', label: 'Data register', icon: Database, count: null, detail: 'Inspect the mounted source neighborhood, row counts, trust state, and table-specific cautions before querying.' },
    { id: 'investigate' as const, seq: '03', label: 'Investigate', icon: TerminalSquare, count: null, detail: 'Work in SQL, Python, scratch notes, and the final-brief draft without leaving the browser.' },
    { id: 'evidence' as const, seq: '04', label: 'Evidence', icon: BookOpen, count: String(evidenceCount), detail: 'Review and append findings that can be traced to the analysis rather than intuition.' },
    { id: 'handoff' as const, seq: '05', label: 'Handoff', icon: FileChartColumn, count: String(presentArtifactCount), detail: 'Polish the decision brief, bind the required artifact files, and package the complete submission.' },
  ];
  const activeWorkflowIndex = workflow.findIndex(({ id }) => id === activeWorkflowStep);
  const activeWorkflow = workflow[activeWorkflowIndex];

  const workdayEvents = useMemo(() => eventsForAssignment(definition.slug), [definition.slug]);
  const latestSqlRun = [...runHistory].reverse().find((snapshot) => snapshot.language === 'sql') ?? null;
  const latestPythonRun = [...runHistory].reverse().find((snapshot) => snapshot.language === 'python') ?? null;
  const sqlIsStale = Boolean(latestSqlRun && latestSqlRun.code !== query);
  const pythonIsStale = Boolean(latestPythonRun && latestPythonRun.code !== pythonCode);

  // Hydrate drafts after mount because browser storage is intentionally local-only.
  /* oxlint-disable react/react-compiler */
  useEffect(() => {
    let active = true;
    const legacyPrefix = mode === 'supported' ? definition.persistenceKey : storageKey;
    async function hydrate() {
      const saved = window.localStorage.getItem(`${storageKey}:query`) ?? window.localStorage.getItem(`${legacyPrefix}:query`);
      if (saved) setQuery(saved);
      const savedPython = window.localStorage.getItem(`${storageKey}:python`) ?? window.localStorage.getItem(`${legacyPrefix}:python`);
      if (savedPython) setPythonCode(migrateLegacyPythonWorksheet(savedPython, definition.dataFiles));
      const savedNotes = window.localStorage.getItem(`${storageKey}:notes`) ?? window.localStorage.getItem(`${legacyPrefix}:notes`);
      if (savedNotes) setNotes(savedNotes);
      const savedFinalBrief = window.localStorage.getItem(`${storageKey}:final`) ?? window.localStorage.getItem(`${legacyPrefix}:final`);
      if (savedFinalBrief) setFinalBrief(savedFinalBrief);
      const savedEvidence = window.localStorage.getItem(`${storageKey}:evidence`) ?? window.localStorage.getItem(`${legacyPrefix}:evidence`);
      if (savedEvidence) {
        try {
          const parsed = JSON.parse(savedEvidence) as EvidenceRecord[];
          if (Array.isArray(parsed)) setEvidence(parsed);
        } catch {
          // A damaged local draft should not prevent the workbench from opening.
        }
      }
      try {
        const extra = await loadWorkbenchRecord<StoredWorkbenchExtras>(storageKey);
        if (active && extra) {
          setIdentity({ ...blankIdentity, ...extra.identity });
          setArtifacts(extra.artifacts ?? []);
          const history = extra.runHistory ?? [];
          setRunHistory(history);
          const restoredSql = [...history].reverse().find((snapshot) => snapshot.language === 'sql');
          const restoredPython = [...history].reverse().find((snapshot) => snapshot.language === 'python');
          setSqlRunCount(history.filter((snapshot) => snapshot.language === 'sql').length);
          setPythonRunCount(history.filter((snapshot) => snapshot.language === 'python').length);
          if (restoredSql) {
            const restoredRows = restoredSql.output.displayedRows ?? [];
            const restoredColumns = restoredSql.output.columns ?? [];
            setColumns(restoredColumns);
            setRows(restoredRows);
            setSqlTotalRows(restoredSql.output.totalRows ?? restoredRows.length);
            setElapsedMs(restoredSql.elapsedMs);
            setSqlCapturedAt(restoredSql.capturedAt);
            setLastSqlResult({
              columns: restoredColumns,
              rows: restoredRows,
              displayedRows: restoredRows.length,
              totalRows: restoredSql.output.totalRows ?? restoredRows.length,
              truncated: (restoredSql.output.totalRows ?? restoredRows.length) > restoredRows.length,
              elapsedMs: restoredSql.elapsedMs,
            });
          }
          if (restoredPython) {
            setPythonCapturedAt(restoredPython.capturedAt);
            setPythonResult({
              stdout: restoredPython.output.stdout ?? [],
              stderr: restoredPython.output.stderr ?? [],
              display: restoredPython.output.display ?? '',
              figures: restoredPython.output.figures ?? [],
              elapsedMs: restoredPython.elapsedMs,
            });
          }
          setPublishedTables(extra.publishedTables ?? []);
          setRevealedEventIds(extra.revealedEventIds ?? []);
        }
      } catch {
        if (active) setSaveState('error');
      }
      if (active) {
        setHydrated(true);
        setSaveState('saved');
      }
    }
    void hydrate();
    return () => { active = false; };
  }, [definition.dataFiles, definition.persistenceKey, mode, storageKey]);
  /* oxlint-enable react/react-compiler */

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(`${storageKey}:query`, query);
  }, [hydrated, query, storageKey]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(`${storageKey}:python`, pythonCode);
  }, [hydrated, pythonCode, storageKey]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(`${storageKey}:notes`, notes);
  }, [hydrated, notes, storageKey]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(`${storageKey}:final`, finalBrief);
  }, [finalBrief, hydrated, storageKey]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(`${storageKey}:evidence`, JSON.stringify(evidence));
  }, [evidence, hydrated, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    const timeout = window.setTimeout(() => {
      setSaveState('saving');
      void saveWorkbenchRecord<StoredWorkbenchExtras>(storageKey, {
        identity, artifacts, runHistory, publishedTables, revealedEventIds,
      }).then(() => setSaveState('saved')).catch(() => setSaveState('error'));
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [artifacts, hydrated, identity, publishedTables, revealedEventIds, runHistory, storageKey]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1199px)');
    const sync = () => setLedgerIsOverlay(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

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

  function revealWorkdayEvents(trigger: 'sql-run' | 'evidence-added' | 'brief-drafted') {
    const unlocked = workdayEvents.filter((event) => event.trigger === trigger).map((event) => event.id);
    if (unlocked.length) setRevealedEventIds((current) => [...new Set([...current, ...unlocked])]);
  }

  function updateFinalBrief(value: string) {
    setFinalBrief(value);
    if (value.trim()) revealWorkdayEvents('brief-drafted');
  }

  async function runQuery() {
    setQueryError(null);
    try {
      const result = await run(query);
      const capturedAt = new Date().toISOString();
      const runNumber = sqlRunCount + 1;
      const codeSha256 = await sha256(query);
      setColumns(result.columns);
      setRows(result.rows);
      setSqlTotalRows(result.totalRows);
      setElapsedMs(result.elapsedMs);
      setLastSqlResult(result);
      setSqlCapturedAt(capturedAt);
      setSqlRunCount(runNumber);
      revealWorkdayEvents('sql-run');
      setRunHistory((history) => [...history, {
        id: crypto.randomUUID(),
        language: 'sql',
        runNumber,
        capturedAt,
        elapsedMs: result.elapsedMs,
        codePath: 'workspace/query_01.sql',
        code: query,
        codeSha256,
        output: {
          columns: result.columns,
          displayedRows: result.rows,
          totalRows: result.totalRows,
          displayLimit: 1000,
        },
      }]);
    } catch (cause) {
      setQueryError(cause instanceof Error ? cause.message : 'Query execution failed.');
    }
  }

  async function runPython() {
    setPythonError(null);
    try {
      const result = await python.run(pythonCode);
      const capturedAt = new Date().toISOString();
      const runNumber = pythonRunCount + 1;
      const codeSha256 = await sha256(pythonCode);
      setPythonResult(result);
      setPythonCapturedAt(capturedAt);
      setPythonRunCount(runNumber);
      setRunHistory((history) => [...history, {
        id: crypto.randomUUID(),
        language: 'python',
        runNumber,
        capturedAt,
        elapsedMs: result.elapsedMs,
        codePath: 'workspace/analysis_01.py',
        code: pythonCode,
        codeSha256,
        output: {
          stdout: result.stdout,
          stderr: result.stderr,
          display: result.display,
          figures: result.figures,
        },
      }]);
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
    setLedgerOpen(false);
    window.requestAnimationFrame(() => workflowStageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function closeLedger() {
    setLedgerOpen(false);
    if (ledgerIsOverlay) window.requestAnimationFrame(() => ledgerTriggerRef.current?.focus());
  }

  function openEvidenceComposer(runId: string | null = null) {
    setEvidenceRunId(runId);
    setEvidenceComposerOpen(true);
    setLedgerOpen(true);
  }

  function addEvidence() {
    const statement = evidenceDraft.trim();
    if (!statement) return;
    const linkedRun = runHistory.find((snapshot) => snapshot.id === evidenceRunId);
    const nextNumber = evidence.reduce((maximum, record) => {
      const parsed = Number(record.id.replace(/\D/g, ''));
      return Number.isFinite(parsed) ? Math.max(maximum, parsed) : maximum;
    }, 0) + 1;
    const nextId = `E-${String(nextNumber).padStart(3, '0')}`;
    setEvidence((records) => [...records, {
      id: nextId,
      statement,
      source: linkedRun
        ? `${linkedRun.language.toUpperCase()} RUN ${String(linkedRun.runNumber).padStart(2, '0')}`
        : workspaceLanguage === 'sql'
          ? 'SQL WORKSHEET'
          : workspaceLanguage === 'python'
            ? 'PYTHON WORKSHEET'
            : workspaceLanguage === 'final'
              ? 'FINAL BRIEF'
              : 'SCRATCH NOTES',
      state: 'review',
      recordedAt: new Date().toISOString(),
      ...(linkedRun ? {
        runId: linkedRun.id,
        codeSha256: linkedRun.codeSha256,
        outputSummary: linkedRun.language === 'sql'
          ? `${linkedRun.output.totalRows ?? 0} result row(s); ${linkedRun.output.displayedRows?.length ?? 0} retained for review`
          : `${linkedRun.output.figures?.length ?? 0} figure(s); ${linkedRun.output.stdout?.length ?? 0} stdout line(s)`,
      } : {}),
    }]);
    revealWorkdayEvents('evidence-added');
    setEvidenceDraft('');
    setEvidenceRunId(null);
    setEvidenceComposerOpen(false);
  }

  function removeEvidence(id: string) {
    setEvidence((records) => records.filter((record) => record.id !== id));
  }

  function artifactFor(label: string) {
    return artifacts.find((artifact) => artifact.requiredArtifactLabel === label);
  }

  function upsertArtifact(next: WorkspaceFileDraft) {
    setArtifacts((current) => [
      ...current.filter((artifact) => artifact.requiredArtifactLabel !== next.requiredArtifactLabel),
      next,
    ]);
  }

  function createTextArtifact(label: string, index: number) {
    const current = artifactFor(label);
    if (!current) {
      upsertArtifact({
        path: `artifacts/${String(index + 1).padStart(2, '0')}-${artifactSlug(label)}.md`,
        language: 'markdown',
        content: '',
        encoding: 'utf-8',
        mimeType: 'text/markdown',
        source: 'authored-artifact',
        requiredArtifactLabel: label,
      });
    }
    setArtifactEditorLabel(label);
  }

  function bindWorksheet(label: string, index: number, source: 'sql' | 'python' | 'final') {
    const details = source === 'sql'
      ? { extension: 'sql', language: 'sql' as const, mimeType: 'application/sql', content: query }
      : source === 'python'
        ? { extension: 'py', language: 'python' as const, mimeType: 'text/x-python', content: pythonCode }
        : { extension: 'md', language: 'markdown' as const, mimeType: 'text/markdown', content: finalBrief };
    upsertArtifact({
      path: `artifacts/${String(index + 1).padStart(2, '0')}-${artifactSlug(label)}.${details.extension}`,
      language: details.language,
      content: details.content,
      encoding: 'utf-8',
      mimeType: details.mimeType,
      source: 'generated-artifact',
      requiredArtifactLabel: label,
    });
    setArtifactEditorLabel(null);
  }

  async function attachArtifact(label: string, index: number, file: File) {
    if (file.size > 10 * 1024 * 1024) {
      window.alert('Choose a file smaller than 10 MB. Keep the complete submission below 50 MB.');
      return;
    }
    const language = languageForFile(file);
    const textLike = ['sql', 'python', 'markdown', 'csv', 'json'].includes(language);
    const content = textLike ? await file.text() : await fileAsDataUrl(file);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
    upsertArtifact({
      path: `artifacts/${String(index + 1).padStart(2, '0')}-${artifactSlug(label)}/${safeName}`,
      language,
      content,
      encoding: textLike ? 'utf-8' : 'data-url',
      mimeType: file.type || 'application/octet-stream',
      source: 'uploaded-artifact',
      requiredArtifactLabel: label,
    });
    setArtifactEditorLabel(null);
  }

  function clearArtifact(label: string) {
    setArtifacts((current) => current.filter((artifact) => artifact.requiredArtifactLabel !== label));
    if (artifactEditorLabel === label) setArtifactEditorLabel(null);
  }

  function updateIdentity(field: keyof LearnerIdentity, value: string) {
    setIdentity((current) => ({ ...current, [field]: value }));
  }

  async function buildCurrentCase(): Promise<AnalystCaseFile> {
    return buildAnalystCase(definition, {
      sql: query,
      python: pythonCode,
      notes,
      finalBrief,
      evidence,
      identity,
      scaffoldMode: mode,
      helpEventsUsed: revealedEventIds,
      artifacts,
      runHistory,
      publishedTables,
      sqlRunCount,
      pythonRunCount,
      sqlCapturedAt,
      pythonCapturedAt,
      sqlResult: lastSqlResult,
      pythonResult,
    });
  }

  async function exportCase(kind: 'case' | 'portfolio' = 'case') {
    setIsExporting(true);
    try {
      const caseFile = await buildCurrentCase();
      if (kind === 'portfolio') downloadPortfolioZip(caseFile);
      else downloadAnalystCase(caseFile);
    } finally {
      setIsExporting(false);
    }
  }

  function restoreStarter(language: 'sql' | 'python') {
    if (!window.confirm(`Restore the ${language.toUpperCase()} starter for ${mode} mode? Your current worksheet will be replaced.`)) return;
    if (language === 'sql') setQuery(starter.sql);
    else setPythonCode(starter.python);
  }

  async function clearAssignment() {
    if (!window.confirm('Clear this assignment on this browser? Download a submission first if you need a recoverable copy.')) return;
    ['query', 'python', 'notes', 'final', 'evidence'].forEach((suffix) => window.localStorage.removeItem(`${storageKey}:${suffix}`));
    await deleteWorkbenchRecord(storageKey);
    setQuery(starter.sql);
    setPythonCode(starter.python);
    setNotes(starter.notes);
    setFinalBrief('');
    setEvidence(starter.evidence);
    setIdentity(blankIdentity);
    setArtifacts([]);
    setRunHistory([]);
    setPublishedTables([]);
    setRevealedEventIds([]);
    setColumns([]);
    setRows([]);
    setSqlTotalRows(0);
    setPythonResult(null);
    setLastSqlResult(null);
    setSqlRunCount(0);
    setPythonRunCount(0);
    setActiveWorkflowStep('inbox');
  }

  async function importSubmission(file: File) {
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error('Choose a submission smaller than 50 MB.');
      const imported = parseAnalystCase(await file.text());
      if (imported.scenario.slug !== definition.slug) {
        throw new Error(`This file belongs to ${imported.scenario.title}. Open that assignment before restoring it.`);
      }
      const hashes = await verifyWorkspaceHashes(imported);
      if (hashes.some((record) => !record.matches)) throw new Error('The submission contains a workspace hash mismatch and was not restored.');
      const byPath = new Map(imported.learnerWorkspace.files.map((fileRecord) => [fileRecord.path, fileRecord]));
      setQuery(byPath.get('workspace/query_01.sql')?.content ?? starter.sql);
      setPythonCode(byPath.get('workspace/analysis_01.py')?.content ?? starter.python);
      setNotes(byPath.get('workspace/scratch_notes.md')?.content ?? starter.notes);
      setFinalBrief(byPath.get('workspace/final_brief.md')?.content ?? '');
      setArtifacts(imported.learnerWorkspace.files.filter((fileRecord) => fileRecord.path.startsWith('artifacts/')));
      setEvidence(imported.learnerWorkspace.evidence);
      setIdentity(imported.identity);
      setRunHistory(imported.capturedRuns.history ?? []);
      setPublishedTables(imported.learnerWorkspace.publishedTables ?? []);
      setRevealedEventIds(imported.scaffold.helpEventsUsed ?? []);
      setSqlRunCount(imported.capturedRuns.sql?.runCount ?? 0);
      setPythonRunCount(imported.capturedRuns.python?.runCount ?? 0);
      setLastSqlResult(imported.capturedRuns.sql ? {
        columns: imported.capturedRuns.sql.columns,
        rows: imported.capturedRuns.sql.displayedRows,
        displayedRows: imported.capturedRuns.sql.displayedRows.length,
        totalRows: imported.capturedRuns.sql.totalRows,
        truncated: imported.capturedRuns.sql.totalRows > imported.capturedRuns.sql.displayedRows.length,
        elapsedMs: imported.capturedRuns.sql.elapsedMs,
      } : null);
      setColumns(imported.capturedRuns.sql?.columns ?? []);
      setRows(imported.capturedRuns.sql?.displayedRows ?? []);
      setSqlTotalRows(imported.capturedRuns.sql?.totalRows ?? 0);
      setPythonResult(imported.capturedRuns.python ? {
        stdout: imported.capturedRuns.python.stdout,
        stderr: imported.capturedRuns.python.stderr,
        display: imported.capturedRuns.python.display,
        figures: imported.capturedRuns.python.figures,
        elapsedMs: imported.capturedRuns.python.elapsedMs,
      } : null);
      setActiveWorkflowStep('handoff');
      window.alert(`Restored ${imported.scenario.id}. The file was created in ${imported.scaffold.mode} mode; the current launch mode remains ${mode}.`);
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : 'The submission could not be restored.');
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
  }

  async function publishToPython() {
    setPublishStatus('Publishing query result…');
    try {
      const result = await publish(query, publishName);
      await python.mountWorkspaceTable(result.table, result.bytes);
      const sourceCodeSha256 = await sha256(query);
      setPublishedTables((current) => [
        ...current.filter((record) => record.table !== result.table),
        { table: result.table, rowCount: result.rowCount, createdAt: result.createdAt, sourceCodeSha256 },
      ]);
      setPublishStatus(`${result.table} available through table("${result.table}")`);
    } catch (cause) {
      setPublishStatus(cause instanceof Error ? cause.message : 'The workspace table could not be published.');
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
  const currentRun = workspaceLanguage === 'sql' ? latestSqlRun : workspaceLanguage === 'python' ? latestPythonRun : null;
  const currentRunIsStale = workspaceLanguage === 'sql' ? sqlIsStale : workspaceLanguage === 'python' ? pythonIsStale : false;
  const revealedWorkdayEvents = workdayEvents.filter((event) => revealedEventIds.includes(event.id));
  const modeLabels: Record<ScaffoldMode, string> = {
    supported: 'Supported',
    guided: 'Guided',
    independent: 'Independent',
  };

  return (
    <main className="workbench-shell">
      <header className="system-bar">
        <div className="brand-lockup">
          <SiteLink path="/" className="brand-word">THE ANALYST</SiteLink>
          <span className="workbench-product-name">MERIDIAN WORKBENCH</span>
        </div>
        <div className="system-breadcrumb">
          <SiteLink path="/projects">ASSIGNMENTS</SiteLink><span>/</span><span>{definition.id}</span>
          <span className="hidden md:inline">/ {definition.businessUnit.toUpperCase()}</span>
        </div>
        <div className="operator-block">
          <label className="mode-control">
            <span>SCAFFOLD</span>
            <select value={mode} onChange={(event) => onSelectMode(event.target.value as ScaffoldMode)}>
              {Object.entries(modeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <div className="operator-identity">
            <p>ANALYST / {identity.name.trim() || 'LOCAL-01'}</p>
            <p>LOCAL SESSION / NO ACCOUNT</p>
          </div>
        </div>
      </header>

      <nav className="mobile-workflow" aria-label="Assignment workflow">
        {workflow.map(({ id, seq, label }) => (
          <button key={seq} type="button" className={id === activeWorkflowStep ? 'is-active' : ''}
            aria-current={id === activeWorkflowStep ? 'step' : undefined} onClick={() => openWorkflowStep(id)}>
            <span>{seq}</span> {label}
          </button>
        ))}
      </nav>

      <aside className="workbench-device-notice" role="note">
        <strong>DESKTOP WORKSPACE REQUIRED</strong>
        <span>Phones may preview the brief. SQL, Python, evidence, and submission work require a laptop or desktop browser.</span>
      </aside>

      <div className="workbench-grid">
        <aside className="work-queue">
          <div className="queue-heading"><span>WORK QUEUE</span><span>{String(caseDefinitions.length).padStart(2, '0')} ASSIGNMENTS</span></div>
          <div className="current-case-block">
            <div className="case-code-line"><span>{definition.id}</span><span className="case-open-flag">OPEN</span></div>
            <h1>{definition.title}</h1><p>{definition.queueSubtitle}</p>
          </div>
          <nav className="workflow-list" aria-label="Assignment workflow steps">
            {workflow.map(({ id, seq, label, icon: Icon, count }) => (
              <button key={seq} type="button" className={id === activeWorkflowStep ? 'active' : ''}
                aria-current={id === activeWorkflowStep ? 'step' : undefined} onClick={() => openWorkflowStep(id)}>
                <span className="workflow-seq">{seq}</span><Icon aria-hidden="true" /><span>{label}</span>
                {count && <span className="workflow-count">{count}</span>}
              </button>
            ))}
          </nav>
          <div className="queue-register">
            <p className="queue-section-label">OTHER ASSIGNMENTS</p>
            {caseDefinitions.filter((item) => item.slug !== definition.slug).map((item) => (
              <button key={item.id} onClick={() => onSelectCase(item.slug)}>
                <span className="queue-case-id">{item.id}</span><span className="queue-case-title">{item.title}</span>
                <span className="queue-case-state">AVAILABLE</span>
              </button>
            ))}
          </div>
          <div className="queue-footer">
            <div><span>WORKFLOW POSITION</span><strong>{String(activeWorkflowIndex + 1).padStart(2, '0')} / 05</strong></div>
            <div className="progress-track"><span style={{ width: `${(activeWorkflowIndex + 1) * 20}%` }} /></div>
            <p>Local save / {saveState}</p>
          </div>
        </aside>

        <section className="analysis-surface">
          <div className="case-command-strip">
            <div className="case-command-id"><span className="status-bar" /><span>ASSIGNMENT {definition.id}</span><strong>{activeWorkflow.label.toUpperCase()}</strong></div>
            <div className="case-command-facts">
              <span><b>PRIORITY</b> {definition.priority}</span><span><b>UNIT</b> {definition.businessUnit.toUpperCase()}</span><span><b>DUE</b> {definition.dueLabel}</span>
            </div>
            <button ref={aiContextTriggerRef} className="ai-context-trigger" onClick={() => { setLedgerOpen(false); setAiContextOpen(true); }}>
              <FileText /> AI HELP PACKET
            </button>
            <button ref={ledgerTriggerRef} className="ledger-trigger" onClick={() => setLedgerOpen(true)}>
              <PanelRightOpen /> ASSIGNMENT RECORD <span>{evidenceCount}</span>
            </button>
          </div>

          <div className="workflow-stage" ref={workflowStageRef}>
            <header className="workflow-stage-head">
              <div><span>STEP {activeWorkflow.seq} / ASSIGNMENT WORKFLOW</span><h1>{activeWorkflow.label}</h1></div>
              <p>{activeWorkflow.detail}</p>
            </header>

            {activeWorkflowStep === 'inbox' && <div className="inbox-stage">
              <article className="briefing-document">
                <div className="briefing-fields"><dl>
                  <div><dt>EMPLOYER</dt><dd>Meridian Living Systems</dd></div><div><dt>YOUR ROLE</dt><dd>{definition.role}</dd></div>
                  <div><dt>FROM</dt><dd>{definition.requester}</dd></div><div><dt>RECEIVED</dt><dd>{definition.received}</dd></div>
                  <div><dt>RESPONSE DUE</dt><dd>{definition.responseDue}</dd></div><div><dt>CHANNEL</dt><dd>{definition.channel}</dd></div>
                </dl></div>
                <div className="briefing-copy">
                  <p className="document-kicker">{definition.requestKicker}</p><h2>{definition.requestTitle}</h2><p>{definition.requestBody}</p>
                  <div className="decision-line"><span>DECISION STANDARD</span><p>{definition.decisionStandard}</p></div>
                </div>
              </article>
              {workdayEvents.length > 0 && <section className="workday-inbox" aria-labelledby="workday-inbox-title">
                <div><span>INCOMING CONTEXT</span><h2 id="workday-inbox-title">The workday changes as you work.</h2><p>Messages unlock after defensible actions. They add context; they do not reveal an answer.</p></div>
                {revealedWorkdayEvents.length ? revealedWorkdayEvents.map((event) => (
                  <article key={event.id}><span>{event.from}</span><h3>{event.subject}</h3><p>{event.body}</p></article>
                )) : <p className="workday-locked">No follow-up messages yet. Begin the investigation and record what the evidence supports.</p>}
              </section>}
            </div>}

            {activeWorkflowStep === 'investigate' && <div className="analysis-workarea">
              <div className="workarea-tabs" role="tablist" aria-label="Investigation tools">
                {(['sql', 'python', 'notes', 'final'] as WorkspaceLanguage[]).map((language) => (
                  <button key={language} className={workspaceLanguage === language ? 'active' : ''} role="tab"
                    aria-selected={workspaceLanguage === language} onClick={() => selectLanguage(language)}>
                    {language === 'sql' ? 'SQL WORKSHEET' : language === 'python' ? 'PYTHON WORKSHEET' : language === 'notes' ? 'SCRATCH NOTES' : 'FINAL BRIEF'}
                  </button>
                ))}
                <span className="ml-auto hidden sm:block">SESSION {definition.sessionLabel}</span>
              </div>
              <div className="editor-toolbar">
                <div className="worksheet-name"><TerminalSquare />
                  {workspaceLanguage === 'sql' ? 'query_01.sql' : workspaceLanguage === 'python' ? 'analysis_01.py' : workspaceLanguage === 'final' ? 'final_brief.md' : 'scratch_notes.md'}
                  <span>{workspaceLanguage === 'sql' ? query === starter.sql ? 'STARTER' : 'EDITED' : workspaceLanguage === 'python' ? pythonCode === starter.python ? 'STARTER' : 'EDITED' : 'LOCAL DRAFT'}</span>
                </div>
                {(workspaceLanguage === 'sql' || workspaceLanguage === 'python') && <button className="restore-starter" onClick={() => restoreStarter(workspaceLanguage)} title="Restore starter worksheet"><RotateCcw /> RESTORE</button>}
                <div className="engine-state"><span className={activeError ? 'is-error' : ''} />{engineLabel}</div>
                {(workspaceLanguage === 'sql' || workspaceLanguage === 'python') && <Button size="sm" className="run-control"
                  disabled={workspaceLanguage === 'sql' ? status === 'booting' || status === 'running' || status === 'error' : python.status === 'booting' || python.status === 'loading_data' || python.status === 'error'}
                  onClick={() => { if (workspaceLanguage === 'python' && python.status === 'running') python.stop(); else void (workspaceLanguage === 'sql' ? runQuery() : runPython()); }}>
                  <Play data-icon="inline-start" />{workspaceLanguage === 'python' && python.status === 'running' ? 'STOP' : workspaceLanguage === 'sql' && status === 'running' ? 'RUNNING' : 'EXECUTE'}
                </Button>}
              </div>
              {workspaceLanguage === 'notes' || workspaceLanguage === 'final' ? <textarea
                className={`notes-editor ${workspaceLanguage === 'final' ? 'final-brief-editor' : ''}`}
                value={workspaceLanguage === 'final' ? finalBrief : notes}
                onChange={(event) => workspaceLanguage === 'final' ? updateFinalBrief(event.target.value) : setNotes(event.target.value)}
                placeholder={workspaceLanguage === 'final' ? `Recommendation or decision:\n\nEvidence that matters:\n\nUncertainty and limitations:\n\nRisks, owners, and next action:` : 'Record assumptions, definitions, open questions, and the reasoning you will need to defend.'}
                spellCheck="true" aria-label={workspaceLanguage === 'final' ? 'Final brief' : 'Scratch notes'}
              /> : <Editor height="300px" language={workspaceLanguage} theme="meridian-sql"
                value={workspaceLanguage === 'sql' ? query : pythonCode} beforeMount={beforeMount}
                onChange={(value) => workspaceLanguage === 'sql' ? setQuery(value ?? '') : setPythonCode(value ?? '')}
                options={{ accessibilitySupport: 'auto', minimap: { enabled: false }, fontFamily: 'var(--font-geist-mono), monospace', fontSize: 14, lineHeight: 23, lineNumbersMinChars: 3, padding: { top: 12, bottom: 12 }, renderLineHighlight: 'line', scrollBeyondLastLine: false, wordWrap: 'off' }} />}

              {activeError && <div role="alert" className="query-alert">{activeError}</div>}
              {(workspaceLanguage === 'sql' || workspaceLanguage === 'python') && <div className="result-pane">
                <div className="result-toolbar">
                  <span>{workspaceLanguage === 'sql' ? `RESULT SET / ${String(sqlRunCount).padStart(2, '0')}` : `PYTHON OUTPUT / ${String(pythonRunCount).padStart(2, '0')}`}</span>
                  <span>{workspaceLanguage === 'sql' ? sqlRunCount ? `SHOWING ${rows.length} OF ${sqlTotalRows} ROWS` : 'NOT YET EXECUTED' : pythonResult ? `${pythonResult.stdout.length} LINES / ${pythonResult.figures.length} FIGURES` : python.detail.toUpperCase()}</span>
                  <span>{workspaceLanguage === 'sql' ? sqlRunCount ? elapsedMs : 0 : pythonResult?.elapsedMs ?? 0} MS</span>
                  <span className={`result-status ${currentRunIsStale ? 'is-stale' : ''}`}><CircleCheck />{currentRunIsStale ? 'OUTPUT PRECEDES EDIT' : currentRun ? 'CAPTURED' : 'WAITING'}</span>
                </div>
                <div className="result-scroll">
                  {workspaceLanguage === 'sql' ? columns.length ? <Table className="results-grid">
                    <TableHeader><TableRow><TableHead className="row-index-head">#</TableHead>{columns.map((heading) => <TableHead key={heading}>{heading}</TableHead>)}</TableRow></TableHeader>
                    <TableBody>{rows.map((row, rowIndex) => <TableRow key={rowIndex}><TableCell className="row-index">{String(rowIndex + 1).padStart(2, '0')}</TableCell>
                      {columns.map((column, index) => <TableCell key={column} className={index === 0 ? 'key-cell' : ''}>{row[column] == null ? <span className="null-cell">NULL</span> : String(row[column])}</TableCell>)}</TableRow>)}</TableBody>
                  </Table> : <p className="python-empty">Execute a query to produce the first result. A result is not evidence until you record the claim it supports.</p> : <div className="python-output">
                    {!pythonResult && <p className="python-empty">{python.status === 'ready' ? 'Runtime ready. Execute the worksheet to produce output.' : python.detail}</p>}
                    {pythonResult?.stdout.map((line, index) => <pre key={`stdout-${index}`}>{line}</pre>)}
                    {pythonResult?.stderr.map((line, index) => <pre className="stderr" key={`stderr-${index}`}>{line}</pre>)}
                    {pythonResult?.display && <pre className="python-display">{pythonResult.display}</pre>}
                    {pythonResult?.figures.length ? <section className="python-figures" aria-label="Python figures">
                      <div className="python-figures-head">FIGURES / {String(pythonResult.figures.length).padStart(2, '0')}</div>
                      {pythonResult.figures.map((figure, index) => <figure key={`figure-${index}`}><Image src={figure} alt={`Python output figure ${index + 1}`} width={1000} height={600} unoptimized /><figcaption>FIGURE {String(index + 1).padStart(2, '0')} / GENERATED IN THIS BROWSER</figcaption></figure>)}
                    </section> : null}
                  </div>}
                </div>
                <div className="result-actions">
                  <div className="run-provenance">{currentRun ? <><span>RUN {String(currentRun.runNumber).padStart(2, '0')}</span><code>{currentRun.codeSha256.slice(0, 12)}</code><span>{currentRunIsStale ? 'worksheet edited afterward' : 'matches worksheet'}</span></> : <span>No captured run</span>}</div>
                  <button disabled={!currentRun} onClick={() => currentRun && openEvidenceComposer(currentRun.id)}><Link2 /> PIN RUN TO EVIDENCE</button>
                  {workspaceLanguage === 'sql' && <div className="publish-control">
                    <label htmlFor="publish-table-name">SHARE WITH PYTHON</label><input id="publish-table-name" value={publishName} onChange={(event) => setPublishName(event.target.value)} />
                    <button disabled={!latestSqlRun || status !== 'ready'} onClick={() => void publishToPython()}>PUBLISH TABLE</button>
                  </div>}
                </div>
                {publishStatus && <output className="publish-status">{publishStatus}</output>}
                {publishedTables.length > 0 && <p className="published-register">SESSION TABLES: {publishedTables.map((item) => `${item.table} (${formatRowCount(item.rowCount)})`).join(' · ')}. Republish after reopening the browser.</p>}
              </div>}
            </div>}

            {activeWorkflowStep === 'data-register' && <section className="workflow-stage-panel workflow-data-stage" aria-labelledby="data-register-title">
              <div className="workflow-panel-intro"><span>REGISTERED SOURCES / {String(definition.dataFiles.length).padStart(2, '0')}</span><h2 id="data-register-title">Know what is mounted before you query it.</h2>
                <p>These tables are available to SQL and Python. A trust label describes source condition—not whether an interpretation is correct.</p><SiteLink path="/data">OPEN FULL DATA DICTIONARY <ArrowRight /></SiteLink></div>
              <div className="workflow-source-scroll"><table className="workflow-source-table"><caption className="sr-only">Assignment source register</caption><thead><tr className="workflow-source-head"><th>TABLE</th><th>ROWS</th><th>STATE</th><th>REGISTER NOTE</th></tr></thead>
                <tbody>{definition.dataFiles.map((source) => <tr className="workflow-source-row" key={source.table}><th scope="row">{source.table}</th><td>{formatRowCount(source.rows)}</td><td className={source.trust === 'VERIFIED' ? 'verified' : 'review'}>{source.trust}</td><td>{source.note}</td></tr>)}</tbody>
              </table></div>
            </section>}

            {activeWorkflowStep === 'evidence' && <section className="workflow-stage-panel workflow-evidence-stage" aria-labelledby="evidence-register-title">
              <div className="workflow-panel-intro"><span>EVIDENCE REGISTER / {String(evidenceCount).padStart(2, '0')} ITEMS</span><h2 id="evidence-register-title">Keep only claims you can trace.</h2><p>A linked record preserves the exact run ID and source hash. Unlinked notes remain visibly unverified working claims.</p></div>
              <ol className="workflow-evidence-list">{evidence.map((record) => <li key={record.id}><span>{record.id}</span><div><p>{record.statement}</p><small>{record.source} / {caseTimeFormatter.format(new Date(record.recordedAt))} / {record.runId ? `RUN ${record.runId.slice(0, 8)}` : 'NO LINKED RUN'}</small></div><button aria-label={`Remove evidence ${record.id}`} onClick={() => removeEvidence(record.id)}><X /></button></li>)}</ol>
              <button className="workflow-primary-action" type="button" onClick={() => openEvidenceComposer(null)}><BookOpen /> APPEND EVIDENCE IN ASSIGNMENT RECORD</button>
            </section>}

            {activeWorkflowStep === 'handoff' && <section className="workflow-stage-panel workflow-handoff-stage" aria-labelledby="handoff-title">
              <div className="workflow-panel-intro"><span>REQUIRED HANDOFF / {presentArtifactCount} OF {definition.requiredArtifacts.length} FILES PRESENT</span><h2 id="handoff-title">Leave work another person can identify, open, and assess.</h2><p>Artifact presence is checked mechanically. Analytical quality, judgment, and communication remain human-review decisions.</p></div>
              <section className="handoff-identity" aria-labelledby="identity-title"><div><span>SUBMISSION IDENTITY</span><h3 id="identity-title">Who is turning this in?</h3></div><div className="identity-grid">
                <label>NAME<input value={identity.name} onChange={(event) => updateIdentity('name', event.target.value)} /></label><label>LEARNER ID<input value={identity.identifier} onChange={(event) => updateIdentity('identifier', event.target.value)} /></label>
                <label>COURSE<input value={identity.course} onChange={(event) => updateIdentity('course', event.target.value)} /></label><label>SECTION<input value={identity.section} onChange={(event) => updateIdentity('section', event.target.value)} /></label>
                <label>TEAM<input value={identity.team} onChange={(event) => updateIdentity('team', event.target.value)} /></label><label>ATTEMPT<input value={identity.attempt} onChange={(event) => updateIdentity('attempt', event.target.value)} inputMode="numeric" /></label>
              </div></section>
              <div className="handoff-brief"><label htmlFor="handoff-final-brief">FINAL POLISHED CONCLUSION</label><textarea id="handoff-final-brief" value={finalBrief} onChange={(event) => updateFinalBrief(event.target.value)} placeholder={`Recommendation or decision:\n\nEvidence that matters:\n\nUncertainty and limitations:\n\nRisks, owners, and next action:`} spellCheck="true" /></div>
              <section className="required-artifact-register" aria-labelledby="artifact-title"><div><span>REQUIRED ARTIFACT FILES</span><h3 id="artifact-title">Bind the actual handoff.</h3><p>A named requirement is present only when a non-empty file is explicitly attached or authored here.</p></div>
                {definition.requiredArtifacts.map((label, index) => { const artifact = artifactFor(label); const present = Boolean(artifact?.content.length); return <article className={present ? 'is-present' : ''} key={label}>
                  <div className="artifact-heading"><span>{String(index + 1).padStart(2, '0')}</span><div><h4>{label}</h4><p>{present ? artifact?.path : 'No file bound'}</p></div><strong>{present ? 'PRESENT' : 'MISSING'}</strong></div>
                  <div className="artifact-actions"><button onClick={() => bindWorksheet(label, index, 'sql')}>USE SQL</button><button onClick={() => bindWorksheet(label, index, 'python')}>USE PYTHON</button><button onClick={() => bindWorksheet(label, index, 'final')}>USE BRIEF</button><button onClick={() => createTextArtifact(label, index)}><FilePlus2 /> WRITE / PASTE</button>
                    <label><Upload /> ATTACH FILE<input type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void attachArtifact(label, index, file); event.currentTarget.value = ''; }} /></label>{artifact && <button className="artifact-clear" onClick={() => clearArtifact(label)}>CLEAR</button>}</div>
                  {artifactEditorLabel === label && <textarea className="artifact-editor" aria-label={`Artifact content for ${label}`} value={artifact?.content ?? ''} onChange={(event) => upsertArtifact({ ...(artifact ?? { path: `artifacts/${String(index + 1).padStart(2, '0')}-${artifactSlug(label)}.md`, language: 'markdown', encoding: 'utf-8', mimeType: 'text/markdown', source: 'authored-artifact', requiredArtifactLabel: label }), content: event.target.value })} placeholder="Write or paste the artifact content here." />}
                </article>; })}
              </section>
              <div className="submission-actions"><button className="download-case" onClick={() => void exportCase('case')} disabled={isExporting}><Download /><span>{isExporting ? 'PACKAGING' : 'DOWNLOAD RESTORABLE SUBMISSION'}</span><small>.ANALYSTCASE</small></button><button className="download-case secondary" onClick={() => void exportCase('portfolio')} disabled={isExporting}><Download /><span>DOWNLOAD PORTFOLIO COPY</span><small>.ZIP</small></button></div>
            </section>}
          </div>

          <footer className="trace-footer"><span><ShieldCheck /> COMPUTE: THIS BROWSER</span><span>CATALOG: {definition.catalogSnapshot}</span><span>SAVE: {saveState.toUpperCase()}</span><span>SCAFFOLD: {mode.toUpperCase()}</span><span className="ml-auto">NO ACCOUNT / LOCAL DRAFT</span><SiteLink path="/privacy">PRIVACY</SiteLink><SiteLink path="/teach" rel="nofollow">INSTRUCTOR AREA</SiteLink></footer>
        </section>

        <aside className={`case-ledger ${ledgerOpen ? 'is-open' : ''}`} aria-label="Assignment record" aria-hidden={ledgerIsOverlay && !ledgerOpen} inert={ledgerIsOverlay && !ledgerOpen}>
          <button className="ledger-close" onClick={closeLedger} aria-label="Close assignment record"><X /></button>
          <div className="ledger-head"><p>ASSIGNMENT RECORD / {definition.id}</p><div className="sla-block"><span><Clock3 /> SIMULATED RESPONSE WINDOW</span><strong>{definition.responseWindow}</strong><small>SCENARIO DURATION / NOT A LIVE TIMER</small></div></div>
          <section className="ledger-section"><div className="ledger-section-head"><span>SOURCE REGISTER</span><SiteLink path="/data">OPEN CATALOG</SiteLink></div><div className="source-register"><div className="source-register-head"><span>TABLE</span><span>ROWS</span><span>STATE</span></div>{definition.dataFiles.map((source) => <div className="source-register-row" key={source.table} title={source.note}><span>{source.table}</span><span>{formatRowCount(source.rows)}</span><strong className={source.trust === 'VERIFIED' ? 'verified' : 'review'}>{source.trust}</strong></div>)}</div></section>
          <section className="ledger-section evidence-section"><div className="ledger-section-head"><span>EVIDENCE REGISTER</span><b>{String(evidenceCount).padStart(2, '0')} ITEMS</b></div><ol>{evidence.map((record) => <li key={record.id}><span className="evidence-id">{record.id}</span><p>{record.statement}</p><small>{record.source} / {record.runId ? `LINKED ${record.codeSha256?.slice(0, 10)}` : 'UNLINKED'}</small><button aria-label={`Remove evidence ${record.id}`} onClick={() => removeEvidence(record.id)}><X /></button></li>)}</ol>
            {evidenceComposerOpen ? <div className="evidence-composer">{evidenceRunId && <p>Linked to captured run {evidenceRunId.slice(0, 8)}. The source hash will travel with this record.</p>}<textarea value={evidenceDraft} onChange={(event) => setEvidenceDraft(event.target.value)} placeholder="State one finding this run supports. Include the population and limitation when they matter." /><div><button onClick={() => { setEvidenceComposerOpen(false); setEvidenceRunId(null); }}>CANCEL</button><button onClick={addEvidence} disabled={!evidenceDraft.trim()}>RECORD</button></div></div> : <button className="add-evidence" onClick={() => openEvidenceComposer(null)}><span>+</span> APPEND EVIDENCE RECORD</button>}
          </section>
          <section className="ledger-section handoff-section"><div className="ledger-section-head"><span>REQUIRED HANDOFF</span><b>{presentArtifactCount} / {definition.requiredArtifacts.length}</b></div><ul>{definition.requiredArtifacts.map((label) => { const present = Boolean(artifactFor(label)?.content.length); return <li className={present ? 'is-present' : ''} key={label}><span /> {label}<small>{present ? 'PRESENT' : 'MISSING'}</small></li>; })}</ul><p>Only file presence is checked here. Meaning and quality require human review.</p>
            <button className="download-case" onClick={() => void exportCase('case')} disabled={isExporting}><Download /><span>{isExporting ? 'PACKAGING' : 'DOWNLOAD SUBMISSION'}</span><small>.ANALYSTCASE</small></button><button className="download-case secondary" onClick={() => void exportCase('portfolio')} disabled={isExporting}><Download /><span>PORTFOLIO COPY</span><small>.ZIP</small></button>
            <div className="workspace-utilities"><input ref={importInputRef} type="file" accept=".analystcase,application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importSubmission(file); }} /><button onClick={() => importInputRef.current?.click()}><Upload /> RESTORE SUBMISSION</button><button onClick={() => void clearAssignment()}><RotateCcw /> CLEAR LOCAL ASSIGNMENT</button></div>
            <p className="download-case-note">The restorable file includes identity, scaffold mode, worksheets, explicit artifacts, evidence, exact run snapshots, outputs, and hashes. No analytical answer is auto-certified.</p>
          </section>
        </aside>
        {ledgerOpen && ledgerIsOverlay && <button className="ledger-scrim" onClick={closeLedger} aria-label="Close assignment record overlay" />}
        {aiContextOpen && <AiContextDialog
          onClose={() => { setAiContextOpen(false); window.requestAnimationFrame(() => aiContextTriggerRef.current?.focus()); }}
          definition={definition}
          scaffoldMode={mode}
          workflowStep={activeWorkflowStep}
          workspaceLanguage={workspaceLanguage}
          revealedMessages={revealedWorkdayEvents.map(({ id, from, subject, body }) => ({ id, from, subject, body }))}
          sql={query}
          python={pythonCode}
          notes={notes}
          finalBrief={finalBrief}
          activeError={activeError}
          evidence={evidence}
          sqlResult={lastSqlResult ? { columns, rows, totalRows: sqlTotalRows } : null}
          pythonResult={pythonResult}
        />}
      </div>
    </main>
  );
}
