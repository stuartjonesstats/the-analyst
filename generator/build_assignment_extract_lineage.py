from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from config import CATALOG_ROOT, PROJECT_ROOT


CASE_ROOT = PROJECT_ROOT / "web" / "public" / "data" / "cases"
OUTPUT_PATH = PROJECT_ROOT / "web" / "public" / "data" / "catalog" / "assignment_extracts.json"

ASSIGNMENTS: list[dict[str, Any]] = [
    {
        "sequence": 1,
        "id": "CC-241202",
        "slug": "the-monday-scorecard",
        "title": "The Monday Scorecard",
        "analysis_cutoff": "2024-12-02 08:05 ET",
        "closure_policy": "No assignment-specific closure: all rows from the three released source snapshots are mounted. Learners must define the eligible response cohort and enforce the historical cutoff.",
    },
    {
        "sequence": 2,
        "id": "CM-240708",
        "slug": "the-quarter-that-moved",
        "title": "The Quarter That Moved",
        "analysis_cutoff": "2024-07-08 08:30 ET",
        "closure_policy": "The complete Q2 decision-window order population is retained with every linked child row; no sampling. Later warehouse arrivals remain visible for explicit close-policy treatment.",
    },
    {
        "sequence": 3,
        "id": "GX-250505",
        "slug": "the-navigation-vote",
        "title": "The Navigation Vote",
        "analysis_cutoff": "2025-05-05 09:00 ET",
        "closure_policy": "The complete EXP005 assignment population is retained with linked sessions, events, orders, and accounts; no sampling. Exposure and attribution rules remain learner-owned.",
    },
    {
        "sequence": 4,
        "id": "OP-250320",
        "slug": "rollback-before-dawn",
        "title": "Rollback Before Dawn",
        "analysis_cutoff": "2025-03-20 11:40 ET",
        "closure_policy": "A deterministic regional asset cohort and its telemetry, alert, weather, and field-operation neighborhood are mounted. The frozen extract intentionally retains later rows and outcomes, so each evidence lane must enforce knowledge time.",
    },
    {
        "sequence": 5,
        "id": "FO-250320",
        "slug": "the-730-capacity-call",
        "title": "The 7:30 Capacity Call",
        "analysis_cutoff": "2025-03-20 07:30 ET",
        "closure_policy": "All appointments for the selected branch are retained with their relational neighborhood. Historical source extracts contain realized outcomes; only the outcome-withheld current roster is eligible for current scoring.",
    },
    {
        "sequence": 6,
        "id": "SP-251201",
        "slug": "forty-eight-hours-of-stock",
        "title": "Forty-Eight Hours of Stock",
        "analysis_cutoff": "2025-12-01 06:45 ET",
        "closure_policy": "The full supply domain is mounted, plus a deterministic 30-pair watchlist and scenario constraints. Post-origin movements and receipts remain present and must be excluded from model selection and forecasting inputs.",
    },
    {
        "sequence": 7,
        "id": "PR-260119",
        "slug": "the-orion-renewal",
        "title": "The Orion Renewal",
        "analysis_cutoff": "Frozen estate extracted 2026-01-15; operating window ends 2025-12-31",
        "closure_policy": "Routes dated 2024-01-01 through 2025-12-31 are retained with their complete relational neighborhood. Route, stop, work-order, visit, and workforce grains are not collapsed during extraction.",
    },
    {
        "sequence": 8,
        "id": "NL-241203",
        "slug": "the-queue-nobody-owns",
        "title": "The Queue Nobody Owns",
        "analysis_cutoff": "2024-12-03 08:20 ET",
        "closure_policy": "Historical conversations begin before the unlabeled backlog and retain complete frozen message/status histories. The current 818-item backlog withholds later text and outcomes; intake-time feature closure is learner-owned.",
    },
    {
        "sequence": 9,
        "id": "MR-260120",
        "slug": "too-good-to-ship",
        "title": "Too Good to Ship",
        "analysis_cutoff": "Frozen estate extracted 2026-01-15; predictor availability is evaluated at each proposed decision time",
        "closure_policy": "A deterministic 12,000-account cohort retains every feature snapshot, all 213 feature columns, linked status/subscription/payment history, and the submitted split. Inclusion in the extract does not establish point-in-time predictor eligibility.",
    },
]


