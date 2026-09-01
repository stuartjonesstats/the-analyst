# The Navigation Vote

> Simulation design brief. The **Private instructor truth** section, reveal
> mechanics, and reference checks are authoring material and must not appear in
> the learner workspace.

## Simulation card

| Field | Design |
|---|---|
| Learner role | Product Experimentation Analyst supporting Digital Product and Growth Science |
| Organizational moment | Monday, 2025-05-05, 09:10 ET. The `mobile_navigation` experiment ended on April 30, and Product wants an immediate rollout vote before the next application release is locked. |
| Initial request | Verify the claimed engagement lift, determine whether it has commercial meaning, quantify uncertainty and guardrails, and recommend ship, hold, scope, or retest. |
| Timebox | 8-12 hours for a prepared learner; 12-18 hours for a true beginner. It works as one Saturday investigation plus two evening analysis/review sessions. |
| Primary level | Intermediate experimentation, statistical inference, and product judgment |
| Decision pressure | The release branch closes at 15:30. UX sees a clear navigation win, Growth wants a positive result in the quarterly readout, and Finance sees no obvious increase in attributable orders. |
| Analysis cutoff | 2025-05-05 09:00 ET. Only assignments, sessions, events, and conversions available to the warehouse by that time may enter the frozen readout. |

## Complexity profile

| Dimension | Profile |
|---|---|
| Workload band | **Decision case** -- a predeclared experiment, multiple plausible outcomes, uncertainty analysis, and a consequential rollout recommendation |
| Expected effort | 8-12 prepared hours; 12-18 beginner hours |
| Core data breadth | Six assets across growth, commerce, and CRM |
| Technical mode | SQL for the analysis mart; Python for inference, visualization, sensitivity, and power |
| Code depth | Assignment-grain extraction, diagnostic functions, effect estimates and intervals, bootstrap/cluster sensitivity, and reproducible appendices |
| Judgment depth | Distinguish a real movement in the primary metric from user benefit, commercial value, equivalence, and post-hoc storytelling |
| Authentic artifacts | Five: SQL mart, Python analysis, metric/guardrail table, exploratory appendix, and rollout memo/retest plan |
| Available scaffolds | Supported, Guided, and Independent |
| Review mode | Deterministic cohort checks plus instructor review of estimands, inference, product meaning, and recommendation |

## Role and organizational moment

Meridian's app team tested a revised navigation treatment intended to help
customers reach useful product and service content with less effort. The Growth
dashboard shows higher pages per session in treatment. UX calls that deeper
discovery. A Finance partner points out that attributable order conversion looks
nearly unchanged. The experiment name says “mobile,” but the intake brief does
not state whether eligibility was actually limited to mobile sessions.

The learner is asked to chair the evidence portion of the rollout vote. They are
not being asked to find a statistically significant number or declare a universal
winner. They must reconstruct the declared experiment, keep assignment grain
intact, quantify effects and uncertainty, decide whether more page views indicate
value or friction, and prevent exploratory segment results from becoming
retrospective promises.

## Initial request

The Product Director writes:

> The new mobile navigation increased engagement, and I want it in this week's
> release. Please verify the lift, tell us whether it means customers navigated
> better, and check that we did not hurt conversion or any important segment. I
> need a ship, hold, scoped release, or retest recommendation before 15:30. If
> the experiment cannot answer one of those questions, tell me exactly what it
> can answer and what the next test must change.

Opening artifacts should include:

- `navigation_readout.pdf`, showing a treatment/control pages-per-session bar
  chart without distributions or uncertainty;
- `finance_conversion_check.csv`, listing raw attributable order counts by
  variant but no denominator, interval, or conversion window;
- `experiment_intake.md`, describing a “mobile navigation simplification” and
  naming pages per session as the primary metric;
- a UX note that interprets additional page views as discovery rather than
  friction; and
- the release cutoff plus a reminder that the test was randomized at session
  grain.

The opening result should be directionally correct but semantically incomplete.
The learner should be able to reproduce it without being rewarded for stopping
there.

## Data neighborhood

| Asset | What one row means | Why it may matter | Important caution |
|---|---|---|---|
| `growth.experiment` | One registered experiment | Declared dates, assignment unit, primary metric, and status | Registry metadata does not contain assignment or outcomes. The experiment name is not an eligibility rule. |
| `growth.experiment_assignment` | One experiment-session assignment and first exposure | Variant, session, optional account, assignment/exposure time, and availability | The declared unit is session. Filtering to observed events can change the intent-to-treat population. |
| `growth.session` | One digital session | Device, channel, event count, duration, attributable order, start time, and availability | `visitor_id` is not a person. Account can be null, and repeated accounts can contribute several sessions. |
| `growth.web_event` | One ordered event within a session | Page sequence and event type for diagnosing what “more pages” represents | Event volume is itself an outcome. Joining events directly to assignments weights deeper sessions more heavily. |
| `commerce.order` | One canonical order | Captured attributable order value and order context for a commercial sensitivity | Only orders linked from sessions are attributable here. Do not convert a secondary exploratory metric into the declared primary outcome. |
| `crm.account` | One customer account | Optional account-type or lifecycle context and cluster sensitivity | Anonymous sessions have no account. Current account fields are not necessarily pre-treatment covariates at session time. |

