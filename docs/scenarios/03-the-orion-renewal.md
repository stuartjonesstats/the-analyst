# The Orion Renewal

> Simulation design brief. The **Private instructor truth** section and reveal
> mechanics are authoring material and must not appear in the learner workspace.

## Simulation card

| Field | Design |
|---|---|
| Learner role | Senior Operations Analyst, Field Operations Strategy |
| Organizational moment | Monday, 2026-01-19, 08:30 ET. Meridian is reviewing eight months of the ORION-2 dispatch optimizer before a vendor-renewal meeting. |
| Initial request | Verify the vendor's claim that ORION-2 improved technician productivity by 12%, recommend whether to renew, and advise whether the result can be used in technician performance goals. |
| Timebox | 3-4 hours; two 90-minute sessions work well for facilitated delivery. |
| Primary level | Intermediate-to-advanced operations analytics and quasi-experimental reasoning |
| Decision pressure | The COO wants a board-ready claim, Procurement needs a renewal recommendation, and Field leadership is considering individual performance targets. |
| Analysis cutoff | Frozen estate extracted 2026-01-15, with operations through 2025-12-31. Late or revised events must be handled according to their documented clocks. |

## Role and organizational moment

ORION-2 replaced Meridian's legacy dispatch rules on 2025-05-01. The vendor's
renewal deck says productivity rose 12%. The COO likes the number. Several branch
managers say the optimizer merely packed more stops onto already strong
technicians, increased rescheduling, and shifted difficult work elsewhere.

The learner owns neither the contract nor the algorithm. Their job is to define
what "worked" should mean, reproduce the claim if possible, determine which
comparisons are descriptive versus causal, and recommend a business action. The
same analysis will be misused for employee evaluation unless the learner draws a
clear boundary.

## Initial request

The COO's chief of staff sends:

> ORION-2 says technician productivity improved 12% after go-live. Please verify
> the number, give Procurement a renew / renegotiate / exit recommendation, and
> tell Field leadership whether we can put this into technician scorecards. I
> need one board slide and the backup analysis by end of day.

Opening artifacts:

- the vendor slide, which defines productivity in a footnote as completed stops
  per planned route hour;
- a Field Operations scorecard using first-time-fix rate and completed work orders
  per scheduled shift;
- a branch-manager email claiming reschedules are being counted as extra stops;
- a renewal decision template with benefits, operational harm, evidence quality,
  and proposed commercial conditions.

The three artifacts intentionally use different outcome definitions.

## Data neighborhood

| Asset | What one row means | Why it may matter | Important caution |
|---|---|---|---|
| `fleet.route` | One vehicle-technician route on one date | Go-live indicator (`optimizer_version`), technician, branch, planned stops, and planned/actual distance | A route is not a completed job or a paid shift. All regions change regime at go-live. |
| `fleet.route_stop` | One work-order stop on one route | Planned/actual arrival, service time, result, route sequence | A work order can appear on multiple routes after rescheduling. Counting rows as completed jobs overstates work. |
| `field_ops.work_order` | One requested unit of work | Demand, priority, assignment, completion, first-time fix, storm disruption, final resolution | Current extract includes post-assignment outcomes. It is caution-rated and not an assignment-time feature table. |
| `field_ops.work_order_status_event` | One status transition | Reconstruct completions, cancellations, and timing | One-to-many; a direct route-stop/status join multiplies rows. |
| `field_ops.appointment` | One booked service window | Customer demand, scheduled window, channel, and disruption flag | Appointments can precede, fail to produce, or be rescheduled across work orders. |
| `field_ops.visit` | One physical or attempted visit | Actual technician, travel, onsite time, outcome, and customer presence | Several visits may relate to operational work; confidential and not identical to route stops. |
| `field_ops.work_order_part` | One product line recorded against a visit | Optional quality/cost consequences and revisit context | Joining parts and histories creates the known work-order fanout trap. |
| `workforce.shift` | One scheduled employee shift | Scheduled capacity and role denominator | Scheduled hours are not necessarily paid or productive hours; restricted employee data. |
| `workforce.absence` | One absence episode affecting a shift | Capacity shocks and selection into routes | Health-adjacent personnel handling should remain aggregated. |
| `workforce.employee_role_history` | One effective-dated role assignment | Correct role and branch at route date | Current employee attributes are not historical assignments. |
| `external.traffic_area_hourly` | One provider revision for a service-area hour | Travel conditions that can affect distance and duration | Some area-hours have revised observations; choose a revision policy. |
| `external.weather_hourly` | One station-hour observation | Weather shocks and seasonality | Requires regional aggregation and deliberate time alignment. |
| `core.branch`, `core.region`, `core.business_calendar` | One branch, region, or calendar date | Geographic and calendar structure | Geography enables stratification but does not create an untreated control after global rollout. |

