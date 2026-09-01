# The Analyst checking policy

The Analyst does not automatically grade professional judgment.

Automated checks are allowed only when the result follows from a stable,
machine-observable invariant and the system can explain a failure precisely. A
check must remain valid across every legitimate analytical path supported by the
scenario. If it cannot meet that standard, it is not a check.

## What the system may verify

- the browser query engine started;
- a submitted SQL statement parsed and executed without mutating the estate;
- a named scenario asset loaded and matched its published schema;
- a required handoff artifact exists and is non-empty;
- a file declared as JSON, CSV, SQL, or Markdown is structurally well formed;
- an exact, scenario-authored data-integrity assertion holds in the frozen
  estate, when that assertion is part of the scenario contract rather than a
  preferred student answer; and
- a saved artifact can be reopened from the learner's local session.

These checks verify execution, structure, availability, or preservation. They do
not verify whether the learner asked the right question or reached a defensible
decision.

## What the system must not grade automatically

- whether a metric definition is the best one;
- whether a causal claim is appropriately cautious;
- whether a recommendation is commercially or operationally sound;
- whether uncertainty has been communicated well;
- whether a query used the "right" join when several estimands are defensible;
- whether a narrative contains expected keywords;
- whether a chart tells the right story;
- whether a learner matched a hidden reference number; or
- whether an LLM, embedding score, regex, or heuristic considers an answer
  sufficiently similar to an instructor answer.

These remain human-review decisions supported by the published assessment rubric.

## Prohibited fragile patterns

- keyword or phrase matching in prose;
- regex inspection of SQL as a substitute for examining its results;
- hidden magic-number targets when multiple cohort or denominator choices are
  legitimate;
- point awards for using named methods or libraries;
- model-generated pass/fail judgments;
- silent tolerance bands chosen after seeing student work; and
- a single aggregate score that obscures which mechanical fact was observed.

## Learner-facing language

The interface uses three labels:

- **Recorded** — the system observed an action or artifact.
- **Verified** — a deterministic structural or execution invariant passed.
- **Instructor review** — professional judgment is required.

"Recorded" and "Verified" must never be presented as proof that an analytical
conclusion is correct.

## Release gate for a new check

A proposed check ships only when all of the following are true:

1. Its invariant can be stated in one unambiguous sentence.
2. Its inputs and cutoff are versioned in the scenario contract.
3. Two different defensible analytical approaches cannot cause different pass
   results.
4. Its failure message identifies the exact observed mechanical problem.
5. A learner can inspect what was checked.
6. The check has a test fixture for both pass and fail states.

Failure on any item means the behavior becomes a prompt, hint, instructor note,
or rubric criterion—not an automated check.
