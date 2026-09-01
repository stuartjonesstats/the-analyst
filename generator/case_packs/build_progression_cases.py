#!/usr/bin/env python3
"""Build and validate the browser data packs for progression cases 02 and 03.

The packs are deterministic slices of the generated Meridian estate. They keep
the full decision population and every linked child row; no outcome-dependent
sampling is used. Run from the repository root with:

    PYTHONPATH=.vendor /opt/anaconda3/bin/python3 \
      generator/case_packs/build_progression_cases.py
"""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

import pandas as pd
import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.dataset as ds
import pyarrow.parquet as pq


ROOT = Path(__file__).resolve().parents[2]
SOURCE_ROOT = ROOT / "parquet"
PUBLIC_ROOT = ROOT / "web" / "public" / "data" / "cases"
REPORT_PATH = Path(__file__).with_name("progression_case_pack_report.md")
REVISION = "2026.09.01"


@dataclass(frozen=True)
class AssetSpec:
    table: str
    filename: str
    source_paths: tuple[str, ...]
    selection: str
    transformation: str = "Source columns preserved; rows sorted deterministically."


def _source(relative_path: str) -> Path:
    return SOURCE_ROOT / relative_path


def _read(relative_path: str, predicate: ds.Expression | None = None) -> pa.Table:
    return ds.dataset(_source(relative_path), format="parquet").to_table(filter=predicate)


def _linked(relative_path: str, key: str, values: Iterable[Any]) -> pa.Table:
    normalized = sorted({str(value) for value in values if value is not None})
    return _read(relative_path, ds.field(key).isin(normalized))


def _sorted(table: pa.Table, keys: list[str]) -> pa.Table:
    if table.num_rows < 2:
        return table
    order = pc.sort_indices(table, sort_keys=[(key, "ascending") for key in keys])
    return table.take(order)


def _table(frame_or_table: pd.DataFrame | pa.Table) -> pa.Table:
    if isinstance(frame_or_table, pa.Table):
        return frame_or_table
    return pa.Table.from_pandas(frame_or_table, preserve_index=False)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _write_asset(
    output_dir: Path,
    spec: AssetSpec,
    frame_or_table: pd.DataFrame | pa.Table,
    sort_keys: list[str],
) -> dict[str, Any]:
    table = _sorted(_table(frame_or_table), sort_keys)
    path = output_dir / spec.filename
    pq.write_table(
        table,
        path,
        compression="zstd",
        compression_level=7,
        use_dictionary=True,
        write_statistics=True,
        row_group_size=32_768,
    )
    return {
        "table": spec.table,
        "file": spec.filename,
        "publicUrl": f"/data/cases/{output_dir.name}/{spec.filename}",
        "pythonPath": f"/data/cases/{output_dir.name}/{spec.filename}",
        "rows": table.num_rows,
        "bytes": path.stat().st_size,
        "sha256": _sha256(path),
        "columns": table.column_names,
        "sourceMapping": {
            "paths": list(spec.source_paths),
            "selection": spec.selection,
            "transformation": spec.transformation,
        },
    }


def _record_check(checks: list[dict[str, Any]], name: str, passed: bool, detail: str) -> None:
    checks.append({"check": name, "passed": bool(passed), "detail": detail})
    if not passed:
        raise AssertionError(f"{name}: {detail}")


def _manifest(
    output_dir: Path,
    case_id: str,
    slug: str,
    files: list[dict[str, Any]],
    checks: list[dict[str, Any]],
) -> dict[str, Any]:
    payload = {
        "format": "theanalyst.browser-case-pack",
        "version": "1.0.0",
        "revision": REVISION,
        "caseId": case_id,
        "slug": slug,
        "selectionPolicy": "Complete decision-window population plus every linked child row; no sampling.",
        "totals": {
            "files": len(files),
            "rows": sum(item["rows"] for item in files),
            "bytes": sum(item["bytes"] for item in files),
        },
        "files": files,
        # Keep answer-bearing validation details out of the public browser pack.
        # Exact assertions remain executable in the generator; the report gives
        # an instructor-facing mechanism summary and the number passed.
        "validation": {
            "passed": all(check["passed"] for check in checks),
            "checkCount": len(checks),
        },
    }
    (output_dir / "manifest.json").write_text(json.dumps(payload, indent=2) + "\n")
    return payload


