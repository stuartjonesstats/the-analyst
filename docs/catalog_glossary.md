# Sensitivity, reliability, and freshness glossary

## Sensitivity

Sensitivity describes handling requirements, not analytical usefulness.

| Label | Meaning | Default handling |
|---|---|---|
| `public` | Approved for public release. | Preview and export are allowed. |
| `internal` | Ordinary organizational data. | Use inside the workbench; do not publish externally. |
| `confidential` | Business-sensitive or identifying data. | Mask previews and restrict raw export. |
| `restricted` | Highly sensitive or specially controlled data. | Role- or purpose-gated; prefer aggregation and prevent row-level export. |

Useful field-level tags include `direct-identifier`, `indirect-identifier`,
`protected-attribute`, `financial`, `health`, `location`, `free-text`,
`credential`, `human-decision`, and `model-output`.

The table-level classification should be at least as restrictive as its most
sensitive field. A safe masked view can have different handling rules, but it
must be registered as a distinct asset or explicitly documented transformation.
Real credentials and secrets must never appear in generated data, samples,
logs, documentation, or learner-visible source code.

## Reliability

Reliability describes present evidence about fitness for stated uses.

| Label | Meaning |
|---|---|
| `verified` | Monitored checks pass and the asset is fit for its documented uses. |
| `caution` | Usable with a displayed limitation or partial-coverage warning. |
| `unreliable` | A known issue materially affects normal use. |
| `unknown` | Monitoring or documentation is insufficient to establish fitness. |

Do not convert these labels into a single numeric trust score. Where available,
show completeness, uniqueness, validity, referential integrity, contract status,
and incident history separately. `verified` never means suitable for every
possible question.

## Freshness

Freshness describes the relationship between expected availability and the
released data snapshot.

| Label | Meaning |
|---|---|
| `current` | Refresh and event coverage are within the documented target. |
| `late` | An expected refresh is delayed but the asset may remain usable with care. |
| `stale` | Available data is outside its normal useful window. |
| `frozen-snapshot` | The asset is intentionally fixed at the estate extract. |
| `frozen` | Updates intentionally ended at a documented point. |
| `unknown` | Expected cadence or latest coverage cannot be established. |

Always distinguish:

- The last successful pipeline refresh.
- The latest event time represented in the records.
- The normal availability lag.
- The analysis cutoff.
- Whether old records can be revised or backfilled.

## Lifecycle

| Label | Meaning |
|---|---|
| `active` | Normal supported asset. |
| `experimental` | Available for exploration but definitions or contracts may change. |
| `deprecated` | Retained for compatibility; use a documented replacement where possible. |
| `frozen` | Intentionally preserved and no longer updated. |
| `unavailable` | Known asset that cannot currently be queried. |

Lifecycle, freshness, reliability, and sensitivity are independent. An active
asset can be stale; a frozen snapshot can be verified; a public table can be
unreliable; and a restricted table can be current.
