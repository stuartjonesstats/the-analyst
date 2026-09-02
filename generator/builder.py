from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq

from config import (
    CATALOG_ROOT,
    COMPANY_NAME,
    DOCS_ROOT,
    MASTER_SEED,
    PARQUET_OPTIONS,
    PARQUET_ROOT,
    VALIDATION_ROOT,
)


def stable_seed(label: str) -> int:
    digest = hashlib.sha256(f"{MASTER_SEED}:{label}".encode()).digest()
    return int.from_bytes(digest[:8], "little")


def rng_for(label: str) -> np.random.Generator:
    return np.random.default_rng(stable_seed(label))


def random_timestamps(
    rng: np.random.Generator,
    n: int,
    start: str = "2023-01-01T00:00:00",
    end: str = "2025-12-31T23:59:59",
) -> np.ndarray:
    start_dt = np.datetime64(start, "s")
    end_dt = np.datetime64(end, "s")
    span = int((end_dt - start_dt) / np.timedelta64(1, "s"))
    return start_dt + rng.integers(0, span + 1, n, dtype=np.int64).astype("timedelta64[s]")


def random_dates(
    rng: np.random.Generator,
    n: int,
    start: str = "2023-01-01",
    end: str = "2025-12-31",
) -> np.ndarray:
    start_dt = np.datetime64(start, "D")
    end_dt = np.datetime64(end, "D")
    span = int((end_dt - start_dt) / np.timedelta64(1, "D"))
    return start_dt + rng.integers(0, span + 1, n, dtype=np.int32).astype("timedelta64[D]")


def nullable(values: Any, missing: np.ndarray) -> pa.Array:
    return pa.array(values, mask=missing)


def codes(prefix: str, n: int, width: int = 7) -> np.ndarray:
    return np.array([f"{prefix}{i:0{width}d}" for i in range(1, n + 1)])


def iso_money_cents(rng: np.random.Generator, n: int, low: int, high: int) -> np.ndarray:
    return rng.integers(low, high + 1, n, dtype=np.int64)


