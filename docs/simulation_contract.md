# Simulation contract

The simulation contract is the portable authoring boundary between scenario
design, the learner workbench, and assessment. A scenario is data, not custom
application code. The canonical schema is
[`scenarios/schema/simulation.schema.json`](../scenarios/schema/simulation.schema.json),
and [`contract-smoke-test.json`](../scenarios/examples/contract-smoke-test.json)
is a deliberately small, non-production fixture.

The contract is intentionally judgment-focused. It can confirm that a query
ran or that a reconciliation was recorded, but it does not reduce an
investigation to matching an answer key. Grain, time, evidence, uncertainty,
and decision quality remain visible assessment dimensions.

## Design principles

1. **Use catalog identities, not local aliases.** Neighborhoods use IDs such as
   `schema:support`; assets use `tbl:support.ticket`; query-facing names use
   `support.ticket`. These match `catalog/table_neighborhoods.json` and
   `catalog/data_catalog.json`.
2. **Treat discovery as part of the work.** An asset can be initially visible,
   discoverable, event-gated, or unavailable. An anchor asset is a navigation
   aid, not an analytically correct starting point.
3. **Keep point-in-time knowledge explicit.** Every scenario declares an
   `analysis_cutoff`. Scenario events may advance the simulation, but they do
   not silently change what was knowable at the original decision time.
4. **Capture an evidence trail.** Artifact submission alone is insufficient.
   The contract can require queries, result snapshots, profiles, join audits,
   source citations, notes, and decision records.
5. **Branch on observable state, never arbitrary code.** Conditions read named
   state facts and use a small operator vocabulary. They cannot execute JavaScript,
   SQL, or template expressions.
6. **Make scaffolding explicit and auditable.** Help is grouped into ordered
   tiers. The default is no scoring penalty; usage can be recorded for learning
   research without treating help-seeking as failure.
7. **Separate signals from judgment.** Machine rules provide evidence, review
   flags, or completion gates. They do not award a conclusion merely because a
   number equals an instructor value.
8. **Treat responsible refusal as a completed professional outcome.** A
   supported refusal can earn full credit when it identifies the unsupported
   claim, supplies evidence, states what can be concluded, and proposes a
   proportional next step.

## Authoring and delivery boundary

The canonical authoring file contains `instructor_only`. It must never be sent
to a learner browser, embedded in a client bundle, stored in learner-visible
local state, or exposed through an unauthenticated endpoint.

A build step should emit two projections:

- **Learner manifest:** all root fields except `instructor_only`; event
  `instructor_note` values must also be removed.
- **Evaluator manifest:** the whole authoring file, access-controlled and
  versioned with the learner manifest.

The build should fail closed if an unrecognized root field appears. The schema
uses `additionalProperties: false` for this reason. A delivery compiler should
also scan learner output for instructor-only anomaly references and known-truth
phrases; schema validation by itself cannot detect accidental answer leakage in
learner-visible prose.

## Contract sections

### Identity and lifecycle

`schema_version` is fixed at `1.0.0` for the first contract. `scenario_id` and
all referenced IDs are lowercase stable identifiers. `status` distinguishes
draft, pilot, published, and retired scenarios. Published scenario revisions
should be immutable: change the scenario revision in source control rather than
quietly changing a live assessment.

`estimated_duration_minutes` describes learner work time, not wall-clock event
duration. Tags are discovery metadata and must not contain answer-bearing hints.

### Learner role and briefing

`learner_context.role` establishes the simulated job, department, seniority,
manager, mandate, and permission boundaries. The mandate should create a real
professional obligation rather than tell the learner which technique to use.

`learner_context.briefing` represents the initial request. It includes channel,
sender, subject, body, requested outcomes, decision deadline, and optional
attachments. Briefings may contain stakeholder pressure or mistaken assumptions,
but a learner is never required to adopt them.

`analysis_cutoff` is the central point-in-time boundary. Authors should separately
consider:

- event time in source records;
- `source_recorded_at` or equivalent source time;
- `warehouse_available_at`, `source_watermark_at`, or other observability time;
- the simulation clock; and
- the stakeholder deadline.

These clocks are not interchangeable.

### Data access and catalog neighborhoods

`data_access.catalog_sources` pins the contract to the estate's three learner-safe
catalog sources:

