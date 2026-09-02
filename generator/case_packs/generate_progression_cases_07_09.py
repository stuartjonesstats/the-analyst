#!/usr/bin/env python3
"""Build the browser data packs for progression cases 07 through 09.

The source estate is intentionally much larger than a browser exercise needs.
These extracts keep complete relational neighborhoods and the documented failure
mechanisms while placing an explicit, reproducible boundary around each case.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import duckdb
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SOURCE_ROOT = PROJECT_ROOT / "parquet"
OUTPUT_ROOT = PROJECT_ROOT / "web" / "public" / "data" / "cases"
REVISION = "2026.09.01.casepack.1"
PARQUET_OPTIONS = {
    "compression": "zstd",
    "compression_level": 5,
    "use_dictionary": True,
    "write_statistics": True,
    "row_group_size": 65_536,
}


def source(table: str) -> str:
    """Return a SQL-safe source path for a fully qualified table name."""

    schema, name = table.split(".")
    return str(SOURCE_ROOT / schema / f"{name}.parquet").replace("'", "''")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def copy_query(connection: duckdb.DuckDBPyConnection, query: str, path: Path) -> None:
    """Write a query to Parquet atomically so interrupted builds do not corrupt packs."""

    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".parquet.building")
    temporary.unlink(missing_ok=True)
    escaped = str(temporary).replace("'", "''")
    connection.execute(
        f"COPY ({query}) TO '{escaped}' "
        "(FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE 65536)"
    )
    temporary.replace(path)


def restore_source_schema(path: Path, table: str) -> None:
    """Restore the source Arrow types that DuckDB normalizes while copying.

    DuckDB intentionally represents all ordinary timestamps as TIMESTAMP, but
    its Parquet writer emits microseconds even when the released source uses
    milliseconds.  Both query the same in SQL; preserving the exact source
    schema also keeps Python, Arrow, and manifest consumers on one contract.
    """

    schema_name, table_name = table.split(".", 1)
    source_path = SOURCE_ROOT / schema_name / f"{table_name}.parquet"
    source_schema = pq.ParquetFile(source_path).schema_arrow
    parquet = pq.ParquetFile(path)
    current_schema = parquet.schema_arrow
    exact_types = current_schema.names == source_schema.names and all(
        current_schema.field(name).type.equals(source_schema.field(name).type)
        for name in current_schema.names
    )
    if exact_types:
        return

    temporary = path.with_suffix(".parquet.schema-building")
    temporary.unlink(missing_ok=True)
    writer_options = dict(PARQUET_OPTIONS)
    row_group_size = int(writer_options.pop("row_group_size"))
    try:
        with pq.ParquetWriter(temporary, source_schema, **writer_options) as writer:
            for batch in parquet.iter_batches(batch_size=row_group_size, use_threads=False):
                cast = pa.Table.from_batches([batch]).cast(source_schema, safe=True)
                writer.write_table(cast, row_group_size=row_group_size)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def write_frame(frame: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".parquet.building")
    temporary.unlink(missing_ok=True)
    pq.write_table(pa.Table.from_pandas(frame, preserve_index=False), temporary, **PARQUET_OPTIONS)
    temporary.replace(path)


def file_record(path: Path, table: str, source_table: str | None, selection: str) -> dict[str, Any]:
    parquet = pq.ParquetFile(path)
    return {
        "table": table,
        "file": path.name,
        "public_path": f"/data/cases/{path.parent.name}/{path.name}",
        "source_table": source_table,
        "selection": selection,
        "rows": parquet.metadata.num_rows,
        "columns": len(parquet.schema_arrow.names),
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
    }


def write_manifest(slug: str, title: str, files: list[dict[str, Any]], boundary: str) -> None:
    output = OUTPUT_ROOT / slug / "manifest.json"
    payload = {
        "case_slug": slug,
        "title": title,
        "revision": REVISION,
        "catalog_snapshot": "2026-01-15",
        "extract_boundary": boundary,
        "file_count": len(files),
        "total_rows": sum(item["rows"] for item in files),
        "total_bytes": sum(item["bytes"] for item in files),
        "files": files,
    }
    output.write_text(json.dumps(payload, indent=2) + "\n")


def build_orion(connection: duckdb.DuckDBPyConnection) -> None:
    slug = "the-orion-renewal"
    output = OUTPUT_ROOT / slug
    files: list[dict[str, Any]] = []
    route_window = "route_date >= DATE '2024-01-01' AND route_date <= DATE '2025-12-31'"

    specs = [
        ("core.region", "region.parquet", f"SELECT * FROM read_parquet('{source('core.region')}')", "complete dimension"),
        ("core.branch", "branch.parquet", f"SELECT * FROM read_parquet('{source('core.branch')}')", "complete dimension"),
        ("core.service_area", "service_area.parquet", f"SELECT * FROM read_parquet('{source('core.service_area')}')", "complete dimension"),
        (
            "core.business_calendar",
            "business_calendar.parquet",
            f"SELECT * FROM read_parquet('{source('core.business_calendar')}') WHERE calendar_date BETWEEN DATE '2024-01-01' AND DATE '2025-12-31'",
            "2024-01-01 through 2025-12-31",
        ),
        (
            "fleet.route",
            "route.parquet",
            f"SELECT * FROM read_parquet('{source('fleet.route')}') WHERE {route_window}",
            "complete 24-month pre/post route window",
        ),
        (
            "fleet.route_stop",
            "route_stop.parquet",
            f"""SELECT stop.* FROM read_parquet('{source('fleet.route_stop')}') stop
                    JOIN read_parquet('{source('fleet.route')}') route USING (route_id)
                    WHERE route.route_date >= DATE '2024-01-01'
                      AND route.route_date <= DATE '2025-12-31'""",
            "all stops belonging to included routes",
        ),
        (
            "field_ops.work_order",
            "work_order.parquet",
            f"""SELECT work_order.* FROM read_parquet('{source('field_ops.work_order')}') work_order
                    SEMI JOIN (
                      SELECT DISTINCT stop.work_order_id
                      FROM read_parquet('{source('fleet.route_stop')}') stop
                      JOIN read_parquet('{source('fleet.route')}') route USING (route_id)
                      WHERE route.{route_window}
                    ) included USING (work_order_id)""",
            "all work orders referenced by included route stops",
        ),
        (
            "field_ops.work_order_status_event",
            "work_order_status_event.parquet",
            f"""SELECT event.* FROM read_parquet('{source('field_ops.work_order_status_event')}') event
                    SEMI JOIN (
                      SELECT DISTINCT stop.work_order_id
                      FROM read_parquet('{source('fleet.route_stop')}') stop
                      JOIN read_parquet('{source('fleet.route')}') route USING (route_id)
                      WHERE route.{route_window}
                    ) included USING (work_order_id)""",
            "complete status histories for included work orders",
        ),
        (
            "field_ops.visit",
            "visit.parquet",
            f"""SELECT visit.* FROM read_parquet('{source('field_ops.visit')}') visit
                    SEMI JOIN (
                      SELECT DISTINCT stop.work_order_id
                      FROM read_parquet('{source('fleet.route_stop')}') stop
                      JOIN read_parquet('{source('fleet.route')}') route USING (route_id)
                      WHERE route.{route_window}
                    ) included USING (work_order_id)""",
            "all visits for included work orders",
        ),
        (
            "field_ops.work_order_part",
            "work_order_part.parquet",
            f"""SELECT part.* FROM read_parquet('{source('field_ops.work_order_part')}') part
                    SEMI JOIN (
                      SELECT DISTINCT stop.work_order_id
                      FROM read_parquet('{source('fleet.route_stop')}') stop
                      JOIN read_parquet('{source('fleet.route')}') route USING (route_id)
                      WHERE route.{route_window}
                    ) included USING (work_order_id)""",
            "all recorded parts for included work orders; one-to-many by design",
        ),
        (
            "field_ops.appointment",
            "appointment.parquet",
            f"""SELECT appointment.* FROM read_parquet('{source('field_ops.appointment')}') appointment
                    SEMI JOIN (
                      SELECT DISTINCT work_order.appointment_id
                      FROM read_parquet('{source('field_ops.work_order')}') work_order
                      SEMI JOIN (
                        SELECT DISTINCT stop.work_order_id
                        FROM read_parquet('{source('fleet.route_stop')}') stop
                        JOIN read_parquet('{source('fleet.route')}') route USING (route_id)
                        WHERE route.{route_window}
                      ) included USING (work_order_id)
                    ) selected USING (appointment_id)""",
            "appointments associated with included work orders",
        ),
        (
            "workforce.shift",
            "shift.parquet",
            f"""SELECT shift.* FROM read_parquet('{source('workforce.shift')}') shift
                    SEMI JOIN (
                      SELECT DISTINCT technician_employee_id AS employee_id
                      FROM read_parquet('{source('fleet.route')}')
                      WHERE {route_window}
                    ) technician USING (employee_id)
                    WHERE CAST(scheduled_start_at AS DATE) BETWEEN DATE '2024-01-01' AND DATE '2025-12-31'""",
            "included technicians' scheduled shifts in the route window",
        ),
        (
            "workforce.employee_role_history",
            "employee_role_history.parquet",
            f"""SELECT history.* FROM read_parquet('{source('workforce.employee_role_history')}') history
                    SEMI JOIN (
                      SELECT DISTINCT technician_employee_id AS employee_id
                      FROM read_parquet('{source('fleet.route')}')
                      WHERE {route_window}
                    ) technician USING (employee_id)""",
            "complete effective-dated histories for included technicians",
        ),
        (
            "workforce.absence",
            "absence.parquet",
            f"""SELECT absence.* FROM read_parquet('{source('workforce.absence')}') absence
                    SEMI JOIN (
                      SELECT shift.shift_id
                      FROM read_parquet('{source('workforce.shift')}') shift
                      SEMI JOIN (
                        SELECT DISTINCT technician_employee_id AS employee_id
                        FROM read_parquet('{source('fleet.route')}')
                        WHERE {route_window}
                      ) technician USING (employee_id)
                      WHERE CAST(scheduled_start_at AS DATE) BETWEEN DATE '2024-01-01' AND DATE '2025-12-31'
                    ) included USING (shift_id)""",
            "absence episodes attached to included shifts",
        ),
        (
            "external.traffic_area_hourly",
            "traffic_area_hourly.parquet",
            f"SELECT * FROM read_parquet('{source('external.traffic_area_hourly')}') WHERE observed_hour >= TIMESTAMP '2024-01-01' AND observed_hour < TIMESTAMP '2026-01-01'",
            "complete service-area hourly history for the route window, including revisions",
        ),
        ("external.weather_station", "weather_station.parquet", f"SELECT * FROM read_parquet('{source('external.weather_station')}')", "complete weather-station dimension"),
        (
            "external.weather_hourly",
            "weather_hourly.parquet",
            f"SELECT * FROM read_parquet('{source('external.weather_hourly')}') WHERE observed_at >= TIMESTAMP '2024-01-01' AND observed_at < TIMESTAMP '2026-01-01'",
            "complete station-hour history for the route window",
        ),
    ]

    for table, filename, query, selection in specs:
        path = output / filename
        copy_query(connection, query, path)
        restore_source_schema(path, table)
        files.append(file_record(path, table, table, selection))

    write_manifest(
        slug,
        "The Orion Renewal",
        files,
        "Routes dated 2024-01-01 through 2025-12-31 and their complete relational neighborhood.",
    )


def build_queue(connection: duckdb.DuckDBPyConnection) -> None:
    slug = "the-queue-nobody-owns"
    output = OUTPUT_ROOT / slug
    files: list[dict[str, Any]] = []
    history_start = "TIMESTAMP '2023-07-01 00:00:00'"
    history_end = "TIMESTAMP '2024-11-01 00:00:00'"
    decision_cutoff = "TIMESTAMP '2024-12-03 08:20:00'"

    history_conversations = f"""
      SELECT * FROM read_parquet('{source('support.conversation')}')
      WHERE started_at >= {history_start} AND started_at < {history_end}
    """
    specs = [
        (
            "support.conversation",
            "conversation.parquet",
            history_conversations,
            "historical conversations started 2023-07-01 through 2024-10-31",
        ),
        (
            "support.ticket",
            "ticket.parquet",
            f"""SELECT ticket.* FROM read_parquet('{source('support.ticket')}') ticket
                    SEMI JOIN ({history_conversations}) conversation USING (ticket_id)""",
            "tickets attached to the historical conversation cohort",
        ),
        (
            "support.message",
            "message.parquet",
            f"""SELECT message.* FROM read_parquet('{source('support.message')}') message
                    SEMI JOIN ({history_conversations}) conversation USING (conversation_id)""",
            "complete frozen message histories for the historical cohort; intake filtering is learner-owned",
        ),
        (
            "support.ticket_status_event",
            "ticket_status_event.parquet",
            f"""SELECT event.* FROM read_parquet('{source('support.ticket_status_event')}') event
                    SEMI JOIN (
                      SELECT DISTINCT ticket_id FROM ({history_conversations})
                    ) ticket USING (ticket_id)""",
            "complete frozen status histories for the historical cohort",
        ),
        (
            "case_input.scoring_queue",
            "scoring_queue.parquet",
            f"""
              WITH first_customer AS (
                SELECT
                  conversation.conversation_id,
                  conversation.ticket_id,
                  conversation.started_at,
                  conversation.channel_code,
                  conversation.language_code,
                  MIN(message.sent_at) AS first_customer_at
                FROM read_parquet('{source('support.conversation')}') conversation
                JOIN read_parquet('{source('support.message')}') message USING (conversation_id)
                WHERE conversation.started_at >= {history_end}
                  AND conversation.started_at <= {decision_cutoff}
                  AND message.sender_type_code = 'CUSTOMER'
                  AND message.sent_at >= conversation.started_at
                  AND message.sent_at <= {decision_cutoff}
                GROUP BY
                  conversation.conversation_id,
                  conversation.ticket_id,
                  conversation.started_at,
                  conversation.channel_code,
                  conversation.language_code
              ),
              queue_conversation AS (
                SELECT *
                FROM first_customer
                ORDER BY first_customer_at DESC, conversation_id
                LIMIT 818
              ),
              eligible_message AS (
                SELECT
                  conversation.conversation_id,
                  COUNT(message.message_id) FILTER (
                    WHERE message.sender_type_code = 'CUSTOMER'
                      AND message.sent_at >= conversation.first_customer_at
                      AND message.sent_at <= LEAST(conversation.first_customer_at + INTERVAL '30 minutes', {decision_cutoff})
                  ) AS eligible_customer_message_count,
                  STRING_AGG(message.body_text, '\\n' ORDER BY message.sent_at) FILTER (
                    WHERE message.sender_type_code = 'CUSTOMER'
                      AND message.sent_at >= conversation.first_customer_at
                      AND message.sent_at <= LEAST(conversation.first_customer_at + INTERVAL '30 minutes', {decision_cutoff})
                  ) AS opening_customer_text,
                  COALESCE(BOOL_OR(message.redaction_state_code = 'REVIEW_REQUIRED') FILTER (
                    WHERE message.sender_type_code = 'CUSTOMER'
                      AND message.sent_at >= conversation.first_customer_at
                      AND message.sent_at <= LEAST(conversation.first_customer_at + INTERVAL '30 minutes', {decision_cutoff})
                  ), FALSE) AS redaction_review_flag,
                  COALESCE(BOOL_OR(message.contains_synthetic_pii_flag) FILTER (
                    WHERE message.sender_type_code = 'CUSTOMER'
                      AND message.sent_at >= conversation.first_customer_at
                      AND message.sent_at <= LEAST(conversation.first_customer_at + INTERVAL '30 minutes', {decision_cutoff})
                  ), FALSE) AS contains_synthetic_pii_flag
                FROM queue_conversation conversation
                LEFT JOIN read_parquet('{source('support.message')}') message USING (conversation_id)
                GROUP BY conversation.conversation_id
              )
              SELECT
                conversation.conversation_id,
                conversation.started_at,
                conversation.first_customer_at,
                LEAST(conversation.first_customer_at + INTERVAL '30 minutes', {decision_cutoff}) AS decision_at,
                ticket.subject,
                conversation.channel_code,
                conversation.language_code,
                eligible.eligible_customer_message_count,
                eligible.opening_customer_text,
                eligible.redaction_review_flag,
                eligible.contains_synthetic_pii_flag,
                (ticket.priority_code = 'URGENT') AS urgent_review_flag
              FROM queue_conversation conversation
              JOIN read_parquet('{source('support.ticket')}') ticket USING (ticket_id)
              JOIN eligible_message eligible USING (conversation_id)
              ORDER BY conversation.started_at, conversation.conversation_id
            """,
            "learner-safe unlabeled 818-item backlog at 2024-12-03 08:20; later text and outcome fields removed",
        ),
    ]

    for table, filename, query, selection in specs:
        path = output / filename
        copy_query(connection, query, path)
        source_table = table if not table.startswith("case_input.") else None
        if source_table is not None:
            restore_source_schema(path, source_table)
        files.append(file_record(path, table, source_table, selection))

    teams = pd.DataFrame(
        [
            ("TIER1", "General account help and routine how-to requests", 20),
            ("TIER2", "Complex technical diagnosis and escalated product behavior", 12),
            ("BILLING", "Invoices, payments, credits, and billing disputes", 14),
            ("RETENTION", "Cancellation, downgrade, and save conversations", 8),
            ("FIELD", "Appointments, technicians, site visits, and onsite service", 10),
        ],
        columns=["team_code", "routing_scope", "human_review_capacity_per_hour"],
    )
    path = output / "routing_team.parquet"
    write_frame(teams, path)
    files.append(file_record(path, "case_reference.routing_team", None, "five receiving teams and hourly review capacity"))

    costs = {
        "TIER1": {"TIER1": 0, "TIER2": 1, "BILLING": 3, "RETENTION": 5, "FIELD": 3},
        "TIER2": {"TIER1": 3, "TIER2": 0, "BILLING": 4, "RETENTION": 5, "FIELD": 4},
        "BILLING": {"TIER1": 4, "TIER2": 4, "BILLING": 0, "RETENTION": 6, "FIELD": 4},
        "RETENTION": {"TIER1": 8, "TIER2": 8, "BILLING": 7, "RETENTION": 0, "FIELD": 8},
        "FIELD": {"TIER1": 5, "TIER2": 5, "BILLING": 5, "RETENTION": 7, "FIELD": 0},
    }
    cost_rows = [
        (actual, predicted, value)
        for actual, predictions in costs.items()
        for predicted, value in predictions.items()
    ]
    cost_frame = pd.DataFrame(cost_rows, columns=["actual_team_code", "predicted_team_code", "relative_harm_cost"])
    path = output / "misroute_cost.parquet"
    write_frame(cost_frame, path)
    files.append(file_record(path, "case_reference.misroute_cost", None, "supplied asymmetric business-harm matrix"))

    write_manifest(
        slug,
        "The Queue Nobody Owns",
        files,
        "Historical conversation starts end before the learner-safe unlabeled backlog cohort; the routing snapshot is 2024-12-03 08:20 ET.",
    )


def build_beacon(connection: duckdb.DuckDBPyConnection) -> None:
    slug = "too-good-to-ship"
    output = OUTPUT_ROOT / slug
    files: list[dict[str, Any]] = []
    account_cohort = f"""
      SELECT account_id
      FROM read_parquet('{source('platform.account_feature_snapshot')}')
      GROUP BY account_id
      ORDER BY account_id
      LIMIT 12000
    """

    specs = [
        (
            "platform.account_feature_snapshot",
            "account_feature_snapshot.parquet",
            f"""SELECT snapshot.*
                    FROM read_parquet('{source('platform.account_feature_snapshot')}') snapshot
                    SEMI JOIN ({account_cohort}) cohort USING (account_id)
                    ORDER BY snapshot.account_id, snapshot.feature_as_of_at""",
            "complete snapshots for a deterministic 12,000-account cohort; all 213 columns retained",
        ),
        ("platform.model_registry", "model_registry.parquet", f"SELECT * FROM read_parquet('{source('platform.model_registry')}')", "complete registry"),
        ("platform.model_version", "model_version.parquet", f"SELECT * FROM read_parquet('{source('platform.model_version')}')", "complete version history"),
        ("platform.pipeline", "pipeline.parquet", f"SELECT * FROM read_parquet('{source('platform.pipeline')}')", "complete pipeline registry"),
        (
            "platform.pipeline_run",
            "pipeline_run.parquet",
            f"SELECT * FROM read_parquet('{source('platform.pipeline_run')}') WHERE started_at >= TIMESTAMP '2024-01-01'",
            "pipeline runs contemporaneous with the candidate feature history",
        ),
        (
            "platform.data_quality_result",
            "data_quality_result.parquet",
            f"""SELECT result.* FROM read_parquet('{source('platform.data_quality_result')}') result
                    SEMI JOIN (
                      SELECT pipeline_run_id FROM read_parquet('{source('platform.pipeline_run')}')
                      WHERE started_at >= TIMESTAMP '2024-01-01'
                    ) run USING (pipeline_run_id)""",
            "quality checks attached to included pipeline runs",
        ),
        (
            "crm.account",
            "account.parquet",
            f"""SELECT account.* FROM read_parquet('{source('crm.account')}') account
                    SEMI JOIN ({account_cohort}) cohort USING (account_id)""",
            "account records for the feature cohort",
        ),
        (
            "crm.account_status_event",
            "account_status_event.parquet",
            f"""SELECT event.* FROM read_parquet('{source('crm.account_status_event')}') event
                    SEMI JOIN ({account_cohort}) cohort USING (account_id)""",
            "status-event histories for the feature cohort",
        ),
        (
            "billing.subscription",
            "subscription.parquet",
            f"""SELECT subscription.* FROM read_parquet('{source('billing.subscription')}') subscription
                    SEMI JOIN ({account_cohort}) cohort USING (account_id)""",
            "subscriptions belonging to the feature cohort",
        ),
        (
            "billing.subscription_event",
            "subscription_event.parquet",
            f"""SELECT event.* FROM read_parquet('{source('billing.subscription_event')}') event
                    SEMI JOIN (
                      SELECT subscription.subscription_id
                      FROM read_parquet('{source('billing.subscription')}') subscription
                      SEMI JOIN ({account_cohort}) cohort USING (account_id)
                    ) included USING (subscription_id)""",
            "complete event histories for included subscriptions",
        ),
        (
            "billing.payment_attempt",
            "payment_attempt.parquet",
            f"""SELECT payment.* FROM read_parquet('{source('billing.payment_attempt')}') payment
                    SEMI JOIN ({account_cohort}) cohort USING (account_id)""",
            "payment attempts for the feature cohort, with occurrence and availability clocks",
        ),
        (
            "case_input.beacon_submitted_split",
            "beacon_submitted_split.parquet",
            f"""SELECT
                    snapshot.account_feature_snapshot_id,
                    CASE WHEN hash(snapshot.account_feature_snapshot_id) % 5 = 0
                      THEN 'VALIDATION' ELSE 'TRAIN' END AS submitted_partition
                  FROM read_parquet('{source('platform.account_feature_snapshot')}') snapshot
                  SEMI JOIN ({account_cohort}) cohort USING (account_id)
                  ORDER BY snapshot.account_feature_snapshot_id""",
            "reproducible row-level 80/20 split supplied with the contractor submission",
        ),
    ]

    for table, filename, query, selection in specs:
        path = output / filename
        copy_query(connection, query, path)
        source_table = table if not table.startswith("case_input.") else None
        if source_table is not None:
            restore_source_schema(path, source_table)
        files.append(file_record(path, table, source_table, selection))

    write_manifest(
        slug,
        "Too Good to Ship",
        files,
        "A deterministic 12,000-account cohort retaining every snapshot, all 213 feature columns, and related event clocks.",
    )


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    connection = duckdb.connect()
    try:
        connection.execute("SET threads = 4")
        build_orion(connection)
        build_queue(connection)
        build_beacon(connection)
    finally:
        connection.close()
    print(f"Built progression case packs at {OUTPUT_ROOT}")


if __name__ == "__main__":
    main()
