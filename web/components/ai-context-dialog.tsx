'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, FileText, X } from 'lucide-react';

import type { PythonRunResult } from '@/hooks/use-python';
import {
  buildAiContextMarkdown,
  downloadAiContext,
  type AiContextMaterials,
  type AiRevealedMessage,
} from '@/lib/ai-context';
import { loadAiContextReference } from '@/lib/ai-context-reference';
import type { EvidenceRecord, ScaffoldMode } from '@/lib/analyst-case';
import type { CaseDefinition } from '@/lib/case-definition';
import type { QueryRow } from '@/hooks/use-duckdb';

type WorkspaceLanguage = 'sql' | 'python' | 'notes' | 'final';

type AiContextDialogProps = {
  onClose: () => void;
  definition: CaseDefinition;
  scaffoldMode: ScaffoldMode;
  workflowStep: string;
  workspaceLanguage: WorkspaceLanguage;
  revealedMessages: AiRevealedMessage[];
  sql: string;
  python: string;
  notes: string;
  finalBrief: string;
  activeError: string | null;
  evidence: EvidenceRecord[];
  sqlResult: { columns: string[]; rows: QueryRow[]; totalRows: number } | null;
  pythonResult: PythonRunResult | null;
};

const QUESTION_STARTERS = [
  ['CLARIFY THE TASK', 'Help me clarify the decision, population, metric, grain, and time cutoff I should make explicit.'],
  ['EXPLAIN AN ERROR', 'Explain the included error in plain language and suggest the smallest next step I should test.'],
  ['CHALLENGE A CLAIM', 'Challenge my current claim. Identify one assumption or rival explanation I should test.'],
  ['SUGGEST A CHECK', 'Suggest one focused diagnostic that would make this analysis more defensible.'],
] as const;

