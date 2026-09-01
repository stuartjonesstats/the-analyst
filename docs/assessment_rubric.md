# Judgment-focused assessment rubric

This rubric evaluates whether a learner performed credible analytical work for a
real decision. It does not award points for matching one hidden number or one
instructor conclusion. A strong conclusion, a qualified conclusion, and a
responsible refusal can each earn 100 points.

The scenario contract may divide a dimension into several checks, but the total
weight for a standard scenario should follow this model.

| Dimension | Weight |
|---|---:|
| Business grain and relationship control | 15 |
| Point-in-time validity | 15 |
| Evidence quality and validation | 10 |
| Reproducibility and lineage | 15 |
| Uncertainty calibration | 15 |
| Professional judgment, including responsible refusal | 20 |
| Decision communication and governance | 10 |
| **Total** | **100** |

For each check, choose the best-supported level from 0 through 4. Points equal
`weight_points × level ÷ 4`. Use the evidence trail and submitted artifacts, not
an impression of effort. If evidence falls between two levels, use the lower
level and record what was missing; the rubric deliberately avoids false scoring
precision.

## 1. Business grain and relationship control — 15 points

This dimension asks whether the learner understood what one row represents,
selected a defensible analytical unit, and controlled multiplicity.

| Level | Descriptor |
|---:|---|
| 0 | Treats physical rows as business entities or events in a way that materially invalidates the result; ignores obvious join multiplication. |
| 1 | Names a grain or duplicate concern but does not test it or quantify its effect. |
| 2 | Uses a plausible grain and some key checks, but leaves a material relationship, many-to-many path, or reconciliation unresolved. |
| 3 | Defines the business grain, profiles key uniqueness, respects relationship cardinality, and reconciles row/entity counts before and after joins. |
| 4 | Meets level 3 and stress-tests alternate grains, temporal relationships, partial coverage, or legitimate repeats; explains whether residual grain risk changes the decision. |

Useful evidence includes primary-key profiles, business-key profiles,
pre/post-join counts, anti-joins, distinct-entity reconciliation, and explicit
use of temporal join conditions. Merely using `COUNT(DISTINCT ...)` is not enough
unless the chosen distinct key represents the intended business unit.

## 2. Point-in-time validity — 15 points

This dimension asks whether the learner used information that could legitimately
have been known at the decision cutoff and interpreted event, source, and
warehouse time correctly.

| Level | Descriptor |
|---:|---|
| 0 | Uses future outcomes, revised current state, or post-cutoff information as if it were available at decision time. |
| 1 | Applies date filters but leaves the analysis cutoff, event-time meaning, or comparison window materially ambiguous. |
| 2 | Defines the cutoff and main periods but misses one relevant lag, backfill, revision, snapshot, or temporal-join issue. |
| 3 | Makes the cutoff explicit; uses coherent event and availability time; reconstructs historical state where needed; and aligns comparison windows to the decision. |
| 4 | Meets level 3 and evaluates sensitivity to availability lag, boundary choices, backfill, temporal coverage, or changing definitions; explains the decision effect. |

The assessment should distinguish a last pipeline refresh, latest represented
event time, normal availability lag, analysis cutoff, and decision deadline.
A model result is not point-in-time valid merely because the feature table has an
`as_of` column; feature source watermarks and outcome leakage still matter.

## 3. Evidence quality and validation — 10 points

This dimension asks whether the evidence is relevant to the claim, supported by
diagnostics, and strong enough for the proposed decision.

| Level | Descriptor |
|---:|---|
| 0 | Provides no auditable support, relies on an unrelated metric, or materially misreads the data. |
| 1 | Provides a headline result with little validation or treats a catalog reliability label or PASS check as universal certification. |
| 2 | Provides relevant evidence and basic diagnostics but leaves a material alternative explanation or data-quality issue untested. |
| 3 | Triangulates the main claim, tests decision-relevant data quality, and separates observed facts from assumptions and interpretation. |
| 4 | Meets level 3 and actively tests credible rival explanations, negative controls, sensitivity, or robustness; identifies evidence that would change the conclusion. |

Evidence volume is not a scoring criterion. A small, well-chosen evidence set is
better than dozens of uncurated query results. Catalog `reliability`, `freshness`,
and `quality_notes` guide investigation but never substitute for use-specific
validation.

## 4. Reproducibility and lineage — 15 points

This dimension asks whether another analyst can recover the population,
transformations, result, and diagnostics without guessing at hidden steps.

| Level | Descriptor |
|---:|---|
| 0 | Relies on unrecorded manual work, non-executable code, or a result that cannot be connected to source assets. |
| 1 | Provides fragments or screenshots but cannot reproduce the reported result end to end. |
| 2 | Core code runs, but parameters, exclusions, metric definitions, or validation steps require reconstruction. |
| 3 | Executable work reproduces the result and key checks; source assets, cutoff, population, and transformations are explicit. |
| 4 | Meets level 3 and adds readable structure, parameters, assertions, deterministic outputs, and concise lineage sufficient for maintenance or peer review. |

Successful execution is only a machine-observable signal. It cannot by itself
earn level 3 or 4 because reproducible work can still reproduce the wrong thing.

## 5. Uncertainty calibration — 15 points

This dimension asks whether the learner's confidence matches the design and
data, and whether limitations are tied to the decision.

