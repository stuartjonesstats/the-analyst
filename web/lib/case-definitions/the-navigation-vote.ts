import type { CaseDefinition } from '@/lib/case-definition';

const base = '/data/cases/the-navigation-vote';

export const navigationVoteCase = {
  id: 'GX-250505',
  slug: 'the-navigation-vote',
  title: 'The Navigation Vote',
  revision: '2026.09.01',
  catalogSnapshot: '2026-01-15',
  businessUnit: 'Product Experimentation',
  role: 'Product Experimentation Analyst',
  queueSubtitle: 'Digital Product / Rollout vote',
  priority: 'P1',
  requester: 'Priya Shah / Product Director',
  received: '05 May / 09:10',
  responseDue: '05 May / 15:30',
  dueLabel: '15:30 LOCAL',
  channel: 'Application release council',
  requestKicker: 'REQUEST / EXPERIMENT DECISION',
  requestTitle: 'Turn an engagement lift into a defensible rollout vote.',
  requestBody:
    'The mobile_navigation experiment ended on 30 April. Verify the reported pages-per-session lift, determine what it does and does not mean for customers, quantify commercial guardrails and uncertainty, and recommend ship, hold, scoped release, or retest before the release branch closes. Freeze the readout at 05 May 2025 09:00 ET.',
  decisionStandard:
    'Preserve the registered intent-to-treat population and assignment grain. Report magnitude and uncertainty, distinguish primary from guardrail and exploratory evidence, and do not translate more navigation into customer benefit without support.',
  sessionLabel: 'SESSION 250505-G',
  responseWindow: '06:20:00',
  persistenceKey: 'the-analyst:the-navigation-vote',
  dataFiles: [
    {
      table: 'growth.experiment',
      url: `${base}/growth_experiment.parquet`,
      pythonPath: `${base}/growth_experiment.parquet`,
      rows: 1,
      trust: 'VERIFIED',
      note: 'Registered EXP005 dates, primary metric, assignment unit, and status.',
    },
    {
      table: 'growth.experiment_assignment',
      url: `${base}/growth_experiment_assignment.parquet`,
      pythonPath: `${base}/growth_experiment_assignment.parquet`,
      rows: 42_000,
      trust: 'VERIFIED',
      note: 'One randomized experiment-session assignment and first exposure.',
    },
    {
      table: 'growth.session',
      url: `${base}/growth_session.parquet`,
      pythonPath: `${base}/growth_session.parquet`,
      rows: 42_000,
      trust: 'REVIEW',
      note: 'Session outcomes and context. Account is nullable; visitor_id is not a person.',
    },
    {
      table: 'growth.web_event',
      url: `${base}/growth_web_event.parquet`,
      pythonPath: `${base}/growth_web_event.parquet`,
      rows: 140_670,
      trust: 'REVIEW',
      note: 'Ordered session events. Event volume is an outcome and must be reduced before assignment joins.',
    },
    {
      table: 'commerce.order',
      url: `${base}/commerce_order.parquet`,
      pythonPath: `${base}/commerce_order.parquet`,
      rows: 15_518,
      trust: 'LIMITED',
      note: 'Orders attributable from selected sessions for a secondary commercial sensitivity.',
    },
    {
      table: 'crm.account',
      url: `${base}/crm_account.parquet`,
      pythonPath: `${base}/crm_account.parquet`,
      rows: 24_773,
      trust: 'LIMITED',
      note: 'Optional account context and clustering sensitivity; anonymous sessions are absent here.',
    },
    {
      table: 'casefiles.navigation_readout',
      url: `${base}/navigation_readout.parquet`,
      pythonPath: `${base}/navigation_readout.parquet`,
      rows: 2,
      trust: 'LIMITED',
      note: 'Opening Product summary: variant means without distributions, uncertainty, or practical threshold.',
    },
    {
      table: 'casefiles.finance_conversion_check',
      url: `${base}/finance_conversion_check.parquet`,
      pythonPath: `${base}/finance_conversion_check.parquet`,
      rows: 2,
      trust: 'LIMITED',
      note: 'Opening Finance counts without assignment denominators, intervals, or a non-inferiority margin.',
    },
    {
      table: 'casefiles.experiment_intake',
      url: `${base}/experiment_intake.parquet`,
      pythonPath: `${base}/experiment_intake.parquet`,
      rows: 1,
      trust: 'REVIEW',
      note: 'Intake wording and registered design fields. The project name is not an eligibility rule.',
    },
  ],
  defaultSql: `-- GX-250505 / registered experiment reconstruction
-- Timestamps are timezone-naive under the scenario's documented ET convention.
-- Frozen analysis cutoff: 2025-05-05 09:00:00 ET.
-- Preserve every eligible assignment before attaching outcomes.
WITH registered AS (
  SELECT *
  FROM growth.experiment
  WHERE experiment_id = 'EXP005'
),
eligible_assignments AS (
  SELECT a.*
  FROM growth.experiment_assignment AS a
  JOIN registered AS e USING (experiment_id)
  WHERE a.assigned_at >= CAST(e.start_date AS TIMESTAMP)
    AND a.assigned_at < CAST(e.end_date + INTERVAL 1 DAY AS TIMESTAMP)
    AND a.warehouse_available_at <= TIMESTAMP '2025-05-05 09:00:00'
)
SELECT
  variant,
  COUNT(*) AS assignments,
  COUNT(DISTINCT session_id) AS distinct_sessions,
  SUM(CASE WHEN account_id IS NULL THEN 1 ELSE 0 END) AS anonymous_assignments,
  MIN(assigned_at) AS first_assignment,
  MAX(assigned_at) AS last_assignment
FROM eligible_assignments
GROUP BY variant
ORDER BY variant;`,
  defaultPython: `import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from analyst import table

SEED = 250505

assignments = table("growth.experiment_assignment")
sessions = table("growth.session")

# validate='one_to_one' makes an accidental grain change fail loudly.
mart = assignments.merge(
    sessions,
    how="left",
    on="session_id",
    validate="one_to_one",
    suffixes=("_assignment", "_session"),
)

def effect_with_interval(frame, outcome, variant="variant"):
    """Return absolute effect, relative effect, and a justified interval."""
    # TODO: choose and document an estimator suitable for this outcome.
    raise NotImplementedError

def bootstrap_effect(frame, outcome, iterations=2000, seed=SEED):
    """Reproduce a resampled effect distribution from an explicit seed."""
    # TODO: resample at the declared unit; account clustering is a sensitivity.
    raise NotImplementedError

allocation = mart.groupby("variant").size().rename("assignments")
device_mix = pd.crosstab(mart["variant"], mart["device_type"], normalize="index")
missing_accounts = mart.groupby("variant")["account_id_assignment"].apply(lambda s: s.isna().sum())

print(device_mix.round(3))
pd.concat([allocation, missing_accounts.rename("missing_accounts")], axis=1)`,
  defaultNotes: `# Rollout-vote working notes

## Registered design
- Experiment and dates:
- Randomization / analysis unit:
- Intent-to-treat population:
- Frozen cutoff:

## Metric contract
| Role | Estimand | Population | Unit | Window | Practical threshold | Uncertainty method |
|---|---|---|---|---|---|---|
| Primary | | | | | | |
| Guardrail | | | | | | |
| Exploratory | | | | | | |

## Diagnostics
- Allocation and missingness:
- Device eligibility:
- Event-join grain check:
- Anonymous / repeated-account consequences:

## Decision evidence
- What moved:
- What did not become established:
- Commercial risk tolerance:
- Post-hoc findings and limitations:

## Rollout vote
Recommendation:

Monitoring / rollback condition:

Next test or missing measurement:
`,
  initialEvidence: [
    {
      id: 'E-001',
      statement: 'The opening navigation readout reports variant means without distributions or uncertainty.',
      source: 'NAVIGATION_READOUT',
      state: 'verified',
      recordedAt: '2025-05-05T13:16:00.000Z',
    },
    {
      id: 'E-002',
      statement: 'The Finance attachment contains attributable-order counts but no assignment denominator.',
      source: 'FINANCE_CONVERSION_CHECK',
      state: 'verified',
      recordedAt: '2025-05-05T13:18:00.000Z',
    },
    {
      id: 'E-003',
      statement: 'The registry declares session assignment and pages_per_session as the primary metric.',
      source: 'EXPERIMENT REGISTRY',
      state: 'review',
      recordedAt: '2025-05-05T13:20:00.000Z',
    },
  ],
  requiredArtifacts: [
    'navigation_experiment_mart.sql',
    'Navigation experiment analysis.py or notebook',
    'Metric and guardrail table',
    'Exploratory segment appendix',
    'Rollout memo or retest plan',
  ],
  pythonPackages: ['numpy', 'scipy'],
} satisfies CaseDefinition;