The catalog should be visible from the start. No learner-facing artifact should
state the encoded treatment effect, preferred inference method, or expected
decision.

## Python and SQL roles

### SQL owns the intent-to-treat analysis mart

SQL should establish one auditable row per experiment-session assignment:

- isolate `mobile_navigation` from the registry and enforce declared dates;
- preserve all eligible assignments under the availability cutoff, including
  sessions with no convenient downstream event match;
- join session outcomes without multiplying assignment rows;
- reduce web events to session-level diagnostics before joining;
- attach attributable order facts at most once per session; and
- retain device, channel, account-presence, exposure, and availability fields
  needed for diagnostics and exploratory sensitivities.

### Python owns statistical reasoning and decision evidence

Python should be used to:

- profile allocation, missingness, device eligibility, and outcome distributions;
- calculate treatment effects in original units and useful relative terms;
- report uncertainty intervals rather than only p-values;
- use bootstrap or other justified inference for skewed session outcomes;
- test cluster-aware sensitivity for repeated accounts without silently dropping
  anonymous sessions;
- visualize distributions, effect estimates, and practical thresholds;
- distinguish primary, guardrail, and exploratory analyses in code and output;
- estimate power or minimum detectable effect for a conversion guardrail; and
- make the complete analysis rerunnable with a fixed seed where randomness is
  used.

SQL and Python should meet at a saved assignment-grain mart. Learners should not
be forced to implement every statistic in SQL or rebuild relational joins inside
Pandas when the database already defines them well.

## Timeline and reveals

### 1. The headline reproduces -- opening

The treatment group has more session event depth under the dashboard's
pages-per-session proxy. The allocation is close enough to plausible random assignment that
the learner should continue the analysis rather than dismissing the experiment
as obviously broken.

### 2. “Mobile” was a name, not a filter -- evidence-triggered or hour 1

When the learner profiles `device_type` or compares the intake brief with the
assignment population, they find desktop and tablet sessions in both variants.
The experiment registry declares session assignment but no device restriction.
Product confirms that the feature flag was active across device types even
though the project retained its original mobile working name.

The full-population intent-to-treat estimate remains valid for the population
actually randomized. A mobile-only estimate becomes a subgroup analysis, not a
repair that can be silently substituted for the original result.

### 3. The event join changes the electorate -- evidence-triggered or hour 2

If the learner joins assignments directly to `growth.web_event`, treatment
sessions contribute more rows precisely because the outcome increased. A Growth
engineer points out that assignment was per session, not per event. Event-level
diagnostics must be reduced to session grain or clearly modeled as a different
estimand.

### 4. More navigation may be more work -- evidence-triggered or hour 4

UX supplies several anonymized paths: an added product-detail view can represent
useful discovery, while repeated search and backtracking can represent friction.
The estate supports aggregate path/event diagnostics but does not encode user
intent or satisfaction. The learner must avoid translating “more pages” directly
into “easier navigation.”

### 5. Flat-looking conversion is not equivalence -- after the first readout or hour 6

Finance asks whether the treatment is “proven harmless” because conversion rates
look similar. The experiment was powered and registered around pages per session,
not a non-inferiority margin for conversion. The learner should report the
conversion estimate and interval, discuss the detectable harm, and avoid treating
a nonsignificant comparison as proof of no effect.

### 6. Find us a winning segment -- after the recommendation draft or hour 8

Product asks for device/channel/account slices and wants the “best” one used to
justify a scoped rollout. Exploratory heterogeneity can inform a future test or a
guarded release, but searching many slices after seeing outcomes changes the
evidentiary status. The segment appendix must show denominators, uncertainty,
and its post-hoc role.

### 7. One account, several votes -- optional advanced reveal

Some identified accounts contribute multiple assigned sessions; many sessions
are anonymous. Session is the declared randomization unit, but within-account
behavior may be correlated. A cluster-aware or account-restricted sensitivity
can test robustness. It should not redefine the population without showing what
was lost, especially the anonymous share.

## Authentic work products

1. `navigation_experiment_mart.sql`, producing one row per assignment with
   declared primary outcome, commercial guardrail, device/channel context,
   availability fields, and session-level event diagnostics.