def build_quarter_pack() -> dict[str, Any]:
    slug = "the-quarter-that-moved"
    output_dir = PUBLIC_ROOT / slug
    output_dir.mkdir(parents=True, exist_ok=True)

    q2 = (ds.field("created_at") >= datetime(2024, 4, 1)) & (
        ds.field("created_at") < datetime(2024, 7, 1)
    )
    orders = _read("commerce/order.parquet", q2)
    order_ids = orders.column("order_id").to_pylist()
    lines = _linked("commerce/order_line.parquet", "order_id", order_ids)
    order_events = _linked("commerce/order_event.parquet", "order_id", order_ids)
    shipment_events = _linked("commerce/shipment_event.parquet", "order_id", order_ids)
    accounts = _linked("crm/account.parquet", "account_id", orders.column("account_id").to_pylist())
    prices = _linked(
        "catalog/product_price_history.parquet",
        "product_id",
        lines.column("product_id").to_pylist(),
    )

    order_frame = orders.to_pandas()
    line_frame = lines.to_pandas()
    order_event_frame = order_events.to_pandas()
    shipment_frame = shipment_events.to_pandas()

    finance_close = order_frame[
        [
            "source_order_id",
            "account_id",
            "source_system",
            "sales_channel",
            "order_status",
            "line_count",
            "subtotal_cents",
            "tax_cents",
            "order_total_cents",
            "created_at",
            "source_recorded_at",
            "warehouse_available_at",
        ]
    ].copy()
    finance_close.insert(0, "finance_extract_row", range(1, len(finance_close) + 1))

    fulfilled = (
        order_event_frame.loc[order_event_frame["event_type"] == "order_fulfilled"]
        .sort_values(["order_id", "event_sequence"])
        .drop_duplicates("order_id")
        [["order_id", "source_recorded_at", "warehouse_available_at"]]
        .rename(
            columns={
                "source_recorded_at": "fulfillment_source_recorded_at",
                "warehouse_available_at": "fulfillment_warehouse_available_at",
            }
        )
    )
    delivered = (
        shipment_frame.loc[shipment_frame["event_type"] == "delivered"]
        .sort_values(["order_id", "occurred_at"])
        .drop_duplicates("order_id")
        [["order_id", "source_recorded_at", "warehouse_available_at"]]
        .rename(
            columns={
                "source_recorded_at": "delivery_source_recorded_at",
                "warehouse_available_at": "delivery_warehouse_available_at",
            }
        )
    )
    fulfillment_review = (
        order_frame[
            [
                "order_id",
                "source_order_id",
                "source_system",
                "created_at",
                "source_recorded_at",
                "warehouse_available_at",
            ]
        ]
        .merge(fulfilled, how="left", on="order_id", validate="one_to_one")
        .merge(delivered, how="left", on="order_id", validate="one_to_one")
    )
    fulfillment_review["reported_processing_minutes"] = (
        (fulfillment_review["source_recorded_at"] - fulfillment_review["created_at"])
        .dt.total_seconds()
        .div(60)
        .round()
        .astype("int64")
    )
    fulfillment_review["reported_fulfillment_minutes"] = (
        (
            fulfillment_review["fulfillment_source_recorded_at"]
            - fulfillment_review["source_recorded_at"]
        )
        .dt.total_seconds()
        .div(60)
        .round()
        .astype("Int64")
    )

    transition_mapping = pd.DataFrame(
        [
            ("local_order_number", "source_order_id", "mapped", "Tenant namespace not carried in initial corporate export."),
            ("tenant_namespace", None, "not supplied", "Field appears in legacy documentation but not the extract."),
            ("order_number", "order_id", "generated", "Corporate warehouse identifier assigned during ingestion."),
            ("order_timestamp", "source_recorded_at", "mapped", "Source time-zone convention not documented in workbook."),
            ("booked_amount", "order_total_cents", "mapped", "Currency is stored separately; amount is in minor units."),
            ("load_complete_time", "warehouse_available_at", "mapped", "Warehouse availability field supplied by platform ingestion."),
        ],
        columns=["legacy_field", "corporate_field", "mapping_state", "transition_note"],
    )

    assets: list[tuple[AssetSpec, pd.DataFrame | pa.Table, list[str]]] = [
        (
            AssetSpec("commerce.order", "commerce_order.parquet", ("parquet/commerce/order.parquet",), "created_at in [2024-04-01, 2024-07-01)"),
            orders,
            ["order_id"],
        ),
        (
            AssetSpec("commerce.order_line", "commerce_order_line.parquet", ("parquet/commerce/order_line.parquet",), "order_id belongs to selected Q2 order population"),
            lines,
            ["order_id", "order_line_id"],
        ),
        (
            AssetSpec("commerce.order_event", "commerce_order_event.parquet", ("parquet/commerce/order_event.parquet",), "order_id belongs to selected Q2 order population"),
            order_events,
            ["order_id", "event_sequence", "order_event_id"],
        ),
        (
            AssetSpec("commerce.shipment_event", "commerce_shipment_event.parquet", ("parquet/commerce/shipment_event.parquet",), "order_id belongs to selected Q2 order population"),
            shipment_events,
            ["order_id", "occurred_at", "shipment_event_id"],
        ),
        (
            AssetSpec("crm.account", "crm_account.parquet", ("parquet/crm/account.parquet",), "account_id belongs to selected Q2 order population"),
            accounts,
            ["account_id"],
        ),
        (
            AssetSpec("catalog.product_price_history", "catalog_product_price_history.parquet", ("parquet/catalog/product_price_history.parquet",), "product_id appears on a selected Q2 order line"),
            prices,
            ["product_id", "channel_code", "effective_from", "product_price_id"],
        ),
        (
            AssetSpec(
                "casefiles.q2_commercial_close",
                "q2_commercial_close.parquet",
                ("parquet/commerce/order.parquet",),
                "Finance-style projection of selected Q2 orders; canonical order_id intentionally absent",
                "Flat attachment retains source key, captured amounts, and all three exposed clocks.",
            ),
            finance_close,
            ["source_system", "source_order_id", "finance_extract_row"],
        ),
        (
            AssetSpec(
                "casefiles.q2_fulfillment_review",
                "q2_fulfillment_review.parquet",
                ("parquet/commerce/order.parquet", "parquet/commerce/order_event.parquet", "parquet/commerce/shipment_event.parquet"),
                "Selected Q2 orders with first recorded fulfillment and delivery milestones",
                "Attachment reproduces source-clock duration fields while retaining component timestamps for audit.",
            ),
            fulfillment_review,
            ["order_id"],
        ),
        (
            AssetSpec(
                "casefiles.harborhome_transition_mapping",
                "harborhome_transition_mapping.parquet",
                ("authoring specification",),
                "Opening transition workbook sheet",
                "Six-row field-map attachment; it is context, not a warehouse source of truth.",
            ),
            transition_mapping,
            ["legacy_field"],
        ),
    ]
    files = [_write_asset(output_dir, spec, data, sort_keys) for spec, data, sort_keys in assets]
    checks = validate_quarter_pack(output_dir)
    return _manifest(output_dir, "CM-240708", slug, files, checks)


