#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import time
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
VENDOR_ROOT = PROJECT_ROOT / ".vendor"
if VENDOR_ROOT.exists():
    sys.path.insert(0, str(VENDOR_ROOT))

import duckdb  # noqa: E402

from config import CATALOG_ROOT, VALIDATION_ROOT  # noqa: E402
from domain_operations import (  # noqa: E402
    SUPPLY_INTERMITTENT_ACTIVE_DAYS,
    SUPPLY_INTERMITTENT_CYCLE_DAYS,
    SUPPLY_MOVEMENT_ROWS,
    SUPPLY_OPENING_BALANCE_ROWS,
    SUPPLY_POSITION_ROWS,
    SUPPLY_SCANNER_REPLAY_PAIRS,
)


def _q(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def _path(table: dict) -> Path:
    return PROJECT_ROOT / table["relative_path"]


def _read_expr(table: dict) -> str:
    escaped = str(_path(table)).replace("'", "''")
    return f"read_parquet('{escaped}')"


def main() -> int:
    started = time.perf_counter()
    catalog = json.loads((CATALOG_ROOT / "data_catalog.json").read_text())
    relationships = json.loads((CATALOG_ROOT / "relationships.json").read_text())
    anomalies = json.loads((CATALOG_ROOT / "anomaly_ledger.json").read_text())
    by_name = {item["fully_qualified_name"]: item for item in catalog}
    con = duckdb.connect()
    checks: list[dict] = []

    def record(name, passed, detail, severity="error"):
        checks.append({"check": name, "passed": bool(passed), "severity": severity, "detail": detail})

    schemas = sorted({item["schema"] for item in catalog})
    total_rows = sum(item["row_count"] for item in catalog)
    max_columns = max(item["column_count"] for item in catalog)
    hefty = [item for item in catalog if item["row_count"] >= 150_000]
    record("estate has at least 15 schemas", len(schemas) >= 15, f"observed {len(schemas)}: {', '.join(schemas)}")
    record("estate has at least 90 tables", len(catalog) >= 90, f"observed {len(catalog)}")
    record("estate has at least 10 million rows", total_rows >= 10_000_000, f"observed {total_rows:,}")
    record("estate includes a 200+ column table", max_columns >= 200, f"maximum {max_columns} columns")
    record("estate includes at least 15 tables with 150k+ rows", len(hefty) >= 15, f"observed {len(hefty)}")
    record("documented anomaly ledger is substantial", len(anomalies) >= 10, f"observed {len(anomalies)} anomaly records")

    for item in catalog:
        name = item["fully_qualified_name"]
        path = _path(item)
        if not path.exists():
            record(f"file exists: {name}", False, str(path))
            continue
        try:
            rows, columns = con.execute(
                f"SELECT count(*), count(*) FILTER (WHERE false) FROM {_read_expr(item)}"
            ).fetchone()
            actual_columns = len(con.execute(f"DESCRIBE SELECT * FROM {_read_expr(item)}").fetchall())
            ok = rows == item["row_count"] and actual_columns == item["column_count"]
            record(f"parquet readable and catalog-aligned: {name}", ok, f"rows={rows:,}; columns={actual_columns}")
        except Exception as exc:
            record(f"parquet readable and catalog-aligned: {name}", False, f"{type(exc).__name__}: {exc}")
            continue

        pk = item.get("primary_key") or []
        if pk:
            key_expr = ", ".join(_q(column) for column in pk)
            null_expr = " OR ".join(f"{_q(column)} IS NULL" for column in pk)
            if len(pk) == 1:
                distinct_expr = f"count(DISTINCT {_q(pk[0])})"
            else:
                distinct_expr = f"count(DISTINCT ({key_expr}))"
            count_rows, distinct_rows, null_rows = con.execute(
                f"SELECT count(*), {distinct_expr}, count(*) FILTER (WHERE {null_expr}) FROM {_read_expr(item)}"
            ).fetchone()
            record(
                f"primary key valid: {name}",
                count_rows == distinct_rows and null_rows == 0,
                f"rows={count_rows:,}; distinct_keys={distinct_rows:,}; null_keys={null_rows:,}",
            )

    for relation in relationships:
        source_name = relation["from_table"]
        target_name = relation["to_table"]
        source = by_name.get(source_name)
        target = by_name.get(target_name)
        if source is None or target is None:
            record(f"relationship target registered: {source_name} -> {target_name}", False, "catalog asset missing")
            continue
        source_cols = relation["from_columns"]
        target_cols = relation["to_columns"]
        if len(source_cols) != len(target_cols):
            record(f"foreign key shape: {source_name} -> {target_name}", False, "column-list lengths differ")
            continue
        join = " AND ".join(f"s.{_q(left)} = t.{_q(right)}" for left, right in zip(source_cols, target_cols))
        nonnull = " AND ".join(f"s.{_q(left)} IS NOT NULL" for left in source_cols)
        missing = f"t.{_q(target_cols[0])} IS NULL"
        try:
            orphan_count = con.execute(
                f"SELECT count(*) FROM {_read_expr(source)} s LEFT JOIN {_read_expr(target)} t ON {join} "
                f"WHERE {nonnull} AND {missing}"
            ).fetchone()[0]
            record(f"foreign key resolves: {source_name} -> {target_name}", orphan_count == 0, f"orphans={orphan_count:,}")
        except Exception as exc:
            record(f"foreign key resolves: {source_name} -> {target_name}", False, f"{type(exc).__name__}: {exc}")

    probes = [
        (
            "dual-write duplicates are discoverable",
            "SELECT count(*) FROM (SELECT interaction_fingerprint FROM read_parquet(?) WHERE dual_write_window_flag GROUP BY 1 HAVING count(*) > 1)",
            [str(PROJECT_ROOT / "parquet/support/ticket.parquet")],
        ),
        (
            "scanner replay rows are discoverable",
            "SELECT count(*) FROM read_parquet(?) WHERE scanner_replay_flag",
            [str(PROJECT_ROOT / "parquet/supply/inventory_movement.parquet")],
        ),
        (
            "winter-storm records are discoverable",
            "SELECT count(*) FROM read_parquet(?) WHERE condition_code = 'SEVERE_WINTER'",
            [str(PROJECT_ROOT / "parquet/external/weather_hourly.parquet")],
        ),
    ]
    for name, query, params in probes:
        try:
            value = con.execute(query, params).fetchone()[0]
            record(name, value > 0, f"matching records/groups={value:,}")
        except Exception as exc:
            record(name, False, f"{type(exc).__name__}: {exc}")

    supply_paths = {
        name: str(PROJECT_ROOT / f"parquet/supply/{name}.parquet")
        for name in (
            "goods_receipt",
            "inventory_movement",
            "inventory_position_daily",
            "product_vendor",
            "purchase_order",
            "purchase_order_line",
        )
    }
    try:
        replay = con.execute(
            """
            SELECT
                count(*) FILTER (WHERE r.scanner_replay_flag) AS replay_rows,
                count(DISTINCT r.replay_of_inventory_movement_id)
                    FILTER (WHERE r.scanner_replay_flag) AS distinct_originals,
                count(*) FILTER (WHERE NOT r.scanner_replay_flag) AS physical_rows,
                count(*) FILTER (
                    WHERE NOT r.scanner_replay_flag
                      AND r.movement_type_code = 'OPENING_BALANCE'
                ) AS opening_balance_rows,
                count(*) FILTER (
                    WHERE r.scanner_replay_flag
                      AND (
                        o.inventory_movement_id IS NULL
                        OR o.scanner_replay_flag
                        OR r.warehouse_id != o.warehouse_id
                        OR r.product_id != o.product_id
                        OR r.movement_at != o.movement_at
                        OR r.movement_type_code != o.movement_type_code
                        OR r.quantity_delta != o.quantity_delta
                        OR r.reference_type_code != o.reference_type_code
                        OR r.reference_number != o.reference_number
                        OR r.scanner_device_code != o.scanner_device_code
                        OR r.posted_at <= o.posted_at
                        OR r.movement_at < TIMESTAMP '2025-11-01'
                        OR r.movement_at >= TIMESTAMP '2025-12-01'
                      )
                ) AS invalid_pairs,
                count(*) FILTER (
                    WHERE (r.scanner_replay_flag AND r.replay_of_inventory_movement_id IS NULL)
                       OR (NOT r.scanner_replay_flag AND r.replay_of_inventory_movement_id IS NOT NULL)
                ) AS flag_link_disagreements
            FROM read_parquet(?) r
            LEFT JOIN read_parquet(?) o
              ON o.inventory_movement_id = r.replay_of_inventory_movement_id
            """,
            [supply_paths["inventory_movement"], supply_paths["inventory_movement"]],
        ).fetchone()
        replay_ok = (
            replay[0] == SUPPLY_SCANNER_REPLAY_PAIRS
            and replay[1] == SUPPLY_SCANNER_REPLAY_PAIRS
            and replay[2] == SUPPLY_MOVEMENT_ROWS - SUPPLY_SCANNER_REPLAY_PAIRS
            and replay[3] == SUPPLY_OPENING_BALANCE_ROWS
            and replay[4] == 0
            and replay[5] == 0
        )
        record(
            "scanner replay rows form exact one-to-one linked pairs",
            replay_ok,
            (
                f"replay_rows={replay[0]:,}; distinct_originals={replay[1]:,}; "
                f"physical_rows={replay[2]:,}; opening_balance_rows={replay[3]:,}; "
                f"invalid_pairs={replay[4]:,}; flag_link_disagreements={replay[5]:,}"
            ),
        )
    except Exception as exc:
        record("scanner replay rows form exact one-to-one linked pairs", False, f"{type(exc).__name__}: {exc}")

    try:
        receipt_shape = con.execute(
            """
            SELECT
                count(*) AS receipt_rows,
                count(*) FILTER (WHERE rejected_quantity > 0) AS rejected_rows,
                count(*) FILTER (
                    WHERE rejected_quantity < 0 OR rejected_quantity > received_quantity
                ) AS invalid_rejections,
                (
                    SELECT count(*)
                    FROM (
                        SELECT purchase_order_line_id
                        FROM read_parquet(?)
                        GROUP BY 1
                        HAVING count(*) > 1
                    ) split_lines
                ) AS split_lines
            FROM read_parquet(?)
            """,
            [supply_paths["goods_receipt"], supply_paths["goods_receipt"]],
        ).fetchone()
        receipt_shape_ok = (
            receipt_shape[0] == 82_000
            and receipt_shape[1] > 0
            and receipt_shape[2] == 0
            and receipt_shape[3] > 0
        )
        record(
            "receipts include valid partial and rejected events",
            receipt_shape_ok,
            (
                f"receipt_rows={receipt_shape[0]:,}; rejected_rows={receipt_shape[1]:,}; "
                f"invalid_rejections={receipt_shape[2]:,}; split_lines={receipt_shape[3]:,}"
            ),
        )

        status_mismatches = con.execute(
            """
            WITH line_rollup AS (
                SELECT
                    pol.purchase_order_id,
                    sum(pol.ordered_quantity - pol.cancelled_quantity) AS net_ordered,
                    sum(coalesce(gr.accepted_quantity, 0)) AS accepted
                FROM read_parquet(?) pol
                LEFT JOIN (
                    SELECT
                        purchase_order_line_id,
                        sum(received_quantity - rejected_quantity) AS accepted_quantity
                    FROM read_parquet(?)
                    GROUP BY 1
                ) gr USING (purchase_order_line_id)
                GROUP BY 1
            )
            SELECT count(*)
            FROM read_parquet(?) po
            JOIN line_rollup USING (purchase_order_id)
            WHERE CASE po.status_code
                WHEN 'RECEIVED' THEN NOT (net_ordered > 0 AND accepted = net_ordered)
                WHEN 'PARTIAL' THEN NOT (accepted > 0 AND accepted < net_ordered)
                WHEN 'OPEN' THEN NOT (net_ordered > 0 AND accepted = 0)
                WHEN 'CANCELLED' THEN NOT (net_ordered = 0 AND accepted = 0)
                ELSE true
            END
            """,
            [
                supply_paths["purchase_order_line"],
                supply_paths["goods_receipt"],
                supply_paths["purchase_order"],
            ],
        ).fetchone()[0]
        record(
            "purchase-order status reconciles to accepted receipts",
            status_mismatches == 0,
            f"status_mismatches={status_mismatches:,}",
        )

        receipt_movement_mismatches = con.execute(
            """
            WITH physical_receipt AS (
                SELECT
                    goods_receipt_id,
                    count(*) AS movement_rows,
                    min(warehouse_id) AS warehouse_id,
                    min(product_id) AS product_id,
                    min(movement_at) AS movement_at,
                    sum(quantity_delta) AS accepted_quantity
                FROM read_parquet(?)
                WHERE goods_receipt_id IS NOT NULL
                  AND NOT scanner_replay_flag
                GROUP BY 1
            )
            SELECT
                count(*) AS receipt_rows,
                count(*) FILTER (
                    WHERE pr.goods_receipt_id IS NULL
                       OR pr.movement_rows != 1
                       OR pr.warehouse_id != gr.warehouse_id
                       OR pr.product_id != pol.product_id
                       OR pr.movement_at != gr.received_at
                       OR pr.accepted_quantity != gr.received_quantity - gr.rejected_quantity
                ) AS mismatches
            FROM read_parquet(?) gr
            JOIN read_parquet(?) pol USING (purchase_order_line_id)
            LEFT JOIN physical_receipt pr USING (goods_receipt_id)
            """,
            [
                supply_paths["inventory_movement"],
                supply_paths["goods_receipt"],
                supply_paths["purchase_order_line"],
            ],
        ).fetchone()
        record(
            "accepted goods receipts post once to the physical ledger",
            receipt_movement_mismatches[0] == 82_000 and receipt_movement_mismatches[1] == 0,
            (
                f"receipt_rows={receipt_movement_mismatches[0]:,}; "
                f"mismatches={receipt_movement_mismatches[1]:,}"
            ),
        )
    except Exception as exc:
        record("receipt and purchase-order invariants", False, f"{type(exc).__name__}: {exc}")

    try:
        approved_product_mismatches = con.execute(
            """
            SELECT count(*)
            FROM read_parquet(?) pol
            JOIN read_parquet(?) po USING (purchase_order_id)
            WHERE NOT EXISTS (
                SELECT 1
                FROM read_parquet(?) pv
                WHERE pv.product_id = pol.product_id
                  AND pv.vendor_id = po.vendor_id
            )
            """,
            [
                supply_paths["purchase_order_line"],
                supply_paths["purchase_order"],
                supply_paths["product_vendor"],
            ],
        ).fetchone()[0]
        record(
            "purchase-order products are approved for the header vendor",
            approved_product_mismatches == 0,
            f"unapproved_lines={approved_product_mismatches:,}",
        )

        realized_lead = con.execute(
            """
            WITH final_receipt AS (
                SELECT purchase_order_line_id, max(received_at) AS final_received_at
                FROM read_parquet(?)
                GROUP BY 1
            )
            SELECT
                count(*) AS received_lines,
                count(*) FILTER (WHERE cast(final_received_at AS DATE) < promised_date) AS early_lines,
                count(*) FILTER (
                    WHERE cast(final_received_at AS DATE) > promised_date + INTERVAL 7 DAY
                ) AS more_than_week_late,
                count(DISTINCT date_diff('day', cast(po.ordered_at AS DATE), cast(final_received_at AS DATE)))
                    AS distinct_realized_leads,
                min(date_diff('day', cast(po.ordered_at AS DATE), cast(final_received_at AS DATE)))
                    AS minimum_realized_lead,
                max(date_diff('day', cast(po.ordered_at AS DATE), cast(final_received_at AS DATE)))
                    AS maximum_realized_lead
            FROM final_receipt
            JOIN read_parquet(?) pol USING (purchase_order_line_id)
            JOIN read_parquet(?) po USING (purchase_order_id)
            """,
            [
                supply_paths["goods_receipt"],
                supply_paths["purchase_order_line"],
                supply_paths["purchase_order"],
            ],
        ).fetchone()
        lead_ok = (
            realized_lead[0] > 0
            and realized_lead[1] > 0
            and realized_lead[2] > 0
            and realized_lead[3] >= 30
            and realized_lead[4] >= 1
            and realized_lead[5] <= 90
        )
        record(
            "realized supplier lead times vary around promise",
            lead_ok,
            (
                f"received_lines={realized_lead[0]:,}; early_lines={realized_lead[1]:,}; "
                f"more_than_week_late={realized_lead[2]:,}; "
                f"distinct_realized_leads={realized_lead[3]:,}; "
                f"range_days={realized_lead[4]}..{realized_lead[5]}"
            ),
        )
    except Exception as exc:
        record("supplier and lead-time invariants", False, f"{type(exc).__name__}: {exc}")

    try:
        position_shape = con.execute(
            """
            SELECT
                count(*) AS rows,
                count(DISTINCT (warehouse_id, product_id, snapshot_date)) AS distinct_business_grain
            FROM read_parquet(?)
            """,
            [supply_paths["inventory_position_daily"]],
        ).fetchone()
        record(
            "inventory positions have a unique business grain",
            position_shape[0] == position_shape[1],
            f"rows={position_shape[0]:,}; distinct_business_grain={position_shape[1]:,}",
        )

        position_reconciliation = con.execute(
            """
            WITH movement_daily AS (
                SELECT
                    warehouse_id,
                    product_id,
                    cast(movement_at AS DATE) AS event_date,
                    sum(quantity_delta) AS quantity_delta
                FROM read_parquet(?)
                WHERE NOT scanner_replay_flag
                GROUP BY 1, 2, 3
            ), combined AS (
                SELECT warehouse_id, product_id, event_date, quantity_delta,
                       NULL::BIGINT AS observed_on_hand, false AS is_snapshot
                FROM movement_daily
                UNION ALL
                SELECT warehouse_id, product_id, snapshot_date, 0,
                       on_hand_quantity, true
                FROM read_parquet(?)
            ), collapsed AS (
                SELECT warehouse_id, product_id, event_date,
                       sum(quantity_delta) AS quantity_delta,
                       max(observed_on_hand) AS observed_on_hand,
                       bool_or(is_snapshot) AS is_snapshot
                FROM combined
                GROUP BY 1, 2, 3
            ), reconciled AS (
                SELECT *,
                       sum(quantity_delta) OVER (
                           PARTITION BY warehouse_id, product_id
                           ORDER BY event_date
                           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                       ) AS expected_on_hand
                FROM collapsed
            )
            SELECT
                count(*) FILTER (WHERE is_snapshot) AS snapshot_rows,
                count(*) FILTER (
                    WHERE is_snapshot AND observed_on_hand != expected_on_hand
                ) AS mismatches
            FROM reconciled
            """,
            [supply_paths["inventory_movement"], supply_paths["inventory_position_daily"]],
        ).fetchone()
        record(
            "sampled on-hand positions reconcile to physical ledger history",
            position_reconciliation[0] == SUPPLY_POSITION_ROWS and position_reconciliation[1] == 0,
            (
                f"snapshot_rows={position_reconciliation[0]:,}; "
                f"mismatches={position_reconciliation[1]:,}"
            ),
        )

        window_columns = []
        window_mismatches = []
        for window in (7, 14, 30, 60, 90):
            window_columns.extend(
                [
                    f"sum(demand_units) OVER (PARTITION BY warehouse_id, product_id ORDER BY event_date RANGE BETWEEN INTERVAL {window - 1} DAY PRECEDING AND CURRENT ROW) AS expected_demand_{window}d",
                    f"sum(receipt_units) OVER (PARTITION BY warehouse_id, product_id ORDER BY event_date RANGE BETWEEN INTERVAL {window - 1} DAY PRECEDING AND CURRENT ROW) AS expected_receipt_{window}d",
                ]
            )
            window_mismatches.append(
                f"observed_demand_{window}d != expected_demand_{window}d OR observed_receipt_{window}d != expected_receipt_{window}d"
            )
        trailing_reconciliation = con.execute(
            f"""
            WITH movement_daily AS (
                SELECT
                    warehouse_id,
                    product_id,
                    cast(movement_at AS DATE) AS event_date,
                    sum(CASE WHEN movement_type_code = 'ISSUE' THEN -quantity_delta ELSE 0 END) AS demand_units,
                    sum(CASE WHEN movement_type_code = 'RECEIPT' THEN quantity_delta ELSE 0 END) AS receipt_units
                FROM read_parquet(?)
                WHERE NOT scanner_replay_flag
                GROUP BY 1, 2, 3
            ), combined AS (
                SELECT warehouse_id, product_id, event_date, demand_units, receipt_units,
                       NULL::FLOAT AS observed_demand_7d, NULL::FLOAT AS observed_receipt_7d,
                       NULL::FLOAT AS observed_demand_14d, NULL::FLOAT AS observed_receipt_14d,
                       NULL::FLOAT AS observed_demand_30d, NULL::FLOAT AS observed_receipt_30d,
                       NULL::FLOAT AS observed_demand_60d, NULL::FLOAT AS observed_receipt_60d,
                       NULL::FLOAT AS observed_demand_90d, NULL::FLOAT AS observed_receipt_90d,
                       false AS is_snapshot
                FROM movement_daily
                UNION ALL
                SELECT warehouse_id, product_id, snapshot_date, 0, 0,
                       demand_units_7d, receipt_units_7d,
                       demand_units_14d, receipt_units_14d,
                       demand_units_30d, receipt_units_30d,
                       demand_units_60d, receipt_units_60d,
                       demand_units_90d, receipt_units_90d,
                       true
                FROM read_parquet(?)
            ), collapsed AS (
                SELECT warehouse_id, product_id, event_date,
                       sum(demand_units) AS demand_units,
                       sum(receipt_units) AS receipt_units,
                       max(observed_demand_7d) AS observed_demand_7d,
                       max(observed_receipt_7d) AS observed_receipt_7d,
                       max(observed_demand_14d) AS observed_demand_14d,
                       max(observed_receipt_14d) AS observed_receipt_14d,
                       max(observed_demand_30d) AS observed_demand_30d,
                       max(observed_receipt_30d) AS observed_receipt_30d,
                       max(observed_demand_60d) AS observed_demand_60d,
                       max(observed_receipt_60d) AS observed_receipt_60d,
                       max(observed_demand_90d) AS observed_demand_90d,
                       max(observed_receipt_90d) AS observed_receipt_90d,
                       bool_or(is_snapshot) AS is_snapshot
                FROM combined
                GROUP BY 1, 2, 3
            ), reconciled AS (
                SELECT *, {', '.join(window_columns)}
                FROM collapsed
            )
            SELECT
                count(*) FILTER (WHERE is_snapshot) AS snapshot_rows,
                count(*) FILTER (
                    WHERE is_snapshot AND ({' OR '.join(window_mismatches)})
                ) AS mismatches
            FROM reconciled
            """,
            [supply_paths["inventory_movement"], supply_paths["inventory_position_daily"]],
        ).fetchone()
        record(
            "position demand and receipt windows reconcile to physical movements",
            trailing_reconciliation[0] == SUPPLY_POSITION_ROWS and trailing_reconciliation[1] == 0,
            (
                f"snapshot_rows={trailing_reconciliation[0]:,}; "
                f"mismatches={trailing_reconciliation[1]:,}"
            ),
        )
    except Exception as exc:
        record("inventory-position reconciliation invariants", False, f"{type(exc).__name__}: {exc}")

    try:
        intermittent = con.execute(
            """
            WITH issues AS (
                SELECT *, cast(substr(product_id, 4) AS INTEGER) - 1 AS product_position
                FROM read_parquet(?)
                WHERE movement_type_code = 'ISSUE'
                  AND NOT scanner_replay_flag
                  AND (cast(substr(product_id, 4) AS INTEGER) - 1) % 5 = 0
            )
            SELECT
                count(*) AS issue_rows,
                count(DISTINCT cast(movement_at AS DATE)) AS active_calendar_dates,
                count(*) FILTER (
                    WHERE (
                        date_diff('day', DATE '2023-01-01', cast(movement_at AS DATE))
                        + product_position * 3
                    ) % ? >= ?
                ) AS inactive_day_violations
            FROM issues
            """,
            [
                supply_paths["inventory_movement"],
                SUPPLY_INTERMITTENT_CYCLE_DAYS,
                SUPPLY_INTERMITTENT_ACTIVE_DAYS,
            ],
        ).fetchone()
        record(
            "intermittent products issue only on their deterministic active days",
            intermittent[0] > 0 and intermittent[2] == 0,
            (
                f"issue_rows={intermittent[0]:,}; active_calendar_dates={intermittent[1]:,}; "
                f"inactive_day_violations={intermittent[2]:,}"
            ),
        )

        seasonal = con.execute(
            """
            WITH issues AS (
                SELECT
                    cast(substr(product_id, 4) AS INTEGER) - 1 AS product_position,
                    extract(month FROM movement_at) AS movement_month,
                    abs(quantity_delta) AS demand_units
                FROM read_parquet(?)
                WHERE movement_type_code = 'ISSUE'
                  AND NOT scanner_replay_flag
            )
            SELECT
                avg(demand_units) FILTER (
                    WHERE product_position % 5 = 1 AND movement_month IN (11, 12, 1, 2)
                ) AS winter_peak,
                avg(demand_units) FILTER (
                    WHERE product_position % 5 = 1 AND movement_month NOT IN (11, 12, 1, 2)
                ) AS winter_off_peak,
                avg(demand_units) FILTER (
                    WHERE product_position % 5 = 2 AND movement_month IN (6, 7, 8)
                ) AS summer_peak,
                avg(demand_units) FILTER (
                    WHERE product_position % 5 = 2 AND movement_month NOT IN (6, 7, 8)
                ) AS summer_off_peak
            FROM issues
            """,
            [supply_paths["inventory_movement"]],
        ).fetchone()
        seasonal_ok = seasonal[0] > seasonal[1] * 2 and seasonal[2] > seasonal[3] * 2
        record(
            "seasonal product families have strong realized peak demand",
            seasonal_ok,
            (
                f"winter_peak_mean={seasonal[0]:.3f}; winter_off_peak_mean={seasonal[1]:.3f}; "
                f"summer_peak_mean={seasonal[2]:.3f}; summer_off_peak_mean={seasonal[3]:.3f}"
            ),
        )
    except Exception as exc:
        record("demand-process invariants", False, f"{type(exc).__name__}: {exc}")

    wide = by_name.get("platform.account_feature_snapshot")
    if wide:
        names = {column["name"] for column in wide["columns"]}
        required = {"future_90d_cancelled_flag", "future_90d_payment_failure_count", "eventual_lifetime_value_cents"}
        record("feature-store leakage exercise is explicit", required <= names, f"present={sorted(required & names)}")

    failed = [check for check in checks if not check["passed"] and check["severity"] == "error"]
    report = {
        "status": "PASS" if not failed else "FAIL",
        "elapsed_seconds": round(time.perf_counter() - started, 3),
        "summary": {
            "schemas": len(schemas), "tables": len(catalog), "rows": total_rows,
            "relationships": len(relationships), "anomalies": len(anomalies),
            "checks": len(checks), "failed": len(failed),
        },
        "checks": checks,
    }
    VALIDATION_ROOT.mkdir(parents=True, exist_ok=True)
    (VALIDATION_ROOT / "validation_report.json").write_text(json.dumps(report, indent=2) + "\n")
    lines = [
        "# Meridian data-estate validation", "", f"**Status: {report['status']}**", "",
        f"{len(catalog)} tables / {total_rows:,} rows / {len(relationships)} declared relationships / {len(anomalies)} documented anomalies.", "",
        "| Result | Check | Detail |", "|---|---|---|",
    ]
    for check in checks:
        result = "PASS" if check["passed"] else "FAIL"
        lines.append(f"| {result} | {check['check'].replace('|', '/')} | {str(check['detail']).replace('|', '/')} |")
    (VALIDATION_ROOT / "validation_report.md").write_text("\n".join(lines) + "\n")
    print(json.dumps(report["summary"], indent=2))
    print(report["status"])
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
