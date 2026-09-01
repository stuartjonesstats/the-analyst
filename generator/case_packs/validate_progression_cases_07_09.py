#!/usr/bin/env python3
"""Exact, non-semantic validations for progression case packs 07 through 09."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import duckdb
import numpy as np
import pandas as pd
import pyarrow.parquet as pq
from sklearn.metrics import roc_auc_score
from sklearn.tree import DecisionTreeClassifier


PROJECT_ROOT = Path(__file__).resolve().parents[2]
PACK_ROOT = PROJECT_ROOT / "web" / "public" / "data" / "cases"
SOURCE_ROOT = PROJECT_ROOT / "parquet"
REPORT_PATH = PROJECT_ROOT / "validation" / "case_packs" / "progression_cases_07_09.json"
checks: list[dict[str, Any]] = []


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def record(case: str, check_id: str, passed: bool, value: Any, requirement: str) -> None:
    checks.append(
        {
            "case": case,
            "check_id": check_id,
            "passed": bool(passed),
            "value": value,
            "requirement": requirement,
        }
    )


def scalar(connection: duckdb.DuckDBPyConnection, query: str) -> Any:
    return connection.execute(query).fetchone()[0]


def validate_manifests() -> None:
    for slug in ("the-orion-renewal", "the-queue-nobody-owns", "too-good-to-ship"):
        manifest_path = PACK_ROOT / slug / "manifest.json"
        manifest = json.loads(manifest_path.read_text())
        actual_rows = 0
        actual_bytes = 0
        all_match = True
        max_file_bytes = 0
        for entry in manifest["files"]:
            path = PACK_ROOT / slug / entry["file"]
            parquet = pq.ParquetFile(path)
            matches = (
                path.exists()
                and parquet.metadata.num_rows == entry["rows"]
                and len(parquet.schema_arrow.names) == entry["columns"]
                and path.stat().st_size == entry["bytes"]
                and sha256(path) == entry["sha256"]
            )
            all_match = all_match and matches
            actual_rows += parquet.metadata.num_rows
            actual_bytes += path.stat().st_size
            max_file_bytes = max(max_file_bytes, path.stat().st_size)
        all_match = all_match and actual_rows == manifest["total_rows"] and actual_bytes == manifest["total_bytes"]
        record(slug, "manifest_integrity", all_match, {"files": len(manifest["files"]), "rows": actual_rows, "bytes": actual_bytes}, "every manifest row, byte count, schema width, and SHA-256 matches the generated file")
        record(slug, "github_file_limit", max_file_bytes < 100_000_000, max_file_bytes, "every browser Parquet is below GitHub's 100 MB per-file limit")


def validate_orion(connection: duckdb.DuckDBPyConnection) -> None:
    case = "the-orion-renewal"
    root = PACK_ROOT / case
    route = root / "route.parquet"
    stop = root / "route_stop.parquet"
    branch = root / "branch.parquet"
    work_order = root / "work_order.parquet"
    status = root / "work_order_status_event.parquet"
    part = root / "work_order_part.parquet"
    visit = root / "visit.parquet"
    shift = root / "shift.parquet"
    traffic = root / "traffic_area_hourly.parquet"

    transition = connection.execute(
        f"""
        SELECT
          MAX(route_date) FILTER (WHERE optimizer_version = 'LEGACY-RULES'),
          MIN(route_date) FILTER (WHERE optimizer_version = 'ORION-2'),
          COUNT(DISTINCT branch_id) FILTER (WHERE optimizer_version = 'LEGACY-RULES'),
          COUNT(DISTINCT branch_id) FILTER (WHERE optimizer_version = 'ORION-2')
        FROM read_parquet('{route}')
        """
    ).fetchone()
    transition_value = [str(value) for value in transition]
    record(case, "global_regime_transition", transition_value == ["2025-04-30", "2025-05-01", "36", "36"], transition_value, "legacy ends 2025-04-30, ORION-2 starts 2025-05-01, and all 36 branches appear in both regimes")

    region_dates = connection.execute(
        f"""
        SELECT branch.region_id,
          MIN(route.route_date) FILTER (WHERE optimizer_version = 'ORION-2') AS first_orion,
          MAX(route.route_date) FILTER (WHERE optimizer_version = 'LEGACY-RULES') AS last_legacy
        FROM read_parquet('{route}') route
        JOIN read_parquet('{branch}') branch USING (branch_id)
        GROUP BY branch.region_id ORDER BY branch.region_id
        """
    ).fetchall()
    same_transition = len(region_dates) == 6 and all(str(first) == "2025-05-01" and str(last) == "2025-04-30" for _, first, last in region_dates)
    record(case, "no_untreated_region", same_transition, [[region, str(first), str(last)] for region, first, last in region_dates], "all six regions transition on the same date")

    multi_route = connection.execute(
        f"""SELECT COUNT(*), SUM(route_count)
             FROM (
               SELECT work_order_id, COUNT(DISTINCT route_id) AS route_count
               FROM read_parquet('{stop}') GROUP BY work_order_id HAVING route_count > 1
             )"""
    ).fetchone()
    record(case, "reschedule_multiplicity", multi_route[0] > 10_000 and multi_route[1] > multi_route[0], {"multi_route_work_orders": multi_route[0], "route_assignments": multi_route[1]}, "substantial work-order rescheduling survives extraction")

    orphan_counts = {
        "stop_to_route": scalar(connection, f"SELECT COUNT(*) FROM read_parquet('{stop}') stop ANTI JOIN read_parquet('{route}') route USING (route_id)"),
        "stop_to_work_order": scalar(connection, f"SELECT COUNT(*) FROM read_parquet('{stop}') stop ANTI JOIN read_parquet('{work_order}') work_order USING (work_order_id)"),
        "status_to_work_order": scalar(connection, f"SELECT COUNT(*) FROM read_parquet('{status}') status ANTI JOIN read_parquet('{work_order}') work_order USING (work_order_id)"),
        "part_to_work_order": scalar(connection, f"SELECT COUNT(*) FROM read_parquet('{part}') part ANTI JOIN read_parquet('{work_order}') work_order USING (work_order_id)"),
        "visit_to_work_order": scalar(connection, f"SELECT COUNT(*) FROM read_parquet('{visit}') visit ANTI JOIN read_parquet('{work_order}') work_order USING (work_order_id)"),
    }
    record(case, "relational_closure", all(value == 0 for value in orphan_counts.values()), orphan_counts, "every extracted operational child resolves to its included parent")

    fanout = connection.execute(
        f"""
        SELECT COUNT(*) AS joined_rows, COUNT(DISTINCT stop.work_order_id) AS work_orders
        FROM read_parquet('{stop}') stop
        JOIN read_parquet('{status}') status USING (work_order_id)
        JOIN read_parquet('{part}') part USING (work_order_id)
        """
    ).fetchone()
    record(case, "fanout_trap_retained", fanout[0] > fanout[1] * 20, {"naive_join_rows": fanout[0], "distinct_work_orders": fanout[1], "multiplier": round(fanout[0] / fanout[1], 2)}, "a naive stop/status/part join materially multiplies the work-order grain")

    route_columns = pq.ParquetFile(route).schema_arrow.names
    has_route_hour_denominator = any("hour" in column.lower() for column in route_columns)
    record(case, "vendor_denominator_unavailable", not has_route_hour_denominator, route_columns, "the route extract does not contain a clean planned-route-hours denominator")

    traffic_revisions = scalar(
        connection,
        f"""SELECT COUNT(*) FROM (
               SELECT service_area_id, observed_hour, COUNT(*) AS versions
               FROM read_parquet('{traffic}') GROUP BY 1, 2 HAVING versions > 1
             )""",
    )
    record(case, "traffic_revisions_retained", traffic_revisions > 0, traffic_revisions, "provider revisions remain available for an explicit as-of policy")

    named_technicians = scalar(connection, f"SELECT COUNT(DISTINCT technician_employee_id) FROM read_parquet('{route}')")
    scheduled_technicians = scalar(connection, f"SELECT COUNT(DISTINCT employee_id) FROM read_parquet('{shift}')")
    record(case, "workforce_coverage", named_technicians == 320 and scheduled_technicians == named_technicians, {"route_technicians": named_technicians, "shift_technicians": scheduled_technicians}, "all routed technicians have scheduled-capacity history")


def validate_queue(connection: duckdb.DuckDBPyConnection) -> None:
    case = "the-queue-nobody-owns"
    root = PACK_ROOT / case
    conversation = root / "conversation.parquet"
    ticket = root / "ticket.parquet"
    message = root / "message.parquet"
    status = root / "ticket_status_event.parquet"
    queue = root / "scoring_queue.parquet"
    source_message = SOURCE_ROOT / "support" / "message.parquet"
    source_conversation = SOURCE_ROOT / "support" / "conversation.parquet"
    source_ticket = SOURCE_ROOT / "support" / "ticket.parquet"

    grains = connection.execute(
        f"SELECT COUNT(*), COUNT(DISTINCT conversation_id), MIN(first_customer_at), MAX(first_customer_at), COUNT_IF(opening_customer_text IS NULL) FROM read_parquet('{queue}')"
    ).fetchone()
    grain_value = [grains[0], grains[1], str(grains[2]), str(grains[3]), grains[4]]
    record(case, "safe_queue_grain", grains[0] == 818 and grains[1] == 818 and grains[4] == 0 and grains[3] <= pd.Timestamp("2024-12-03 08:20:00").to_pydatetime(), grain_value, "the scoring queue is 818 unique conversations with non-empty opening text available by the snapshot")

    forbidden = {
        "ticket_id", "interaction_fingerprint", "account_id", "service_site_id",
        "assigned_team_code", "category_code", "current_status_code", "solved_at",
        "first_response_minutes", "reopen_count", "sender_type_code", "sentiment_score",
    }
    queue_columns = set(pq.ParquetFile(queue).schema_arrow.names)
    record(case, "safe_queue_projection", forbidden.isdisjoint(queue_columns), sorted(queue_columns), "the learner scoring queue excludes identifiers, labels, outcomes, and later-message metadata")

    matched_opening = scalar(
        connection,
        f"""
        SELECT COUNT(*)
        FROM read_parquet('{queue}') queue
        JOIN read_parquet('{source_conversation}') conversation USING (conversation_id)
        JOIN read_parquet('{source_ticket}') ticket USING (ticket_id)
        JOIN read_parquet('{source_message}') message
          ON message.conversation_id = queue.conversation_id
         AND message.sent_at = queue.first_customer_at
         AND message.body_text = queue.opening_customer_text
        WHERE message.sender_type_code = 'CUSTOMER'
          AND message.sent_at >= conversation.started_at
          AND message.sent_at <= TIMESTAMP '2024-12-03 08:20:00'
          AND ticket.subject = queue.subject
        """,
    )
    record(case, "opening_text_provenance", matched_opening == 818, matched_opening, "each opening text traces to an eligible customer message and matching ticket subject")

    history_boundary = connection.execute(
        f"SELECT MAX(started_at), (SELECT MIN(started_at) FROM read_parquet('{queue}')) FROM read_parquet('{conversation}')"
    ).fetchone()
    record(case, "cohort_separation", history_boundary[0] < history_boundary[1], [str(value) for value in history_boundary], "historical conversation starts precede the scoring cohort")

    orphans = {
        "message_to_conversation": scalar(connection, f"SELECT COUNT(*) FROM read_parquet('{message}') message ANTI JOIN read_parquet('{conversation}') conversation USING (conversation_id)"),
        "conversation_to_ticket": scalar(connection, f"SELECT COUNT(*) FROM read_parquet('{conversation}') conversation ANTI JOIN read_parquet('{ticket}') ticket USING (ticket_id)"),
        "status_to_ticket": scalar(connection, f"SELECT COUNT(*) FROM read_parquet('{status}') status ANTI JOIN read_parquet('{ticket}') ticket USING (ticket_id)"),
    }
    record(case, "relational_closure", all(value == 0 for value in orphans.values()), orphans, "historical message, conversation, ticket, and status relationships are closed")

    duplicate_groups = connection.execute(
        f"SELECT COUNT(*), SUM(ticket_count) FROM (SELECT interaction_fingerprint, COUNT(*) ticket_count FROM read_parquet('{ticket}') GROUP BY 1 HAVING ticket_count > 1)"
    ).fetchone()
    record(case, "dual_write_groups_retained", duplicate_groups[0] > 0, {"duplicate_interactions": duplicate_groups[0], "tickets": duplicate_groups[1]}, "distinct source tickets still share business-interaction fingerprints")

    text_mechanisms = connection.execute(
        f"""
        SELECT
          COUNT(DISTINCT body_text),
          COUNT_IF(sender_type_code <> 'CUSTOMER'),
          COUNT_IF(redaction_state_code = 'REVIEW_REQUIRED'),
          COUNT_IF(contains_synthetic_pii_flag),
          COUNT_IF(message.sent_at < conversation.started_at)
        FROM read_parquet('{message}') message
        JOIN read_parquet('{conversation}') conversation USING (conversation_id)
        """
    ).fetchone()
    text_value = {"templates": text_mechanisms[0], "non_customer": text_mechanisms[1], "review_required": text_mechanisms[2], "pii_flagged": text_mechanisms[3], "pre_start_inconsistencies": text_mechanisms[4]}
    record(case, "text_and_handling_mechanisms", text_mechanisms[0] == 5 and all(value > 0 for value in text_mechanisms[1:]), text_value, "repetitive text, post-route senders, handling flags, and timestamp inconsistencies all survive")

    conditional_ceiling = scalar(
        connection,
        f"""
        WITH first_legal_customer AS (
          SELECT conversation.conversation_id, MIN(message.sent_at) AS first_customer_at
          FROM read_parquet('{conversation}') conversation
          JOIN read_parquet('{message}') message USING (conversation_id)
          WHERE message.sender_type_code = 'CUSTOMER' AND message.sent_at >= conversation.started_at
          GROUP BY conversation.conversation_id
        ), corpus AS (
          SELECT conversation.conversation_id, message.body_text, ticket.assigned_team_code
          FROM first_legal_customer first
          JOIN read_parquet('{conversation}') conversation USING (conversation_id)
          JOIN read_parquet('{ticket}') ticket USING (ticket_id)
          JOIN read_parquet('{message}') message
            ON message.conversation_id = first.conversation_id AND message.sent_at = first.first_customer_at
        ), template_counts AS (
          SELECT body_text, assigned_team_code, COUNT(*) AS n FROM corpus GROUP BY 1, 2
        ), best_by_template AS (
          SELECT body_text, MAX(n) AS best FROM template_counts GROUP BY body_text
        )
        SELECT SUM(best) * 1.0 / (SELECT COUNT(*) FROM corpus) FROM best_by_template
        """,
    )
    record(case, "weak_clean_text_signal", conditional_ceiling < 0.25, round(conditional_ceiling, 6), "even an in-sample majority lookup by the five clean templates remains below 25% accuracy")

    queue_slices = connection.execute(
        f"SELECT COUNT_IF(redaction_review_flag), COUNT_IF(contains_synthetic_pii_flag), COUNT_IF(urgent_review_flag), COUNT_IF(language_code <> 'en') FROM read_parquet('{queue}')"
    ).fetchone()
    record(case, "mandatory_review_slices", all(value > 0 for value in queue_slices), {"redaction_review": queue_slices[0], "pii_flagged": queue_slices[1], "urgent": queue_slices[2], "non_english_or_unknown": queue_slices[3]}, "the unlabeled queue contains every policy-relevant mandatory-review slice")


def validate_beacon(connection: duckdb.DuckDBPyConnection) -> None:
    case = "too-good-to-ship"
    root = PACK_ROOT / case
    snapshot_path = root / "account_feature_snapshot.parquet"
    split_path = root / "beacon_submitted_split.parquet"
    account_path = root / "account.parquet"
    status_path = root / "account_status_event.parquet"
    subscription_path = root / "subscription.parquet"
    subscription_event_path = root / "subscription_event.parquet"
    payment_path = root / "payment_attempt.parquet"

    schema = pq.ParquetFile(snapshot_path).schema_arrow.names
    final_columns = schema[-3:]
    expected_future = ["future_90d_cancelled_flag", "future_90d_payment_failure_count", "eventual_lifetime_value_cents"]
    record(case, "wide_snapshot_and_future_tail", len(schema) == 213 and final_columns == expected_future, {"columns": len(schema), "final_columns": final_columns}, "the 213-column snapshot retains the three realized future outcomes in their documented tail positions")

    snapshot_stats = connection.execute(
        f"""SELECT COUNT(*), COUNT(DISTINCT account_id), COUNT(*) - COUNT(DISTINCT account_id),
                  AVG(future_90d_cancelled_flag::INTEGER),
                  MAX(DATE_DIFF('hour', source_watermark_at, feature_as_of_at))
             FROM read_parquet('{snapshot_path}')"""
    ).fetchone()
    record(case, "entity_and_availability_structure", snapshot_stats[0] == 33156 and snapshot_stats[1] == 12000 and snapshot_stats[2] > 20_000 and 0 < snapshot_stats[3] < 1 and snapshot_stats[4] >= 95, {"rows": snapshot_stats[0], "accounts": snapshot_stats[1], "repeat_snapshots": snapshot_stats[2], "positive_rate": round(snapshot_stats[3], 6), "max_watermark_lag_hours": snapshot_stats[4]}, "the compact cohort retains repeated entities, both target classes, and availability lag")

    split_stats = connection.execute(
        f"""
        WITH joined AS (
          SELECT snapshot.account_id, snapshot.feature_as_of_at, split.submitted_partition
          FROM read_parquet('{snapshot_path}') snapshot
          JOIN read_parquet('{split_path}') split USING (account_feature_snapshot_id)
        )
        SELECT
          (SELECT COUNT(*) FROM joined WHERE submitted_partition = 'TRAIN'),
          (SELECT COUNT(*) FROM joined WHERE submitted_partition = 'VALIDATION'),
          (SELECT COUNT(*) FROM (SELECT account_id FROM joined GROUP BY account_id HAVING COUNT(DISTINCT submitted_partition) = 2)),
          (SELECT MIN(feature_as_of_at) FROM joined WHERE submitted_partition = 'TRAIN'),
          (SELECT MAX(feature_as_of_at) FROM joined WHERE submitted_partition = 'TRAIN'),
          (SELECT MIN(feature_as_of_at) FROM joined WHERE submitted_partition = 'VALIDATION'),
          (SELECT MAX(feature_as_of_at) FROM joined WHERE submitted_partition = 'VALIDATION')
        """
    ).fetchone()
    temporal_overlap = split_stats[3] <= split_stats[6] and split_stats[5] <= split_stats[4]
    record(case, "submitted_split_failures", split_stats[2] > 1000 and temporal_overlap, {"train_rows": split_stats[0], "validation_rows": split_stats[1], "accounts_on_both_sides": split_stats[2], "train_window": [str(split_stats[3]), str(split_stats[4])], "validation_window": [str(split_stats[5]), str(split_stats[6])]}, "the supplied row split has substantial account overlap and overlapping calendar windows")

    snapshot = pd.read_parquet(snapshot_path)
    split = pd.read_parquet(split_path)
    submitted = snapshot.merge(split, on="account_feature_snapshot_id", validate="one_to_one")
    numeric_columns = [
        column for column in snapshot.select_dtypes(include=[np.number, "bool"]).columns
        if column != "account_feature_snapshot_id"
    ]
    direct_target_selected = "future_90d_cancelled_flag" in numeric_columns
    train = submitted[submitted["submitted_partition"] == "TRAIN"]
    validation = submitted[submitted["submitted_partition"] == "VALIDATION"]
    model = DecisionTreeClassifier(max_depth=3, random_state=260120)
    model.fit(train[numeric_columns].fillna(-999), train["future_90d_cancelled_flag"].astype(int))
    probability = model.predict_proba(validation[numeric_columns].fillna(-999))[:, 1]
    auc = roc_auc_score(validation["future_90d_cancelled_flag"].astype(int), probability)
    record(case, "submitted_result_reproduces", direct_target_selected and auc > 0.999, {"numeric_wildcard_columns": len(numeric_columns), "direct_target_selected": direct_target_selected, "validation_auc": round(float(auc), 6)}, "the exact wildcard and row-split mechanism reproducibly yields an implausibly perfect result")

    orphans = {
        "status_to_account": scalar(connection, f"SELECT COUNT(*) FROM read_parquet('{status_path}') status ANTI JOIN read_parquet('{account_path}') account USING (account_id)"),
        "subscription_to_account": scalar(connection, f"SELECT COUNT(*) FROM read_parquet('{subscription_path}') subscription ANTI JOIN read_parquet('{account_path}') account USING (account_id)"),
        "event_to_subscription": scalar(connection, f"SELECT COUNT(*) FROM read_parquet('{subscription_event_path}') event ANTI JOIN read_parquet('{subscription_path}') subscription USING (subscription_id)"),
        "payment_to_account": scalar(connection, f"SELECT COUNT(*) FROM read_parquet('{payment_path}') payment ANTI JOIN read_parquet('{account_path}') account USING (account_id)"),
    }
    record(case, "relational_closure", all(value == 0 for value in orphans.values()), orphans, "all related account, subscription, event, and payment records resolve inside the cohort")


def main() -> None:
    validate_manifests()
    connection = duckdb.connect()
    try:
        connection.execute("SET threads = 4")
        validate_orion(connection)
        validate_queue(connection)
        validate_beacon(connection)
    finally:
        connection.close()

    failed = [check for check in checks if not check["passed"]]
    report = {
        "suite": "progression_cases_07_09",
        "revision": "2026.09.01.casepack.1",
        "checks": len(checks),
        "passed": len(checks) - len(failed),
        "failed": len(failed),
        "status": "PASS" if not failed else "FAIL",
        "results": checks,
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2, default=str) + "\n")
    print(json.dumps({key: report[key] for key in ("suite", "checks", "passed", "failed", "status")}, indent=2))
    if failed:
        for check in failed:
            print(f"FAILED {check['case']}::{check['check_id']}: {check['value']}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
