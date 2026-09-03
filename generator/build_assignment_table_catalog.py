"""Build the learner-safe, assignment-specific schema catalog used by AI help packets."""

from __future__ import annotations

import json
from pathlib import Path

import duckdb


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_ROOT = ROOT / "web" / "public"
CASE_ROOT = PUBLIC_ROOT / "data" / "cases"
CATALOG_ROOT = PUBLIC_ROOT / "data" / "catalog"
OUTPUT = CATALOG_ROOT / "assignment_table_catalog.json"


def parquet_path(manifest_dir: Path, item: dict[str, object]) -> Path:
    public_path = item.get("publicUrl") or item.get("public_path") or item.get("path")
    if isinstance(public_path, str) and public_path.startswith("/data/"):
        candidate = PUBLIC_ROOT / public_path.removeprefix("/")
        if candidate.exists():
            return candidate
    file_name = item.get("file")
    if isinstance(file_name, str):
        direct = manifest_dir / file_name
        if direct.exists():
            return direct
        matches = list(manifest_dir.rglob(file_name))
        if len(matches) == 1:
            return matches[0]
    table = str(item["table"])
    matches = list(manifest_dir.rglob(f"{table.split('.')[-1]}.parquet"))
    if len(matches) == 1:
        return matches[0]
    raise FileNotFoundError(f"Cannot resolve Parquet for {table} in {manifest_dir}")


def main() -> None:
    enterprise_assets = json.loads((CATALOG_ROOT / "data_catalog.json").read_text())
    enterprise_by_name = {asset["fully_qualified_name"]: asset for asset in enterprise_assets}
    extracts = json.loads((CATALOG_ROOT / "assignment_extracts.json").read_text())
    extracts_by_slug = {assignment["slug"]: assignment for assignment in extracts["assignments"]}
    connection = duckdb.connect()
    assignments: list[dict[str, object]] = []

    for manifest_path in sorted(CASE_ROOT.glob("*/manifest.json")):
        slug = manifest_path.parent.name
        manifest = json.loads(manifest_path.read_text())
        mounted_names = {item["table"] for item in manifest["files"]}
        extract = extracts_by_slug[slug]
        extract_by_table = {item["table"]: item for item in extract["files"]}
        sources: list[dict[str, object]] = []

        for item in manifest["files"]:
            table = item["table"]
            source_name = item.get("source_table") or table
            base = enterprise_by_name.get(source_name, {})
            lineage = extract_by_table[table]
            path = parquet_path(manifest_path.parent, item)
            escaped = str(path).replace("'", "''")
            described = connection.execute(
                f"DESCRIBE SELECT * FROM read_parquet('{escaped}')"
            ).fetchall()
            columns = [
                {"name": row[0], "type": row[1], "nullable": row[2] == "YES"}
                for row in described
            ]
            column_names = {column["name"] for column in columns}
            primary_key = [
                column for column in base.get("primary_key", []) if column in column_names
            ]
            foreign_keys = [
                key for key in base.get("foreign_keys", [])
                if all(column in column_names for column in key["columns"])
                and key["references"] in mounted_names
            ]
            supplied = source_name not in enterprise_by_name
            quality_notes = list(base.get("quality_notes", []))
            for note in (lineage.get("transformation"), lineage.get("note")):
                if note and note not in quality_notes:
                    quality_notes.append(note)

            sources.append({
                "fully_qualified_name": table,
                "description": base.get("description") or lineage.get("note")
                or "Assignment-supplied decision artifact; establish its meaning before use.",
                "grain": base.get("grain") if not supplied else
                "Assignment-supplied table; profile and test its grain before joining.",
                "primary_key": primary_key,
                "foreign_keys": foreign_keys,
                "owner": base.get("owner", "Assignment case file"),
                "reliability": base.get("reliability", "review-required"),
                "sensitivity": base.get("sensitivity", "internal-fictional"),
                "use_when": base.get("use_when") or lineage["selection"],
                "do_not_use_when": base.get("do_not_use_when") or
                "Do not assume this artifact's grain, keys, coverage, or claims without profiling it.",
                "quality_notes": quality_notes,
                "columns": columns,
            })

        assignments.append({"slug": slug, "sources": sources})

    connection.close()
    OUTPUT.write_text(json.dumps({"assignments": assignments}, indent=2) + "\n")
    print(f"Wrote {OUTPUT.relative_to(ROOT)} with {len(assignments)} assignments")


if __name__ == "__main__":
    main()
