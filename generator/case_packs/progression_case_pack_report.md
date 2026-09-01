# Progression case-pack build report

Generator revision: `2026.09.01`. Packs retain complete decision populations and all linked child rows; no learner outcome is sampled or simplified.

## CM-240708 / the-quarter-that-moved

- 9 Parquet files
- 212,431 total rows across files
- 6,013,419 compressed bytes (5.73 MiB)
- 13 deterministic validation checks passed

Encoded mechanisms:

- Canonical order IDs remain unique while tenant-local source IDs collide.
- The acquired source representation preserves its shifted clock; original fields are never overwritten.
- Lines, lifecycle events, and shipment events remain separate one-to-many tables so an unsafe join still fans out.
- Captured header and line values reconcile exactly, while 76 records cross the quarter-close availability rollover.
- Opening Finance and fulfillment extracts preserve their weaker key/clock choices alongside the governed sources.

Files:

| Table | Rows | Bytes |
|---|---:|---:|
| `commerce.order` | 18,167 | 785,908 |
| `commerce.order_line` | 32,466 | 941,671 |
| `commerce.order_event` | 54,501 | 1,152,627 |
| `commerce.shipment_event` | 51,036 | 1,242,278 |
| `crm.account` | 15,601 | 257,698 |
| `catalog.product_price_history` | 4,320 | 54,607 |
| `casefiles.q2_commercial_close` | 18,167 | 699,347 |
| `casefiles.q2_fulfillment_review` | 18,167 | 875,651 |
| `casefiles.harborhome_transition_mapping` | 6 | 3,632 |

## GX-250505 / the-navigation-vote

- 9 Parquet files
- 264,967 total rows across files
- 6,490,665 compressed bytes (6.19 MiB)
- 12 deterministic validation checks passed

Encoded mechanisms:

- All 42,000 randomized assignments and 140,670 linked web events are retained.
- Treatment's maintained session-depth movement remains present without labeling additional navigation as benefit.
- Mobile, desktop, and tablet assignments remain in both variants.
- Anonymous assignments and repeated identified accounts remain available for population and clustering sensitivities.
- Opening Product and Finance summaries omit uncertainty or denominators while raw assignment-grain evidence remains complete.

Files:

| Table | Rows | Bytes |
|---|---:|---:|
| `growth.experiment` | 1 | 2,264 |
| `growth.experiment_assignment` | 42,000 | 1,202,049 |
| `growth.session` | 42,000 | 1,396,987 |
| `growth.web_event` | 140,670 | 2,801,683 |
| `commerce.order` | 15,518 | 673,176 |
| `crm.account` | 24,773 | 403,151 |
| `casefiles.navigation_readout` | 2 | 3,076 |
| `casefiles.finance_conversion_check` | 2 | 3,089 |
| `casefiles.experiment_intake` | 1 | 5,190 |

