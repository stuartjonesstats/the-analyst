from __future__ import annotations

import json

from config import CATALOG_ROOT, PROJECT_ROOT


PUBLIC_ROOT = PROJECT_ROOT / "web" / "public" / "data"


def main() -> None:
    catalog_path = CATALOG_ROOT / "data_catalog.json"
    public_catalog_path = PUBLIC_ROOT / "catalog" / "data_catalog.json"
    catalog_text = catalog_path.read_text(encoding="utf-8")
    if catalog_text != public_catalog_path.read_text(encoding="utf-8"):
        raise SystemExit("catalog/data_catalog.json and the public catalog copy differ")

    catalog = json.loads(catalog_text)
    catalog_by_name = {asset["fully_qualified_name"]: asset for asset in catalog}
    errors: list[str] = []

    for asset in catalog:
        columns = {column["name"]: column for column in asset["columns"]}
        for column in columns.values():
            null_count = column.get("null_count")
            if not isinstance(null_count, int) or null_count < 0:
                errors.append(f"{asset['fully_qualified_name']}.{column['name']}: invalid null_count")
            elif column.get("nullable") is not (null_count > 0):
                errors.append(f"{asset['fully_qualified_name']}.{column['name']}: nullable/null_count disagree")
        for primary_key in asset["primary_key"]:
            column = columns.get(primary_key)
            if column is None:
                errors.append(f"{asset['fully_qualified_name']}: missing primary-key column {primary_key}")
            elif column["null_count"] != 0:
                errors.append(f"{asset['fully_qualified_name']}.{primary_key}: primary key contains nulls")

    csat = catalog_by_name["support.csat_response"]
    if not any("score_normalized" in note for note in csat["quality_notes"]):
        errors.append("support.csat_response: quality note does not name score_normalized")
    if any("normalized_score" in note for note in csat["quality_notes"]):
        errors.append("support.csat_response: stale normalized_score name remains")

    lineage = json.loads((PUBLIC_ROOT / "catalog" / "assignment_extracts.json").read_text(encoding="utf-8"))
    assignments = lineage.get("assignments", [])
    if len(assignments) != 9:
        errors.append(f"assignment extract lineage: expected 9 assignments, found {len(assignments)}")
    if [assignment.get("sequence") for assignment in assignments] != list(range(1, 10)):
        errors.append("assignment extract lineage: sequence must be 1 through 9")

    for assignment in assignments:
        slug = assignment["slug"]
        if not assignment.get("analysis_cutoff") or not assignment.get("selection_policy") or not assignment.get("closure_policy"):
            errors.append(f"{slug}: cutoff, selection, and closure policies are required")
        files = assignment.get("files", [])
        if assignment.get("mounted_file_count") != len(files):
            errors.append(f"{slug}: mounted_file_count does not match files")
        if assignment.get("mounted_row_count") != sum(file["mounted_rows"] for file in files):
            errors.append(f"{slug}: mounted_row_count does not match file rows")
        for file in files:
            if not file.get("selection"):
                errors.append(f"{slug}/{file.get('table')}: selection rule is required")
            source_table = file.get("source_table")
            if source_table:
                asset = catalog_by_name.get(source_table)
                if asset is None:
                    errors.append(f"{slug}/{file['table']}: unknown source table {source_table}")
                elif file.get("enterprise_rows") != asset["row_count"]:
                    errors.append(f"{slug}/{file['table']}: enterprise row count is stale")
                elif file["mounted_rows"] > asset["row_count"]:
                    errors.append(f"{slug}/{file['table']}: mounted rows exceed source-table rows")
            elif file.get("enterprise_rows") is not None:
                errors.append(f"{slug}/{file['table']}: scenario table cannot have enterprise rows")

    if errors:
        raise SystemExit("\n".join(f"[error] {error}" for error in errors))

    primary_key_count = sum(len(asset["primary_key"]) for asset in catalog)
    null_column_count = sum(
        1 for asset in catalog for column in asset["columns"] if column["null_count"] > 0
    )
    print(
        f"[ok] {len(catalog)} assets; {primary_key_count} primary-key fields non-null; "
        f"{null_column_count} columns contain observed nulls; 9 assignment lineages valid"
    )


if __name__ == "__main__":
    main()
