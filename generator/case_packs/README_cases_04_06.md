# Browser packs for progression cases 04–06

This builder owns the learner data extracts for:

- `OP-250320` — Rollback Before Dawn;
- `FO-250320` — The 7:30 Capacity Call; and
- `SP-251201` — Forty-Eight Hours of Stock.

The packs are deterministic projections of the generated Parquet estate. They
are deliberately large enough to support investigation, modeling, and
reconciliation, but together ship about 28.7 MiB rather than the 538 MiB world.

| Case | Parquets | Rows | Bytes | Design boundary |
|---|---:|---:|---:|---|
| Rollback Before Dawn | 14 | 193,898 | 7,205,974 | A balanced 18,000-asset denominator, pre/post firmware telemetry, post-cutoff traps, weather, and complete six-event work-order histories. |
| The 7:30 Capacity Call | 15 | 91,946 | 3,064,869 | All BR0020 appointments, one-to-one visits, six-event histories, revised traffic, regional weather, and a seven-row outcome-withheld live roster. |
| Forty-Eight Hours of Stock | 14 | 1,056,905 | 19,783,206 | The complete compact supply domain plus a 30-pair watchlist, reconciled opening balances, and exact portfolio constraints. |

The learner-served manifests contain actual row counts, byte counts, SHA-256
digests, table mappings, and non-spoiling source cautions. Exact mechanism counts
remain in the authoring validation report rather than the learner workspace.

## Rebuild and validate

From the repository root:

```bash
PYTHONPATH=.vendor /opt/anaconda3/bin/python3 generator/case_packs/build_cases_04_06.py
PYTHONPATH=.vendor /opt/anaconda3/bin/python3 generator/case_packs/validate_cases_04_06.py
```

The validator hashes every shipped Parquet and then checks relational closure
and scenario-specific invariants. Its report is written to:

- `generator/case_packs/reports/cases_04_06_validation.json`
- `generator/case_packs/reports/cases_04_06_validation.md`

The current report is **PASS: 3 cases / 25 checks / 0 failures**.

## Mechanisms retained

Rollback keeps both firmware versions, received/recorded/warehouse clocks,
15,567 incident-window silent cohort assets, later-available failure labels, all
six storm/control regions, and one-to-many operational histories.

Capacity keeps a non-degenerate matured first-arrival target, 393 traffic
area-hours with revisions, frozen-source outcome columns for the leakage
exercise, aggregate action limits, and a privacy-minimized geography bridge.

Supply keeps all 520,000 technical movements, including 2,400 exact linked
replays; 330,000 sparse positions; 11,573 rejected receipt rows; 16,080 split PO
lines; calendar zeros; exact intermittent active days; greater-than-2x winter
and summer peaks; and 1–83-day realized final-receipt lead times.