def validate_quarter_pack(output_dir: Path) -> list[dict[str, Any]]:
    checks: list[dict[str, Any]] = []
    orders = pd.read_parquet(output_dir / "commerce_order.parquet")
    lines = pd.read_parquet(output_dir / "commerce_order_line.parquet")
    events = pd.read_parquet(output_dir / "commerce_order_event.parquet")
    shipments = pd.read_parquet(output_dir / "commerce_shipment_event.parquet")
    accounts = pd.read_parquet(output_dir / "crm_account.parquet")
    prices = pd.read_parquet(output_dir / "catalog_product_price_history.parquet")
    finance = pd.read_parquet(output_dir / "q2_commercial_close.parquet")
    review = pd.read_parquet(output_dir / "q2_fulfillment_review.parquet")

    _record_check(checks, "quarter_order_population", len(orders) == 18_167, f"{len(orders):,} complete Q2 order headers")
    _record_check(checks, "canonical_order_grain", orders["order_id"].is_unique, "order_id is unique")
    collision_sizes = orders.groupby("source_order_id").size()
    _record_check(
        checks,
        "source_key_collisions_retained",
        int((collision_sizes > 1).sum()) == 771,
        f"{int((collision_sizes > 1).sum()):,} source keys collide across {int(collision_sizes[collision_sizes > 1].sum()):,} rows",
    )
    harbor = orders.loc[orders["source_system"] == "harbor_oms"]
    clock_delta = (harbor["source_recorded_at"] - harbor["created_at"]).dt.total_seconds() / 60
    _record_check(
        checks,
        "source_clock_representation_retained",
        len(harbor) == 1_971 and clock_delta.between(-299, -270).all(),
        f"{len(harbor):,} acquired-source rows preserve the documented source-clock range",
    )
    order_ids = set(orders["order_id"])
    for name, child in (("line", lines), ("order_event", events), ("shipment_event", shipments)):
        orphans = int((~child["order_id"].isin(order_ids)).sum())
        _record_check(checks, f"{name}_referential_integrity", orphans == 0, f"{orphans} orphan rows")
    line_rollup = lines.groupby("order_id", as_index=True).agg(
        line_total_cents=("line_total_cents", "sum"), observed_lines=("order_line_id", "size")
    )
    bridge = orders.set_index("order_id").join(line_rollup, how="left", validate="one_to_one")
    exact = (bridge["order_total_cents"] == bridge["line_total_cents"]).all() and (
        bridge["line_count"] == bridge["observed_lines"]
    ).all()
    _record_check(checks, "captured_value_reconciliation", bool(exact), "header totals and line counts reconcile for every order")
    late_rollover = int(
        (
            (orders["created_at"] < pd.Timestamp("2024-07-01 00:00:00"))
            & (orders["warehouse_available_at"] >= pd.Timestamp("2024-07-01 00:00:00"))
        ).sum()
    )
    _record_check(checks, "late_arrival_population_retained", late_rollover == 76, f"{late_rollover} rows cross the quarter-close rollover")
    _record_check(checks, "finance_attachment_source_grain", "order_id" not in finance and len(finance) == len(orders), "flat Finance extract is source-keyed and row-complete")
    _record_check(checks, "fulfillment_attachment_grain", review["order_id"].is_unique and len(review) == len(orders), "one review row per canonical order")
    _record_check(checks, "account_subset_integrity", set(accounts["account_id"]) == set(orders["account_id"]), f"{len(accounts):,} linked accounts")
    _record_check(checks, "price_context_integrity", set(lines["product_id"]).issubset(set(prices["product_id"])), f"history covers {prices['product_id'].nunique():,} ordered products")
    return checks


