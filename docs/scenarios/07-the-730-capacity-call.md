# The 7:30 Capacity Call

> Simulation design brief. The **Private instructor truth** section and reveal
> mechanics are authoring material and must not appear in the learner workspace.

## Simulation card

| Field | Design |
|---|---|
| Learner role | Service Capacity Analyst embedded with a regional Field Operations dispatch team |
| Organizational moment | Thursday, 2025-03-20, 07:30 local branch time. Severe winter weather is affecting the selected branch, the daily capacity call begins at 08:00, and the first remaining customer window starts shortly afterward. |
| Initial request | Rank today's remaining appointments by risk of missing the promised arrival window, recommend which cases dispatch should review or contact, and define whether the approach is safe enough to become a daily decision aid. |
| Timebox | 10-16 hours for a prepared learner; 18-26 hours for a newer learner. A facilitated delivery works well as one six-hour build session plus a later model-review and operations-handoff session. |
| Primary level | Intermediate-to-advanced predictive analytics and operational decision design |
| Decision pressure | Dispatch has limited review and outbound-contact capacity. Calling too many customers creates unnecessary alarm and consumes scarce staff time; missing a high-risk appointment damages trust and can strand urgent work. |
| Analysis cutoff | 2025-03-20 07:30 in the selected branch's catalog timezone. Historical features must reproduce what was knowable at the equivalent morning decision time. Same-day future observations and frozen-extract outcomes are inadmissible. |

## Role and organizational moment

The learner joins a regional dispatch room before the morning capacity call. The
weather bulletin is worsening, several technicians have not yet started their
shifts, and Customer Care wants to know which customers should receive an early
warning. A planning manager has circulated a spreadsheet that sorts appointments
using the final `completion_hours` field from the analytical work-order extract.
The spreadsheet looks accurate in retrospect but cannot have existed at 07:30.

The learner is not being asked to win a leaderboard. They must create a
point-in-time appointment feature mart, compare a simple operational baseline
with one or more transparent scikit-learn pipelines, and turn calibrated risk
into a capacity-constrained human-review policy. The risk model is allowed to be
modest. A reliable rule or shadow-only recommendation is preferable to a more
impressive model that uses future information or confuses predicted risk with
the effect of an intervention.

This case occurs earlier on the same organizational day as **Rollback Before
Dawn**. The shared storm is intentional: Field Operations is making appointment
promises at 07:30 while Connected Products will later ask a different question
about firmware and physical failures. Evidence may overlap, but the decisions,
grains, and permissible claims do not.

## Initial request

The regional dispatch director writes:

> For the 08:00 call, give us today's remaining appointments in the order we
> should review them. We can only make a limited number of proactive calls and
> route changes. Show me the risk, what is driving it, and the action you
> recommend. Then tell me whether this should run every morning or remain in
> shadow. Do not use anything we could only know after the customer window.

Opening artifacts should include:

- the selected branch, branch-local cutoff, and today's remaining appointment
  roster with outcome and final-status fields withheld;
- the previous retrospective spreadsheet built from
  `field_ops.work_order_analytics`;
- a 07:25 operations bulletin containing the approved current weather and road
  snapshot, staff review capacity, and the cost assumptions for missed windows,
  unnecessary contacts, dispatcher review, and emergency rerouting;
- a one-page service promise defining a breach as no first technician arrival on
  or before the booked `scheduled_end_at`; and
- an intervention menu that distinguishes customer contact, dispatcher review,
  route change, overtime request, and no action.

The scenario pack should select one affected branch with enough remaining
appointments to make prioritization meaningful. All displayed times should be
normalized to the branch timezone while retaining UTC or source timestamps in
the analytical artifacts.

## Data neighborhood

The learner may search the full catalog. These are nearby assets, not a required
feature list.