- `catalog/data_catalog.json`
- `catalog/relationships.json`
- `catalog/table_neighborhoods.json`

`accessible_neighborhoods` controls progressive disclosure:

| Availability | Meaning |
|---|---|
| `initial` | Visible at scenario start. |
| `discoverable` | Available through ordinary catalog exploration. |
| `event-gated` | Hidden until the named event or action unlocks it. |
| `role-restricted` | Known but not queryable under the simulated role. |

`initial_asset_ids` can focus the first catalog view without implying the listed
asset is correct. `asset_access` supplies per-asset exceptions. Its `availability`
is a scenario control and does not replace the catalog's `lifecycle`,
`sensitivity`, `reliability`, or `freshness` classifications.

The harness must enforce `query_policy` together with catalog handling metadata.
For example, setting `allow_row_preview` to true does not make a `restricted`
asset safe to preview without masking. `respect_catalog_sensitivity` is fixed to
true and raw export is a separate permission.

At authoring validation time, every neighborhood ID, asset ID, and fully qualified
name should resolve against the catalog. The schema validates shape and naming;
referential validation is a second pass.

### Events and reveals

The timeline supports four trigger kinds:

- `elapsed-minutes`: relative to scenario start;
- `simulation-time`: a precise simulated date-time;
- `state-condition`: an observable workbench fact;
- `instructor-manual`: a deliberate classroom reveal.

Events execute one or more typed actions: deliver a message, unlock a
neighborhood, unlock an asset, add an attachment, set a scenario fact, request
an artifact, or end the scenario. An event should normally be `once: true`.

Timed messages should change the decision context, supply a realistic
clarification, or create proportionate pressure. They should not merely tell the
learner the hidden answer. When timing is irrelevant, prefer a state condition
or catalog discovery over a theatrical interruption.

### State facts and conditions

Facts are namespaced, harness-owned values. Recommended namespaces are:

| Namespace | Examples | Owner |
|---|---|---|
| `harness.*` | `harness.elapsed_minutes` | Runtime |
| `evidence.<id>.*` | `evidence.join-audit.count` | Evidence log |
| `artifact.<id>.*` | `artifact.decision-brief.status` | Submission service |
| `decision.*` | `decision.mode` | Learner decision record |
| `event.<id>.*` | `event.migration-context.revealed` | Runtime |
| `scaffold.*` | `scaffold.current_tier` | Help system |
| `scenario.*` | `scenario.deadline-changed` | Scenario actions |
| `instructor.*` | `instructor.release-extra-context` | Instructor console |

Conditions combine leaf comparisons with `all`, `any`, or `not`. Fact values
must be produced by trusted runtime components. Do not allow scenario authors to
provide executable expressions or interpolate facts into raw SQL.

When multiple branches are true, evaluate larger `priority` values first. Within
an `exclusive_group`, execute only the first true branch. Branches outside an
exclusive group may all execute. The runtime must record the facts used, selected
branch, action results, and contract revision for replayability.

### Evidence and artifacts

Evidence is a cited unit of analytical support; an artifact is a submitted work
product. They refer to one another through assessment check IDs but are not the
same thing.

Evidence kinds include:

- executable queries and result snapshots;
- data profiles and join audits;
- charts and source citations;
- analysis notes and decision records.

`capture_mode` is `automatic`, `learner-selected`, or `either`. Automatically
captured evidence should preserve the query text, catalog snapshot/revision,
execution timestamp, analysis cutoff, row count, bounded result preview or hash,
and upstream artifact lineage. Capturing every exploratory query as submitted
evidence would reward volume rather than reasoning, so the learner must be able
to curate the final evidence set.

Artifact requirements declare audience, accepted media types, constraints, and
linked checks. The harness should retain intermediate drafts for learning review
but grade the explicitly submitted version.

### Scaffolding tiers

Scaffolds are ordered from least to most directive. Available intervention types
range from orienting questions and catalog pointers to query starters and worked
examples. Production scenarios should generally begin with an independent tier,
then offer conceptual direction before syntax help.

`default_assessment_treatment` should normally be `no-penalty`. A scored
assessment may record usage or impose a disclosed cap only when that is part of
the declared assessment design; it must never silently subtract points per hint.
Scaffold events and timestamps belong in the replay log so instructors can
distinguish conceptual difficulty from interface or syntax difficulty.

