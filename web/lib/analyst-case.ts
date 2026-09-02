import { strToU8, zipSync } from 'fflate';

import type { QueryRow } from '@/hooks/use-duckdb';
import type { PythonRunResult } from '@/hooks/use-python';
import type { CaseDefinition } from '@/lib/case-definition';

export const ANALYST_CASE_FORMAT = 'theanalyst.case';
export const ANALYST_CASE_VERSION = '2.0.0';

export type ScaffoldMode = 'supported' | 'guided' | 'independent';

export type LearnerIdentity = {
  name: string;
  identifier: string;
  course: string;
  section: string;
  team: string;
  attempt: string;
};

export type EvidenceRecord = {
  id: string;
  statement: string;
  source: string;
  state: 'review' | 'verified';
  recordedAt: string;
  runId?: string;
  codeSha256?: string;
  outputSummary?: string;
};

export type WorkspaceLanguage = 'sql' | 'python' | 'markdown' | 'csv' | 'json' | 'image' | 'binary';

export type WorkspaceFileDraft = {
  path: string;
  language: WorkspaceLanguage;
  content: string;
  encoding?: 'utf-8' | 'data-url';
  mimeType?: string;
  source?: 'worksheet' | 'authored-artifact' | 'uploaded-artifact' | 'generated-artifact';
  requiredArtifactLabel?: string;
};

export type WorkspaceFile = WorkspaceFileDraft & {
  encoding: 'utf-8' | 'data-url';
  mimeType: string;
  sha256: string;
  sizeBytes: number;
};

export type RunSnapshot = {
  id: string;
  language: 'sql' | 'python';
  runNumber: number;
  capturedAt: string;
  elapsedMs: number;
  codePath: string;
  code: string;
  codeSha256: string;
  output: {
    columns?: string[];
    displayedRows?: QueryRow[];
    totalRows?: number;
    displayLimit?: number;
    stdout?: string[];
    stderr?: string[];
    display?: string;
    figures?: string[];
  };
};

export type PublishedTableRecord = {
  table: string;
  rowCount: number;
  createdAt: string;
  sourceCodeSha256: string;
};

export type AnalystCaseFile = {
  format: typeof ANALYST_CASE_FORMAT;
  version: typeof ANALYST_CASE_VERSION;
  exportedAt: string;
  readme: string;
  identity: LearnerIdentity;
  scaffold: {
    mode: ScaffoldMode;
    helpEventsUsed: string[];
  };
  scenario: {
    id: string;
    slug: string;
    title: string;
    revision: string;
    catalogSnapshot: string;
  };
  learnerWorkspace: {
    files: WorkspaceFile[];
    evidence: EvidenceRecord[];
    publishedTables: PublishedTableRecord[];
  };
  capturedRuns: {
    history: RunSnapshot[];
    sql: null | {
      runCount: number;
      capturedAt: string;
      elapsedMs: number;
      columns: string[];
      displayedRows: QueryRow[];
      totalRows: number;
      displayLimit: number;
      codeSha256: string;
      codeMatchesExportedWorkspace: boolean;
    };
    python: null | (PythonRunResult & {
      runCount: number;
      capturedAt: string;
      codeSha256: string;
      codeMatchesExportedWorkspace: boolean;
    });
  };
  handoff: {
    requiredArtifacts: Array<{ label: string; present: boolean; workspacePath?: string }>;
  };
  runtime: {
    sql: string;
    python: string;
    execution: 'learner-browser';
    dataLeavesDevice: false;
  };
  verification: {
    boundary: string;
    records: Array<{
      check: string;
      result: 'recorded' | 'not-recorded' | 'attention';
      detail: string;
    }>;
  };
};

export type BuildCaseInput = {
  sql: string;
  python: string;
  notes: string;
  finalBrief: string;
  evidence: EvidenceRecord[];
  identity?: Partial<LearnerIdentity>;
  scaffoldMode?: ScaffoldMode;
  helpEventsUsed?: string[];
  artifacts?: WorkspaceFileDraft[];
  runHistory?: RunSnapshot[];
  publishedTables?: PublishedTableRecord[];
  sqlRunCount: number;
  pythonRunCount: number;
  sqlCapturedAt: string | null;
  pythonCapturedAt: string | null;
  sqlResult: { columns: string[]; rows: QueryRow[]; totalRows?: number; elapsedMs: number } | null;
  pythonResult: PythonRunResult | null;
};

