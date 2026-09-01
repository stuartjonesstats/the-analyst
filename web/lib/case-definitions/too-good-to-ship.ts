import type { CaseDefinition } from '@/lib/case-definition';

const root = '/data/cases/too-good-to-ship';

export const tooGoodToShip: CaseDefinition = {
  id: 'MR-260120',
  slug: 'too-good-to-ship',
  title: 'Too Good to Ship',
  revision: '2026.09.01.casepack.1',
  catalogSnapshot: '2026-01-15',
  businessUnit: 'ML Governance',
  role: 'Model Risk Analyst',
  queueSubtitle: 'Product Beacon / Deployment gate',
  priority: 'P1',
  requester: 'Elena Park / Director ML Governance',
  received: '20 Jan / 09:15',
  responseDue: '20 Jan / 13:00',
  dueLabel: '13:00 LOCAL',
  channel: 'Governance intake and campaign gate',
  requestKicker: 'REQUEST / SUSPICIOUS MODEL RESULT',
  requestTitle: 'Audit Beacon before Product acts on it.',
  requestBody: 'Reproduce the contractor cancellation model result and decide whether it supports deployment. If it fails, quarantine unsafe inputs, identify every material validity problem, propose the smallest credible alternative, and rule on Product’s request for an account-level campaign file.',
  decisionStandard: 'Reproduction is only the first audit step. Every predictor, label, split, and source clock must be valid at the proposed decision time before discrimination can support customer action.',
  sessionLabel: '260120-MR',
  responseWindow: '03:45:00',
  persistenceKey: 'the-analyst:too-good-to-ship',
  dataFiles: [
    { table: 'platform.account_feature_snapshot', url: `${root}/account_feature_snapshot.parquet`, pythonPath: `${root}/account_feature_snapshot.parquet`, rows: 33_156, trust: 'LIMITED', note: 'Restricted 213-column snapshots. Multiple rows per account are expected; the final three columns are realized future outcomes.' },
    { table: 'platform.model_registry', url: `${root}/model_registry.parquet`, pythonPath: `${root}/model_registry.parquet`, rows: 18, trust: 'REVIEW', note: 'Registration and lifecycle stage are governance context, not validation evidence.' },
    { table: 'platform.model_version', url: `${root}/model_version.parquet`, pythonPath: `${root}/model_version.parquet`, rows: 76, trust: 'REVIEW', note: 'Stored metrics and approval states must be reconstructed against their contracts.' },
    { table: 'platform.pipeline', url: `${root}/pipeline.parquet`, pythonPath: `${root}/pipeline.parquet`, rows: 72, trust: 'REVIEW', note: 'Logical pipeline lineage; orchestration success does not establish point-in-time validity.' },
    { table: 'platform.pipeline_run', url: `${root}/pipeline_run.parquet`, pythonPath: `${root}/pipeline_run.parquet`, rows: 61_301, trust: 'REVIEW', note: 'Run clocks and cutoffs can be compared with the claimed model lineage.' },
    { table: 'platform.data_quality_result', url: `${root}/data_quality_result.parquet`, pythonPath: `${root}/data_quality_result.parquet`, rows: 173_210, trust: 'REVIEW', note: 'Check results have their own grain and cannot certify unseen temporal logic.' },
    { table: 'crm.account', url: `${root}/account.parquet`, pythonPath: `${root}/account.parquet`, rows: 12_000, trust: 'LIMITED', note: 'Restricted account cohort for relational reconciliation; current status is not a historical target.' },
    { table: 'crm.account_status_event', url: `${root}/account_status_event.parquet`, pythonPath: `${root}/account_status_event.parquet`, rows: 14_175, trust: 'REVIEW', note: 'Candidate independent status-event label source with occurrence—not warehouse—time.' },
    { table: 'billing.subscription', url: `${root}/subscription.parquet`, pythonPath: `${root}/subscription.parquet`, rows: 12_084, trust: 'LIMITED', note: 'Account and subscription grains differ.' },
    { table: 'billing.subscription_event', url: `${root}/subscription_event.parquet`, pythonPath: `${root}/subscription_event.parquet`, rows: 60_420, trust: 'REVIEW', note: 'Lifecycle evidence includes occurrence, source-recorded, and availability clocks.' },
    { table: 'billing.payment_attempt', url: `${root}/payment_attempt.parquet`, pythonPath: `${root}/payment_attempt.parquet`, rows: 230_757, trust: 'LIMITED', note: 'Many-to-one payment attempts include late-arrival and changing raw decline taxonomies.' },
    { table: 'case_input.beacon_submitted_split', url: `${root}/beacon_submitted_split.parquet`, pythonPath: `${root}/beacon_submitted_split.parquet`, rows: 33_156, trust: 'REVIEW', note: 'Contractor-supplied random row-level 80/20 split for exact reproduction and audit.' },
  ],
  defaultSql: `WITH submitted AS (
  SELECT
    snapshot.account_id,
    snapshot.feature_as_of_at,
    snapshot.source_watermark_at,
    split.submitted_partition
  FROM platform.account_feature_snapshot snapshot
  JOIN case_input.beacon_submitted_split split USING (account_feature_snapshot_id)
), account_overlap AS (
  SELECT COUNT(*) AS accounts_on_both_sides
  FROM (
    SELECT account_id
    FROM submitted
    GROUP BY account_id
    HAVING COUNT(DISTINCT submitted_partition) = 2
  )
)
SELECT
  submitted_partition,
  COUNT(*) AS snapshot_rows,
  COUNT(DISTINCT account_id) AS accounts,
  MIN(feature_as_of_at) AS first_feature_time,
  MAX(feature_as_of_at) AS last_feature_time,
  MAX(DATE_DIFF('hour', source_watermark_at, feature_as_of_at)) AS max_watermark_lag_hours,
  MAX(accounts_on_both_sides) AS accounts_on_both_sides
FROM submitted
CROSS JOIN account_overlap
GROUP BY submitted_partition
ORDER BY submitted_partition;`,
  defaultPython: `import pandas as pd
from analyst import table
from sklearn.metrics import roc_auc_score
from sklearn.tree import DecisionTreeClassifier

snapshot = table("platform.account_feature_snapshot")
submitted_split = table("case_input.beacon_submitted_split")
submitted = snapshot.merge(submitted_split, on="account_feature_snapshot_id", validate="one_to_one")

# Exact reproduction of the contractor's wildcard and row-split logic.
# A successful run explains what the notebook did; it does not validate it.
numeric_columns = [
    column for column in snapshot.select_dtypes(include=["number", "bool"]).columns
    if column != "account_feature_snapshot_id"
]
train = submitted[submitted["submitted_partition"] == "TRAIN"]
valid = submitted[submitted["submitted_partition"] == "VALIDATION"]

candidate = DecisionTreeClassifier(max_depth=3, random_state=260120)
candidate.fit(
    train[numeric_columns].fillna(-999),
    train["future_90d_cancelled_flag"].astype(int),
)
probability = candidate.predict_proba(valid[numeric_columns].fillna(-999))[:, 1]

overlap = (
    submitted.groupby("account_id")["submitted_partition"]
             .nunique()
             .gt(1)
             .sum()
)
{
    "submitted_validation_auc": roc_auc_score(valid["future_90d_cancelled_flag"], probability),
    "numeric_wildcard_columns": len(numeric_columns),
    "accounts_on_both_sides": int(overlap),
    "realized_future_fields_selected": [c for c in numeric_columns if c.startswith("future_") or c.startswith("eventual_")],
}`,
  defaultNotes: `# Submitted evidence audit

- Operational scoring time:
- Target, entity grain, and horizon:
- Predictor inventory and wildcard behavior:
- Direct / proxy / entity / temporal / availability leakage:
- Split unit and forward holdout:

# Replacement contract

- Explicit allowed predictors:
- Explicit exclusions:
- Source-watermark rule:
- Independent label construction:
- Baseline, calibration, threshold cost, and stability evidence:

# Gate disposition

- Reject / quarantine / rebuild for shadow / simpler rule:
- Evidence and owners for the next gate:
- Customer action allowed now?
- Account-level score/export handling:
`,
  initialEvidence: [
    {
      id: 'E-001',
      statement: 'The submitted notebook reports near-perfect offline discrimination from a numeric wildcard and random snapshot-row split.',
      source: 'BEACON VALIDATION EXPORT',
      state: 'review',
      recordedAt: '2026-01-20T14:19:00.000Z',
    },
    {
      id: 'E-002',
      statement: 'Beacon has not passed the ML Governance deployment gate.',
      source: 'MODEL INTAKE',
      state: 'verified',
      recordedAt: '2026-01-20T14:22:00.000Z',
    },
  ],
  requiredArtifacts: [
    'Reproducible model-risk audit',
    'Machine-readable predictor allow-list',
    'Grouped forward validation design',
    'Deployability and salvage memo',
    'Restricted score-handling note',
  ],
  pythonPackages: ['scikit-learn'],
};
