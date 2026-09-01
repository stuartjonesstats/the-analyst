import type { CaseDefinition } from '@/lib/case-definition';

const root = '/data/cases/the-orion-renewal';

export const theOrionRenewal: CaseDefinition = {
  id: 'PR-260119',
  slug: 'the-orion-renewal',
  title: 'The Orion Renewal',
  revision: '2026.09.01.casepack.1',
  catalogSnapshot: '2026-01-15',
  businessUnit: 'Field Operations Strategy',
  role: 'Senior Operations Analyst',
  queueSubtitle: 'Procurement / Optimizer renewal',
  priority: 'P1',
  requester: 'Mara Okafor / COO Chief of Staff',
  received: '19 Jan / 08:30',
  responseDue: '19 Jan / 17:00',
  dueLabel: '17:00 LOCAL',
  channel: 'Board and procurement review',
  requestKicker: 'REQUEST / VENDOR CLAIM AUDIT',
  requestTitle: 'Decide what the ORION-2 result can support.',
  requestBody: 'The vendor says technician productivity improved 12% after ORION-2 went live. Verify the claim, recommend renew / renegotiate / exit, and tell Field leadership whether this result belongs in technician scorecards. Procurement needs the decision today.',
  decisionStandard: 'Define stable grains and outcomes before comparing periods. Keep observed change, causal attribution, procurement action, and employee evaluation as four separate claims.',
  sessionLabel: '260119-A',
  responseWindow: '08:30:00',
  persistenceKey: 'the-analyst:the-orion-renewal',
  dataFiles: [
    { table: 'core.region', url: `${root}/region.parquet`, pythonPath: `${root}/region.parquet`, rows: 6, trust: 'VERIFIED', note: 'Six operating regions; geography does not by itself provide an untreated control.' },
    { table: 'core.branch', url: `${root}/branch.parquet`, pythonPath: `${root}/branch.parquet`, rows: 36, trust: 'VERIFIED', note: 'Branch-to-region structure for heterogeneity and operating context.' },
    { table: 'core.service_area', url: `${root}/service_area.parquet`, pythonPath: `${root}/service_area.parquet`, rows: 120, trust: 'VERIFIED', note: 'Maps dispatch areas to default branches and regions.' },
    { table: 'core.business_calendar', url: `${root}/business_calendar.parquet`, pythonPath: `${root}/business_calendar.parquet`, rows: 731, trust: 'VERIFIED', note: 'Complete calendar spine for the 24-month analysis window.' },
    { table: 'fleet.route', url: `${root}/route.parquet`, pythonPath: `${root}/route.parquet`, rows: 73_350, trust: 'REVIEW', note: 'One technician-vehicle route per date. A route is not a job, visit, or paid shift.' },
    { table: 'fleet.route_stop', url: `${root}/route_stop.parquet`, pythonPath: `${root}/route_stop.parquet`, rows: 213_566, trust: 'REVIEW', note: 'Scheduling rows include reschedules; repeated work-order IDs require an explicit reconciliation policy.' },
    { table: 'field_ops.work_order', url: `${root}/work_order.parquet`, pythonPath: `${root}/work_order.parquet`, rows: 99_832, trust: 'REVIEW', note: 'Current extract contains post-assignment outcomes and final resolution fields.' },
    { table: 'field_ops.work_order_status_event', url: `${root}/work_order_status_event.parquet`, pythonPath: `${root}/work_order_status_event.parquet`, rows: 598_992, trust: 'VERIFIED', note: 'One-to-many histories support reconstruction but multiply an unaggregated join.' },
    { table: 'field_ops.visit', url: `${root}/visit.parquet`, pythonPath: `${root}/visit.parquet`, rows: 99_832, trust: 'LIMITED', note: 'Restricted physical-visit facts; visits are not interchangeable with planned stops.' },
    { table: 'field_ops.work_order_part', url: `${root}/work_order_part.parquet`, pythonPath: `${root}/work_order_part.parquet`, rows: 216_316, trust: 'REVIEW', note: 'One-to-many part lines create a known fanout risk with status histories.' },
    { table: 'field_ops.appointment', url: `${root}/appointment.parquet`, pythonPath: `${root}/appointment.parquet`, rows: 99_832, trust: 'REVIEW', note: 'Booked service windows may be rescheduled and do not always yield completed work.' },
    { table: 'workforce.shift', url: `${root}/shift.parquet`, pythonPath: `${root}/shift.parquet`, rows: 156_695, trust: 'LIMITED', note: 'Scheduled capacity is not necessarily paid or productive labor time.' },
    { table: 'workforce.employee_role_history', url: `${root}/employee_role_history.parquet`, pythonPath: `${root}/employee_role_history.parquet`, rows: 425, trust: 'LIMITED', note: 'Effective-dated role and branch history for routed technicians.' },
    { table: 'workforce.absence', url: `${root}/absence.parquet`, pythonPath: `${root}/absence.parquet`, rows: 3_996, trust: 'LIMITED', note: 'Health-adjacent workforce facts must remain aggregated and purpose-limited.' },
    { table: 'external.traffic_area_hourly', url: `${root}/traffic_area_hourly.parquet`, pythonPath: `${root}/traffic_area_hourly.parquet`, rows: 252_909, trust: 'REVIEW', note: 'Provider revisions require a declared revision/as-of policy.' },
    { table: 'external.weather_station', url: `${root}/weather_station.parquet`, pythonPath: `${root}/weather_station.parquet`, rows: 12, trust: 'VERIFIED', note: 'Weather station to region mapping.' },
    { table: 'external.weather_hourly', url: `${root}/weather_hourly.parquet`, pythonPath: `${root}/weather_hourly.parquet`, rows: 210_528, trust: 'REVIEW', note: 'Station-hour weather supports context, seasonality, and falsification work.' },
  ],
  defaultSql: `WITH stop_rollup AS (
  SELECT
    route_id,
    COUNT(*) AS stop_rows,
    COUNT(DISTINCT work_order_id) AS unique_work_orders,
    COUNT(*) FILTER (WHERE stop_result_code = 'COMPLETED') AS completed_stop_rows,
    COUNT(*) FILTER (WHERE stop_result_code = 'RESCHEDULED') AS rescheduled_stop_rows
  FROM fleet.route_stop
  GROUP BY route_id
), route_month AS (
  SELECT
    DATE_TRUNC('month', route.route_date) AS route_month,
    route.optimizer_version,
    COUNT(*) AS routes,
    SUM(COALESCE(stop.stop_rows, 0)) AS stop_rows,
    SUM(COALESCE(stop.unique_work_orders, 0)) AS route_level_unique_work_orders,
    SUM(COALESCE(stop.completed_stop_rows, 0)) AS completed_stop_rows,
    SUM(COALESCE(stop.rescheduled_stop_rows, 0)) AS rescheduled_stop_rows,
    SUM(route.planned_distance_km) AS planned_distance_km,
    SUM(route.actual_distance_km) AS actual_distance_km
  FROM fleet.route route
  LEFT JOIN stop_rollup stop USING (route_id)
  GROUP BY 1, 2
)
SELECT
  *,
  ROUND(completed_stop_rows * 1.0 / NULLIF(routes, 0), 3) AS completed_stop_rows_per_route,
  ROUND(rescheduled_stop_rows * 100.0 / NULLIF(stop_rows, 0), 2) AS reschedule_row_pct
FROM route_month
ORDER BY route_month, optimizer_version;`,
  defaultPython: `import pandas as pd
import matplotlib.pyplot as plt

routes = pd.read_parquet("/data/cases/the-orion-renewal/route.parquet")
stops = pd.read_parquet("/data/cases/the-orion-renewal/route_stop.parquet")

route_grain = (
    stops.groupby("route_id")
         .agg(stop_rows=("route_stop_id", "size"),
              unique_work_orders=("work_order_id", "nunique"),
              completed_stop_rows=("stop_result_code", lambda x: (x == "COMPLETED").sum()))
         .reset_index()
)
analysis = routes.merge(route_grain, on="route_id", how="left", validate="one_to_one")
analysis["route_month"] = pd.to_datetime(analysis["route_date"]).dt.to_period("M").dt.to_timestamp()

monthly = (
    analysis.groupby(["route_month", "optimizer_version"])
            .agg(routes=("route_id", "size"),
                 completed_stop_rows=("completed_stop_rows", "sum"),
                 route_level_unique_work_orders=("unique_work_orders", "sum"),
                 actual_distance_km=("actual_distance_km", "sum"))
            .reset_index()
)
monthly["completed_stop_rows_per_route"] = monthly["completed_stop_rows"] / monthly["routes"]

ax = monthly.plot(x="route_month", y="completed_stop_rows_per_route", marker="o", legend=False)
ax.axvline(pd.Timestamp("2025-05-01"), color="#c65b35", linestyle="--", label="ORION-2 go-live")
ax.set(title="Descriptive route trend — not a causal estimate", ylabel="Completed stop rows / route", xlabel="Route month")
ax.legend()
plt.tight_layout()

monthly.tail(12)`,
  defaultNotes: `# KPI contract

- Primary benefit: entity, numerator, denominator, event clock, inclusion rule
- Guardrail 1:
- Guardrail 2:
- Reschedule policy: first assignment / final route / unique completed work order / other

# Identification boundary

- What changed descriptively?
- What can be attributed to ORION-2?
- Which placebo, sensitivity window, or falsification would change confidence?

# Decision

- Renew / renegotiate / controlled extension / exit:
- Commercial or measurement conditions:
- Employee scorecard use: allowed, constrained, or refused — and why
`,
  initialEvidence: [
    {
      id: 'E-001',
      statement: 'The vendor reports a 12% increase in completed stops per planned route hour; Field and Finance use different productivity definitions.',
      source: 'OPENING PACKET',
      state: 'review',
      recordedAt: '2026-01-19T13:35:00.000Z',
    },
  ],
  requiredArtifacts: [
    'KPI and grain contract',
    'Reproducible pre/post and sensitivity analysis',
    'Board-ready finding slide',
    'Renewal recommendation',
    'Employee-use boundary note',
  ],
  pythonPackages: [],
};