const emptyIdentity: LearnerIdentity = {
  name: '', identifier: '', course: '', section: '', team: '', attempt: '1',
};

function dataUrlBytes(value: string) {
  const comma = value.indexOf(',');
  if (comma < 0) return new TextEncoder().encode(value);
  const metadata = value.slice(0, comma);
  const payload = value.slice(comma + 1);
  if (!metadata.includes(';base64')) return new TextEncoder().encode(decodeURIComponent(payload));
  const decoded = atob(payload);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function contentBytes(file: Pick<WorkspaceFileDraft, 'content' | 'encoding'>) {
  return file.encoding === 'data-url' ? dataUrlBytes(file.content) : new TextEncoder().encode(file.content);
}

export async function sha256Bytes(bytes: Uint8Array) {
  const stableBuffer = new Uint8Array(bytes).buffer;
  const digest = await crypto.subtle.digest('SHA-256', stableBuffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256(content: string) {
  return sha256Bytes(new TextEncoder().encode(content));
}

function mimeFor(language: WorkspaceLanguage) {
  if (language === 'sql') return 'application/sql';
  if (language === 'python') return 'text/x-python';
  if (language === 'markdown') return 'text/markdown';
  if (language === 'csv') return 'text/csv';
  if (language === 'json') return 'application/json';
  if (language === 'image') return 'image/png';
  return 'application/octet-stream';
}

async function finalizeFile(file: WorkspaceFileDraft): Promise<WorkspaceFile> {
  const encoding = file.encoding ?? 'utf-8';
  const bytes = contentBytes({ ...file, encoding });
  return {
    ...file,
    encoding,
    mimeType: file.mimeType ?? mimeFor(file.language),
    sha256: await sha256Bytes(bytes),
    sizeBytes: bytes.byteLength,
  };
}

function latestRun(history: RunSnapshot[], language: 'sql' | 'python') {
  return [...history].reverse().find((run) => run.language === language) ?? null;
}

export async function buildAnalystCase(definition: CaseDefinition, input: BuildCaseInput): Promise<AnalystCaseFile> {
  const exportedAt = new Date().toISOString();
  const drafts: WorkspaceFileDraft[] = [
    { path: 'workspace/query_01.sql', language: 'sql', content: input.sql, source: 'worksheet' },
    { path: 'workspace/analysis_01.py', language: 'python', content: input.python, source: 'worksheet' },
    { path: 'workspace/scratch_notes.md', language: 'markdown', content: input.notes, source: 'worksheet' },
    { path: 'workspace/final_brief.md', language: 'markdown', content: input.finalBrief, source: 'worksheet' },
    ...(input.artifacts ?? []),
  ];
  const files = await Promise.all(drafts.map(finalizeFile));
  const runHistory = input.runHistory ?? [];
  const latestSql = latestRun(runHistory, 'sql');
  const latestPython = latestRun(runHistory, 'python');
  const sqlFile = files.find((file) => file.path === 'workspace/query_01.sql');
  const pythonFile = files.find((file) => file.path === 'workspace/analysis_01.py');
  const identity = { ...emptyIdentity, ...input.identity };
  const requiredArtifacts = definition.requiredArtifacts.map((label) => {
    const file = files.find((candidate) => candidate.requiredArtifactLabel === label && candidate.sizeBytes > 0);
    return { label, present: Boolean(file), ...(file ? { workspacePath: file.path } : {}) };
  });
  const staleRunCount = runHistory.filter((run) => {
    const workspaceFile = run.language === 'sql' ? sqlFile : pythonFile;
    return workspaceFile?.sha256 !== run.codeSha256;
  }).length;

  return {
    format: ANALYST_CASE_FORMAT,
    version: ANALYST_CASE_VERSION,
    exportedAt,
    readme: [
      'Portable submission from The Analyst.',
      'Artifact presence means only that an explicitly bound, non-empty file was included.',
      'Captured runs retain the exact executed code hash; stale outputs are reported rather than hidden.',
      'No automated record certifies analytical quality, meaning, or correctness.',
      'Open this file from the Instructor Planning Desk submission viewer.',
    ].join('\n'),
    identity,
    scaffold: { mode: input.scaffoldMode ?? 'supported', helpEventsUsed: input.helpEventsUsed ?? [] },
    scenario: {
      id: definition.id,
      slug: definition.slug,
      title: definition.title,
      revision: definition.revision,
      catalogSnapshot: definition.catalogSnapshot,
    },
    learnerWorkspace: {
      files,
      evidence: input.evidence,
      publishedTables: input.publishedTables ?? [],
    },
    capturedRuns: {
      history: runHistory,
      sql: latestSql ? {
        runCount: input.sqlRunCount,
        capturedAt: latestSql.capturedAt,
        elapsedMs: latestSql.elapsedMs,
        columns: latestSql.output.columns ?? [],
        displayedRows: latestSql.output.displayedRows ?? [],
        totalRows: latestSql.output.totalRows ?? latestSql.output.displayedRows?.length ?? 0,
        displayLimit: 1000,
        codeSha256: latestSql.codeSha256,
        codeMatchesExportedWorkspace: latestSql.codeSha256 === sqlFile?.sha256,
      } : null,
      python: latestPython ? {
        stdout: latestPython.output.stdout ?? [],
        stderr: latestPython.output.stderr ?? [],
        display: latestPython.output.display ?? '',
        figures: latestPython.output.figures ?? [],
        elapsedMs: latestPython.elapsedMs,
        runCount: input.pythonRunCount,
        capturedAt: latestPython.capturedAt,
        codeSha256: latestPython.codeSha256,
        codeMatchesExportedWorkspace: latestPython.codeSha256 === pythonFile?.sha256,
      } : null,
    },
    handoff: { requiredArtifacts },
    runtime: {
      sql: 'DuckDB-Wasm',
      python: 'Pyodide 314.0.6',
      execution: 'learner-browser',
      dataLeavesDevice: false,
    },
    verification: {
      boundary: 'Mechanical records only: explicit file presence, hashes, and captured execution. Analytical quality and judgment require human review.',
      records: [
        {
          check: 'SQL execution captured',
          result: latestSql ? 'recorded' : 'not-recorded',
          detail: latestSql ? `${input.sqlRunCount} successful run(s); latest executed source hash retained` : 'No successful SQL run captured',
        },
        {
          check: 'Python execution captured',
          result: latestPython ? 'recorded' : 'not-recorded',
          detail: latestPython ? `${input.pythonRunCount} successful run(s); latest executed source hash retained` : 'No successful Python run captured',
        },
        {
          check: 'Executed code matches exported worksheet',
          result: staleRunCount === 0 ? 'recorded' : 'attention',
          detail: staleRunCount === 0 ? 'Every captured run matches its exported worksheet hash' : `${staleRunCount} captured run(s) precede later worksheet edits`,
        },
        {
          check: 'Required artifact files present',
          result: requiredArtifacts.every((artifact) => artifact.present) ? 'recorded' : 'not-recorded',
          detail: `${requiredArtifacts.filter((artifact) => artifact.present).length} of ${requiredArtifacts.length} explicitly bound artifact file(s) present`,
        },
        {
          check: 'Workspace files hashed',
          result: 'recorded',
          detail: `${files.length} learner workspace file(s) include SHA-256 content hashes`,
        },
      ],
    },
  };
}

export async function buildMondayCase(input: BuildCaseInput): Promise<AnalystCaseFile> {
  const { mondayScorecard } = await import('@/lib/case-definitions/monday-scorecard');
  return buildAnalystCase(mondayScorecard, input);
}

function safeSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48);
}

function submissionStem(caseFile: AnalystCaseFile) {
  const identity = safeSlug(caseFile.identity.identifier || caseFile.identity.name || caseFile.identity.team);
  const date = caseFile.exportedAt.slice(0, 10);
  return `the-analyst-${caseFile.scenario.id.toLowerCase()}${identity ? `-${identity}` : ''}-attempt-${safeSlug(caseFile.identity.attempt || '1')}-${date}`;
}

function triggerDownload(bytes: BlobPart[], type: string, filename: string) {
  const url = URL.createObjectURL(new Blob(bytes, { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadAnalystCase(caseFile: AnalystCaseFile) {
  triggerDownload([JSON.stringify(caseFile, null, 2)], 'application/vnd.theanalyst.case+json', `${submissionStem(caseFile)}.analystcase`);
}

export function downloadPortfolioZip(caseFile: AnalystCaseFile) {
  const entries: Record<string, Uint8Array> = {};
  for (const file of caseFile.learnerWorkspace.files) {
    const path = file.path.replace(/^workspace\//, '').replace(/\.\.(\/|\\)/g, '');
    entries[path] = contentBytes(file);
  }
  entries['evidence/evidence-register.json'] = strToU8(JSON.stringify(caseFile.learnerWorkspace.evidence, null, 2));
  entries['submission-manifest.json'] = strToU8(JSON.stringify({
    scenario: caseFile.scenario,
    identity: caseFile.identity,
    scaffold: caseFile.scaffold,
    handoff: caseFile.handoff,
    verification: caseFile.verification,
    publishedTables: caseFile.learnerWorkspace.publishedTables,
  }, null, 2));
  entries['README.md'] = strToU8([
    `# ${caseFile.scenario.title}`,
    '',
    caseFile.identity.name ? `Learner: ${caseFile.identity.name}` : '',
    caseFile.identity.course ? `Course: ${caseFile.identity.course}${caseFile.identity.section ? ` / ${caseFile.identity.section}` : ''}` : '',
    `Assignment: ${caseFile.scenario.id}`,
    `Scaffold mode: ${caseFile.scaffold.mode}`,
    `Exported: ${caseFile.exportedAt}`,
    '',
    'This folder is the standard portfolio copy. The matching .analystcase file retains the integrity and run-provenance record used for course review.',
  ].filter(Boolean).join('\n'));
  const zipBuffer = new Uint8Array(zipSync(entries, { level: 6 })).buffer;
  triggerDownload([zipBuffer], 'application/zip', `${submissionStem(caseFile)}-portfolio.zip`);
}

type LegacyCase = Omit<AnalystCaseFile, 'version' | 'identity' | 'scaffold'> & {
  version: '1.0.0';
  identity?: LearnerIdentity;
  scaffold?: AnalystCaseFile['scaffold'];
};

function migrateLegacyCase(candidate: LegacyCase): AnalystCaseFile {
  const legacyRuns = candidate.capturedRuns as unknown as {
    sql: AnalystCaseFile['capturedRuns']['sql'];
    python: AnalystCaseFile['capturedRuns']['python'];
  };
  return {
    ...candidate,
    version: ANALYST_CASE_VERSION,
    identity: candidate.identity ?? emptyIdentity,
    scaffold: candidate.scaffold ?? { mode: 'supported', helpEventsUsed: [] },
    learnerWorkspace: {
      ...candidate.learnerWorkspace,
      files: candidate.learnerWorkspace.files.map((file) => ({
        ...file,
        encoding: file.encoding ?? 'utf-8',
        mimeType: file.mimeType ?? mimeFor(file.language),
        sizeBytes: file.sizeBytes ?? new TextEncoder().encode(file.content).byteLength,
      })),
      publishedTables: candidate.learnerWorkspace.publishedTables ?? [],
    },
    capturedRuns: {
      history: [],
      sql: legacyRuns.sql ? { ...legacyRuns.sql, totalRows: legacyRuns.sql.displayedRows.length, codeSha256: '', codeMatchesExportedWorkspace: false } : null,
      python: legacyRuns.python ? { ...legacyRuns.python, codeSha256: '', codeMatchesExportedWorkspace: false } : null,
    },
  };
}

export function parseAnalystCase(value: string): AnalystCaseFile {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object') throw new Error('This file does not contain a valid submission.');
  const candidate = parsed as Partial<Omit<AnalystCaseFile, 'version'>> & { version?: string };
  if (candidate.format !== ANALYST_CASE_FORMAT) throw new Error('Unrecognized submission format.');
  if (!candidate.scenario || !candidate.learnerWorkspace || !candidate.capturedRuns || !candidate.verification) {
    throw new Error('The submission is incomplete.');
  }
  if (candidate.version === '1.0.0') return migrateLegacyCase(candidate as unknown as LegacyCase);
  if (candidate.version !== ANALYST_CASE_VERSION) throw new Error(`Unsupported submission version: ${candidate.version ?? 'missing'}.`);
  return candidate as AnalystCaseFile;
}

export async function verifyWorkspaceHashes(caseFile: AnalystCaseFile) {
  return Promise.all(caseFile.learnerWorkspace.files.map(async (file) => ({
    path: file.path,
    matches: await sha256Bytes(contentBytes(file)) === file.sha256,
  })));
}
