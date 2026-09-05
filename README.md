# The Analyst / Meridian Living Systems data estate

This repository is the data foundation for a hands-on, open-world data-science simulation. It models one synthetic company across three years instead of presenting unrelated exercise datasets.

The first deliverable was deliberately **data-first**: a reproducible generator, linked Parquet files, machine-readable catalog, relationship map, anomaly ledger, world guide, and validation suite.

The browser product is **The Analyst** ([theanalyst.dev](https://theanalyst.dev)). Nine full assignments and a sixteen-brief weekly decision series run in `web/` with Monaco, DuckDB-Wasm, Pyodide, governed relational Parquet packs, local drafts, portable submissions, and publication-reviewed portfolio exports. The complete generated estate remains local and reproducible rather than being committed to Git; the public site ships compact decision populations built from it.

## Current footprint

- 96 Parquet tables
- 16,548,418 rows
- 16 schemas
- 168 declared relationships
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
- [Supply generator invariants](docs/supply_data_invariants.md): exact ledger, receipt, replay, demand, and lead-time guarantees.

## Nine-assignment progression

- [The Monday Scorecard](docs/scenarios/01-the-monday-scorecard.md) — reconcile conflicting support and satisfaction scorecards under executive pressure.
- [The Quarter That Moved](docs/scenarios/05-the-quarter-that-moved.md) — certify a quarter after an acquisition creates identifier, clock, and grain traps.
- [The Navigation Vote](docs/scenarios/06-the-navigation-vote.md) — audit a product experiment without confusing deeper sessions with better customer outcomes.
- [Rollback Before Dawn](docs/scenarios/02-rollback-before-dawn.md) — determine whether firmware, weather, or their interaction explains an apparent device incident.
- [The 7:30 Capacity Call](docs/scenarios/07-the-730-capacity-call.md) — build a point-in-time appointment risk operation under storm capacity constraints.
- [Forty-Eight Hours of Stock](docs/scenarios/09-forty-eight-hours-of-stock.md) — forecast intermittent demand and convert inventory risk into constrained supply actions.
- [The Orion Renewal](docs/scenarios/03-the-orion-renewal.md) — evaluate a dispatch optimizer without confusing policy-induced selection with productivity.
- [The Queue Nobody Owns](docs/scenarios/08-the-queue-nobody-owns.md) — determine whether a support-routing model is valid enough even for shadow use.
- [Too Good to Ship](docs/scenarios/04-too-good-to-ship.md) — audit a suspiciously excellent account-risk model for temporal and outcome leakage.

The authoring schema is [simulation.schema.json](scenarios/schema/simulation.schema.json). Instructor-only truth is part of source authoring but must be stripped from learner manifests before delivery.

## Sixteen Priority Briefs

Priority Briefs are substantial, self-contained 60–120 minute decisions in a permanent weekly rotation. The sixteen-brief sequence maps to a 16-week term and then repeats while each briefing URL remains permanently available. They do not introduce separate toy tables: every brief reuses an existing Meridian assignment pack and opens it in its own persistence namespace, so brief work cannot overwrite the corresponding full assignment.

The rotation spans metric governance, join grain, missing telemetry, experiment interpretation, forecast judgment, point-in-time leakage, privacy, executive communication, dispatch controls, pricing, preventive-maintenance policy, event semantics, supplier performance, data reliability, process mining, and field-service operations. Each brief has a permanent public URL, exact source register, SQL and Python workbench, multiple professional deliverables, optional stretch, and a spoiler-separated debrief describing defensible approaches rather than one answer.

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
JOIN read_parquet('parquet/crm/account.parquet') a USING (account_id)
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

The public front door includes a nine-assignment progression register, permanent spoiler-free assignment pages, the weekly Priority Brief rotation, pedagogical approach, self-guided manual, and a searchable dictionary for all 96 source tables. Each assignment or brief mounts only its own compact data neighborhood. DuckDB and Python run locally in WebAssembly; learner Python opens named tables through `from analyst import table`, and Matplotlib figures render in the workbench. Source files remain unchanged, drafts stay in browser storage, and no account or upload is required. The complete estate is never downloaded on startup.

At handoff, learners can build a separate GitHub-ready portfolio through an explicit publication review. The exporter omits academic identity, course metadata, scratch notes, raw data, run errors/history, stale figures, and every unselected artifact. The resulting ZIP contains a professional README, source and report folders, approved evidence and figures, a responsive `docs/` portfolio for optional GitHub Pages, a repository preview image, honest reproducibility notes, attribution, and a publication checklist. An optional learner-declared Analytical Field Record can be downloaded for social sharing; it is deliberately not a score, credential, or certification.

The assignment-pack builders, manifests, and exact validators live in `generator/case_packs/`. Together the browser packs contain more than five million rows in about 110 MiB while preserving each assignment's authored mechanisms. The checks cover hashes, row/column contracts, relationship closure, cutoffs, and planted mechanical invariants—not the quality of a learner's conclusion.

The public site is built as a static export and deployed from
`.github/workflows/pages.yml`. It needs no application server or learner account.
For the project-site URL, the workflow sets the repository path for chunks,
Parquets, workers, and internal links, then prepares `web/dist/client` as the
Pages artifact. The `theanalyst.dev` domain can switch those path values
to the domain root without changing the application architecture.

When a learner wants outside AI help, the workbench can create a separate,
reviewable Markdown context file. It includes the assignment brief, runtime
rules, relevant table dictionary, revealed workplace messages, and only the
worksheet material the learner selects. The site creates the file locally and
does not upload or send it. This help packet is deliberately narrower than a
formal `.analystcase` submission or portfolio archive; see
[`docs/ai_context_packet.md`](docs/ai_context_packet.md).

## License

The Analyst uses a split license so the software can remain genuinely open
source while the educational work is protected from commercial repackaging:

- Software source code is available under the MIT License.
- Assignments, instructor materials, scenario content, catalogs, and synthetic
  data are available under CC BY-NC 4.0 plus an additional permission for
  teaching and academic use, including tuition-supported college, university,
  and boot-camp courses.
- Selling, sublicensing, or white-labeling the educational materials as a
  commercial product requires separate written permission.

See [LICENSE.md](LICENSE.md) for the complete scope, attribution requirement,
academic-use permission, and third-party notice.

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
- Learners can export a versioned `.analystcase` submission containing their SQL, Python, scratch notes, polished final brief, evidence, captured outputs, runtime metadata, and file hashes. The public instructor viewer opens it locally without an account; see [`docs/submission_format.md`](docs/submission_format.md).