def build_navigation_pack() -> dict[str, Any]:
    slug = "the-navigation-vote"
    output_dir = PUBLIC_ROOT / slug
    output_dir.mkdir(parents=True, exist_ok=True)

    experiment = _read("growth/experiment.parquet", ds.field("experiment_id") == "EXP005")
    assignments = _read("growth/experiment_assignment.parquet", ds.field("experiment_id") == "EXP005")
    session_ids = assignments.column("session_id").to_pylist()
    sessions = _linked("growth/session.parquet", "session_id", session_ids)
    events = _linked("growth/web_event.parquet", "session_id", session_ids)
    session_frame = sessions.to_pandas()
    assignment_frame = assignments.to_pandas()
    converted_order_ids = session_frame["converted_order_id"].dropna().tolist()
    orders = _linked("commerce/order.parquet", "order_id", converted_order_ids)
    account_ids = pd.concat(
        [assignment_frame["account_id"], session_frame["account_id"]], ignore_index=True
    ).dropna()
    accounts = _linked("crm/account.parquet", "account_id", account_ids.tolist())

    mart = assignment_frame.merge(
        session_frame[
            [
                "session_id",
                "device_type",
                "acquisition_channel",
                "event_count",
                "converted_order_id",
            ]
        ],
        how="left",
        on="session_id",
        validate="one_to_one",
    )
    navigation_readout = (
        mart.groupby("variant", as_index=False)
        .agg(mean_pages_per_session=("event_count", "mean"))
        .assign(metric_name="pages_per_session", dashboard_label="Engagement")
        [["variant", "metric_name", "mean_pages_per_session", "dashboard_label"]]
    )
    finance_conversion = (
        mart.groupby("variant", as_index=False)
        .agg(attributable_orders=("converted_order_id", lambda values: int(values.notna().sum())))
        .assign(window_label="Experiment dates", denominator_status="Not supplied")
    )
    intake = pd.DataFrame(
        [
            {
                "working_title": "Mobile navigation simplification",
                "experiment_name": "mobile_navigation",
                "start_date": pd.Timestamp("2025-01-01").date(),
                "end_date": pd.Timestamp("2025-04-30").date(),
                "primary_metric": "pages_per_session",
                "assignment_unit": "session",
                "eligibility_note": "See feature-flag configuration; device restriction not stated in intake.",
            }
        ]
    )

    assets: list[tuple[AssetSpec, pd.DataFrame | pa.Table, list[str]]] = [
        (
            AssetSpec("growth.experiment", "growth_experiment.parquet", ("parquet/growth/experiment.parquet",), "experiment_id = EXP005"),
            experiment,
            ["experiment_id"],
        ),
        (
            AssetSpec("growth.experiment_assignment", "growth_experiment_assignment.parquet", ("parquet/growth/experiment_assignment.parquet",), "experiment_id = EXP005; complete assignment population"),
            assignments,
            ["assignment_id"],
        ),
        (
            AssetSpec("growth.session", "growth_session.parquet", ("parquet/growth/session.parquet",), "session_id belongs to EXP005 assignment population"),
            sessions,
            ["session_id"],
        ),
        (
            AssetSpec("growth.web_event", "growth_web_event.parquet", ("parquet/growth/web_event.parquet",), "session_id belongs to EXP005 assignment population"),
            events,
            ["session_id", "event_sequence", "web_event_id"],
        ),
        (
            AssetSpec("commerce.order", "commerce_order.parquet", ("parquet/commerce/order.parquet",), "order_id appears as converted_order_id on a selected session"),
            orders,
            ["order_id"],
        ),
        (
            AssetSpec("crm.account", "crm_account.parquet", ("parquet/crm/account.parquet",), "account_id appears on a selected assignment or session"),
            accounts,
            ["account_id"],
        ),
        (
            AssetSpec(
                "casefiles.navigation_readout",
                "navigation_readout.parquet",
                ("parquet/growth/experiment_assignment.parquet", "parquet/growth/session.parquet"),
                "Variant summary for EXP005",
                "Opening dashboard extract: unrounded means, no distributions, denominators, or uncertainty.",
            ),
            navigation_readout,
            ["variant"],
        ),
        (
            AssetSpec(
                "casefiles.finance_conversion_check",
                "finance_conversion_check.parquet",
                ("parquet/growth/experiment_assignment.parquet", "parquet/growth/session.parquet"),
                "Raw attributable-order counts by EXP005 variant",
                "Opening Finance extract intentionally omits assignment denominators and intervals.",
            ),
            finance_conversion,
            ["variant"],
        ),
        (
            AssetSpec(
                "casefiles.experiment_intake",
                "experiment_intake.parquet",
                ("parquet/growth/experiment.parquet", "opening brief specification"),
                "Registered EXP005 metadata plus intake wording",
                "One-row intake attachment; it does not infer eligibility from the experiment name.",
            ),
            intake,
            ["experiment_name"],
        ),
    ]
    files = [_write_asset(output_dir, spec, data, sort_keys) for spec, data, sort_keys in assets]
    checks = validate_navigation_pack(output_dir)
    return _manifest(output_dir, "GX-250505", slug, files, checks)


