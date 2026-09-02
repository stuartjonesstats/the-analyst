#!/usr/bin/env python3
"""Exhaustively validate every released Parquet with Arrow and native DuckDB.

Unlike a COUNT(*)-only smoke test, this validator hashes every value in every
column.  That forces DuckDB to decode all column pages and catches corruption
or type errors hidden behind Parquet metadata shortcuts.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


PROJECT_ROOT = Path(__file__).resolve().parents[1]
VENDOR_ROOT = PROJECT_ROOT / ".vendor"
if VENDOR_ROOT.exists():
    sys.path.insert(0, str(VENDOR_ROOT))

import duckdb  # noqa: E402
import pyarrow as pa  # noqa: E402
import pyarrow.parquet as pq  # noqa: E402


ENTERPRISE_ROOT = PROJECT_ROOT / "parquet"
PUBLIC_DATA_ROOT = PROJECT_ROOT / "web" / "public" / "data"
CASE_ROOT = PUBLIC_DATA_ROOT / "cases"
ENTERPRISE_MANIFEST = PROJECT_ROOT / "catalog" / "manifest.json"
REPORT_PATH = PROJECT_ROOT / "validation" / "parquet_compatibility_report.json"
HASH_BATCH_COLUMNS = 32
ARROW_BATCH_ROWS = 65_536


@dataclass(frozen=True)
class ExpectedFile:
    scope: str
    label: str
    path: Path
    rows: int | None = None
    columns: tuple[str, ...] | int | None = None
    bytes: int | None = None
    sha256: str | None = None
    source_table: str | None = None
    source_path: Path | None = None


def _q(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def _chunks(values: list[str], size: int) -> Iterable[list[str]]:
    for start in range(0, len(values), size):
        yield values[start : start + size]


def _json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _enterprise_expectations() -> list[ExpectedFile]:
    manifest = _json(ENTERPRISE_MANIFEST)
    return [
        ExpectedFile(
            scope="enterprise",
            label=str(item["table"]),
            path=PROJECT_ROOT / str(item["path"]),
            rows=int(item["rows"]),
            columns=int(item["columns"]),
            bytes=int(item["bytes"]),
            sha256=str(item["sha256"]),
        )
        for item in manifest["files"]
    ]


def _manifest_file_path(manifest_path: Path, item: dict[str, Any]) -> Path:
    public_path = item.get("path") or item.get("publicUrl") or item.get("public_path")
    if public_path:
        public_path = str(public_path)
        prefix = "/data/"
        if not public_path.startswith(prefix):
            raise ValueError(f"{manifest_path}: invalid public data path {public_path!r}")
        return PUBLIC_DATA_ROOT / public_path.removeprefix(prefix)
    file_name = item.get("file")
    if file_name:
        return manifest_path.parent / str(file_name)
    raise ValueError(f"{manifest_path}: file record has no resolvable path")


def _public_expectations() -> list[ExpectedFile]:
    enterprise_manifest = _json(ENTERPRISE_MANIFEST)
    enterprise_paths = {
        str(item["table"]): PROJECT_ROOT / str(item["path"])
        for item in enterprise_manifest["files"]
    }
    expected: list[ExpectedFile] = []
    for manifest_path in sorted(CASE_ROOT.glob("*/manifest.json")):
        manifest = _json(manifest_path)
        slug = str(manifest.get("slug") or manifest.get("case_slug") or manifest_path.parent.name)
        for item in manifest.get("files", []):
            table_name = str(item["table"])
            source_table = item.get("source_table")
            if source_table is None and table_name in enterprise_paths:
                source_table = table_name
            raw_columns = item.get("columns")
            columns: tuple[str, ...] | int | None
            if isinstance(raw_columns, list):
                columns = tuple(str(value) for value in raw_columns)
            elif raw_columns is not None:
                columns = int(raw_columns)
            else:
                columns = None
            expected.append(
                ExpectedFile(
                    scope="public",
                    label=f"{slug}:{table_name}",
                    path=_manifest_file_path(manifest_path, item),
                    rows=int(item["rows"]) if item.get("rows") is not None else None,
                    columns=columns,
                    bytes=int(item["bytes"]) if item.get("bytes") is not None else None,
                    sha256=str(item["sha256"]) if item.get("sha256") else None,
                    source_table=str(source_table) if source_table else None,
                    source_path=enterprise_paths.get(str(source_table)) if source_table else None,
                )
            )
    return expected


def _validate_inventory(expected: list[ExpectedFile], roots: list[Path]) -> list[str]:
    errors: list[str] = []
    paths = [item.path.resolve() for item in expected]
    duplicates = sorted({path for path in paths if paths.count(path) > 1})
    if duplicates:
        errors.extend(f"duplicate manifest registration: {path}" for path in duplicates)

    registered = set(paths)
    discovered = {
        path.resolve()
        for root in roots
        if root.exists()
        for path in root.rglob("*.parquet")
    }
    for path in sorted(discovered - registered):
        errors.append(f"unregistered Parquet: {path.relative_to(PROJECT_ROOT)}")
    for path in sorted(registered - discovered):
        try:
            display = path.relative_to(PROJECT_ROOT)
        except ValueError:
            display = path
        errors.append(f"manifest Parquet missing: {display}")
    return errors


def _scan_file(connection: duckdb.DuckDBPyConnection, expected: ExpectedFile) -> dict[str, Any]:
    path = expected.path
    relative_path = str(path.relative_to(PROJECT_ROOT))
    result: dict[str, Any] = {
        "scope": expected.scope,
        "label": expected.label,
        "path": relative_path,
        "status": "PASS",
        "errors": [],
        "warnings": [],
    }
    errors: list[str] = result["errors"]
    warnings: list[str] = result["warnings"]
    started = time.perf_counter()

    if not path.exists():
        errors.append("file does not exist")
        result["status"] = "FAIL"
        return result

    actual_bytes = path.stat().st_size
    result["bytes"] = actual_bytes
    if expected.bytes is not None and actual_bytes != expected.bytes:
        errors.append(f"byte count {actual_bytes:,} != manifest {expected.bytes:,}")
    if expected.sha256 is not None:
        actual_sha256 = _sha256(path)
        result["sha256"] = actual_sha256
        if actual_sha256 != expected.sha256:
            errors.append(f"SHA-256 {actual_sha256} != manifest {expected.sha256}")

    try:
        arrow_file = pq.ParquetFile(path)
        arrow_rows = arrow_file.metadata.num_rows
        arrow_columns = arrow_file.schema_arrow.names
        arrow_row_groups = arrow_file.metadata.num_row_groups
        for batch in arrow_file.iter_batches(batch_size=ARROW_BATCH_ROWS, use_threads=False):
            batch.validate(full=True)
        result["arrow"] = {
            "rows": arrow_rows,
            "columns": len(arrow_columns),
            "row_groups": arrow_row_groups,
            "types": sorted({str(field.type) for field in arrow_file.schema_arrow}),
        }
        null_fields = [
            field.name for field in arrow_file.schema_arrow if pa.types.is_null(field.type)
        ]
        if null_fields:
            errors.append(
                "Arrow null logical type has no stable SQL meaning: " + ", ".join(null_fields)
            )
        non_scalar_fields = [
            f"{field.name} ({field.type})"
            for field in arrow_file.schema_arrow
            if (
                pa.types.is_nested(field.type)
                or pa.types.is_binary(field.type)
                or pa.types.is_large_binary(field.type)
                or pa.types.is_fixed_size_binary(field.type)
                or pa.types.is_decimal(field.type)
            )
        ]
        if non_scalar_fields:
            errors.append(
                "workbench contract permits only flat scalar fields: "
                + ", ".join(non_scalar_fields)
            )
        result["arrow"]["timestamp_ns_columns"] = [
            field.name
            for field in arrow_file.schema_arrow
            if pa.types.is_timestamp(field.type) and field.type.unit == "ns"
        ]
    except Exception as exc:  # pragma: no cover - exercised by corrupt inputs
        errors.append(f"Arrow full decode: {type(exc).__name__}: {exc}")
        arrow_rows = None
        arrow_columns = []

    try:
        description = connection.execute(
            "DESCRIBE SELECT * FROM read_parquet(?)", [str(path)]
        ).fetchall()
        duckdb_columns = [str(row[0]) for row in description]
        duckdb_types = [str(row[1]) for row in description]
        lowered = [name.casefold() for name in duckdb_columns]
        collisions = sorted({name for name in lowered if lowered.count(name) > 1})
        if collisions:
            errors.append(f"case-insensitive duplicate columns: {', '.join(collisions)}")

        duckdb_rows = int(
            connection.execute("SELECT count(*) FROM read_parquet(?)", [str(path)]).fetchone()[0]
        )
        # Each aggregate forces decoding of every value in its column.  Running
        # these in bounded batches also covers very wide tables without a huge
        # generated expression or Arrow result schema.
        for column_batch in _chunks(duckdb_columns, HASH_BATCH_COLUMNS):
            aggregates = ", ".join(
                f"bit_xor(hash({_q(column)})) AS {_q(f'checksum_{index}')}"
                for index, column in enumerate(column_batch)
            )
            connection.execute(
                f"SELECT {aggregates} FROM read_parquet(?)", [str(path)]
            ).fetchone()

        result["duckdb"] = {
            "version": duckdb.__version__,
            "rows": duckdb_rows,
            "columns": len(duckdb_columns),
            "types": sorted(set(duckdb_types)),
            "full_value_scan": True,
        }

        if expected.source_path is not None:
            source_description = connection.execute(
                "DESCRIBE SELECT * FROM read_parquet(?)", [str(expected.source_path)]
            ).fetchall()
            source_types = {str(row[0]): str(row[1]) for row in source_description}
            extract_types = dict(zip(duckdb_columns, duckdb_types))
            missing_source_columns = sorted(set(extract_types) - set(source_types))
            if missing_source_columns:
                errors.append(
                    f"source contract {expected.source_table} lacks columns: "
                    + ", ".join(missing_source_columns)
                )
            drift = [
                f"{column}: {source_types[column]} -> {extract_types[column]}"
                for column in extract_types.keys() & source_types.keys()
                if extract_types[column] != source_types[column]
            ]
            if drift:
                errors.append(
                    f"DuckDB schema drift from {expected.source_table}: " + "; ".join(sorted(drift))
                )
            result["duckdb"]["source_contract"] = expected.source_table
            result["duckdb"]["source_schema_match"] = not missing_source_columns and not drift

            if arrow_columns:
                source_arrow_schema = pq.ParquetFile(expected.source_path).schema_arrow
                source_arrow_fields = {
                    field.name: field for field in source_arrow_schema
                }
                arrow_type_drift = [
                    f"{field.name}: {source_arrow_fields[field.name].type} -> {field.type}"
                    for field in arrow_file.schema_arrow
                    if field.name in source_arrow_fields
                    and not field.type.equals(source_arrow_fields[field.name].type)
                ]
                if arrow_type_drift:
                    errors.append(
                        f"Arrow schema drift from {expected.source_table}: "
                        + "; ".join(sorted(arrow_type_drift))
                    )
                result["arrow"]["source_schema_match"] = not arrow_type_drift
    except Exception as exc:  # pragma: no cover - exercised by corrupt inputs
        errors.append(f"DuckDB full decode: {type(exc).__name__}: {exc}")
        duckdb_rows = None
        duckdb_columns = []

    if expected.rows is not None:
        if arrow_rows is not None and arrow_rows != expected.rows:
            errors.append(f"Arrow rows {arrow_rows:,} != manifest {expected.rows:,}")
        if duckdb_rows is not None and duckdb_rows != expected.rows:
            errors.append(f"DuckDB rows {duckdb_rows:,} != manifest {expected.rows:,}")
    if arrow_rows is not None and duckdb_rows is not None and arrow_rows != duckdb_rows:
        errors.append(f"Arrow rows {arrow_rows:,} != DuckDB rows {duckdb_rows:,}")
    if arrow_columns and duckdb_columns and arrow_columns != duckdb_columns:
        errors.append("Arrow and DuckDB column names or order differ")

    if isinstance(expected.columns, int):
        if duckdb_columns and len(duckdb_columns) != expected.columns:
            errors.append(
                f"DuckDB columns {len(duckdb_columns)} != manifest {expected.columns}"
            )
    elif isinstance(expected.columns, tuple):
        if duckdb_columns and list(expected.columns) != duckdb_columns:
            errors.append("DuckDB column names or order differ from manifest")

    if warnings:
        result["status"] = "WARN"
    if errors:
        result["status"] = "FAIL"
    result["elapsed_seconds"] = round(time.perf_counter() - started, 3)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fully decode and contract-check every released Parquet file."
    )
    parser.add_argument(
        "--scope",
        choices=("all", "enterprise", "public"),
        default="all",
        help="Choose the full estate, browser assignment data, or both.",
    )
    parser.add_argument(
        "--report",
        type=Path,
        nargs="?",
        const=REPORT_PATH,
        help="Write a JSON report (defaults to validation/parquet_compatibility_report.json).",
    )
    args = parser.parse_args()

    expected: list[ExpectedFile] = []
    roots: list[Path] = []
    if args.scope in ("all", "enterprise"):
        expected.extend(_enterprise_expectations())
        roots.append(ENTERPRISE_ROOT)
    if args.scope in ("all", "public"):
        expected.extend(_public_expectations())
        roots.append(PUBLIC_DATA_ROOT)

    inventory_errors = _validate_inventory(expected, roots)
    connection = duckdb.connect()
    started = time.perf_counter()
    results: list[dict[str, Any]] = []
    for index, item in enumerate(expected, start=1):
        result = _scan_file(connection, item)
        results.append(result)
        print(
            f"[{index:03d}/{len(expected):03d}] {result['status']:<4} "
            f"{item.path.relative_to(PROJECT_ROOT)}"
        )
        for error in result["errors"]:
            print(f"    error: {error}")
        for warning in result["warnings"]:
            print(f"    warning: {warning}")
    connection.close()

    failed = [result for result in results if result["status"] == "FAIL"]
    warned = [result for result in results if result["status"] == "WARN"]
    report = {
        "status": "FAIL" if failed or inventory_errors else "PASS",
        "scope": args.scope,
        "duckdb_version": duckdb.__version__,
        "summary": {
            "files": len(results),
            "enterprise_files": sum(result["scope"] == "enterprise" for result in results),
            "public_files": sum(result["scope"] == "public" for result in results),
            "physical_rows": sum(
                int(result.get("duckdb", {}).get("rows", 0)) for result in results
            ),
            "bytes": sum(int(result.get("bytes", 0)) for result in results),
            "failed": len(failed),
            "warned": len(warned),
            "inventory_errors": len(inventory_errors),
            "elapsed_seconds": round(time.perf_counter() - started, 3),
        },
        "inventory_errors": inventory_errors,
        "files": results,
    }
    if args.report:
        report_path = args.report if args.report.is_absolute() else PROJECT_ROOT / args.report
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        try:
            report_display = report_path.relative_to(PROJECT_ROOT)
        except ValueError:
            report_display = report_path
        print(f"[report] {report_display}")

    for error in inventory_errors:
        print(f"[inventory error] {error}")
    summary = report["summary"]
    print(
        f"[{report['status'].lower()}] {summary['files']} files; "
        f"{summary['physical_rows']:,} physical rows; {summary['bytes']:,} bytes; "
        f"{summary['failed']} failed; {summary['warned']} warned; "
        f"{summary['elapsed_seconds']:.3f}s"
    )
    return 1 if report["status"] == "FAIL" else 0


if __name__ == "__main__":
    raise SystemExit(main())
