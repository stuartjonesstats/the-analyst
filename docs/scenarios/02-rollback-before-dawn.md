# Rollback Before Dawn

> Simulation design brief. The **Private instructor truth** section and reveal
> mechanics are authoring material and must not appear in the learner workspace.

## Simulation card

| Field | Design |
|---|---|
| Learner role | Connected Reliability Analyst assigned to the incident command team |
| Organizational moment | Thursday, 2025-03-20, 11:40 ET. A severe winter event is still affecting the North Coast, Great Lakes, and Mid-Atlantic regions. Firmware major version 5 was released the previous month. |
| Initial request | Decide whether observed device failures justify an emergency firmware rollback, are mainly storm effects, or require a different containment action. |
| Timebox | 2-2.5 hours; 90 minutes with the supported scaffold. |
| Primary level | Intermediate investigation and causal judgment |
| Decision pressure | A rollback window closes at 16:00. Rolling back may interrupt healthy devices; waiting may expose customers to avoidable failures. |
| Analysis cutoff | 2025-03-20 11:40 ET, enforced using event and warehouse-availability timestamps. Outcomes that became knowable later are not admissible for the incident decision. |

## Role and organizational moment

The learner joins an active incident bridge. Connected Products sees elevated
alerts after firmware v5. Field Service sees weather-related demand. The release
manager argues for an immediate rollback; the regional operations director says
the pattern is just the storm. Neither has shown a comparison that separates
product behavior, weather exposure, telemetry availability, and operational
failure.

The learner is not being asked for a research-paper estimate. They must make a
time-bounded operational recommendation, identify what is actually knowable, and
specify monitoring that could change the decision.

## Initial request

The incident commander writes:

> Failure signals rose after v5, but the same regions are in the storm path. By
> 16:00 I need a recommendation: global rollback, scoped rollback or hold,
> continue with monitoring, or another containment plan. Tell me what the data
> supports now, what it cannot separate, and what evidence would make us change
> course.

Opening artifacts should include:

- an alert chart aligned to firmware release date but not weather;
- a regional field-operations message mentioning storm callouts;
- a short firmware v5 release note saying the measurement pipeline was
  recalibrated, without saying whether physical device behavior changed;
- the incident cutoff and approved aggregate-data handling rules.

The chart should be directionally concerning but insufficient to decide cause.

## Data neighborhood

| Asset | What one row means | Why it may matter | Important caution |
|---|---|---|---|
| `iot.sensor_reading` | One recorded sensor observation | Firmware, region, observed time, recorded time, warehouse availability, value, and quality | Version 5 changed measurement behavior. Missing telemetry is informative during the storm; observed rows alone cannot describe absent rows. |
| `iot.sensor` | One sensor or logical channel | Expected frequency and sensor type needed to estimate missing observations | A sensor is not an asset and expected frequency can vary by channel. |
| `iot.asset` | One physical asset | Product, current site, subscription, install date, and current state | Current site is not necessarily historical site. |
| `iot.asset_installation_history` | One asset-at-site installation period | Historical location at the incident time | Requires effective-period logic; some legacy removals are recorded late. |
| `iot.device_alert` | One generated alert | Alert type, severity, firmware-release flag, and acknowledgement | Alerts are generated signals, not confirmed physical failures. Multiple alerts may belong to one asset. |
| `iot.asset_health_daily` | One sampled asset-day analytical snapshot | Convenient completeness, health, alert, firmware, and later failure fields | Sampled population; `failure_within_30d` and its availability timestamp are future outcomes at the incident cutoff. Missingness changes during severe weather. |
| `external.weather_hourly` | One station-hour observation | Snow, wind, visibility, condition, and quality by hour | Must join through station-to-region mapping; weather proximity is exposure evidence, not proof for an individual asset. |
| `external.weather_station` | One station | Maps stations to operating regions | Multiple stations per region must be aggregated deliberately. |
| `field_ops.work_order` | One requested unit of field work | Requests, asset, branch, priority, timestamps, and final resolution | The current extract mixes request-time facts with outcomes learned later. |
| `field_ops.work_order_status_event` | One status transition | Reconstruct work-order state known by the cutoff | Direct joins multiply work orders. `source_recorded_at` can matter. |
| `field_ops.visit` | One attempted or completed visit | Actual technician observation and outcome | Many visits are not yet complete at the incident cutoff and visits are confidential. |
| `core.region`, `core.branch` | One region or branch | Stable operating geography | Branch and asset geography are different concepts. |
| `core.world_event` | One registered world-state event | Additional incident or policy context | Not every downstream anomaly has a registered event; absence is not evidence of absence. |

