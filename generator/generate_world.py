#!/usr/bin/env python3
from __future__ import annotations

import gc
import sys
import time
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
VENDOR_ROOT = PROJECT_ROOT / ".vendor"
if VENDOR_ROOT.exists():
    sys.path.insert(0, str(VENDOR_ROOT))

from builder import WorldBuilder  # noqa: E402
from catalog_docs import write_catalog_support_files  # noqa: E402
from domain_enterprise import generate_enterprise  # noqa: E402
from domain_foundation import generate_foundation  # noqa: E402
from domain_operations import generate_operations  # noqa: E402
from domain_transactions import generate_transactions  # noqa: E402
from write_duckdb_views import write_duckdb_views  # noqa: E402


def _phase(name, function, builder):
    started = time.perf_counter()
    print(f"\n[phase] {name}", flush=True)
    function(builder)
    gc.collect()
    print(f"[phase] {name} complete in {time.perf_counter() - started:,.1f}s", flush=True)


def main() -> int:
    started = time.perf_counter()
    builder = WorldBuilder()
    builder.prepare()
    _phase("foundation and master data", generate_foundation, builder)
    _phase("commerce, billing, and growth", generate_transactions, builder)
    _phase("operations, support, supply, fleet, and external", generate_operations, builder)
    _phase("finance, trust, platform, and model lifecycle", generate_enterprise, builder)
    write_catalog_support_files(builder)
    builder.finalize()
    write_duckdb_views(builder.catalog)
    elapsed = time.perf_counter() - started
    print(
        f"\n[done] {len(builder.catalog)} tables, "
        f"{sum(x['row_count'] for x in builder.catalog):,} rows, "
        f"{sum(x['bytes'] for x in builder.manifest) / 1024 / 1024:,.1f} MiB in {elapsed:,.1f}s",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