| Asset | What one row means | Why it may matter | Important caution |
|---|---|---|---|
| `field_ops.appointment` | One booked customer service window | Defines booking lead time, promised start/end, branch, appointment type, and channel | `storm_disruption_flag` describes realized disruption in the frozen estate and is not a legitimate 07:30 predictor. |
| `field_ops.work_order` | One requested unit of field work | Supplies request time, priority, service type, assignment, branch, asset, and source availability | Current status, completion, first-time-fix, and final resolution are post-decision outcomes. The table is caution-rated. |
| `field_ops.work_order_status_event` | One observed work-order status transition | Supports historical backlog and as-of state reconstruction | Direct appointment/event joins multiply appointments. `source_recorded_at`, not only `occurred_at`, controls knowledge time. |
| `field_ops.visit` | One physical or attempted service visit | Supplies the historical arrival label and later operational outcomes | Arrival, departure, travel, onsite time, and visit outcome are labels or post-decision facts, never scoring-time features. Aggregate to first arrival per appointment before joining. |
| `field_ops.work_order_analytics` | One work order in a convenient analytical extract | Tempting source of trailing operational fields | It was generated in January 2026 and co-locates final outcomes with predictors. It is not a point-in-time training mart for this decision. |
| `workforce.shift` | One scheduled employee shift | Provides aggregate planned branch capacity at the morning cutoff | Restricted employee data; a shift is scheduled capacity, not proof of attendance or productivity. |
| `workforce.absence` | One absence episode affecting a shift | May explain known reductions in same-day capacity | Highly restricted and lacks a general warehouse-availability clock. Use only the approved 07:25 aggregate roster snapshot, not raw categories or employee-level model features. |
| `workforce.employee_role_history` | One effective-dated role assignment | Identifies technicians and correct branch at historical feature time | Current employee attributes are not historical role or branch assignment. Individual identity is unnecessary for the primary capacity model. |
| `workforce.skill_certification` | One employee-product certification period | Optional feasibility check for proposed reassignment | Certification validity does not prove availability, and the table is restricted. Use for action feasibility after risk estimation rather than as a performance proxy. |
| `external.traffic_area_hourly` | One provider revision for a sampled service-area hour | Historical and current traffic pressure can affect route feasibility | Some hours have revised observations and there is no general provider-availability timestamp. Use the approved current snapshot and state a conservative historical revision policy. |
| `external.weather_hourly` | One station-hour observation | Supports historical weather exposure and the storm timeline | Later same-day observations are future information. Multiple stations per region require deliberate aggregation. |
| `external.weather_station` | One weather station | Maps weather observations to operating regions | Regional proximity is not an appointment-specific forecast. |
| `core.branch` | One operating branch | Supplies stable branch-region mapping and timezone | Branch is an operating unit, not a service site or service area. |
| `core.region` | One stable corporate region | Supports weather and holiday mapping | Regional aggregates can hide branch heterogeneity. |
| `core.service_area` | One current dispatch territory | Connects geography, traffic, and default branch | Current territory mappings may not reconstruct every historical assignment without an explicit effective-date rule. |
| `crm.service_site` | One serviceable physical site | Optional geographic and access-context features | Restricted synthetic location data; raw address, coordinates, and access notes are not needed in model outputs. |
| `iot.asset` | One installed physical asset | Product and installation context can support service complexity | Current site/state is not a historical feature without effective installation logic. Serial numbers must not appear in the action queue. |

The approved 07:25 bulletin is a scenario artifact derived at the decision
cutoff. It prevents the learner from pretending that later provider revisions or
raw absence records were available simply because they exist in the frozen
estate.

## Timeline and reveals

Reveals should be triggered by evidence, questions, or timed fallbacks. They
should deepen the decision rather than prescribe a model.

### 1. The retrospective shortcut — opening

The planning manager's spreadsheet uses `completion_hours`,
`final_resolution_code`, and a current technician fix-rate field from
`field_ops.work_order_analytics`. Its retrospective performance is strong. The
catalog shows that the table was generated after the operational period and
contains eventual outcomes.

### 2. What the promise actually means — evidence-triggered or minute 35

Customer Care clarifies that the promise concerns **first arrival by the end of
the service window**, not job completion, first-time fix, or whether the customer
was ultimately satisfied. Multiple later outcomes may matter as guardrails, but
they are not the routing target.

### 3. The history must be replayed — evidence-triggered or minute 75

When the learner builds trailing features, the data owner asks whether every
historical appointment was represented as it looked at 07:30 on its service
date. A backlog count built from current status or status events recorded later
can leak the future even if its SQL uses an apparently historical date column.

### 4. The revised traffic feed — evidence-triggered or minute 110