## Timeline and reveals

### 1. Release chronology — opening

Firmware v5 appears after v4 in the telemetry. The release note states that v5
changed the measurement pipeline. A simple pre/post mean can therefore detect a
software-defined scale or reporting change without demonstrating a physical
failure change.

### 2. The storm footprint — evidence-triggered or minute 30

When the learner explores weather, region, or dates, the external feed shows
`SEVERE_WINTER` conditions from 2025-03-14 through 2025-03-20 in regions
`REG001`-`REG003`. Heavy snow, wind, and low visibility overlap the operational
spike. Other regions provide comparisons, but they are not randomized controls.

### 3. The devices that went quiet — evidence-triggered or minute 55

If the learner examines expected versus observed sensor frequency, completeness,
or quality notes, an IoT engineer explains that some affected devices failed to
report precisely when outages were most likely. A clean-looking distribution of
received readings is survivor-biased. The absence must be measured at an
asset/channel/time grid rather than inferred only from existing rows.

### 4. A second incident in Great Lakes — evidence-triggered or minute 75

The event register contains a low-severity firmware issue in `REG002` beginning
late on 2025-03-18. This is useful corroborating context but not a canonical label
for all failures. It can support a scoped precaution without proving v5 caused the
storm-period pattern.

### 5. The tempting future label — after `asset_health_daily` access

The convenient health table exposes `failure_within_30d`. Its
`failure_label_available_at` makes clear that the incident team did not know that
outcome on March 20. If the learner uses it, the incident commander asks whether
the recommendation could truly have been made before the rollback deadline.

### 6. Decision challenge — after first recommendation or minute 100

The release manager asks for a binary verdict. The regional director asks whether
healthy non-storm regions should bear the risk of a global rollback. The learner
must state a decision rule and monitoring thresholds, not merely say "more data
is needed."

## Authentic work products

1. An incident timeline that aligns firmware, weather, telemetry availability,
   alerts, work requests, and the analysis cutoff.
2. A reproducible investigation notebook or SQL package with region/time
   comparisons, asset-level denominators, missingness checks, and at least one
   point-in-time validation.
3. A one-page incident decision brief containing recommendation, evidence for and
   against, uncertainty, affected scope, customer/operational risk, and explicit
   change-of-course triggers.
4. A monitoring query or metric specification for the next 6-24 hours that does
   not depend on future labels.
5. A concise bridge update suitable for an incident log.

## Ambiguity and defensible outcome space

The simulation supports several recommendations if their risk logic and scope
match the evidence:

- Hold v5 globally but pause further rollout and intensify monitoring in exposed
  regions.
- Roll back or quarantine only a well-defined Great Lakes/device cohort because
  the local firmware incident raises the precautionary threshold.
- Continue v5 while deploying operational mitigations for the storm, if the
  learner demonstrates that non-weather comparisons do not show a corresponding
  physical-failure signal.
- Choose a broader rollback when a clearly stated safety asymmetry makes the cost
  of a false negative much larger than rollback disruption, while acknowledging
  that this is a precautionary decision rather than a causal finding.

It is not defensible to declare the storm or firmware the sole cause from temporal
coincidence, treat missing readings as healthy readings, use future outcomes at
the incident cutoff, or present alerts as confirmed failures.

## Private instructor truth

The estate intentionally contains overlapping mechanisms:

- The March 14-20 severe winter event affects regions 1-3 across weather,
  telemetry, field-service demand, and routes. It is a shared external cause, not
  a nuisance variable that can be ignored.
- Storm-period telemetry is missing not at random (`A08`): devices can disappear
  from the observed-reading population when outages and failures rise.
- Firmware v5 changes measurement behavior in `iot.sensor_reading`. A level shift
  can therefore be real in the data without proving a physical reliability
  effect.