## Timeline and reveals

### 1. A denominator dispute — opening

The vendor, Field Operations, and Finance each use a defensible-sounding
productivity denominator: planned route hours, scheduled shift hours, and labor
cost. The released estate has scheduled shifts but not a clean paid-labor-cost
fact at the employee-day grain. The learner must select decision-relevant
outcomes and name what cannot be computed.

### 2. Go-live is a regime change — evidence-triggered or minute 35

Profiling `optimizer_version` shows ORION-2 begins on 2025-05-01 and changes route
density and technician-assignment patterns. All six regions switch on the same
date, so a simple region-level difference-in-differences design has no untreated
region. Pre/post trends remain useful descriptive evidence but need stronger
assumptions for causal attribution.

### 3. The reschedule multiplication — evidence-triggered or minute 60

When the learner checks `work_order_id` uniqueness in `fleet.route_stop`, or when
their counts exceed base work orders, the scheduling owner confirms that a work
order can appear on multiple routes after rescheduling. The correct policy may
use the final attempted stop, the first assignment, or a work-order-level outcome
depending on the estimand. There is no universal deduplication rule.

### 4. The employee-ranking request — minute 90 or after a technician table

Field leadership asks for a list of technicians whose performance "fell under
ORION." The optimizer itself changes assignment patterns, route density, priority
mix, and branch exposure. Historical role assignment and scheduled capacity are
available, but protected attributes are intentionally absent. The learner must
decide whether individual ranking is analytically and ethically supported.

### 5. May was not an experiment — evidence-triggered or minute 120

Traffic, weather, demand, and staffing evidence show that pre/post operational
conditions vary. A branch manager also notes a process-learning period after
launch. The harness should not reveal a magic adjustment variable. It should
reward transparent specifications, placebo checks, trend plots, sensitivity
windows, and alternative outcome definitions.

### 6. Procurement needs an action — after first causal conclusion

Procurement asks whether lack of causal proof means the contract should be
terminated. The learner must separate three questions:

1. Did operating measures change?
2. How much of the change can be attributed to ORION-2?
3. What renewal action is sensible under uncertainty, including prospective
   measurement conditions?

## Authentic work products

1. A KPI contract defining the primary outcome and guardrails at stable grains.
   It should distinguish routes, unique work orders, visits, shifts, and customer
   outcomes.
2. A reproducible analysis package with pre/post trends, region/branch
   heterogeneity, reschedule reconciliation, sensitivity windows, and at least
   one falsification or placebo check.
3. A one-slide executive finding that labels descriptive change separately from
   causal attribution and does not repeat an unsupported 12% claim.
4. A two-page renewal recommendation: renew, renegotiate, run a controlled
   extension, or exit, with assumptions and commercial/measurement conditions.
5. A short note to Field leadership explaining whether and how optimizer-period
   data may be used for individual performance management.

## Ambiguity and defensible outcome space

Several business recommendations can be well supported:

- Conditional renewal with holdout branches, phased parameter changes, or a
  switchback design to identify incremental value prospectively.
- Renegotiation around operational guardrails such as reschedules, distance,
  first-time fix, completion delay, and customer-window adherence rather than a
  single vendor productivity measure.
- Renewal based on modest, heterogeneous descriptive improvement and strategic
  value, while explicitly declining to certify the 12% causal claim.
- Exit or limited deployment if a defensible outcome set shows operational harm
  or no benefit large enough to justify risk, even though exact causal magnitude
  remains uncertain.

It can also be defensible to conclude that the historical estate does not identify
a causal ROI while still making a procurement decision. It is not defensible to
treat every route-stop row as a unique completed job, use a single uncontrolled
pre/post ratio as proof, or rank employees on an assignment policy that changed
their work mix.

## Private instructor truth

The generated estate encodes a real optimizer regime change (`A10`): ORION-2
begins 2025-05-01 and alters route density and technician assignment patterns by
region. The estate does **not** encode an easy 12% causal productivity answer.

Key truths:

- Adoption is simultaneous across regions, leaving no clean untreated geographic
  control at go-live.
- A work order frequently appears on more than one route after rescheduling.
  Work-order IDs remain the necessary reconciliation grain for completed work;
  route-stop rows answer a different scheduling-process question.