def _human_value(value: Any) -> str:
    if isinstance(value, list):
        return " → ".join(str(item) for item in value)
    if isinstance(value, dict):
        return "; ".join(f"{key.replace('_', ' ')}: {_human_value(item)}" for key, item in value.items())
    return str(value)


def _selection_summary(manifest: dict[str, Any]) -> str:
    if manifest.get("selectionPolicy"):
        return str(manifest["selectionPolicy"])
    if manifest.get("extract_boundary"):
        return str(manifest["extract_boundary"])
    selection = manifest.get("selection")
    if isinstance(selection, dict):
        return _human_value(selection)
    return "See the file-level selection rules."


def _file_selection(file_record: dict[str, Any]) -> str:
    source_mapping = file_record.get("sourceMapping") or {}
    return str(
        file_record.get("selection")
        or source_mapping.get("selection")
        or "Governed by the assignment selection policy above; no separate file-level rule is declared."
    )


def build() -> dict[str, Any]:
    catalog = json.loads((CATALOG_ROOT / "data_catalog.json").read_text(encoding="utf-8"))
    catalog_by_name = {asset["fully_qualified_name"]: asset for asset in catalog}
    assignments: list[dict[str, Any]] = []

    for assignment in ASSIGNMENTS:
        manifest_path = CASE_ROOT / assignment["slug"] / "manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        selection_summary = _selection_summary(manifest)
        files: list[dict[str, Any]] = []

        for file_record in manifest.get("files", []):
            table = str(file_record["table"])
            source_table = file_record.get("source_table")
            if not source_table and table in catalog_by_name:
                source_table = table
            source_asset = catalog_by_name.get(str(source_table)) if source_table else None
            source_mapping = file_record.get("sourceMapping") or {}
            files.append(
                {
                    "table": table,
                    "source_table": source_table,
                    "mounted_rows": int(file_record["rows"]),
                    "enterprise_rows": int(source_asset["row_count"]) if source_asset else None,
                    "selection": _file_selection(file_record),
                    "transformation": source_mapping.get("transformation"),
                    "note": file_record.get("note"),
                }
            )

        manifest_totals = manifest.get("totals") or {}
        declared_file_count = manifest.get("file_count", manifest_totals.get("files"))
        declared_row_count = manifest.get("total_rows", manifest_totals.get("rows"))
        if declared_file_count is not None and int(declared_file_count) != len(files):
            raise ValueError(
                f"{assignment['slug']}: manifest declares {declared_file_count} files; found {len(files)}"
            )
        mounted_row_count = sum(file["mounted_rows"] for file in files)
        if declared_row_count is not None and int(declared_row_count) != mounted_row_count:
            raise ValueError(
                f"{assignment['slug']}: manifest declares {declared_row_count} rows; found {mounted_row_count}"
            )

        assignments.append(
            {
                **assignment,
                "manifest_path": f"/data/cases/{assignment['slug']}/manifest.json",
                "selection_policy": selection_summary,
                "mounted_file_count": len(files),
                "mounted_row_count": mounted_row_count,
                "files": files,
            }
        )

    return {
        "catalog_snapshot": "2026-01-15",
        "row_count_definition": "Mounted rows are the rows exposed to the assignment. Enterprise rows are the rows in the corresponding released Meridian estate table. Scenario-supplied tables have no enterprise-row comparator.",
        "assignments": assignments,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build learner-facing assignment extract lineage.")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate that the committed learner-facing projection is current.",
    )
    args = parser.parse_args()
    payload = json.dumps(build(), indent=2) + "\n"

    if args.check:
        if not OUTPUT_PATH.exists() or OUTPUT_PATH.read_text(encoding="utf-8") != payload:
            raise SystemExit(f"assignment extract lineage is stale: {OUTPUT_PATH.relative_to(PROJECT_ROOT)}")
        print("[ok] assignment extract lineage matches all nine case manifests")
        return

    OUTPUT_PATH.write_text(payload, encoding="utf-8")
    print(f"[write] {OUTPUT_PATH.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()
