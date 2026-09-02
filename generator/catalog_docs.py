from __future__ import annotations

import json
from collections import Counter, defaultdict
from typing import Any

from config import (
    CATALOG_ROOT,
    COMPANY_NAME,
    DOCS_ROOT,
    EXTRACT_AS_OF,
    WORLD_END,
    WORLD_START,
)


def write_catalog_support_files(builder: Any) -> None:
    """Write human- and machine-readable guides for a generated data estate.

    The function is deliberately independent of ``WorldBuilder.finalize`` so a
    build script can call it once all assets have been registered. Outputs are
    deterministic: no wall-clock generation timestamp is included.
    """

    CATALOG_ROOT.mkdir(parents=True, exist_ok=True)
    DOCS_ROOT.mkdir(parents=True, exist_ok=True)

    catalog = sorted(
        builder.catalog,
        key=lambda item: str(item.get("fully_qualified_name", "")),
    )

    (DOCS_ROOT / "world_bible.md").write_text(
        _world_bible_markdown(catalog), encoding="utf-8"
    )
    (CATALOG_ROOT / "README.md").write_text(
        _catalog_guide_markdown(), encoding="utf-8"
    )
    (DOCS_ROOT / "catalog_glossary.md").write_text(
        _catalog_glossary_markdown(), encoding="utf-8"
    )
    neighborhoods = _build_neighborhoods(catalog)
    (CATALOG_ROOT / "table_neighborhoods.json").write_text(
        json.dumps(neighborhoods, indent=2, sort_keys=False, default=str) + "\n",
        encoding="utf-8",
    )


def _world_bible_markdown(catalog: list[dict[str, Any]]) -> str:
    schemas = sorted({str(item.get("schema", "unknown")) for item in catalog})
    total_rows = sum(_as_int(item.get("row_count")) for item in catalog)
    owners = sorted(
        {
            str(item["owner"])
            for item in catalog
            if item.get("owner") not in (None, "")
        }
    )

    owner_text = ", ".join(owners) if owners else "Not yet assigned"
    schema_text = ", ".join(f"`{schema}`" for schema in schemas) or "None yet"
    return f"""# {COMPANY_NAME} world bible

## Purpose

{COMPANY_NAME} is a synthetic, internally coherent data estate for learning
data work through evidence, judgment, verification, and handoff. It is not a
collection of unrelated exercise files. Tables should be interpreted as parts
of one organization whose definitions, operational processes, limitations, and
history persist across assignments.

All people, organizations, identifiers, events, and records in this estate are
synthetic. They must not be mistaken for production or personally identifiable
data.

## Canonical timeline

- Simulated operational window: **{WORLD_START}** through **{WORLD_END}**.
- Extract-as-of timestamp: **{EXTRACT_AS_OF}**.
- A table's refresh timestamp and its latest event timestamp are different
  concepts. A recent file can still contain delayed events.
- Point-in-time analysis must use information that would have been observable
  by the decision cutoff, not facts added later.

## Current estate footprint

- Registered assets: **{len(catalog):,}**.
- Registered rows: **{total_rows:,}**.
- Schemas: {schema_text}.
- Listed owners: {owner_text}.

These counts describe the current generated snapshot, not a promise that every
asset is relevant to every task.

## World rules

1. **Grain comes before calculation.** Identify what one row represents before
   filtering, joining, grouping, or modeling.
2. **Time is part of the data model.** Distinguish event time, ingestion time,
   effective periods, snapshots, and the time at which a value became knowable.
3. **Relationships are evidence, not permission.** A matching key does not make
   a join valid. Check cardinality, match rate, fan-out, and temporal conditions.
4. **Reliability is use-specific.** A table can be fit for monthly reporting but
   unsafe for a same-day operational decision.
5. **Missing and conflicting values have causes.** Nulls, duplicates, delayed
   updates, and definition changes should be investigated rather than silently
   removed.
6. **Sensitive data remains sensitive.** Use the least detailed data needed for
   the decision and respect preview, export, and aggregation constraints.
7. **Simple, reproducible evidence is valuable.** A defensible baseline and a
   clear limitation are preferable to an impressive result with invalid logic.
8. **Responsible refusal is a valid outcome.** If the available evidence cannot
   support a requested conclusion, document why and propose the next safe step.

## Navigating the estate

Start with the business question, then use the catalog to locate an asset whose
purpose, grain, time coverage, and fitness match that question. Explore its
table neighborhood before searching the whole estate. Neighborhoods show nearby
assets and relationships; they do not identify a single correct analytical
path.

For each candidate asset, ask:

- What does one row represent?
- Who owns the asset, and is it authoritative for this concept?
- What period is covered, and when was the latest event observable?
- What is the current reliability and freshness status?
- What should this asset explicitly not be used for?
- Which fields are sensitive?
- If joined, what row multiplication or unmatched records should be expected?

## Documentation precedence

The generated catalog describes the released snapshot. Quest briefs describe a
stakeholder's request and may be incomplete or mistaken. Observed data is still
evidence that must be profiled and verified. When documentation and observed
behavior disagree, preserve the discrepancy in the decision log rather than
quietly choosing one account.

## Safe learner interpretation

Catalog badges are starting evidence, not truth scores. `verified` means checks
passed for stated uses at the recorded snapshot. It does not certify every
possible use. `internal` does not mean harmless, and synthetic data should still
be handled according to the scenario's stated controls.
"""


def _catalog_guide_markdown() -> str:
    return f"""# {COMPANY_NAME} data catalog

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
"""