The traffic provider explains that some area-hours receive a second revision.
The full frozen table does not record a universal revision-availability clock.
For today's call the supplied 07:25 snapshot is authoritative. For historical
features the learner must select and disclose a conservative policy, such as the
first revision only, or omit the feature if its availability cannot be defended.

### 5. Storm-day calibration — after first temporal evaluation

Recent temporal performance looks different from a random split, and the storm
population is outside much of the earlier training distribution. Operations
asks whether a threshold chosen on ordinary weeks can be trusted today. A
weather feature can support risk estimation, but the frozen
`storm_disruption_flag` cannot be used as if it were a forecast.

### 6. The technician-scorecard request — after feature importance review

A branch manager asks for technician names and individual risk rankings. The
model target is an appointment promise affected by window length, route load,
weather, and capacity. The data does not identify an employee's causal effect,
and employee data is restricted. The learner must keep the action at appointment
and operational-capacity grain.

### 7. Prediction is not intervention effect — after threshold selection

The dispatch director asks how many breaches the proactive-call policy will
prevent. Historical data records outcomes under prior operations, not randomized
effects of calls or reroutes. The learner can optimize review under supplied
cost assumptions and capacity, but must describe intervention effectiveness as
an assumption to be tested in shadow or a controlled rollout.

## Authentic work products

1. `appointment_risk_mart.sql`, or an equivalent reproducible SQL asset, producing
   one row per appointment at a declared morning feature time, plus a separate
   matured historical label table.
2. A Python analysis package using scikit-learn pipelines, including a naive
   operational baseline, at least one regularized interpretable model, optional
   nonlinear challenger, temporal validation, calibration analysis, and a
   cost/capacity threshold comparison.
3. A machine-readable feature manifest naming source field, grain, transformation,
   feature timestamp, availability rule, sensitivity, and inclusion rationale.
4. A model/data card stating target, intended use, excluded uses, training and
   validation periods, performance by relevant operational slice, calibration,
   limitations, and current disposition.
5. Today's appointment action queue containing appointment identifier, calibrated
   risk, recommended action, concise operational reason, and review priority—but
   no unnecessary customer location, free text, serial number, or employee score.
6. An intervention contract defining action options, review capacity, cost
   assumptions, threshold logic, human authority, abstention/escalation rules,
   logging, and evidence required to claim benefit.
7. A two-minute 07:30 call brief and a shadow-monitoring specification covering
   coverage, calibration, breaches, false alerts, operational load, drift, and
   customer-impact guardrails.

## Ambiguity and defensible outcome space

There is no mandated algorithm or deployment verdict. Defensible outcomes
include:

- use a calibrated risk ranking only to order a fixed number of dispatcher
  reviews, with no automatic customer action;
- adopt a transparent rule based on window length, current approved storm
  exposure, priority, and branch capacity because it performs comparably to a
  learned model and is easier to operate;
- run the model in shadow because out-of-time or storm-day calibration is too
  uncertain for live thresholding;
- use separate review thresholds by documented operational cost or priority when
  calibration and capacity evidence support them; or
- decline model deployment and improve point-in-time data collection first while
  still delivering a manually usable capacity dashboard.

It is not defensible to use final outcomes or later observations as features,
choose a random split as the only validation, interpret a risk score as an
employee score, automatically reschedule customers from an unvalidated model,
or claim how many breaches an intervention will prevent without intervention
evidence.

## Private instructor truth

The generated estate supports several invariant lessons:

1. **The convenient analytical row leaks.**
   `field_ops.work_order_analytics` is generated in January 2026 and includes
   `first_time_fix_flag`, `final_resolution_code`, and `completion_hours` beside
   trailing features. The frozen `field_ops.work_order` similarly contains
   current/final fields. Those values cannot support a March 20 morning decision.
2. **The target is arrival-window breach.** The clean historical target is based
   on the earliest `field_ops.visit.arrived_at` for an appointment relative to
   `field_ops.appointment.scheduled_end_at`, after sufficient outcome maturation.
   Completion and resolution are different estimands.
3. **Window length and the storm create real signal.** Generated arrival occurs
   around scheduled start, while storm-exposed appointments receive additional
   delay. Wider windows are mechanically less likely to breach. The approved
   weather bulletin is an ex-ante exposure proxy; the realized
   `storm_disruption_flag`, arrival fields, and travel fields are future facts.
