import assert from 'node:assert/strict';

import { parseAnalystCase } from '../lib/analyst-case.ts';

const pilotTranscript = {
  path: 'advisory/advisory-transcript.md',
  language: 'markdown',
  content: '# Pilot transcript',
  encoding: 'utf-8',
  mimeType: 'text/markdown',
  source: 'generated-artifact',
  sha256: 'pilot-hash',
  sizeBytes: 18,
};

const pilotV3 = {
  format: 'theanalyst.case',
  version: '3.0.0',
  exportedAt: '2026-09-03T12:00:00.000Z',
  readme: 'Short-lived Advisory Desk pilot export.',
  identity: { name: '', identifier: '', course: '', section: '', team: '', attempt: '1' },
  scaffold: { mode: 'supported', helpEventsUsed: [] },
  scenario: { id: 'CC-241202', slug: 'the-monday-scorecard', title: 'The Monday Scorecard', revision: '2026.09.01', catalogSnapshot: '2026-01-15' },
  learnerWorkspace: { files: [pilotTranscript], evidence: [], publishedTables: [], advisoryConsultations: [{ id: 'pilot' }] },
  capturedRuns: { history: [], sql: null, python: null },
  handoff: { requiredArtifacts: [] },
  runtime: { sql: 'DuckDB-Wasm', python: 'Pyodide 314.0.6', execution: 'learner-browser', dataLeavesDevice: false, advisory: { model: 'pilot' } },
  verification: { boundary: 'Mechanical records only.', records: [] },
};

const restored = parseAnalystCase(JSON.stringify(pilotV3));
assert.equal(restored.version, '2.0.0');
assert.equal('advisoryConsultations' in restored.learnerWorkspace, false);
assert.equal('advisory' in restored.runtime, false);
assert.equal(restored.learnerWorkspace.files[0].content, '# Pilot transcript');

console.log('analystcase migration: Advisory pilot v3 compatibility passed');
