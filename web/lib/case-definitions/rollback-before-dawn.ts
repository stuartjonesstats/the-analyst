import type { CaseDefinition } from '@/lib/case-definition';

const root = '/data/cases/rollback-before-dawn';

export const rollbackBeforeDawn: CaseDefinition = {
  id: 'OP-250320',
  slug: 'rollback-before-dawn',
  title: 'Rollback Before Dawn',
  revision: '2026.09.01',
  catalogSnapshot: '2026-01-15',
  businessUnit: 'Connected Reliability',
  role: 'Connected Reliability Analyst',
  queueSubtitle: 'Incident command / Reliability containment',
  priority: 'P1',
  requester: 'Mara Chen / Incident Commander',
  received: '20 Mar / 11:40',
  responseDue: '20 Mar / 16:00',
  dueLabel: 'ROLLBACK WINDOW / 16:00 ET',
  channel: 'Active incident bridge',
  requestKicker: 'REQUEST / INCIDENT DECISION',
  requestTitle: 'Separate firmware risk from the storm before the rollback window closes.',
  requestBody: 'Failure signals rose after firmware v5, but the same regions are in the winter-storm path. Recommend a global rollback, scoped containment, monitored continuation, or another reversible action. State what the evidence supports now, what it cannot separate, and exactly what would make the incident team change course.',
  decisionStandard: 'Use only evidence knowable by 11:40 ET. Keep alerts, work requests, telemetry absence, and physical failure distinct; make the action scope and reversal thresholds explicit.',
  sessionLabel: '250320-INC-04',
  responseWindow: '04:20:00',
  persistenceKey: 'the-analyst:rollback-before-dawn',
  dataFiles: [
    { table: 'scenario.asset_cohort', url: `${root}/scenario/asset_cohort.parquet`, pythonPath: `${root}/scenario/asset_cohort.parquet`, rows: 18_000, trust: 'VERIFIED', note: 'Stable regional asset denominator, including devices with no received telemetry.' },
    { table: 'iot.asset', url: `${root}/iot/asset.parquet`, pythonPath: `${root}/iot/asset.parquet`, rows: 21_823, trust: 'REVIEW', note: 'Asset master; current site and state are not historical facts.' },
    { table: 'iot.asset_installation_history', url: `${root}/iot/asset_installation_history.parquet`, pythonPath: `${root}/iot/asset_installation_history.parquet`, rows: 16_640, trust: 'REVIEW', note: 'Effective installation periods; some removals are recorded late.' },
    { table: 'iot.sensor', url: `${root}/iot/sensor.parquet`, pythonPath: `${root}/iot/sensor.parquet`, rows: 27_549, trust: 'VERIFIED', note: 'Channel grain and expected reporting frequency.' },
    { table: 'iot.sensor_reading', url: `${root}/iot/sensor_reading.parquet`, pythonPath: `${root}/iot/sensor_reading.parquet`, rows: 41_224, trust: 'REVIEW', note: 'Observed, recorded, and warehouse clocks differ; v5 changed measurement behavior.' },
    { table: 'iot.device_alert', url: `${root}/iot/device_alert.parquet`, pythonPath: `${root}/iot/device_alert.parquet`, rows: 6_297, trust: 'REVIEW', note: 'Generated signals, not confirmed failures; several alerts may belong to one asset.' },
    { table: 'iot.asset_health_daily', url: `${root}/iot/asset_health_daily.parquet`, pythonPath: `${root}/iot/asset_health_daily.parquet`, rows: 24_810, trust: 'LIMITED', note: 'Sampled convenience table containing delayed outcomes unavailable at the cutoff.' },
    { table: 'external.weather_station', url: `${root}/external/weather_station.parquet`, pythonPath: `${root}/external/weather_station.parquet`, rows: 12, trust: 'VERIFIED', note: 'Station-to-region bridge; several stations may describe one region.' },
    { table: 'external.weather_hourly', url: `${root}/external/weather_hourly.parquet`, pythonPath: `${root}/external/weather_hourly.parquet`, rows: 17_280, trust: 'REVIEW', note: 'Regional exposure evidence, not device-level causal proof.' },
    { table: 'field_ops.work_order', url: `${root}/field_ops/work_order.parquet`, pythonPath: `${root}/field_ops/work_order.parquet`, rows: 2_886, trust: 'LIMITED', note: 'Frozen extract mixes request-time facts with eventual outcomes.' },
    { table: 'field_ops.work_order_status_event', url: `${root}/field_ops/work_order_status_event.parquet`, pythonPath: `${root}/field_ops/work_order_status_event.parquet`, rows: 17_316, trust: 'REVIEW', note: 'Use source-recorded time and pre-aggregate the one-to-many history.' },
    { table: 'core.region', url: `${root}/core/region.parquet`, pythonPath: `${root}/core/region.parquet`, rows: 6, trust: 'VERIFIED', note: 'Stable corporate region reference.' },
    { table: 'core.branch', url: `${root}/core/branch.parquet`, pythonPath: `${root}/core/branch.parquet`, rows: 36, trust: 'VERIFIED', note: 'Branch, region, and timezone reference.' },
    { table: 'core.world_event', url: `${root}/core/world_event.parquet`, pythonPath: `${root}/core/world_event.parquet`, rows: 19, trust: 'LIMITED', note: 'Registered context is not a complete causal label.' },
  ],
  defaultSql: `WITH admissible_readings AS (
  SELECT
    region_id,
    asset_id,
    observed_at,
    CASE
      WHEN observed_at < TIMESTAMP '2025-03-14 00:00:00' THEN 'PRE_STORM'
      ELSE 'STORM_TO_CUTOFF'
    END AS period
  FROM iot.sensor_reading
  WHERE observed_at >= TIMESTAMP '2025-03-01 00:00:00'
    AND observed_at <= TIMESTAMP '2025-03-20 11:40:00'
    AND warehouse_available_at <= TIMESTAMP '2025-03-20 11:40:00'
), received AS (
  SELECT region_id, period,
         COUNT(*) AS readings_received,
         COUNT(DISTINCT asset_id) AS assets_reporting
  FROM admissible_readings
  GROUP BY 1, 2
), denominator AS (
  SELECT region_id, COUNT(*) AS cohort_assets
  FROM scenario.asset_cohort
  GROUP BY 1
)
SELECT r.region_id, r.period, d.cohort_assets,
       r.assets_reporting, r.readings_received,
       ROUND(100.0 * r.assets_reporting / d.cohort_assets, 2) AS assets_reporting_pct
FROM received r
JOIN denominator d USING (region_id)
ORDER BY r.period, r.region_id;`,
  defaultPython: `import pandas as pd
import matplotlib.pyplot as plt
from analyst import table

cutoff = pd.Timestamp("2025-03-20 11:40:00")

cohort = table("scenario.asset_cohort")
readings = table("iot.sensor_reading")
readings = readings[
    (readings["observed_at"] >= "2025-03-01")
    & (readings["observed_at"] <= cutoff)
    & (readings["warehouse_available_at"] <= cutoff)
].copy()
readings["day"] = readings["observed_at"].dt.floor("D")

# Build the missing rows explicitly. Do not let received readings define the estate.
days = pd.date_range("2025-03-01", cutoff.floor("D"), freq="D")
panel = pd.MultiIndex.from_product(
    [cohort["asset_id"], days], names=["asset_id", "day"]
).to_frame(index=False)
observed = readings.groupby(["asset_id", "day"], as_index=False).agg(
    received_readings=("sensor_reading_id", "size")
)
panel = (
    panel.merge(cohort[["asset_id", "region_id"]], on="asset_id", how="left")
         .merge(observed, on=["asset_id", "day"], how="left")
         .fillna({"received_readings": 0})
)
panel["period"] = panel["day"].lt(pd.Timestamp("2025-03-14")).map(
    {True: "PRE_STORM", False: "STORM_TO_CUTOFF"}
)

profile = panel.groupby(["region_id", "period"], as_index=False).agg(
    asset_days=("asset_id", "size"),
    reporting_asset_days=("received_readings", lambda value: int((value > 0).sum())),
    mean_received_readings=("received_readings", "mean"),
)
profile["reporting_asset_day_pct"] = (
    100 * profile["reporting_asset_days"] / profile["asset_days"]
)

pivot = profile.pivot(index="region_id", columns="period", values="reporting_asset_day_pct")
pivot.plot(kind="bar", figsize=(9, 4), color=["#78a6b8", "#dd8057"])
plt.ylabel("Asset-days with any received reading (%)")
plt.title("Telemetry availability before and during the storm")
plt.tight_layout()

profile`,
  defaultNotes: `# Incident notebook

## Decision at 11:40 ET
- Action and scope:
- Why this is reversible:

## Evidence lanes
- Firmware chronology:
- Weather exposure:
- Telemetry availability and denominator:
- Alerts versus operational confirmation:
- Counterevidence:

## What the data cannot separate
-

## Change-of-course triggers through 16:00
-
`,
  initialEvidence: [
    { id: 'E-001', statement: 'The 11:40 cutoff applies to warehouse availability, not only the event timestamp.', source: 'INCIDENT BRIEF', state: 'verified', recordedAt: '2025-03-20T15:40:00.000Z' },
    { id: 'E-002', statement: 'Firmware v5 and the regional winter event overlap in calendar time.', source: 'OPENING TIMELINE', state: 'review', recordedAt: '2025-03-20T15:43:00.000Z' },
  ],
  requiredArtifacts: [
    'Point-in-time incident timeline',
    'Reproducible SQL/Python investigation',
    'One-page decision brief',
    'Six-to-24-hour monitoring specification',
    'Incident bridge update',
  ],
  pythonPackages: [],
};
