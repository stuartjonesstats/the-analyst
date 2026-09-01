import type { CaseDefinition } from '@/lib/case-definition';

const root = '/data/cases/the-730-capacity-call';

export const the730CapacityCall: CaseDefinition = {
  id: 'FO-250320',
  slug: 'the-730-capacity-call',
  title: 'The 7:30 Capacity Call',
  revision: '2026.09.01',
  catalogSnapshot: '2026-01-15',
  businessUnit: 'Field Operations Planning',
  role: 'Service Capacity Analyst',
  queueSubtitle: 'Dispatch / Morning promise risk',
  priority: 'P1',
  requester: 'Avery Brooks / Regional Dispatch Director',
  received: '20 Mar / 07:30',
  responseDue: '20 Mar / 08:00',
  dueLabel: 'CAPACITY CALL / 08:00 ET',
  channel: 'Regional dispatch room',
  requestKicker: 'REQUEST / APPOINTMENT RISK',
  requestTitle: 'Rank today’s remaining appointments for limited human review.',
  requestBody: 'Give dispatch the remaining BR0020 appointments in the order they should be reviewed. Show calibrated risk and concise operational drivers, recommend no more action than the published capacity permits, and decide whether this should run daily, remain in shadow, or be replaced by a simpler rule. Do not use anything learned after the customer window.',
  decisionStandard: 'Reproduce every historical row at a comparable morning feature time. The promise is first arrival by scheduled end; risk is not intervention effect, and an appointment score must not become an employee scorecard.',
  sessionLabel: '250320-DSP-07',
  responseWindow: '00:30:00',
  persistenceKey: 'the-analyst:the-730-capacity-call',
  dataFiles: [
    { table: 'scenario.current_appointment_roster', url: `${root}/scenario/current_appointment_roster.parquet`, pythonPath: `${root}/scenario/current_appointment_roster.parquet`, rows: 7, trust: 'VERIFIED', note: 'Outcome-withheld appointments still in scope at 07:30.' },
    { table: 'scenario.capacity_bulletin', url: `${root}/scenario/capacity_bulletin.parquet`, pythonPath: `${root}/scenario/capacity_bulletin.parquet`, rows: 1, trust: 'VERIFIED', note: 'Approved 07:25 weather, aggregate staffing, cost, and action capacity.' },
    { table: 'scenario.appointment_geography', url: `${root}/scenario/appointment_geography.parquet`, pythonPath: `${root}/scenario/appointment_geography.parquet`, rows: 3_517, trust: 'VERIFIED', note: 'Privacy-minimized appointment-to-service-area bridge with no address or coordinates.' },
    { table: 'field_ops.appointment', url: `${root}/field_ops/appointment.parquet`, pythonPath: `${root}/field_ops/appointment.parquet`, rows: 3_517, trust: 'LIMITED', note: 'Realized storm disruption is a forbidden scoring-time feature.' },
    { table: 'field_ops.work_order', url: `${root}/field_ops/work_order.parquet`, pythonPath: `${root}/field_ops/work_order.parquet`, rows: 3_517, trust: 'LIMITED', note: 'Frozen source co-locates valid request facts and eventual outcomes.' },
    { table: 'field_ops.work_order_status_event', url: `${root}/field_ops/work_order_status_event.parquet`, pythonPath: `${root}/field_ops/work_order_status_event.parquet`, rows: 21_102, trust: 'REVIEW', note: 'One-to-many status history; source-recorded time controls historical knowledge.' },
    { table: 'field_ops.visit', url: `${root}/field_ops/visit.parquet`, pythonPath: `${root}/field_ops/visit.parquet`, rows: 3_517, trust: 'LIMITED', note: 'First arrival creates a matured label; every visit field is post-decision.' },
    { table: 'workforce.shift', url: `${root}/workforce/shift.parquet`, pythonPath: `${root}/workforce/shift.parquet`, rows: 9_687, trust: 'LIMITED', note: 'Scheduled capacity; final shift status does not prove morning availability.' },
    { table: 'workforce.employee_role_history', url: `${root}/workforce/employee_role_history.parquet`, pythonPath: `${root}/workforce/employee_role_history.parquet`, rows: 28, trust: 'LIMITED', note: 'Restricted effective role history for aggregate feasibility only.' },
    { table: 'external.weather_station', url: `${root}/external/weather_station.parquet`, pythonPath: `${root}/external/weather_station.parquet`, rows: 2, trust: 'VERIFIED', note: 'Selected region’s weather-station bridge.' },
    { table: 'external.weather_hourly', url: `${root}/external/weather_hourly.parquet`, pythonPath: `${root}/external/weather_hourly.parquet`, rows: 38_848, trust: 'REVIEW', note: 'Historical weather through 07:30; later same-day observations are omitted.' },
    { table: 'external.traffic_area_hourly', url: `${root}/external/traffic_area_hourly.parquet`, pythonPath: `${root}/external/traffic_area_hourly.parquet`, rows: 7_103, trust: 'LIMITED', note: 'Provider revisions retained; historical availability is not universally known.' },
    { table: 'core.branch', url: `${root}/core/branch.parquet`, pythonPath: `${root}/core/branch.parquet`, rows: 1, trust: 'VERIFIED', note: 'BR0020’s region and America/New_York timezone.' },
    { table: 'core.service_area', url: `${root}/core/service_area.parquet`, pythonPath: `${root}/core/service_area.parquet`, rows: 3, trust: 'REVIEW', note: 'Operational geography for current territory and traffic aggregation.' },
    { table: 'core.business_calendar', url: `${root}/core/business_calendar.parquet`, pythonPath: `${root}/core/business_calendar.parquet`, rows: 1_096, trust: 'VERIFIED', note: 'Complete date reference for temporal folds.' },
  ],
  defaultSql: `WITH first_arrival AS (
  SELECT appointment_id, MIN(arrived_at) AS first_arrived_at
  FROM field_ops.visit
  GROUP BY 1
), matured_label AS (
  SELECT
    a.appointment_id,
    CAST(a.scheduled_start_at AS DATE) AS decision_date,
    a.appointment_type_code,
    a.booking_channel_code,
    DATE_DIFF('hour', a.booked_at, a.scheduled_start_at) AS booking_lead_hours,
    DATE_DIFF('minute', a.scheduled_start_at, a.scheduled_end_at) AS window_minutes,
    w.requested_service_code,
    w.priority_code,
    CASE WHEN f.first_arrived_at > a.scheduled_end_at THEN 1 ELSE 0 END AS arrival_window_breach
  FROM field_ops.appointment a
  JOIN field_ops.work_order w USING (appointment_id)
  JOIN first_arrival f USING (appointment_id)
  WHERE a.scheduled_end_at < TIMESTAMP '2025-02-20 07:30:00'
)
SELECT decision_date,
       COUNT(*) AS appointments,
       SUM(arrival_window_breach) AS breaches,
       ROUND(AVG(arrival_window_breach) * 100, 2) AS breach_pct,
       ROUND(AVG(window_minutes), 1) AS mean_window_minutes
FROM matured_label
GROUP BY 1
ORDER BY 1 DESC
LIMIT 60;`,
  defaultPython: `import pandas as pd
from analyst import table
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

cutoff = pd.Timestamp("2025-03-20 07:30:00")

appointments = table("field_ops.appointment")
orders = table("field_ops.work_order")
visits = table("field_ops.visit")
roster = table("scenario.current_appointment_roster")

first_arrival = visits.groupby("appointment_id", as_index=False).agg(
    first_arrived_at=("arrived_at", "min")
)
history = (
    appointments.merge(
        orders[["appointment_id", "requested_service_code", "priority_code"]],
        on="appointment_id", validate="one_to_one"
    ).merge(first_arrival, on="appointment_id", validate="one_to_one")
)
history = history[history["scheduled_end_at"] < cutoff - pd.Timedelta(days=28)].copy()
history["arrival_window_breach"] = (
    history["first_arrived_at"] > history["scheduled_end_at"]
).astype(int)

def safe_features(data):
    result = pd.DataFrame(index=data.index)
    result["booking_lead_hours"] = (
        data["scheduled_start_at"] - data["booked_at"]
    ).dt.total_seconds() / 3600
    result["window_minutes"] = (
        data["scheduled_end_at"] - data["scheduled_start_at"]
    ).dt.total_seconds() / 60
    result["scheduled_hour"] = data["scheduled_start_at"].dt.hour
    result["scheduled_weekday"] = data["scheduled_start_at"].dt.dayofweek
    for column in ["appointment_type_code", "booking_channel_code", "requested_service_code", "priority_code"]:
        result[column] = data[column]
    return result

numeric = ["booking_lead_hours", "window_minutes", "scheduled_hour", "scheduled_weekday"]
categorical = ["appointment_type_code", "booking_channel_code", "requested_service_code", "priority_code"]
processor = ColumnTransformer([
    ("numeric", Pipeline([("impute", SimpleImputer()), ("scale", StandardScaler())]), numeric),
    ("category", OneHotEncoder(handle_unknown="ignore"), categorical),
])
model = Pipeline([
    ("features", processor),
    ("model", LogisticRegression(max_iter=500, class_weight="balanced")),
])

# Forward holdout: no random split.
train = history[history["scheduled_start_at"] < "2024-10-01"]
validate = history[history["scheduled_start_at"] >= "2024-10-01"]
model.fit(safe_features(train), train["arrival_window_breach"])
validation_risk = model.predict_proba(safe_features(validate))[:, 1]

roster_risk = model.predict_proba(safe_features(roster))[:, 1]
queue = roster[["appointment_id", "scheduled_start_at", "scheduled_end_at", "priority_code"]].copy()
queue["shadow_risk"] = roster_risk
queue = queue.sort_values("shadow_risk", ascending=False)

print({
    "train_rows": len(train),
    "validation_rows": len(validate),
    "validation_auc": round(roc_auc_score(validate["arrival_window_breach"], validation_risk), 3),
    "validation_brier": round(brier_score_loss(validate["arrival_window_breach"], validation_risk), 3),
})
queue`,
  defaultNotes: `# 07:30 capacity notebook

## Decision unit and clocks
- Entity:
- Feature time:
- Target and label-maturation rule:

## Leakage register
- Exact fields excluded:
- Historical state reconstruction:
- Traffic revision policy:

## Model and temporal evaluation
- Operational baseline:
- Interpretable pipeline:
- Calibration and storm-day limitations:

## Review policy
- Capacity and cost logic:
- Human authority / abstention:
- Why risk is not intervention effect:

## Disposition
- Daily aid, shadow, simple rule, or data-first refusal:
`,
  initialEvidence: [
    { id: 'E-001', statement: 'The service promise is first technician arrival by the scheduled window end—not completion.', source: 'SERVICE PROMISE', state: 'verified', recordedAt: '2025-03-20T11:30:00.000Z' },
    { id: 'E-002', statement: 'The retrospective source contains outcomes that could not exist at a historical 07:30 feature time.', source: 'DATA REGISTER', state: 'review', recordedAt: '2025-03-20T11:33:00.000Z' },
  ],
  requiredArtifacts: [
    'Point-in-time appointment risk mart',
    'Python model and temporal evaluation package',
    'Machine-readable feature manifest',
    'Model/data card',
    'Current appointment action queue',
    'Intervention contract',
    '07:30 briefing and shadow-monitoring plan',
  ],
  pythonPackages: ['scikit-learn'],
};
