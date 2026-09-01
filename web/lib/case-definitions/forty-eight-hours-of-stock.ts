import type { CaseDefinition } from '@/lib/case-definition';

const root = '/data/cases/forty-eight-hours-of-stock';

export const fortyEightHoursOfStock: CaseDefinition = {
  id: 'SP-251201',
  slug: 'forty-eight-hours-of-stock',
  title: 'Forty-Eight Hours of Stock',
  revision: '2026.09.01',
  catalogSnapshot: '2026-01-15',
  businessUnit: 'Supply Planning',
  role: 'Supply Planning Data Scientist',
  queueSubtitle: 'Supply chain / 21-day stock risk',
  priority: 'P1',
  requester: 'Nikhil Rao / VP Supply Chain',
  received: '01 Dec / 06:45',
  responseDue: '01 Dec / 07:30',
  dueLabel: 'SUPPLY CALL / 07:30 ET',
  channel: 'Corporate supply room',
  requestKicker: 'REQUEST / INVENTORY RISK',
  requestTitle: 'Reconcile the “48 hours” alert and build a constrained 21-day action book.',
  requestBody: 'Produce a probabilistic SKU/warehouse outlook through 21 December and recommend hold, transfer, expedite, substitute, or manual review. The portfolio must stay within the published freight, buyer, lane, MOQ, approval, and donor-reserve constraints. Show which alerts survive physical reconciliation and which choices change under winter-demand or vendor-delay stress.',
  decisionStandard: 'Build zeros, physical movements, accepted receipts, and forecast-origin clocks explicitly. Report ranges and probabilities rather than dressing a point forecast as certainty; never fix one warehouse by creating an unmodeled donor shortage.',
  sessionLabel: '251201-SUP-48',
  responseWindow: '00:45:00',
  persistenceKey: 'the-analyst:forty-eight-hours-of-stock',
  dataFiles: [
    { table: 'scenario.supply_watchlist', url: `${root}/scenario/supply_watchlist.parquet`, pythonPath: `${root}/scenario/supply_watchlist.parquet`, rows: 30, trust: 'REVIEW', note: 'Mixed review cohort; workbook cover is a claim, not a correct action.' },
    { table: 'scenario.opening_balance', url: `${root}/scenario/opening_balance.parquet`, pythonPath: `${root}/scenario/opening_balance.parquet`, rows: 81, trust: 'VERIFIED', note: 'Controller-approved cutoff balance for every watchlist product at all three warehouses.' },
    { table: 'scenario.action_constraints', url: `${root}/scenario/action_constraints.parquet`, pythonPath: `${root}/scenario/action_constraints.parquet`, rows: 10, trust: 'VERIFIED', note: 'Portfolio budget, review capacity, donor reserve, and transfer lanes.' },
    { table: 'supply.inventory_movement', url: `${root}/supply/inventory_movement.parquet`, pythonPath: `${root}/supply/inventory_movement.parquet`, rows: 520_000, trust: 'REVIEW', note: 'Technical events include linked scanner replays; posting and movement clocks differ.' },
    { table: 'supply.inventory_position_daily', url: `${root}/supply/inventory_position_daily.parquet`, pythonPath: `${root}/supply/inventory_position_daily.parquet`, rows: 330_000, trust: 'REVIEW', note: 'Unique but sparse sampled positions; missing rows are not zero stock.' },
    { table: 'supply.purchase_order', url: `${root}/supply/purchase_order.parquet`, pythonPath: `${root}/supply/purchase_order.parquet`, rows: 24_000, trust: 'LIMITED', note: 'Header status is current/frozen and quantity lives at line grain.' },
    { table: 'supply.purchase_order_line', url: `${root}/supply/purchase_order_line.parquet`, pythonPath: `${root}/supply/purchase_order_line.parquet`, rows: 96_000, trust: 'REVIEW', note: 'Ordered and cancelled quantities; direct receipt joins fan out split lines.' },
    { table: 'supply.goods_receipt', url: `${root}/supply/goods_receipt.parquet`, pythonPath: `${root}/supply/goods_receipt.parquet`, rows: 82_000, trust: 'REVIEW', note: 'Gross and rejected units at receipt-event grain; accepted quantity must be derived.' },
    { table: 'supply.product_vendor', url: `${root}/supply/product_vendor.parquet`, pythonPath: `${root}/supply/product_vendor.parquet`, rows: 1_440, trust: 'REVIEW', note: 'Effective sourcing options, contract lead time, MOQ, and cost.' },
    { table: 'supply.vendor', url: `${root}/supply/vendor.parquet`, pythonPath: `${root}/supply/vendor.parquet`, rows: 85, trust: 'REVIEW', note: 'Terms and risk tiers support transparent pooling, not deterministic future performance.' },
    { table: 'supply.warehouse', url: `${root}/supply/warehouse.parquet`, pythonPath: `${root}/supply/warehouse.parquet`, rows: 3, trust: 'VERIFIED', note: 'Three warehouse locations, regions, capacity, and timezones.' },
    { table: 'catalog.product', url: `${root}/catalog/product.parquet`, pythonPath: `${root}/catalog/product.parquet`, rows: 720, trust: 'VERIFIED', note: 'Synthetic but realistic SKU names, types, lifecycle state, and cost.' },
    { table: 'catalog.product_substitution', url: `${root}/catalog/product_substitution.parquet`, pythonPath: `${root}/catalog/product_substitution.parquet`, rows: 1_440, trust: 'REVIEW', note: 'Effective options; some still require customer approval.' },
    { table: 'core.business_calendar', url: `${root}/core/business_calendar.parquet`, pythonPath: `${root}/core/business_calendar.parquet`, rows: 1_096, trust: 'VERIFIED', note: 'Complete date spine needed to represent source-absent issue days as zero.' },
  ],
  defaultSql: `WITH replay_audit AS (
  SELECT
    COUNT(*) AS technical_events,
    COUNT(*) FILTER (WHERE scanner_replay_flag) AS replay_events,
    COUNT(DISTINCT replay_of_inventory_movement_id)
      FILTER (WHERE scanner_replay_flag) AS replayed_originals
  FROM supply.inventory_movement
), physical_by_type AS (
  SELECT movement_type_code,
         COUNT(*) AS physical_events,
         SUM(quantity_delta) AS signed_quantity
  FROM supply.inventory_movement
  WHERE NOT scanner_replay_flag
    AND posted_at <= TIMESTAMP '2025-12-01 06:45:00'
  GROUP BY 1
)
SELECT p.movement_type_code, p.physical_events, p.signed_quantity,
       a.technical_events, a.replay_events, a.replayed_originals
FROM physical_by_type p
CROSS JOIN replay_audit a
ORDER BY p.movement_type_code;`,
  defaultPython: `import pandas as pd
import matplotlib.pyplot as plt

root = "/data/cases/forty-eight-hours-of-stock"
cutoff = pd.Timestamp("2025-12-01 06:45:00")
watchlist = pd.read_parquet(f"{root}/scenario/supply_watchlist.parquet")
movement = pd.read_parquet(f"{root}/supply/inventory_movement.parquet")

keys = ["warehouse_id", "product_id"]
cohort = watchlist[keys].drop_duplicates()
issues = movement[
    (~movement["scanner_replay_flag"])
    & (movement["movement_type_code"] == "ISSUE")
    & (movement["posted_at"] <= cutoff)
    & (movement["product_id"].isin(cohort["product_id"]))
].copy()
issues["demand_date"] = issues["movement_at"].dt.floor("D")
issues["demand_units"] = -issues["quantity_delta"]
daily_source = issues.groupby(keys + ["demand_date"], as_index=False).agg(
    demand_units=("demand_units", "sum")
)

# A complete series includes days with no ISSUE row.
dates = pd.date_range("2023-01-01", cutoff.floor("D"), freq="D")
spine = (
    cohort.assign(_key=1)
          .merge(pd.DataFrame({"demand_date": dates, "_key": 1}), on="_key")
          .drop(columns="_key")
          .merge(daily_source, on=keys + ["demand_date"], how="left")
          .fillna({"demand_units": 0})
)

profile = spine.groupby(keys, as_index=False).agg(
    calendar_days=("demand_date", "size"),
    issue_days=("demand_units", lambda value: int((value > 0).sum())),
    mean_daily_demand=("demand_units", "mean"),
    demand_std=("demand_units", "std"),
)
profile["zero_day_pct"] = 100 * (1 - profile["issue_days"] / profile["calendar_days"])

focus = watchlist.sort_values("workbook_claimed_cover_hours").iloc[0]
series = spine[
    (spine["warehouse_id"] == focus["warehouse_id"])
    & (spine["product_id"] == focus["product_id"])
    & (spine["demand_date"] >= "2025-06-01")
]
plt.figure(figsize=(10, 3.5))
plt.plot(series["demand_date"], series["demand_units"], color="#dd8057", linewidth=1)
plt.title(f"All-days demand: {focus['warehouse_id']} / {focus['product_id']}")
plt.ylabel("Issue units")
plt.tight_layout()

profile.sort_values("zero_day_pct", ascending=False).head(12)`,
  defaultNotes: `# Supply decision notebook

## Evidence-layer contracts
- Physical movement and replay audit:
- Complete demand spine / zero policy:
- Opening-balance reconciliation:
- PO-line as-of and accepted receipt logic:
- Final lead-time definition and pooling:

## Forecast and uncertainty
- Rolling origins and untouched final fold:
- All-days baseline:
- Intermittent/seasonal challenger:
- Error, bias, quantile, and decision metrics:

## Inventory simulation
- Demand paths:
- Receipt/lead-time paths:
- Recipient and donor reserve:
- Seed and reproducibility:

## Constrained actions
- Stable actions:
- Manual-review cases:
- Winter and vendor-delay stress changes:
- Owner, expiration, monitoring, and override:
`,
  initialEvidence: [
    { id: 'E-001', statement: 'The “daily” position file is sampled; a missing row cannot be interpreted as zero inventory.', source: 'DATA REGISTER', state: 'review', recordedAt: '2025-12-01T11:45:00.000Z' },
    { id: 'E-002', statement: 'Scanner replay rows have explicit links to original technical events.', source: 'WAREHOUSE INCIDENT NOTE', state: 'review', recordedAt: '2025-12-01T11:49:00.000Z' },
  ],
  requiredArtifacts: [
    'Governed supply evidence SQL layer',
    'Movement, position, demand, and receipt reconciliation report',
    'Rolling-origin forecasting package',
    'Seeded 21-day inventory-risk simulator',
    'Inventory risk Parquet',
    'Constrained supply action CSV',
    'Forecast/model card',
    'Supply-call brief and decision log',
  ],
  pythonPackages: [],
};
