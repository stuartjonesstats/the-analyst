from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import duckdb

from config import CATALOG_ROOT, PROJECT_ROOT


PUBLIC_CATALOG = PROJECT_ROOT / "web" / "public" / "data" / "catalog" / "data_catalog.json"


def refresh(catalog_path: Path) -> list[dict[str, Any]]:
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    connection = duckdb.connect()
    for asset in catalog:
        parquet_path = PROJECT_ROOT / asset["relative_path"]
        path_string = str(parquet_path)
        row_count = connection.execute(
            "SELECT num_rows FROM parquet_file_metadata(?)", [path_string]
        ).fetchone()[0]
        null_counts = dict(
            connection.execute(
                """
                SELECT path_in_schema, SUM(stats_null_count)::BIGINT
                FROM parquet_metadata(?)
                GROUP BY path_in_schema
                """,
                [path_string],
            ).fetchall()
        )

        if row_count != asset["row_count"]:
            raise ValueError(
                f"{asset['fully_qualified_name']}: catalog rows={asset['row_count']}, "
                f"Parquet rows={row_count}"
            )
        if len(null_counts) != asset["column_count"]:
            raise ValueError(
                f"{asset['fully_qualified_name']}: catalog columns={asset['column_count']}, "
                f"Parquet columns={len(null_counts)}"
            )

        catalog_columns = {column["name"]: column for column in asset["columns"]}
        if set(catalog_columns) != set(null_counts):
            raise ValueError(f"{asset['fully_qualified_name']}: catalog/Parquet column names differ")

        refreshed_columns: list[dict[str, Any]] = []
        for column in asset["columns"]:
            name = column["name"]
            null_count = int(null_counts[name])
            refreshed_columns.append(
                {
                    "name": name,
                    "type": column["type"],
                    "nullable": null_count > 0,
                    "null_count": null_count,
                }
            )
        asset["columns"] = refreshed_columns
    connection.close()
    return catalog


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Refresh released-snapshot column null profiles from Parquet metadata."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate that committed catalog copies already match the Parquet profiles.",
    )
    args = parser.parse_args()

    catalog_path = CATALOG_ROOT / "data_catalog.json"
    refreshed = refresh(catalog_path)
    payload = json.dumps(refreshed, indent=2) + "\n"

    if args.check:
        for path in (catalog_path, PUBLIC_CATALOG):
            if path.read_text(encoding="utf-8") != payload:
                raise SystemExit(f"catalog column profiles are stale: {path.relative_to(PROJECT_ROOT)}")
        print(f"[ok] {len(refreshed)} catalog assets match released Parquet null profiles")
        return

    catalog_path.write_text(payload, encoding="utf-8")
    PUBLIC_CATALOG.write_text(payload, encoding="utf-8")
    print(f"[write] refreshed {len(refreshed)} assets in catalog and public catalog copy")


if __name__ == "__main__":
    main()