| Level | Descriptor |
|---:|---|
| 0 | Makes a categorical or causal claim that the evidence cannot support, or conceals decision-material uncertainty. |
| 1 | Appends generic caveats without connecting them to the estimate, claim, or action. |
| 2 | Identifies material limitations but does not explain their likely direction, magnitude, or consequence. |
| 3 | Calibrates language to evidence; distinguishes descriptive, predictive, and causal claims; and explains which uncertainty matters for the decision. |
| 4 | Meets level 3 and quantifies, bounds, or stress-tests key uncertainty; states what new evidence would materially change confidence or action. |

Do not reward caveat quantity. Reward prioritization. A limitation is useful when
the audience can understand how it affects the claim or decision.

## 6. Professional judgment and responsible refusal — 20 points

This dimension asks whether the learner converted evidence into a proportionate
professional position under organizational constraints.

| Level | Descriptor |
|---:|---|
| 0 | Recommends a materially unsafe, unethical, or unsupported action; fabricates confidence; or complies with an improper request without challenge. |
| 1 | Reports analysis but avoids the decision, or refuses without doing proportionate investigation and without offering a useful alternative. |
| 2 | Gives a plausible recommendation or refusal, but the link between evidence, stakes, alternatives, and action is incomplete. |
| 3 | Makes a clear, proportional, evidence-aligned recommendation, qualified conclusion, or responsible refusal; handles stakeholder pressure without overstating certainty. |
| 4 | Meets level 3 and anticipates consequences, affected parties, reversible options, escalation paths, and the evidence or threshold that should trigger a different decision. |

### Responsible-refusal pathway

Responsible refusal is a positive analytical outcome when the requested claim or
action exceeds the available evidence, violates point-in-time validity, would
misuse sensitive data, or creates disproportionate risk. It carries no automatic
point deduction and does not cap the score.

To earn level 3 or 4, a refusal must include all four elements:

1. **Boundary:** Name the exact claim or action that cannot responsibly be
   supported. Do not reject the entire problem if only one inference is invalid.
2. **Evidence:** Show why the limitation is material, using a proportionate
   investigation rather than intuition alone.
3. **Useful remainder:** State what can be concluded or delivered now, with the
   appropriate qualification.
4. **Next step:** Offer the smallest ethical action that could close the gap,
   reduce risk, or support a reversible decision.

A refusal is weak when it is a shortcut around analysis, a generic disclaimer,
or an insistence on perfect information. A refusal is strong when it preserves
decision value while declining only the unsupported portion of the request.

## 7. Decision communication and governance — 10 points

This dimension asks whether the work product is usable by its declared audience
and respects data-handling obligations.

| Level | Descriptor |
|---:|---|
| 0 | Is materially misleading, exposes prohibited confidential/restricted detail, or obscures the actual decision. |
| 1 | Is difficult to act on, omits the population or metric definition, or uses technical output without audience translation. |
| 2 | Is understandable and mostly compliant but buries the recommendation, evidence, or limitations. |
| 3 | Leads with the decision; defines the metric and population; communicates key evidence and uncertainty concisely; follows catalog sensitivity and export rules. |
| 4 | Meets level 3 and anticipates likely misinterpretation, cleanly separates fact from judgment, and tailors detail and escalation to the audience and stakes. |

Polish is not the same as communication quality. A beautiful chart with an
ambiguous denominator does not score highly; a concise, plain-language brief can.

## Machine checks and human evaluation

Machine checks should be limited to facts the harness can establish reliably,
such as:

- a required artifact exists;
- submitted SQL parses or executes;
- a declared cutoff appears in captured parameters;
- a before/after reconciliation query was captured;
- the evidence record links to source asset IDs;
- a raw export violated a declared policy; or
- a branch or scaffold tier was used.

Machine checks should not decide that:

- the chosen grain is conceptually correct;
- a causal claim is warranted;
- an uncertainty statement is adequate;
- a recommendation is proportional; or
- a refusal is sincere or professionally useful.

Those require human judgment. For hybrid checks, show machine observations to
the evaluator alongside the learner artifact and ask the evaluator to select a
level. Never translate query tokens, keyword matches, number of queries, time on
task, or hint usage directly into quality points.

## Critical review flags

Some observations require adjudication before a score is released:

- use of post-cutoff outcomes or target leakage;
- disclosure or raw export contrary to catalog sensitivity or scenario policy;
- fabricated evidence or a result unsupported by submitted work;
- materially unsafe advice presented with unwarranted certainty; or
- a required artifact that does not execute or cannot be opened.

A flag is not an automatic zero. The evaluator should determine scope and
intent, apply the relevant rubric levels, and record the rationale. A contained
error in one diagnostic should not erase strong work elsewhere; a foundational
grain or time failure may legitimately affect several dimensions because its
consequences propagate.

## Holistic score interpretation

| Score | Interpretation |
|---:|---|
| 90–100 | Decision-ready work with strong validation, calibration, and professional judgment. |
| 75–89 | Credible work that supports action, with bounded gaps or missed robustness opportunities. |
| 60–74 | Partially defensible work; at least one material issue must be resolved before relying on the decision. |
| 40–59 | Major analytical or communication weaknesses make the proposed action unreliable. |
| 0–39 | Evidence and reasoning do not support professional use, or a critical governance failure dominates the work. |

The numerical score is a summary, not the feedback. Evaluators should always
return:

- the strongest demonstrated practice;
- the most decision-material weakness;
- one concrete next improvement; and
- whether the conclusion, qualification, or refusal was proportionate.

Scenario-specific evaluation checks may add detail, but they must preserve the
principle that more than one well-supported conclusion can be excellent work.
