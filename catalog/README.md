# Meridian Living Systems data catalog

This directory contains machine-readable inventory, relationship, neighborhood,
manifest, and anomaly metadata for the generated learning estate.

## Files

- `data_catalog.json`: one record per registered table.
- `relationships.json`: foreign-key and join relationships registered during
  generation.
- `table_neighborhoods.json`: schema-centered, progressively discloseable asset
  neighborhoods derived from the catalog.
- `manifest.json`: file sizes, row counts, hashes, and generated paths.
- `anomaly_ledger.json`: authoring and validation information. This file may
  reveal designed anomalies and should not be exposed in a learner interface.

## Catalog record fields

| Field | Meaning |
|---|---|
| `asset_id` | Stable catalog identifier, normally `tbl:<schema>.<table>`. |
| `company` | Organization represented by the synthetic estate. |
| `schema` | Primary business or technical neighborhood. |
| `table` | Physical table name. |
| `fully_qualified_name` | `<schema>.<table>` reference used in relationships. |
| `asset_type` | Storage or interface type, such as `parquet-table`. |
| `description` | Plain-language account of what the asset represents. |
| `grain` | Mandatory statement of what one row represents. |
| `primary_key` | Field or fields intended to identify a row. |
| `foreign_keys` | Registered links to other assets, including join cautions. |
| `owner` | Department accountable for definitions and operational questions. |
| `lifecycle` | Whether the asset is active, experimental, deprecated, or frozen. |
| `sensitivity` | Table-level handling classification; field-level tags may refine it. |
| `reliability` | Current use-oriented quality status, not a universal trust score. |
| `freshness` | Current update status or snapshot behavior. |
| `use_when` | Representative decisions or analyses the asset can support. |
| `do_not_use_when` | Explicit anti-use cases and important boundaries. |
| `quality_notes` | Known caveats that require interpretation. |
| `row_count` | Rows in the released snapshot. |
| `column_count` | Columns in the released snapshot. |
| `columns` | Physical field names, Arrow types, and observed null profiles for the released snapshot. |
| `relative_path` | Project-relative path to the generated Parquet file. |

Descriptions, grain, `use_when`, and `do_not_use_when` should be understandable
without reading generator source code. A blank anti-use case is not evidence
that an asset is appropriate for every use.

## Column metadata minimum

The generated catalog currently records:

- `name`
- `type`
- `null_count` (the exact count observed in the released snapshot)
- `nullable` (a compatibility boolean derived from `null_count > 0`)

These values describe the frozen release, not an upstream database constraint or
a promise about future extracts. A column with `nullable: false` has zero nulls
in this snapshot; it is not necessarily declared `NOT NULL` in a source system.

When richer semantic metadata is added, prefer these fields:

- `friendly_name`
- `description`
- `unit`
- `null_meaning`
- `valid_values`
- `sensitivity_tags`
- `event_time_semantics`
- `observable_from`
- `safe_example`

`observable_from` is the point at which the value could legitimately have been
known. It supports point-in-time reasoning without labeling a column as an
answer or a leakage trap.

## Foreign-key metadata

Each relationship should document:

- `columns` and `references`
- `referenced_columns`
- `cardinality`
- `nullable`
- `temporal_condition`, where relevant
- `warning`, especially for fan-out, partial coverage, or changing identifiers

A declared relationship does not guarantee complete matches or authorize a
many-to-many join. Learners should profile keys and validate row counts before
and after joining.

## Neighborhood behavior

Neighborhoods are centered on schemas because schemas provide a stable first
layer of discovery. Each neighborhood lists:

- Candidate anchor assets, ranked by relationship connectivity.
- Compact asset cards.
- Internal and cross-neighborhood relationships.
- Owner, sensitivity, reliability, and freshness summaries.

An interface should normally show one seed asset and one or two relationship
hops rather than every table at once. Anchor ranking supports navigation; it
does not declare the analytically correct starting table.

## Authoring versus learner metadata

Keep answer-bearing metadata separate from the catalog shown to learners.
Anomaly intent, expected findings, correct paths, grading rules, and distractor
roles belong in authoring data. Learner-visible metadata should describe the
estate well enough to investigate it without exposing the intended conclusion.