2. `navigation_vote_analysis.ipynb` or an equivalent Python report containing
   allocation and missingness checks, effect sizes, uncertainty intervals,
   distribution plots, justified resampling/cluster sensitivity, and
   reproducibility controls.
3. A metric and guardrail table naming each estimand, population, unit,
   numerator/denominator or statistic, time window, practical threshold,
   uncertainty method, and evidentiary role.
4. An exploratory segment appendix that reports all examined slices, sample
   sizes, uncertainty, and multiplicity/post-hoc limitations rather than only
   the most favorable subgroup.
5. A rollout memo with a concrete ship, hold, scope, or retest recommendation;
   what the experiment supports; what it cannot establish; monitoring or
   rollback conditions; and, if needed, a powered next-test design.

## Ambiguity and defensible outcome space

The case deliberately supports more than one professional decision:

- ship broadly with monitoring if the engagement effect is material, the
  conversion interval rules out unacceptable harm under a stated tolerance,
  and additional navigation is judged useful enough to warrant release;
- run a reversible, scoped rollout while collecting stronger path, task-success,
  or satisfaction evidence, without calling a post-hoc subgroup confirmatory;
- hold and retest because pages per session is too ambiguous a success metric or
  the conversion interval remains too wide for the business risk;
- ship the interaction change while rejecting the proposed “customers navigate
  more easily” claim; or
- replace the success metric in a future experiment with task completion,
  time-to-destination, or another predeclared measure closer to user value.

It is not defensible to count event rows as independent observations, remove
non-mobile assignments after seeing results without relabeling the analysis,
call nonsignificant conversion evidence of equivalence, present a selected best
segment as preplanned, or translate a page-depth effect into customer benefit
without additional evidence.

## Private instructor truth

The generated estate contains a deliberately interpretable but nontrivial
experiment:

1. `growth.experiment` identifies `EXP005`, `mobile_navigation`, running
   2025-01-01 through 2025-04-30 with `pages_per_session` as the primary metric
   and session as the assignment unit.
2. Treatment produces a real increase in session event depth, which the opening
   dashboard uses as its pages-per-session proxy. Reproducing positive movement
   in that maintained depth measure is expected, but the exact effect or p-value
   is not a grading target and the estate does not label human task success.
3. The experiment includes mobile, desktop, and tablet sessions. The word
   “mobile” in the experiment name does not constrain eligibility.
4. Attributable order conversion was not generated with a corresponding
   treatment effect. Sample differences can exist, but the experiment does not
   establish equivalence or rule out every commercially meaningful harm.
5. `growth.web_event` is one-to-many from session, and treatment sessions have
   more events by design. Direct assignment-to-event analysis creates
   outcome-dependent weighting and exaggerates precision.
6. Some accounts appear in multiple sessions and account is nullable. Session is
   still the registered assignment unit; account-clustered or identified-only
   analyses are sensitivities whose population consequences must be visible.
7. The data supports path and segment exploration but does not label whether an
   additional page was useful discovery, confusion, or friction.

There is no instructor-mandated rollout decision. The strongest work preserves
the randomized estimand, reports the genuine primary movement, refuses semantic
and equivalence overclaims, and makes a decision consistent with an explicit
risk tolerance and next-evidence plan.

## Planted traps

- Filtering to mobile because of the experiment name and calling the resulting
  subgroup the original intent-to-treat population.
- Joining assignments directly to web events and treating event rows as
  independent observations.
- Comparing total page views rather than a session-level estimand.
- Dropping sessions with no downstream event or order match from the denominator.
- Treating attributable-order count as conversion rate without the assignment
  denominator.
- Reporting only relative lift without the absolute effect and distribution.
- Using only a p-value and omitting practical magnitude and uncertainty.
- Calling a nonsignificant conversion result “no harm” or “equivalent.”
- Treating session duration as independent corroboration when it partly grows
  mechanically with event depth.
- Searching device/channel/account segments and reporting only the largest
  positive estimate.
- Clustering by `visitor_id` as if it were a stable person identifier.
- Excluding anonymous sessions to enable account analysis without stating the
  population change.
- Letting warehouse-late assignments or outcomes drift into a frozen rerun.
- Choosing a rollout position first and selecting the analysis that supports it.

## Scaffold levels

### Supported

- The workbench opens on the experiment registry and assignment table with grain
  and cardinality displayed inline.
- A starter SQL mart retains all assignments and leaves session/event reductions
  and cutoff logic incomplete.
- Python templates provide function signatures for allocation, effect/interval,
  bootstrap, and minimum-detectable-effect analysis without implementing them.
- The metric table labels primary, guardrail, and exploratory rows but leaves
  definitions and tolerances blank.
