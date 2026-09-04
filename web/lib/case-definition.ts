import type { EvidenceRecord } from '@/lib/analyst-case';

export type SourceTrust = 'VERIFIED' | 'REVIEW' | 'LIMITED';

export type CaseDataFile = {
  table: string;
  /** Public URL path, beginning with /data/. */
  url: string;
  /** File path exposed inside the browser Python filesystem. */
  pythonPath: string;
  rows: number;
  trust: SourceTrust;
  note: string;
};

export type CaseDefinition = {
  id: string;
  slug: string;
  title: string;
  revision: string;
  catalogSnapshot: string;
  businessUnit: string;
  role: string;
  queueSubtitle: string;
  priority: 'P1' | 'P2' | 'P3';
  requester: string;
  received: string;
  responseDue: string;
  dueLabel: string;
  channel: string;
  requestKicker: string;
  requestTitle: string;
  requestBody: string;
  decisionStandard: string;
  sessionLabel: string;
  responseWindow: string;
  persistenceKey: string;
  /** Canonical public briefing page used by portfolio exports. */
  publicUrl?: string;
  dataFiles: CaseDataFile[];
  defaultSql: string;
  defaultPython: string;
  defaultNotes: string;
  initialEvidence: EvidenceRecord[];
  requiredArtifacts: string[];
  pythonPackages: string[];
};

export function formatRowCount(rows: number) {
  return new Intl.NumberFormat('en-US').format(rows);
}
