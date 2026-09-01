import type { QueryRow } from '@/hooks/use-duckdb';
import type { PythonRunResult } from '@/hooks/use-python';

export const ANALYST_CASE_FORMAT = 'theanalyst.case';
export const ANALYST_CASE_VERSION = '1.0.0';

export type EvidenceRecord = {
  id: string;
  statement: string;
  source: string;
  state: 'review' | 'verified';
  recordedAt: string;
};

export type AnalystCaseFile = {
  format: typeof ANALYST_CASE_FORMAT;
  version: typeof ANALYST_CASE_VERSION;
  exportedAt: string;
  readme: string;
  scenario: {
    id: string;
    slug: string;
    title: string;
    revision: string;
    catalogSnapshot: string;
  };
  learnerWorkspace: {
    files: Array<{
      path: string;
      language: 'sql' | 'python' | 'markdown';
      content: string;
      sha256: string;
    }>;
    evidence: EvidenceRecord[];
  };
  capturedRuns: {
    sql: null | {
      runCount: number;
      capturedAt: string;
      elapsedMs: number;
      columns: string[];
      displayedRows: QueryRow[];
      displayLimit: number;
    };
    python: null | (PythonRunResult & {
      runCount: number;
      capturedAt: string;
    });
  };
  handoff: {
    requiredArtifacts: Array<{ label: string; present: boolean }>;
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
      result: 'recorded' | 'not-recorded';
      detail: string;
    }>;
  };
};

type BuildCaseInput = {
  sql: string;
  python: string;
  notes: string;
  evidence: EvidenceRecord[];
  sqlRunCount: number;
  pythonRunCount: number;
  sqlCapturedAt: string | null;
  pythonCapturedAt: string | null;
  sqlResult: { columns: string[]; rows: QueryRow[]; elapsedMs: number } | null;
  pythonResult: PythonRunResult | null;
};

async function sha256(content: string) {
  const encoded = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function buildMondayCase(input: BuildCaseInput): Promise<AnalystCaseFile> {
  const exportedAt = new Date().toISOString();
  const files = [
    { path: 'workspace/query_01.sql', language: 'sql' as const, content: input.sql },
    { path: 'workspace/analysis_01.py', language: 'python' as const, content: input.python },
    { path: 'workspace/scratch_notes.md', language: 'markdown' as const, content: input.notes },
  ];

  return {
    format: ANALYST_CASE_FORMAT,
    version: ANALYST_CASE_VERSION,
    exportedAt,
    readme: [
      'Portable submission from The Analyst.',
      'The learner workspace and captured outputs are preserved with content hashes.',
      'Execution records establish only that work ran; they do not certify analytical correctness.',
      'Open this file from the Instructor Planning Desk submission viewer.',
    ].join('\n'),
    scenario: {
      id: 'CC-241202',
      slug: 'the-monday-scorecard',
      title: 'The Monday Scorecard',
      revision: '2026.09.01',
      catalogSnapshot: '2026-01-15',
    },
    learnerWorkspace: {
      files: await Promise.all(files.map(async (file) => ({ ...file, sha256: await sha256(file.content) }))),
      evidence: input.evidence,
    },
    capturedRuns: {
      sql: input.sqlResult && input.sqlRunCount > 0 ? {
        runCount: input.sqlRunCount,
        capturedAt: input.sqlCapturedAt ?? exportedAt,
        elapsedMs: input.sqlResult.elapsedMs,
        columns: input.sqlResult.columns,
        displayedRows: input.sqlResult.rows,
        displayLimit: 1000,
      } : null,
      python: input.pythonResult && input.pythonRunCount > 0 ? {
        ...input.pythonResult,
        runCount: input.pythonRunCount,
        capturedAt: input.pythonCapturedAt ?? exportedAt,
      } : null,
    },
    handoff: {
      requiredArtifacts: [
        'Reproducible analysis',
        'Metric definition note',
        'Updated scorecard',
        'Executive response',
      ].map((label) => ({ label, present: false })),
    },
    runtime: {
      sql: 'DuckDB-Wasm',
      python: 'Pyodide 314.0.6',
      execution: 'learner-browser',
      dataLeavesDevice: false,
    },
    verification: {
      boundary: 'Mechanical records only. No claim is made about the quality, meaning, or correctness of the analysis.',
      records: [
        {
          check: 'SQL execution captured',
          result: input.sqlRunCount > 0 ? 'recorded' : 'not-recorded',
          detail: input.sqlRunCount > 0 ? `${input.sqlRunCount} successful run(s)` : 'No successful SQL run captured',
        },
        {
          check: 'Python execution captured',
          result: input.pythonRunCount > 0 ? 'recorded' : 'not-recorded',
          detail: input.pythonRunCount > 0 ? `${input.pythonRunCount} successful run(s)` : 'No successful Python run captured',
        },
        {
          check: 'Workspace files hashed',
          result: 'recorded',
          detail: `${files.length} learner-authored files include SHA-256 content hashes`,
        },
      ],
    },
  };
}

export function downloadAnalystCase(caseFile: AnalystCaseFile) {
  const date = caseFile.exportedAt.slice(0, 10);
  const filename = `the-analyst-${caseFile.scenario.id.toLowerCase()}-${date}.analystcase`;
  const blob = new Blob([JSON.stringify(caseFile, null, 2)], {
    type: 'application/vnd.theanalyst.case+json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function parseAnalystCase(value: string): AnalystCaseFile {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object') throw new Error('This file does not contain a case submission.');
  const candidate = parsed as Partial<AnalystCaseFile>;
  if (candidate.format !== ANALYST_CASE_FORMAT) throw new Error('Unrecognized case submission format.');
  if (candidate.version !== ANALYST_CASE_VERSION) throw new Error(`Unsupported case version: ${candidate.version ?? 'missing'}.`);
  if (!candidate.scenario || !candidate.learnerWorkspace || !candidate.capturedRuns || !candidate.verification) {
    throw new Error('The case submission is incomplete.');
  }
  return candidate as AnalystCaseFile;
}

export async function verifyWorkspaceHashes(caseFile: AnalystCaseFile) {
  const results = await Promise.all(caseFile.learnerWorkspace.files.map(async (file) => ({
    path: file.path,
    matches: await sha256(file.content) === file.sha256,
  })));
  return results;
}
