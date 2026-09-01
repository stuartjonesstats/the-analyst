# Meridian Living Systems data estate

This repository is the data foundation for a hands-on, open-world data-science simulation. It models one synthetic company across three years instead of presenting unrelated exercise datasets.

The first deliverable was deliberately **data-first**: a reproducible generator, linked Parquet files, machine-readable catalog, relationship map, anomaly ledger, world guide, and validation suite.

The second phase has now begun under the product name **The Analyst** (`theanalyst.dev`). The first browser vertical slice lives in `web/` and runs a real Monaco + DuckDB-Wasm SQL workbench against a small scenario-specific Parquet pack. The complete generated estate remains local and reproducible rather than being committed to Git.

## Current footprint

- 96 Parquet tables
- 16,548,418 rows
- 16 schemas
- 166 declared relationships
- 10 documented causal/data-quality anomalies
- 564.7 MiB compressed
- largest event table: `growth.web_event` at 1,303,974 rows
- widest table: `platform.account_feature_snapshot` at 213 columns and 165,000 rows

The estate covers:

`core`, `catalog`, `crm`, `commerce`, `billing`, `growth`, `iot`, `field_ops`, `support`, `supply`, `fleet`, `workforce`, `external`, `finance`, `trust`, and `platform`.

## Start here

- [World bible](docs/world_bible.md): company context, chronology, working norms, and caveats.
- [Schema inventory](docs/schema_inventory.md): every table with grain, size, width, and reliability.
- [Catalog glossary](docs/catalog_glossary.md): how to interpret metadata and evidence labels.
- [Data catalog](catalog/data_catalog.json): column-level machine-readable metadata.
- [Relationships](catalog/relationships.json): declared foreign keys and join warnings.
- [Anomaly ledger](catalog/anomaly_ledger.json): instructor-facing defect mechanisms and learning purposes.
- [DuckDB view script](catalog/create_duckdb_views.sql): mounts every Parquet file as a schema-qualified SQL view.
- [Validation report](validation/validation_report.md): structural, key, relationship, and scenario-probe checks.
- [Simulation contract](docs/simulation_contract.md): the portable authoring/runtime boundary.
- [Assessment rubric](docs/assessment_rubric.md): judgment-focused evaluation, including responsible refusal.
- [Checking policy](docs/checking_policy.md): the deterministic-only standard for any automated verification.

## Flagship simulations

- [The Monday Scorecard](docs/scenarios/01-the-monday-scorecard.md) — reconcile conflicting support and satisfaction scorecards under executive pressure.
- [Rollback Before Dawn](docs/scenarios/02-rollback-before-dawn.md) — determine whether firmware, weather, or their interaction explains an apparent device incident.
- [The Orion Renewal](docs/scenarios/03-the-orion-renewal.md) — evaluate a dispatch optimizer without confusing policy-induced selection with productivity.
- [Too Good to Ship](docs/scenarios/04-too-good-to-ship.md) — audit a suspiciously excellent account-risk model for temporal and outcome leakage.

The authoring schema is [simulation.schema.json](scenarios/schema/simulation.schema.json). Instructor-only truth is part of source authoring but must be stripped from learner manifests before delivery.

## Query the Parquet files

DuckDB can query a file directly without importing it:

```sql
SELECT
  status_code,
  count(*) AS work_orders,
  avg(completion_hours) AS mean_completion_hours
FROM read_parquet('parquet/field_ops/work_order_analytics.parquet')
GROUP BY status_code
ORDER BY work_orders DESC;
```

Or join across the estate:

```sql
SELECT
  r.region_name,
  count(*) AS orders,
  sum(o.order_total_cents) / 100.0 AS booked_value
FROM read_parquet('parquet/commerce/order.parquet') o
JOIN read_parquet('parquet/crm.account.parquet') a USING (account_id)
JOIN read_parquet('parquet/core/branch.parquet') b
  ON a.home_branch_id = b.branch_id
JOIN read_parquet('parquet/core/region.parquet') r USING (region_id)
GROUP BY r.region_name
ORDER BY booked_value DESC;
```

Those examples demonstrate access, not answer keys. Before using a table, inspect its declared grain, reliability, time fields, and `quality_notes` in the catalog.

## Reproduce and validate

The generator is deterministic under the fixed master seed in `generator/config.py`.

```bash
python -m pip install --target .vendor -r requirements.txt
PYTHONPATH=.vendor python generator/generate_world.py
PYTHONPATH=.vendor python generator/validate_world.py
```

Generation overwrites Parquet files with the same names; it does not delete unrelated files. On the machine used to create v0, a complete build took roughly 21 seconds.

## Run the browser workbench

```bash
cd web
npm install
npm run dev
```

The connected Monday workbench currently serves only `support.csat_response`, `support.ticket`, and `crm.account` to the browser. DuckDB runs locally in WebAssembly inside a disposable learner workspace; source Parquets remain unchanged, while learner-created local tables and views may be rebuilt on refresh. The complete estate is not downloaded on startup. All nine case files are represented in the learner-safe registry; the remaining case-specific data packs and staged runtime content are the next implementation layer.

## Why the data are messy

The data contain controlled, explainable difficulty rather than random corruption. Examples include:

- an acquired company with legacy identifiers and local-time timestamps;
- a support-system dual-write window with duplicate business interactions;
- a firmware rollout entangled with a severe winter storm;
- a dispatch-policy regime change;
- payment-processor taxonomy drift and a real cutover incident;
- warehouse scanner retries that replay technical events;
- mixed customer-satisfaction scales;
- joins that silently multiply work orders;
- delayed availability clocks and future-outcome leakage fields.

Every planted issue has a mechanism, date range, breadcrumb, and learning objective. Not every surprising pattern is planted; the scale and linked processes also create legitimate ambiguity.

## Deliberate boundaries of v0

- All people, organizations, addresses, messages, credentials, and events are synthetic.
- The accounting ledger is structurally realistic but is not guaranteed to balance by journal.
- Dense analytical snapshots may be sampled rather than complete date spines.
- The catalog is the contract; filenames and convenient columns alone are not sufficient semantics.
- Instructor judgment is not replaced by automatic scoring. The browser may verify only explicit mechanical invariants and artifact presence; the rubric owns analytical quality.
- Learners can export a versioned `.analystcase` submission containing their SQL, Python, notes, evidence, captured outputs, runtime metadata, and file hashes. The public instructor viewer opens it locally without an account; see [`docs/submission_format.md`](docs/submission_format.md).