- A low-severity firmware issue overlaps the event in Great Lakes, making a
  blanket "nothing but weather" conclusion too strong.
- The 30-day failure label in `iot.asset_health_daily` is a delayed outcome and
  unavailable for the urgent decision.

The strongest supported causal statement is that the storm explains a meaningful
shared regional component and that the released data does not identify a clean
firmware-only physical effect. It also cannot rule out an interaction or a scoped
firmware problem because observation disappears non-randomly. Recommendation
quality should therefore be judged on evidence, risk asymmetry, scope, and
monitoring—not on selecting a hidden rollback answer.

This design uses anomalies `A07` and `A08`, the firmware behavior note on
`iot.sensor_reading`, and the point-in-time warnings on the daily health and work
order extracts.

## Planted traps

- A naive before/after comparison around the firmware release.
- Comparing received reading values while omitting expected-but-absent readings.
- Treating regions 4-6 as perfect controls despite different assets, climates,
  and operating conditions.
- Counting alerts as independent device failures.
- Joining assets to current service sites instead of effective installation
  history.
- Using `failure_within_30d` or final work-order resolution before it was
  available.
- Confusing `observed_at`, `source_recorded_at`, and `warehouse_available_at`.
- Joining hourly weather directly to asset readings and creating station-hour
  multiplication.
- Interpreting a `core.world_event` match as a complete causal label.
- Producing an inconclusive analysis with no operational decision rule.

## Scaffold levels

### Supported

- An incident-timeline canvas is preloaded with the cutoff and release date.
- The table explorer suggests telemetry, sensor frequency, weather, and work
  requests as separate evidence lanes.
- Starter queries demonstrate an asset-hour denominator and a
  `warehouse_available_at <= cutoff` filter without completing the analysis.
- A decision template prompts for action, scope, reversible mitigations, evidence
  against, and monitoring triggers.

### Guided

- The learner receives the data neighborhood and release note.
- Hints appear if they use the future failure label or compare only existing
  readings.
- Geographic and temporal comparison design remains learner-owned.

### Independent

- Only the incident inbox, attachments, catalog, and workbench are supplied.
- All tables remain searchable.
- Reveals can be obtained by interrogating owners, profiling data, or waiting for
  timed incident updates.

## Completion criteria

A complete submission:

- defines physical failure, alert, work request, and telemetry absence as distinct
  concepts;
- reconstructs the storm, firmware, and availability timeline before comparing
  outcomes;
- applies the cutoff to at least the telemetry and operational evidence;
- uses asset/channel denominators to investigate missing-not-at-random telemetry;
- provides a geographically and temporally credible comparison, with its
  assumptions stated;
- avoids future outcome leakage and invalid current-state fields;
- quantifies at least one alternative explanation or piece of counterevidence;
- recommends an actionable scope rather than only naming uncertainty;
- gives monitoring thresholds or conditions that could reverse the decision; and
- makes the strength of the causal language match the identification available.

## Curriculum fit

| Curriculum capability | How the work demonstrates it |
|---|---|
| Event time and knowledge time | Observed, recorded, available, and label-available timestamps are separated. |
| Missing-data mechanisms | The learner treats telemetry absence as potentially informative, not random noise. |
| Causal reasoning | Shared weather exposure, release timing, comparison regions, and interaction hypotheses are evaluated. |
| Analytical grain | Sensor observations, assets, alerts, work orders, visits, and station-hours are kept distinct. |
| Incident decision-making | Imperfect evidence is converted into a reversible, monitored operational action. |
| Responsible claims | Correlation, corroboration, precaution, and causal attribution are communicated separately. |

## Source anchors

- [`world_bible.md`](../world_bible.md): time, relationship, reliability, and
  responsible-refusal rules.
- [`schema_inventory.md`](../schema_inventory.md): IoT, external, and field-ops
  asset grains and caution labels.
- [`data_catalog.json`](../../catalog/data_catalog.json): firmware behavior,
  missingness, future-label, and current-extract warnings.
- [`relationships.json`](../../catalog/relationships.json): sensor-to-asset,
  weather-to-region, work-order-to-asset, and visit relationships.
- [`anomaly_ledger.json`](../../catalog/anomaly_ledger.json): private anomalies
  `A07` and `A08`.