export function AiContextDialog({
  onClose,
  definition,
  scaffoldMode,
  workflowStep,
  workspaceLanguage,
  revealedMessages,
  sql,
  python,
  notes,
  finalBrief,
  activeError,
  evidence,
  sqlResult,
  pythonResult,
}: AiContextDialogProps) {
  const [question, setQuestion] = useState('');
  const [includeSql, setIncludeSql] = useState(workspaceLanguage === 'sql');
  const [includePython, setIncludePython] = useState(workspaceLanguage === 'python');
  const [includeNotes, setIncludeNotes] = useState(false);
  const [includeFinal, setIncludeFinal] = useState(false);
  const [includeError, setIncludeError] = useState(Boolean(activeError));
  const [includeEvidence, setIncludeEvidence] = useState(false);
  const [includeSqlPreview, setIncludeSqlPreview] = useState(false);
  const [includePythonOutput, setIncludePythonOutput] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    window.requestAnimationFrame(() => closeRef.current?.focus());
  }, []);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !exporting) onClose();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [exporting, onClose]);

  async function createPacket() {
    const learnerQuestion = question.trim();
    if (!learnerQuestion) return;
    setExporting(true);
    setError(null);
    try {
      const reference = await loadAiContextReference(
        definition.dataFiles.map((file) => file.table),
        definition.slug,
      );
      const materials: AiContextMaterials = {};
      if (includeSql) materials.sql = sql;
      if (includePython) materials.python = python;
      if (includeNotes) materials.notes = notes;
      if (includeFinal) materials.finalBrief = finalBrief;
      if (includeError && activeError) {
        materials.currentError = { language: workspaceLanguage, message: activeError };
      }
      if (includeEvidence) materials.evidence = evidence;
      if (includeSqlPreview && sqlResult) materials.sqlPreview = sqlResult;
      if (includePythonOutput && pythonResult) {
        materials.pythonOutput = {
          stdout: pythonResult.stdout,
          stderr: pythonResult.stderr,
          display: pythonResult.display,
          figureCount: pythonResult.figures.length,
        };
      }
      const generatedAt = new Date().toISOString();
      const markdown = buildAiContextMarkdown({
        generatedAt,
        question: learnerQuestion,
        definition,
        scaffoldMode,
        workflowStep,
        reference,
        revealedMessages,
        materials,
      });
      downloadAiContext(markdown, definition.id, generatedAt);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The AI context file could not be prepared.');
    } finally {
      setExporting(false);
    }
  }

  return <>
    <button className="ai-context-scrim" onClick={onClose} aria-label="Close AI context builder" />
    <dialog open className="ai-context-dialog" aria-modal="true" aria-labelledby="ai-context-title" aria-describedby="ai-context-description">
      <header>
        <div><span>OPTIONAL AI CONSULTATION</span><h2 id="ai-context-title">Prepare context for an external AI tool</h2></div>
        <button ref={closeRef} onClick={onClose} aria-label="Close AI context builder"><X /></button>
      </header>

      <div className="ai-context-body">
        <p id="ai-context-description" className="ai-context-intro">
          Build a reviewable Markdown brief, then attach it to an AI tool permitted by your course or institution. The Analyst creates the file on this device and does not send anything.
        </p>

        <section className="ai-context-question" aria-labelledby="ai-question-title">
          <div className="ai-context-section-label"><span id="ai-question-title">01 / FOCUS THE REQUEST</span><b>REQUIRED</b></div>
          <div className="ai-context-starters">
            {QUESTION_STARTERS.map(([label, value]) => <button key={label} onClick={() => setQuestion(value)}>{label}</button>)}
          </div>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)}
            placeholder="What specific SQL, Python, statistical, or analytical question should the AI help you investigate?"
            aria-label="Question for an external AI tool" />
        </section>

        <section className="ai-context-selection" aria-labelledby="ai-selection-title">
          <div className="ai-context-section-label"><span id="ai-selection-title">02 / SELECT LEARNER MATERIAL</span><b>REVIEW BEFORE SHARING</b></div>
          <p>The assignment brief, cutoff, mounted data dictionary, relationships, runtime rules, and revealed messages are always included.</p>
          <div className="ai-context-checks">
            <label><input type="checkbox" checked={includeSql} onChange={(event) => setIncludeSql(event.target.checked)} /> Current SQL worksheet</label>
            <label><input type="checkbox" checked={includePython} onChange={(event) => setIncludePython(event.target.checked)} /> Current Python worksheet</label>
            <label><input type="checkbox" checked={includeNotes} onChange={(event) => setIncludeNotes(event.target.checked)} /> Scratch notes</label>
            <label><input type="checkbox" checked={includeFinal} onChange={(event) => setIncludeFinal(event.target.checked)} /> Final brief draft</label>
            {activeError && <label><input type="checkbox" checked={includeError} onChange={(event) => setIncludeError(event.target.checked)} /> Current error</label>}
            <label><input type="checkbox" checked={includeEvidence} onChange={(event) => setIncludeEvidence(event.target.checked)} /> Evidence register</label>
            {sqlResult && <label className="data-preview-option"><input type="checkbox" checked={includeSqlPreview} onChange={(event) => setIncludeSqlPreview(event.target.checked)} /> First 25 displayed SQL rows <small>EXPLICIT DATA SAMPLE</small></label>}
            {pythonResult && <label><input type="checkbox" checked={includePythonOutput} onChange={(event) => setIncludePythonOutput(event.target.checked)} /> Latest Python text output <small>NO FIGURES</small></label>}
          </div>
        </section>

        <aside className="ai-context-boundary" role="note">
          <FileText aria-hidden="true" />
          <p><strong>WHAT STAYS OUT</strong> Learner identity, raw Parquet files, uploaded artifacts, binary figures, unrevealed messages, instructor material, and full run history.</p>
        </aside>

        {error && <p className="ai-context-error" role="alert">{error}</p>}
      </div>

      <footer>
        <p>Review the file before uploading. AI responses may be wrong; verify advice by running and inspecting the work yourself.</p>
        <button onClick={() => void createPacket()} disabled={!question.trim() || exporting}>
          <Download /> {exporting ? 'BUILDING PACKET' : 'DOWNLOAD AI HELP PACKET'} <small>.MD</small>
        </button>
      </footer>
    </dialog>
  </>;
}
