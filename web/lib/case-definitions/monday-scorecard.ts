import type { CaseDefinition } from '@/lib/case-definition';

export const mondayScorecard: CaseDefinition = {
  id: 'CC-241202',
  slug: 'the-monday-scorecard',
  title: 'The Monday Scorecard',
  revision: '2026.09.01',
  catalogSnapshot: '2026-01-15',
  businessUnit: 'Customer Care',
  role: 'Customer Insights Analyst',
  queueSubtitle: 'Customer Care / Metrics dispute',
  priority: 'P1',
  requester: 'Talia Rivera / VP Customer Care',
  received: '02 Dec / 08:05',
  responseDue: '02 Dec / 14:00',
  dueLabel: '14:00 LOCAL',
  channel: 'Executive review packet',
  requestKicker: 'REQUEST / METRIC RECONCILIATION',
  requestTitle: 'Reconcile two conflicting satisfaction figures.',
  requestBody: 'The board packet says satisfaction improved to 7.6, while the weekly dashboard says it fell to 3.8. Provide one defensible headline measure and a short explanation before the 14:00 review.',
  decisionStandard: 'Prefer the better-supported sentence over the prettier number. State what the data cannot establish.',
  sessionLabel: '241202-A',
  responseWindow: '04:29:18',
  persistenceKey: 'the-analyst:the-monday-scorecard',
  dataFiles: [
    {
      table: 'support.csat_response',
      url: '/data/support/csat_response.parquet',
      pythonPath: '/data/support/csat_response.parquet',
      rows: 48_000,
      trust: 'REVIEW',
      note: 'Two incompatible response scales and non-random survey coverage require reconciliation.',
    },
    {
      table: 'support.ticket',
      url: '/data/support/ticket.parquet',
      pythonPath: '/data/support/ticket.parquet',
      rows: 100_000,
      trust: 'REVIEW',
      note: 'Migration-era source references can collide across source systems.',
    },
    {
      table: 'crm.account',
      url: '/data/crm/account.parquet',
      pythonPath: '/data/crm/account.parquet',
      rows: 65_000,
      trust: 'VERIFIED',
      note: 'Account attributes support respondent-versus-population coverage checks.',
    },
  ],
  defaultSql: `SELECT
  survey_source_code,
  scale_max,
  ROUND(AVG(score_raw), 2) AS mean_score,
  COUNT(*) AS responses,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS share_pct
FROM support.csat_response
GROUP BY 1, 2
ORDER BY responses DESC;`,
  defaultPython: `import pandas as pd
import matplotlib.pyplot as plt

csat = pd.read_parquet("/data/support/csat_response.parquet")

profile = (
    csat.groupby(["survey_source_code", "scale_max"])
        .agg(responses=("score_raw", "size"),
             mean_raw_score=("score_raw", "mean"),
             mean_normalized=("score_normalized", "mean"))
        .reset_index()
)

profile`,
  defaultNotes: `# Working notes

- What population does each score describe?
- Which grain and scale should the headline use?
- What remains uncertain after reconciliation?
`,
  initialEvidence: [
    {
      id: 'E-001',
      statement: 'Two survey scales coexist in the extract.',
      source: 'OPENING BRIEF',
      state: 'review',
      recordedAt: '2026-12-02T14:28:00.000Z',
    },
  ],
  requiredArtifacts: [
    'Reproducible analysis',
    'Metric definition note',
    'Updated scorecard',
    'Executive response',
  ],
  pythonPackages: [],
};