- A reveal warns about row multiplication after a direct event join.

### Guided

- The learner receives the data neighborhood, experiment intake, and blank
  metric/decision templates.
- Hints appear on device eligibility mismatch, assignment/event fanout,
  denominator loss, or conversion-equivalence language.
- The learner chooses estimators, plots, clustering sensitivity, commercial
  tolerance, and next-test design.

### Independent

- Only the Product request, opening readout, Finance count, experiment intake,
  catalog, cutoff, and SQL/Python workbench are supplied.
- Evidence-based stakeholder questions can unlock reveal messages.
- No hint mandates a t-test, bootstrap, regression adjustment, cluster method,
  power convention, or rollout answer.

## Completion criteria

A complete submission:

- reconstructs the registered experiment, dates, assignment unit, and primary
  metric rather than inferring them from the project name or dashboard;
- builds and reconciles an assignment-grain intent-to-treat population under the
  frozen availability cutoff;
- profiles allocation, missingness, devices, account presence, and outcome
  distributions by variant;
- prevents web-event fanout from weighting deeper sessions as additional
  experimental units;
- reports primary and guardrail effects in interpretable units with justified
  uncertainty;
- distinguishes a real pages-per-session effect from a claim about navigation
  ease, user value, or commercial benefit;
- treats conversion uncertainty as uncertainty rather than proof of equivalence;
- labels segment analyses as exploratory, shows all examined slices, and avoids
  winner-only reporting;
- examines repeated-account/anonymous-session consequences in proportion to the
  decision;
- provides reproducible SQL and Python with row-count, key, cutoff, and seed
  controls; and
- makes a concrete rollout or retest recommendation whose monitoring and claims
  match the evidence.

## Safe mechanical checks

The harness may verify only stable, method-independent properties:

- the saved analysis mart contains no more than one row per
  `experiment_id`/`session_id` assignment;
- assignment counts reconcile to the frozen eligible population and excluded
  records have explicit reason codes;
- all admitted inputs satisfy the declared warehouse-availability cutoff;
- variant values, experiment identifier, date window, and assignment unit match
  the registry;
- the saved assignment mart remains one row per experiment/session after event
  and order fields are attached, with source and output row-count reconciliation;
- primary, guardrail, and exploratory outputs carry explicit machine-readable
  role labels and denominators;
- device composition and missing-account counts are present in the diagnostic
  artifact;
- randomized Python procedures declare a seed and reproduce saved tables from a
  clean run; and
- learner assets contain no instructor-only truth or reveal metadata.

The harness must **not** require one p-value, confidence interval implementation,
bootstrap scheme, cluster estimator, minimum detectable effect, segment set,
chart, or rollout answer. It must not use keyword matching to decide whether a
learner understands intent-to-treat, equivalence, or product meaning. It must not
grade against the encoded treatment effect as a hidden target. Instructors review
the estimand, method suitability, semantic claims, risk tolerance, and decision
as a connected evidence chain.

## Curriculum fit

| Curriculum capability | How the work demonstrates it |
|---|---|
| SQL and APIs/data access | Registry, assignments, sessions, events, and orders become a stable, cutoff-aware analysis mart. |
| Pandas and NumPy | Allocation, missingness, distributions, resampling inputs, and reproducible output tables are manipulated programmatically. |
| Statistical inference | Effect magnitude, uncertainty, skew, clustering sensitivity, power, and minimum detectable effects inform a decision. |
| Experimental design | Assignment unit, intent-to-treat population, predeclared outcome, guardrails, eligibility, and post-hoc analysis remain distinct. |
| Visualization | Distributions and interval plots replace unsupported bar-chart certainty. |
| Metric design | Engagement, task value, conversion, and commercial risk receive separate estimands and evidentiary roles. |
| Critical thinking | A real primary effect is neither dismissed nor automatically promoted into a causal claim about user benefit. |
| Professional communication | The learner gives a release team a bounded decision, monitoring conditions, and a better next-test design. |

## Source anchors

- [`world_bible.md`](../world_bible.md): grain, event/knowledge time,
  relationship, reproducibility, and responsible-claim rules.
- [`schema_inventory.md`](../schema_inventory.md): growth, commerce, and CRM
  asset grains and reliability labels.
- [`data_catalog.json`](../../catalog/data_catalog.json): experiment,
  assignment, session, event, order, and account descriptions, columns, and
  quality warnings.
- [`relationships.json`](../../catalog/relationships.json): assignment-to-session,
  event-to-session, session-to-order, and account relationship cardinalities.
- [`domain_transactions.py`](../../generator/domain_transactions.py): private
  source for the experiment registry, assignment process, and encoded navigation
  treatment behavior.