def validate_navigation_pack(output_dir: Path) -> list[dict[str, Any]]:
    checks: list[dict[str, Any]] = []
    experiment = pd.read_parquet(output_dir / "growth_experiment.parquet")
    assignments = pd.read_parquet(output_dir / "growth_experiment_assignment.parquet")
    sessions = pd.read_parquet(output_dir / "growth_session.parquet")
    events = pd.read_parquet(output_dir / "growth_web_event.parquet")
    orders = pd.read_parquet(output_dir / "commerce_order.parquet")
    accounts = pd.read_parquet(output_dir / "crm_account.parquet")

    registry_ok = (
        len(experiment) == 1
        and experiment.iloc[0]["experiment_id"] == "EXP005"
        and experiment.iloc[0]["assignment_unit"] == "session"
        and experiment.iloc[0]["primary_metric"] == "pages_per_session"
    )
    _record_check(checks, "registered_experiment", bool(registry_ok), "EXP005 registry row, session assignment, and primary metric retained")
    _record_check(checks, "complete_assignment_population", len(assignments) == 42_000, f"{len(assignments):,} EXP005 assignments")
    _record_check(
        checks,
        "assignment_grain",
        assignments["assignment_id"].is_unique and assignments["session_id"].is_unique,
        "one unique assignment per session",
    )
    _record_check(checks, "session_relationship", set(assignments["session_id"]) == set(sessions["session_id"]), f"{len(sessions):,} assigned sessions retained")
    event_orphans = int((~events["session_id"].isin(set(sessions["session_id"]))).sum())
    _record_check(checks, "event_referential_integrity", event_orphans == 0, f"{event_orphans} orphan events")
    event_counts = events.groupby("session_id").size()
    observed_counts = sessions.set_index("session_id")["event_count"].astype("int64")
    _record_check(
        checks,
        "session_event_reconciliation",
        event_counts.reindex(observed_counts.index, fill_value=0).equals(observed_counts),
        f"{len(events):,} events reconcile to session-level event_count",
    )
    mart = assignments[["session_id", "variant", "account_id"]].merge(
        sessions[["session_id", "device_type", "event_count", "converted_order_id"]],
        on="session_id",
        how="left",
        validate="one_to_one",
    )
    allocation = mart.groupby("variant").size()
    _record_check(
        checks,
        "plausible_allocation",
        set(allocation.index) == {"control", "treatment"} and allocation.min() >= 20_000,
        ", ".join(f"{variant}={count:,}" for variant, count in allocation.items()),
    )
    devices = mart.groupby("variant")["device_type"].unique().map(set)
    _record_check(
        checks,
        "device_breadth_retained",
        all(values == {"mobile", "desktop", "tablet"} for values in devices),
        "mobile, desktop, and tablet are present in both variants",
    )
    means = mart.groupby("variant")["event_count"].mean()
    _record_check(
        checks,
        "primary_movement_retained",
        means["treatment"] > means["control"],
        f"control mean={means['control']:.4f}; treatment mean={means['treatment']:.4f}",
    )
    anonymous = int(assignments["account_id"].isna().sum())
    repeats = int((assignments.dropna(subset=["account_id"]).groupby("account_id").size() > 1).sum())
    _record_check(checks, "identity_ambiguity_retained", anonymous == 10_106 and repeats == 5_860, f"{anonymous:,} anonymous assignments; {repeats:,} repeated identified accounts")
    linked_orders = set(sessions["converted_order_id"].dropna())
    _record_check(checks, "conversion_order_integrity", linked_orders == set(orders["order_id"]), f"{len(orders):,} attributable orders retained")
    linked_accounts = set(pd.concat([assignments["account_id"], sessions["account_id"]]).dropna())
    _record_check(checks, "account_subset_integrity", linked_accounts == set(accounts["account_id"]), f"{len(accounts):,} linked accounts retained")
    return checks


