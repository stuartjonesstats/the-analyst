#!/usr/bin/env python3
"""Regenerate only supply fact tables and merge their generated metadata."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pyarrow.parquet as pq


PROJECT_ROOT = Path(__file__).resolve().parents[1]
VENDOR_ROOT = PROJECT_ROOT / ".vendor"
if VENDOR_ROOT.exists():
    sys.path.insert(0, str(VENDOR_ROOT))

from builder import WorldBuilder  # noqa: E402
from catalog_docs import write_catalog_support_files  # noqa: E402
from config import CATALOG_ROOT, PARQUET_ROOT  # noqa: E402
from domain_operations import _generate_supply_facts  # noqa: E402
from write_duckdb_views import write_duckdb_views  # noqa: E402


SUPPLY_FACT_TABLES = {
    "supply.purchase_order",
    "supply.purchase_order_line",
    "supply.goods_receipt",
    "supply.inventory_movement",
    "supply.inventory_position_daily",
}


def _read(path: Path, columns: list[str]) -> dict[str, np.ndarray]:
    table = pq.read_table(path, columns=columns)
    return {name: np.asarray(table[name].to_pylist()) for name in columns}


def _load_context() -> dict[str, np.ndarray]:
    product = _read(
        PARQUET_ROOT / "catalog/product.parquet",
        ["product_id", "unit_cost_cents"],
    )
    employee = _read(PARQUET_ROOT / "workforce/employee.parquet", ["employee_id"])
    vendor = _read(
        PARQUET_ROOT / "supply/vendor.parquet",
        ["vendor_id", "standard_lead_time_days", "risk_tier"],
    )
    warehouse = _read(PARQUET_ROOT / "supply/warehouse.parquet", ["warehouse_id"])
    product_vendor = _read(
        PARQUET_ROOT / "supply/product_vendor.parquet",
        [
            "product_id",
            "vendor_id",
            "contract_unit_cost_cents",
            "contract_lead_time_days",
        ],
    )
    return {
        "product_id": product["product_id"],
        "product_unit_cost_cents": product["unit_cost_cents"],
        "employee_id": employee["employee_id"],
        "vendor_id": vendor["vendor_id"],
        "vendor_standard_lead_time_days": vendor["standard_lead_time_days"],
        "vendor_risk_tier": vendor["risk_tier"],
        "product_vendor_product": product_vendor["product_id"],
        "product_vendor_vendor": product_vendor["vendor_id"],
        "product_vendor_contract_unit_cost_cents": product_vendor[
            "contract_unit_cost_cents"
        ],
        "product_vendor_contract_lead_time_days": product_vendor[
            "contract_lead_time_days"
        ],
        "warehouse_id": warehouse["warehouse_id"],
    }


def main() -> int:
    catalog = json.loads((CATALOG_ROOT / "data_catalog.json").read_text())
    relationships = json.loads((CATALOG_ROOT / "relationships.json").read_text())
    anomalies = json.loads((CATALOG_ROOT / "anomaly_ledger.json").read_text())
    manifest = json.loads((CATALOG_ROOT / "manifest.json").read_text())

    builder = WorldBuilder(context=_load_context())
    builder.catalog = [
        item for item in catalog if item["fully_qualified_name"] not in SUPPLY_FACT_TABLES
    ]
    builder.relationships = [
        item for item in relationships if item["from_table"] not in SUPPLY_FACT_TABLES
    ]
    builder.anomalies = [item for item in anomalies if item.get("anomaly_id") != "A12"]
    builder.manifest = [
        item for item in manifest["files"] if item["table"] not in SUPPLY_FACT_TABLES
    ]
    builder.prepare()

    _generate_supply_facts(builder)
    write_catalog_support_files(builder)
    builder.finalize()
    write_duckdb_views(builder.catalog)
    print(
        f"[done] regenerated {len(SUPPLY_FACT_TABLES)} supply fact tables; "
        f"estate remains {len(builder.catalog)} tables / "
        f"{sum(item['row_count'] for item in builder.catalog):,} rows"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
