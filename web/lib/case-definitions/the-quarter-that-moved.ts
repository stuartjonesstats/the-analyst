import type { CaseDefinition } from '@/lib/case-definition';

const base = '/data/cases/the-quarter-that-moved';

export const quarterThatMovedCase = {
  id: 'CM-240708',
  slug: 'the-quarter-that-moved',
  title: 'The Quarter That Moved',
  revision: '2026.09.01',
  catalogSnapshot: '2026-01-15',
  businessUnit: 'Commercial Data Transition',
  role: 'Commercial Data Transition Analyst',
  queueSubtitle: 'Finance close / Acquisition cutover',
  priority: 'P1',
  requester: 'Mara Bell / Commercial Controller',
  received: '08 Jul / 08:40',
  responseDue: '08 Jul / 16:00',
  dueLabel: '16:00 LOCAL',
  channel: 'Q2 close review',
  requestKicker: 'REQUEST / COMMERCIAL CERTIFICATION',
  requestTitle: 'Certify the quarter without erasing the acquired business.',
  requestBody:
    'The Q2 review is paused. HarborHome order numbers repeat, a fulfillment workbook contains impossible processing times, and two analysts produced different revenue totals. Certify order volume, booked value, and supportable fulfillment timing; quantify the exceptions; and leave Finance a cutover rule it can rerun next quarter. The frozen analysis cutoff is 08 Jul 2024 at 08:30 ET.',
  decisionStandard:
    'Use canonical business grain, captured transaction value, named clocks, and an explicit frozen-cutoff policy. Preserve exceptions as evidence; do not silently delete or repair them.',
  sessionLabel: 'SESSION 240708-C',
  responseWindow: '07:20:00',
  persistenceKey: 'the-analyst:the-quarter-that-moved',
  dataFiles: [
    {
      table: 'commerce.order',
      url: `${base}/commerce_order.parquet`,
      pythonPath: `${base}/commerce_order.parquet`,
      rows: 18_167,
      trust: 'REVIEW',
      note: 'One canonical Q2 order header. Source identifiers and source clocks require investigation.',
    },
    {
      table: 'commerce.order_line',
      url: `${base}/commerce_order_line.parquet`,
      pythonPath: `${base}/commerce_order_line.parquet`,
      rows: 32_466,
      trust: 'VERIFIED',
      note: 'Captured purchase lines. Reduce to order grain before joining another one-to-many table.',
    },
    {
      table: 'commerce.order_event',
      url: `${base}/commerce_order_event.parquet`,
      pythonPath: `${base}/commerce_order_event.parquet`,
      rows: 54_501,
      trust: 'REVIEW',
      note: 'Lifecycle events with occurrence, source-record, and warehouse-availability clocks.',
    },
    {
      table: 'commerce.shipment_event',
      url: `${base}/commerce_shipment_event.parquet`,
      pythonPath: `${base}/commerce_shipment_event.parquet`,
      rows: 51_036,
      trust: 'REVIEW',
      note: 'Tracking events, not shipments or orders. Several rows can belong to one order.',
    },
    {
      table: 'crm.account',
      url: `${base}/crm_account.parquet`,
      pythonPath: `${base}/crm_account.parquet`,
      rows: 15_601,
      trust: 'VERIFIED',
      note: 'Linked customer accounts for commercial context; not an order-grain fact.',
    },
    {
      table: 'catalog.product_price_history',
      url: `${base}/catalog_product_price_history.parquet`,
      pythonPath: `${base}/catalog_product_price_history.parquet`,
      rows: 4_320,
      trust: 'LIMITED',
      note: 'Effective-dated list-price context. It is not the captured transaction receipt.',
    },
    {
      table: 'casefiles.q2_commercial_close',
      url: `${base}/q2_commercial_close.parquet`,
      pythonPath: `${base}/q2_commercial_close.parquet`,
      rows: 18_167,
      trust: 'LIMITED',
      note: 'Opening Finance export keyed by source_order_id; canonical order_id is absent.',
    },
    {
      table: 'casefiles.q2_fulfillment_review',
      url: `${base}/q2_fulfillment_review.parquet`,
      pythonPath: `${base}/q2_fulfillment_review.parquet`,
      rows: 18_167,
      trust: 'LIMITED',
      note: 'Opening fulfillment workbook projection using source-recorded duration fields.',
    },
    {
      table: 'casefiles.harborhome_transition_mapping',
      url: `${base}/harborhome_transition_mapping.parquet`,
      pythonPath: `${base}/harborhome_transition_mapping.parquet`,
      rows: 6,
      trust: 'REVIEW',
      note: 'Incomplete field-map sheet recovered from the acquisition transition workbook.',
    },
  ],
  defaultSql: `-- CM-240708 / governed commercial fact
-- Timestamps are timezone-naive; apply the scenario's documented ET convention.
-- Frozen analysis cutoff: 2024-07-08 08:30:00 ET.
--
-- Start by profiling the candidate grain. Do not deduplicate source_order_id
-- until you can explain what a repeated value represents.
WITH q2_orders AS (
  SELECT
    *,
    warehouse_available_at <= TIMESTAMP '2024-07-08 08:30:00' AS known_by_cutoff
  FROM commerce."order"
  WHERE created_at >= TIMESTAMP '2024-04-01 00:00:00'
    AND created_at <  TIMESTAMP '2024-07-01 00:00:00'
)
SELECT
  source_system,
  COUNT(*) AS warehouse_rows,
  COUNT(DISTINCT order_id) AS canonical_orders,
  COUNT(DISTINCT source_order_id) AS source_order_numbers,
  SUM(order_total_cents) / 100.0 AS captured_order_value,
  SUM(CASE WHEN known_by_cutoff THEN 1 ELSE 0 END) AS known_by_cutoff
FROM q2_orders
GROUP BY source_system
ORDER BY source_system;`,
  defaultPython: `import pandas as pd
import matplotlib.pyplot as plt
from analyst import table

orders = table("commerce.order")
finance = table("casefiles.q2_commercial_close")
fulfillment_review = table("casefiles.q2_fulfillment_review")

ANALYSIS_CUTOFF = pd.Timestamp("2024-07-08 08:30:00")

def profile_key(frame, key, groups):
    """Return a reusable key-collision profile without modifying source rows."""
    # TODO: include rows, distinct values, nulls, and collision materiality.
    raise NotImplementedError

def add_exception_flags(frame):
    """Return a copy with deterministic, documented exception indicators."""
    # TODO: preserve original columns and derive population-level rules.
    raise NotImplementedError

opening_profile = (
    orders.groupby("source_system")
          .agg(warehouse_rows=("order_id", "size"),
               canonical_orders=("order_id", "nunique"),
               source_order_numbers=("source_order_id", "nunique"),
               captured_value_cents=("order_total_cents", "sum"))
)

print(f"Finance attachment rows: {len(finance):,}")
print(f"Fulfillment review rows: {len(fulfillment_review):,}")
opening_profile`,
  defaultNotes: `# Certification working notes

## Candidate reporting grain
- One row represents:
- Primary key:
- Evidence that the grain is stable:

## Clock contract
- Business occurrence clock:
- Source-record clock:
- Warehouse-availability clock:
- Frozen analysis cutoff: 2024-07-08 08:30 ET
- Quarter-close availability policy:

## Reconciliation bridge
- Source export population:
- Canonical warehouse population:
- Included close population:
- Late-arriving or qualified population:
- Header-to-line amount difference:

## Open exceptions and owners
-

## Certification language
What I can certify:

What remains qualified:

Rule Finance can rerun next quarter:
`,
  initialEvidence: [
    {
      id: 'E-001',
      statement: 'The opening Finance extract does not contain the canonical warehouse order_id.',
      source: 'Q2_COMMERCIAL_CLOSE',
      state: 'verified',
      recordedAt: '2024-07-08T12:44:00.000Z',
    },
    {
      id: 'E-002',
      statement: 'Finance requires a fixed 08 Jul 08:30 ET knowledge cutoff for the certified rerun.',
      source: 'CONTROLLER REQUEST',
      state: 'verified',
      recordedAt: '2024-07-08T12:46:00.000Z',
    },
    {
      id: 'E-003',
      statement: 'Two workbook totals disagree because their key and inclusion rules have not been reconciled.',
      source: 'OPENING REVIEW',
      state: 'review',
      recordedAt: '2024-07-08T12:48:00.000Z',
    },
  ],
  requiredArtifacts: [
    'q2_commercial_fact.sql',
    'commercial_migration_audit.py or notebook',
    'q2_exception_register.csv',
    'Q2 reconciliation report',
    'Commercial certification memo',
  ],
  pythonPackages: ['numpy'],
} satisfies CaseDefinition;