def _catalog_glossary_markdown() -> str:
    return """# Sensitivity, reliability, and freshness glossary

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
"""


def _build_neighborhoods(catalog: list[dict[str, Any]]) -> dict[str, Any]:
    by_schema: dict[str, list[dict[str, Any]]] = defaultdict(list)
    known_assets: set[str] = set()
    for item in catalog:
        schema = str(item.get("schema") or "unknown")
        by_schema[schema].append(item)
        fq_name = str(item.get("fully_qualified_name") or "")
        if fq_name:
            known_assets.add(fq_name)

    relationships = _relationships_from_catalog(catalog)
    adjacency: dict[str, set[str]] = defaultdict(set)
    for edge in relationships:
        source = edge["from_table"]
        target = edge["to_table"]
        adjacency[source].add(target)
        adjacency[target].add(source)

    neighborhoods: list[dict[str, Any]] = []
    for schema, items in sorted(by_schema.items()):
        sorted_items = sorted(
            items,
            key=lambda item: str(item.get("fully_qualified_name", "")),
        )
        schema_assets = {
            str(item.get("fully_qualified_name") or "") for item in sorted_items
        }
        schema_assets.discard("")

        internal_edges = [
            edge
            for edge in relationships
            if edge["from_table"] in schema_assets
            and edge["to_table"] in schema_assets
        ]
        cross_edges = [
            edge
            for edge in relationships
            if (edge["from_table"] in schema_assets)
            != (edge["to_table"] in schema_assets)
        ]

        anchor_assets = sorted(
            schema_assets,
            key=lambda name: (-len(adjacency.get(name, set())), name),
        )[:3]

        assets = []
        for item in sorted_items:
            fq_name = str(item.get("fully_qualified_name") or "")
            related = sorted(
                target for target in adjacency.get(fq_name, set()) if target in known_assets
            )
            assets.append(
                {
                    "asset_id": item.get("asset_id"),
                    "fully_qualified_name": fq_name,
                    "table": item.get("table"),
                    "description": item.get("description", ""),
                    "grain": item.get("grain", ""),
                    "row_count": _as_int(item.get("row_count")),
                    "column_count": _as_int(item.get("column_count")),
                    "primary_key": list(item.get("primary_key") or []),
                    "owner": item.get("owner"),
                    "lifecycle": item.get("lifecycle"),
                    "sensitivity": item.get("sensitivity"),
                    "reliability": item.get("reliability"),
                    "freshness": item.get("freshness"),
                    "use_when": item.get("use_when", ""),
                    "do_not_use_when": item.get("do_not_use_when", ""),
                    "quality_notes": list(item.get("quality_notes") or []),
                    "relationship_degree": len(related),
                    "related_assets": related,
                }
            )

        neighborhoods.append(
            {
                "id": f"schema:{schema}",
                "schema": schema,
                "display_name": _display_name(schema),
                "description": (
                    f"Assets registered in the {schema} schema. Start with an "
                    "anchor asset, then reveal related tables as the question requires."
                ),
                "asset_count": len(sorted_items),
                "total_rows": sum(_as_int(item.get("row_count")) for item in sorted_items),
                "owners": sorted(
                    {
                        str(item["owner"])
                        for item in sorted_items
                        if item.get("owner") not in (None, "")
                    }
                ),
                "sensitivity_summary": _count_values(sorted_items, "sensitivity"),
                "reliability_summary": _count_values(sorted_items, "reliability"),
                "freshness_summary": _count_values(sorted_items, "freshness"),
                "anchor_assets": anchor_assets,
                "assets": assets,
                "internal_relationships": internal_edges,
                "cross_neighborhood_relationships": cross_edges,
            }
        )

    return {
        "company": COMPANY_NAME,
        "extract_as_of": EXTRACT_AS_OF,
        "generated_from": "builder.catalog",
        "neighborhood_count": len(neighborhoods),
        "asset_count": len(catalog),
        "relationship_count": len(relationships),
        "neighborhoods": neighborhoods,
    }


def _relationships_from_catalog(
    catalog: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    relationships: list[dict[str, Any]] = []
    seen: set[tuple[Any, ...]] = set()
    for item in catalog:
        source = str(item.get("fully_qualified_name") or "")
        if not source:
            continue
        for foreign_key in item.get("foreign_keys") or []:
            target = str(foreign_key.get("references") or "")
            from_columns = list(foreign_key.get("columns") or [])
            to_columns = list(
                foreign_key.get("referenced_columns") or from_columns
            )
            identity = (
                source,
                tuple(from_columns),
                target,
                tuple(to_columns),
            )
            if not target or identity in seen:
                continue
            seen.add(identity)
            relationships.append(
                {
                    "from_table": source,
                    "from_columns": from_columns,
                    "to_table": target,
                    "to_columns": to_columns,
                    "cardinality": foreign_key.get("cardinality", "many-to-one"),
                    "nullable": bool(foreign_key.get("nullable", False)),
                    "temporal_condition": foreign_key.get("temporal_condition"),
                    "warning": foreign_key.get("warning"),
                }
            )
    return sorted(
        relationships,
        key=lambda edge: (
            edge["from_table"],
            edge["to_table"],
            edge["from_columns"],
        ),
    )


def _count_values(items: list[dict[str, Any]], field_name: str) -> dict[str, int]:
    counts = Counter(str(item.get(field_name) or "unknown") for item in items)
    return dict(sorted(counts.items()))


def _display_name(value: str) -> str:
    return value.replace("_", " ").replace("-", " ").strip().title()


def _as_int(value: Any) -> int:
    if value is None:
        return 0
    return int(value)
