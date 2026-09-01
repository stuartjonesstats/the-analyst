from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
PARQUET_ROOT = PROJECT_ROOT / "parquet"
CATALOG_ROOT = PROJECT_ROOT / "catalog"
DOCS_ROOT = PROJECT_ROOT / "docs"
VALIDATION_ROOT = PROJECT_ROOT / "validation"

COMPANY_NAME = "Meridian Living Systems"
MASTER_SEED = 20260831
WORLD_START = "2023-01-01T00:00:00"
WORLD_END = "2025-12-31T23:59:59"
EXTRACT_AS_OF = "2026-01-15T06:00:00"

# V0 deliberately mixes compact dimensions, substantial event tables, and
# very wide analytical snapshots. Counts are fixed for reproducibility.
SCALE = {
    "regions": 6,
    "branches": 36,
    "service_areas": 120,
    "postal_areas": 800,
    "org_units": 90,
    "customers": 60_000,
    "accounts": 65_000,
    "sites": 80_000,
    "products": 720,
    "employees": 850,
    "technicians": 320,
    "vehicles": 220,
    "vendors": 85,
    "orders": 220_000,
    "subscriptions": 40_000,
    "assets": 55_000,
    "work_orders": 120_000,
    "tickets": 100_000,
}

PARQUET_OPTIONS = {
    "compression": "zstd",
    "compression_level": 5,
    "use_dictionary": True,
    "write_statistics": True,
    "row_group_size": 65_536,
}