4. **The decision population shifts.** March 20 is inside the severe-winter
   event. A model trained and thresholded on ordinary periods may be
   miscalibrated even when its ranking remains useful. Random splitting hides
   this operational shift.
5. **Individual technician identity is not the planted mechanism.** Technician
   assignment is not evidence of causal performance. Historical rates can encode
   work mix and policy. The safe unit of action is the appointment/capacity
   decision, not employee evaluation.
6. **Risk is not treatment effect.** The estate does not identify the causal
   benefit of proactive calls, reroutes, or overtime. The intervention contract
   must frame those effects as assumptions and create a way to learn them.

The strongest submission may use logistic regression, a calibrated tree-based
pipeline, or a simple rule. There is no hidden AUC or required review threshold.
Evaluation should reward point-in-time validity, calibration, capacity/cost
reasoning, restricted-data restraint, and an operationally honest disposition.

This simulation uses the March severe-weather mechanism described by anomaly
`A07` and the work-order fanout risk in anomaly `A14`. It must not expose those
anomaly IDs or mechanisms in the learner workspace.

## Planted traps

- Training directly from `field_ops.work_order_analytics` because it is already
  one row per work order.
- Predicting first-arrival breach with completion, resolution, first-time-fix,
  arrival, travel, onsite, visit outcome, or realized storm fields.
- Using current status to reconstruct a historical 07:30 backlog.
- Filtering events by `occurred_at` but ignoring a later `source_recorded_at`.
- Joining appointments to status events and visits without pre-aggregation.
- Allowing multiple visits or status events to weight an appointment repeatedly.
- Randomly splitting appointments from the full three-year period.
- Calibrating or choosing a threshold on the final temporal test period.
- Treating later traffic revisions as historical morning observations.
- Using raw absence category or employee identity when an approved aggregate
  capacity snapshot is sufficient.
- Selecting a threshold solely from F1 or accuracy while ignoring review
  capacity and asymmetric operational costs.
- Treating predicted breach risk as proof a call or reroute will prevent a
  breach.
- Emitting raw addresses, access notes, serial numbers, or employee rankings in
  the dispatcher queue.

## Scaffold levels

### Supported

- A mart template separates entity key, feature time, availability time, label,
  and label-available time.
- Starter SQL demonstrates one as-of status reconstruction and first-arrival
  label aggregation without supplying the full feature set.
- A Python shell includes `ColumnTransformer`, a dummy baseline, an empty
  scikit-learn pipeline, temporal fold boundaries, and calibration/cost plotting
  functions.
- The feature-manifest, model-card, and intervention-contract templates are
  preloaded.
- A point-in-time validation report identifies offending rows but does not repair
  the learner's mart.

### Guided

- The learner receives the data neighborhood, service-promise definition,
  approved 07:25 snapshot, and cost/capacity sheet.
- Hints appear when manifest fields originate after feature time, train and
  validation dates overlap, or a final-outcome column is selected.
- Feature choice, model family, calibration method, and threshold remain
  learner-owned.

### Independent

- Only the dispatch request, roster, retrospective spreadsheet, operations
  bulletin, service promise, catalog, and open SQL/Python workbench are supplied.
- The learner defines the mart, label-maturation policy, comparison models,
  validation periods, review policy, and disposition.
- A principled rule, shadow-only result, or refusal remains acceptable when the
  evidence supports it.

## Completion criteria

A complete submission:

- defines the appointment-level decision, target, feature time, label time, and
  label-availability rule;
- produces a one-row-per-appointment mart with explicit row-count and join
  reconciliation;
- excludes final outcomes, realized visit facts, later provider revisions, and
  other post-decision information from features;
- reconstructs historical state at comparable morning cutoffs rather than using
  the frozen current extract;
- compares a naive operational baseline with at least one reproducible
  scikit-learn pipeline;
- uses temporal validation and preserves a genuinely untouched forward period;
- evaluates calibration and operationally relevant slices in addition to
  discrimination;
- chooses or declines a threshold using the supplied cost assumptions and review
  capacity rather than a generic classification metric alone;