def _write_report(manifests: list[dict[str, Any]]) -> None:
    lines = [
        "# Progression case-pack build report",
        "",
        f"Generator revision: `{REVISION}`. Packs retain complete decision populations and all linked child rows; no learner outcome is sampled or simplified.",
        "",
    ]
    mechanisms = {
        "the-quarter-that-moved": [
            "Canonical order IDs remain unique while tenant-local source IDs collide.",
            "The acquired source representation preserves its shifted clock; original fields are never overwritten.",
            "Lines, lifecycle events, and shipment events remain separate one-to-many tables so an unsafe join still fans out.",
            "Captured header and line values reconcile exactly, while 76 records cross the quarter-close availability rollover.",
            "Opening Finance and fulfillment extracts preserve their weaker key/clock choices alongside the governed sources.",
        ],
        "the-navigation-vote": [
            "All 42,000 randomized assignments and 140,670 linked web events are retained.",
            "Treatment's maintained session-depth movement remains present without labeling additional navigation as benefit.",
            "Mobile, desktop, and tablet assignments remain in both variants.",
            "Anonymous assignments and repeated identified accounts remain available for population and clustering sensitivities.",
            "Opening Product and Finance summaries omit uncertainty or denominators while raw assignment-grain evidence remains complete.",
        ],
    }
    for manifest in manifests:
        lines.extend(
            [
                f"## {manifest['caseId']} / {manifest['slug']}",
                "",
                f"- {manifest['totals']['files']} Parquet files",
                f"- {manifest['totals']['rows']:,} total rows across files",
                f"- {manifest['totals']['bytes']:,} compressed bytes ({manifest['totals']['bytes'] / 1024 / 1024:.2f} MiB)",
                f"- {manifest['validation']['checkCount']} deterministic validation checks passed",
                "",
                "Encoded mechanisms:",
                "",
            ]
        )
        lines.extend(f"- {item}" for item in mechanisms[manifest["slug"]])
        lines.extend(["", "Files:", "", "| Table | Rows | Bytes |", "|---|---:|---:|"])
        lines.extend(
            f"| `{item['table']}` | {item['rows']:,} | {item['bytes']:,} |"
            for item in manifest["files"]
        )
        lines.append("")
    REPORT_PATH.write_text("\n".join(lines) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--case", choices=("all", "quarter", "navigation"), default="all")
    args = parser.parse_args()
    manifests: list[dict[str, Any]] = []
    if args.case in ("all", "quarter"):
        manifests.append(build_quarter_pack())
    if args.case in ("all", "navigation"):
        manifests.append(build_navigation_pack())
    _write_report(manifests)
    for manifest in manifests:
        size_mib = manifest["totals"]["bytes"] / 1024 / 1024
        print(
            f"PASS {manifest['caseId']} {manifest['totals']['files']} files "
            f"{manifest['totals']['rows']:,} rows {size_mib:.2f} MiB"
        )


if __name__ == "__main__":
    main()