### Assessment checks

Each check has a rubric criterion, point weight, method, evidence/artifact links,
and five performance levels. Weights across checks must sum to 100; JSON Schema
cannot enforce this arithmetic, so it is a semantic validation rule.

Methods have deliberately narrow meanings:

- `machine`: structural or deterministic validation only;
- `human`: judgment using the five-level descriptors;
- `hybrid`: machine signals presented to a human evaluator.

A `machine_rule` reads a named signal and produces one of three effects:

- `evidence`: contributes an observation to the evaluator;
- `review-flag`: calls attention to a likely issue without assigning a score;
- `completion-gate`: confirms a minimum operational requirement, such as a
  required artifact being present.

Machine rules must never run author-supplied code. A passing rule is not proof of
analytical correctness. For example, executable SQL can still use the wrong
grain, and a catalog quality check marked PASS covers only the named check.

The shared assessment model is documented in
[`assessment_rubric.md`](assessment_rubric.md).

### Instructor-only truth

`instructor_only` is a map for evaluation, facilitation, and scenario maintenance,
not a single correct response. It contains:

- a concise truth summary;
- causal or measurement claims with confidence and supporting assets;
- known anomalies, preferably linked to `catalog/anomaly_ledger.json`;
- evidence a strong investigation is expected to produce;
- multiple plausible conclusions;
- claims that exceed the evidence; and
- conditions under which responsible refusal is justified.

Authors should distinguish known generator truth from evidence a learner can
actually observe. A hidden causal mechanism is not automatically a fair grading
criterion. If the learner cannot discover it from permitted assets and catalog
clues, it can inform facilitation but should not reduce the score.

## Validation rules beyond JSON Schema

A publish command should fail if any of these checks fail:

1. All IDs are unique within their entity type.
2. Every `revealed_by`, evidence, artifact, and evaluation-check reference
   resolves.
3. Every `schema:*`, `tbl:*`, and fully qualified name resolves to the current
   catalog, and paired asset ID/name values agree.
4. Event-gated neighborhoods and assets have a reachable unlock action.
5. All branches refer only to registered runtime fact namespaces.
6. Assessment weights sum to exactly 100.
7. Assessment levels contain each integer 0 through 4 once.
8. Every required evidence/artifact has at least one associated evaluation check.
9. `responsible-refusal` appears in `completion_modes` when refusal is eligible.
10. Learner projection contains neither `instructor_only` nor `instructor_note`.
11. Attachments exist, use declared media types, and do not escape the scenario
    package directory.
12. Simulation times, the analysis cutoff, and decision deadline are internally
    coherent or the mismatch is intentional and documented for instructors.

Warnings, rather than hard failures, should flag:

- a scenario with only one plausible conclusion;
- all data neighborhoods being initially visible;
- a timed event that contains answer-bearing language;
- a score made entirely from machine checks;
- a scaffold that reveals an exact final query or decision without an explicit
  pedagogical reason; or
- reliance on a catalog asset whose lifecycle, reliability, freshness, or
  sensitivity conflicts with the learner's use.

## Versioning

Contract changes follow semantic versioning:

- Patch: documentation or stricter linting that does not change valid payloads.
- Minor: backward-compatible optional fields or enum additions.
- Major: renamed fields, changed runtime semantics, or new required fields.

The evaluator must load the exact contract revision used during the learner run.
A replay record should include `scenario_id`, scenario source revision,
`schema_version`, catalog manifest hash, learner-visible event log, scaffold use,
submitted artifacts, and evidence lineage.

## Minimal author workflow

1. Copy the smoke-test fixture or a future blank template.
2. Define the job role, decision, cutoff, and data neighborhoods before writing
   events.
3. Write evidence and artifact requirements before assessment checks.
4. Write multiple plausible conclusions and refusal conditions before inserting
   hidden truth.
5. Add branches only where state should materially change the experience.
6. Validate JSON and schema conformance.
7. Run catalog/reference linting and the learner-projection leak check.
8. Pilot with both an independent learner and a scaffolded learner.

The purpose of the contract is to let the website grow around authentic work.
If a scenario requires bespoke application logic that cannot be expressed here,
first ask whether the behavior is genuinely reusable. Reusable behavior should
become a versioned contract feature; one-off theatrics should normally be
removed.
