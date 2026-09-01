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
            "scanner retry defect is discoverable",
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