- separates risk estimation from intervention-effect claims;
- protects restricted customer, location, and employee data;
- produces a usable action queue with human authority and abstention/escalation
  rules; and
- specifies shadow monitoring and evidence that could change the deployment
  disposition.

## Complexity profile

Scale: 1 is foundational and 5 is capstone-level.

| Dimension | Rating | Why |
|---|---:|---|
| SQL | 4 | Point-in-time state, historical rolling features, label maturation, and one-to-many event reconciliation are required. |
| Python | 4 | Learners build reusable preprocessing/model pipelines, temporal evaluation, calibration, threshold analysis, and operational outputs. |
| Data complexity | 5 | Appointment, work order, event, visit, workforce, geography, traffic, and weather clocks interact. |
| Statistical reasoning | 4 | Out-of-time validation, calibration, distribution shift, asymmetric cost, and risk-versus-treatment reasoning matter. |
| Ambiguity | 5 | A simple rule, calibrated model, shadow deployment, or refusal can each be defensible. |
| Deliverable load | 5 | The case requires code, mart, manifest, model card, queue, intervention contract, briefing, and monitoring plan. |

## Deterministic checks

Mechanical checks may validate artifacts and invariants only. They must not
award points for a preferred model, metric value, threshold, or conclusion.

Safe deterministic checks include:

- the submitted mart has exactly one row per declared `appointment_id` and its
  row count reconciles to the learner's documented cohort;
- each feature has a manifest entry, and its declared source/availability time
  is no later than the row's feature time;
- exact forbidden outcome fields—`current_status_code`, `completed_at`,
  `first_time_fix_flag`, `final_resolution_code`, `completion_hours`,
  `arrived_at`, `departed_at`, `travel_minutes`, `onsite_minutes`,
  `visit_outcome_code`, and realized `storm_disruption_flag`—do not appear in the
  submitted feature matrix;
- historical labels are present only when the learner's declared maturation rule
  is satisfied;
- the maximum training decision date precedes the minimum untouched validation
  decision date;
- serialized or inspectable pipelines execute in the fixed environment and emit
  one finite probability in `[0,1]` per scored appointment;
- today's queue contains only in-scope remaining appointments and no duplicate
  appointment IDs;
- proposed automatic actions never exceed the declared review/action capacity
  and conform to the submitted intervention contract; and
- restricted raw fields are absent from the exported action queue.

Unsafe checks include matching a secret probability, requiring a specific AUC,
searching code text for preferred model names, guessing whether prose is
"responsible" from keywords, or treating one cost threshold as universally
correct. Those judgments remain instructor-reviewed under the rubric in
[`checking_policy.md`](../checking_policy.md).

## Curriculum fit

| Curriculum capability | How the work demonstrates it |
|---|---|
| Point-in-time feature engineering | Historical state, feature time, source availability, and label maturation are reconstructed explicitly. |
| SQL data modeling | Event histories and visits are aggregated to a stable appointment grain with reconciliation. |
| Python pipelines | Scikit-learn preprocessing and estimators are packaged reproducibly rather than assembled ad hoc. |
| Model validation | Temporal holdout, calibration, slice analysis, and distribution shift replace random-split accuracy. |
| Decision analysis | Risk is converted into a cost- and capacity-constrained human-review policy. |
| Responsible deployment | Risk prediction, intervention effect, employee evaluation, restricted handling, and shadow evidence are separated. |

## Source anchors

- [`world_bible.md`](../world_bible.md): grain, decision cutoff, event/knowledge
  time, sensitivity, and responsible-refusal rules.
- [`schema_inventory.md`](../schema_inventory.md): appointment, work-order,
  visit, workforce, traffic, weather, geography, and asset grains.
- [`data_catalog.json`](../../catalog/data_catalog.json): caution notes on
  `field_ops.work_order`, `field_ops.work_order_analytics`, and traffic
  revisions, plus field descriptions and sensitivity labels.
- [`relationships.json`](../../catalog/relationships.json): appointment,
  work-order, visit, branch, site, employee, asset, and weather relationships.
- [`anomaly_ledger.json`](../../catalog/anomaly_ledger.json): private authoring
  context for anomalies `A07` and `A14`; never ship it to the learner workspace.
- [`checking_policy.md`](../checking_policy.md): deterministic-check and
  instructor-judgment boundary.