- Joining work orders to both parts and status histories creates the explicit
  one-to-many fanout anomaly `A14`.
- Assignment, work mix, traffic, weather, capacity, and calendar conditions vary.
  ORION changes who receives what work, so raw technician outcome differences are
  partly policy effects rather than stable employee effects.
- Released data can reveal small or heterogeneous descriptive changes under
  reasonable KPI definitions. Those patterns are evidence, but not a unique
  causal ROI estimate.

The best work often rejects the exact executive claim while proposing a useful
renewal decision and a future identification design. Instructors should accept
different renewal choices when the learner's outcomes, uncertainty, risk
tolerance, and proposed controls form a coherent chain.

## Planted traps

- Accepting the vendor's productivity definition without checking its numerator
  and denominator.
- Dividing route-stop rows by routes and calling the result completed work.
- Joining route stops, work-order status history, and parts before aggregating
  each to a stable grain.
- Deduplicating rescheduled work orders without saying whether first assignment,
  final route, or completed visit answers the question.
- A before/after comparison with no seasonality, trend, or placebo checks.
- Treating region stratification as difference-in-differences when all regions
  adopt together.
- Using current employee or work-order fields as historical predictors.
- Treating scheduled shift hours as paid labor without limitation.
- Selecting only a KPI that improved and ignoring distance, reschedules,
  first-time fix, timeliness, or customer-window adherence.
- Producing named employee rankings from restricted data despite policy-induced
  work-mix changes.
- Equating inability to prove 12% with proof that ORION has zero value.

## Scaffold levels

### Supported

- A KPI worksheet asks the learner to name entity, numerator, denominator,
  event date, completion rule, and guardrail before querying.
- Starter diagnostics compare `count(*)` and `count(distinct work_order_id)` in
  route stops and demonstrate pre-aggregation before a one-to-many join.
- A trend template marks go-live and leaves outcome selection blank.
- The renewal template separates observed change, attributable effect, business
  decision, and proposed measurement plan.

### Guided

- The table neighborhood and the three competing metric definitions are supplied.
- Hints fire on fanout, all-region adoption, or named employee output.
- The learner owns the outcome set, comparison windows, and sensitivity design.

### Independent

- Only the executive request, vendor slide, branch email, catalog, and workbench
  are supplied.
- No hint names interrupted time series, synthetic control, or switchback; those
  are possible tools, not required answers.
- All reasonable procurement outcomes remain available.

## Completion criteria

A complete submission:

- defines at least one primary benefit metric and two material guardrails;
- establishes stable grains before joining route, stop, work-order, visit, and
  workforce data;
- detects and reconciles work orders placed on multiple routes;
- tests and documents fanout with row-count and distinct-key checks;
- identifies the simultaneous go-live and explains what it prevents the analysis
  from identifying cleanly;
- shows pre/post trends and meaningful heterogeneity or sensitivity analysis;
- distinguishes observed operational change from attributable causal effect;
- refuses or safely constrains individual employee ranking;
- makes a concrete renewal recommendation under uncertainty; and
- proposes a prospective design or contract condition that would improve the
  next decision.

## Curriculum fit

| Curriculum capability | How the work demonstrates it |
|---|---|
| Metric design | Competing definitions of productivity are converted into explicit KPI contracts. |
| Join discipline | Route-stop rescheduling and work-order history/parts fanout require pre-aggregation and reconciliation. |
| Quasi-experimental reasoning | Simultaneous adoption, trend, seasonality, heterogeneity, and placebo evidence are evaluated. |
| Temporal modeling | Historical role, assignment, event, and completion states are reconstructed. |
| Decision analysis | Evidence quality and operational value are separated from the procurement action. |
| Fairness and governance | Policy-induced work mix and restricted employee data constrain individual performance claims. |

## Source anchors

- [`world_bible.md`](../world_bible.md): grain, time, relationship, sensitive-data,
  and responsible-refusal rules.
- [`schema_inventory.md`](../schema_inventory.md): fleet, field-ops, external, and
  workforce grains and reliability labels.
- [`data_catalog.json`](../../catalog/data_catalog.json): route-stop rescheduling,
  traffic revision, historical role, and current-work-order warnings.
- [`relationships.json`](../../catalog/relationships.json): route-to-stop,
  stop-to-work-order, visit, employee, branch, and workforce links.
- [`anomaly_ledger.json`](../../catalog/anomaly_ledger.json): private anomalies
  `A10` and `A14`.