@dataclass
class WorldBuilder:
    context: dict[str, Any] = field(default_factory=dict)
    catalog: list[dict[str, Any]] = field(default_factory=list)
    relationships: list[dict[str, Any]] = field(default_factory=list)
    anomalies: list[dict[str, Any]] = field(default_factory=list)
    manifest: list[dict[str, Any]] = field(default_factory=list)

    def prepare(self) -> None:
        for root in (PARQUET_ROOT, CATALOG_ROOT, DOCS_ROOT, VALIDATION_ROOT):
            root.mkdir(parents=True, exist_ok=True)

    def write(
        self,
        schema: str,
        name: str,
        columns: dict[str, Any],
        *,
        description: str,
        grain: str,
        primary_key: list[str],
        foreign_keys: list[dict[str, Any]] | None = None,
        owner: str,
        lifecycle: str = "active",
        sensitivity: str = "internal",
        reliability: str = "verified",
        freshness: str = "frozen-snapshot",
        use_when: str = "",
        do_not_use_when: str = "",
        quality_notes: list[str] | None = None,
    ) -> Path:
        table = pa.table(columns)
        schema_dir = PARQUET_ROOT / schema
        schema_dir.mkdir(parents=True, exist_ok=True)
        path = schema_dir / f"{name}.parquet"
        pq.write_table(table, path, **PARQUET_OPTIONS)

        fks = foreign_keys or []
        fq_name = f"{schema}.{name}"
        # ``pa.table`` uses Arrow's permissive schema default, which marks every
        # field nullable even when the released snapshot contains no nulls.  The
        # catalog describes this frozen release, so profile the actual arrays
        # rather than repeating that schema-construction default.
        column_catalog = []
        for index, field in enumerate(table.schema):
            null_count = table.column(index).null_count
            column_catalog.append(
                {
                    "name": field.name,
                    "type": str(field.type),
                    "nullable": null_count > 0,
                    "null_count": null_count,
                }
            )
        entry = {
            "asset_id": f"tbl:{fq_name}",
            "company": COMPANY_NAME,
            "schema": schema,
            "table": name,
            "fully_qualified_name": fq_name,
            "asset_type": "parquet-table",
            "description": description,
            "grain": grain,
            "primary_key": primary_key,
            "foreign_keys": fks,
            "owner": owner,
            "lifecycle": lifecycle,
            "sensitivity": sensitivity,
            "reliability": reliability,
            "freshness": freshness,
            "use_when": use_when,
            "do_not_use_when": do_not_use_when,
            "quality_notes": quality_notes or [],
            "row_count": table.num_rows,
            "column_count": table.num_columns,
            "columns": column_catalog,
            "relative_path": str(path.relative_to(self.project_root)),
        }
        self.catalog.append(entry)
        for fk in fks:
            self.relationships.append(
                {
                    "from_table": fq_name,
                    "from_columns": fk["columns"],
                    "to_table": fk["references"],
                    "to_columns": fk.get("referenced_columns", fk["columns"]),
                    "cardinality": fk.get("cardinality", "many-to-one"),
                    "nullable": fk.get("nullable", False),
                    "temporal_condition": fk.get("temporal_condition"),
                    "warning": fk.get("warning"),
                }
            )
        self.manifest.append(
            {
                "table": fq_name,
                "rows": table.num_rows,
                "columns": table.num_columns,
                "bytes": path.stat().st_size,
                "sha256": self._sha256(path),
                "path": str(path.relative_to(self.project_root)),
            }
        )
        print(
            f"[write] {fq_name:<42} {table.num_rows:>10,} rows x {table.num_columns:>3} cols "
            f"({path.stat().st_size / 1024 / 1024:,.1f} MiB)",
            flush=True,
        )
        return path

    @property
    def project_root(self) -> Path:
        return PARQUET_ROOT.parent

    def add_anomaly(self, **record: Any) -> None:
        self.anomalies.append(record)

    def finalize(self) -> None:
        self.catalog.sort(key=lambda x: x["fully_qualified_name"])
        self.relationships.sort(key=lambda x: (x["from_table"], x["to_table"]))
        self.manifest.sort(key=lambda x: x["table"])
        payloads = {
            CATALOG_ROOT / "data_catalog.json": self.catalog,
            CATALOG_ROOT / "relationships.json": self.relationships,
            CATALOG_ROOT / "anomaly_ledger.json": self.anomalies,
            CATALOG_ROOT / "manifest.json": {
                "company": COMPANY_NAME,
                "master_seed": MASTER_SEED,
                "table_count": len(self.manifest),
                "total_rows": sum(x["rows"] for x in self.manifest),
                "total_bytes": sum(x["bytes"] for x in self.manifest),
                "files": self.manifest,
            },
        }
        for path, payload in payloads.items():
            path.write_text(json.dumps(payload, indent=2, default=str) + "\n")
        self._write_inventory_markdown()

    def _write_inventory_markdown(self) -> None:
        by_schema: dict[str, list[dict[str, Any]]] = {}
        for item in self.catalog:
            by_schema.setdefault(item["schema"], []).append(item)
        lines = [
            f"# {COMPANY_NAME} data-estate inventory",
            "",
            f"Generated tables: **{len(self.catalog)}**  ",
            f"Generated rows: **{sum(x['row_count'] for x in self.catalog):,}**  ",
            f"Schemas: **{len(by_schema)}**",
            "",
        ]
        for schema, tables in sorted(by_schema.items()):
            lines.extend(
                [
                    f"## `{schema}`",
                    "",
                    "| Table | Grain | Rows | Columns | Reliability |",
                    "|---|---|---:|---:|---|",
                ]
            )
            for item in tables:
                grain = item["grain"].replace("|", "/")
                lines.append(
                    f"| `{item['table']}` | {grain} | {item['row_count']:,} | "
                    f"{item['column_count']} | {item['reliability']} |"
                )
            lines.append("")
        (DOCS_ROOT / "schema_inventory.md").write_text("\n".join(lines) + "\n")

    @staticmethod
    def _sha256(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()
