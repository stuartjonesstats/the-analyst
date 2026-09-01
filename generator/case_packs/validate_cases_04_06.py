#!/usr/bin/env python3
"""Exact integrity checks for browser case packs 04 through 06."""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path
from typing import Any, Callable

import duckdb
import numpy as np
import pandas as pd
import pyarrow.parquet as pq


ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "web" / "public"
PACK_ROOT = PUBLIC / "data" / "cases"
REPORT_ROOT = ROOT / "generator" / "case_packs" / "reports"
SLUGS = (
    "rollback-before-dawn",
    "the-730-capacity-call",
    "forty-eight-hours-of-stock",
)


class Validator:
    def __init__(self) -> None:
        self.checks: list[dict[str, Any]] = []

    def check(self, case: str, name: str, condition: bool, detail: str) -> None:
        self.checks.append(
            {"case": case, "check": name, "passed": bool(condition), "detail": detail}
        )

    def guarded(self, case: str, name: str, callback: Callable[[], None]) -> None:
        try:
            callback()
        except Exception as exc:  # validation must report all independent failures
            self.check(case, name, False, f"{type(exc).__name__}: {exc}")


def manifest(slug: str) -> dict[str, Any]:
    return json.loads((PACK_ROOT / slug / "manifest.json").read_text(encoding="utf-8"))


def table_path(slug: str, table_name: str) -> Path:
    schema_name, table = table_name.split(".", 1)
    return PACK_ROOT / slug / schema_name / f"{table}.parquet"


def frame(slug: str, table_name: str, columns: list[str] | None = None) -> pd.DataFrame:
    return pd.read_parquet(table_path(slug, table_name), columns=columns)


def validate_manifests(v: Validator) -> None:
    for slug in SLUGS:
        data = manifest(slug)
        row_total = 0
        byte_total = 0
        mappings_ok = True
        file_ok = True
        for item in data["files"]:
            path = PUBLIC / item["path"].removeprefix("/")
            if not path.exists():
                file_ok = False
                continue
            actual_rows = pq.ParquetFile(path).metadata.num_rows
            actual_bytes = path.stat().st_size
            actual_sha = hashlib.sha256(path.read_bytes()).hexdigest()
            file_ok &= (
                actual_rows == item["rows"]
                and actual_bytes == item["bytes"]
                and actual_sha == item["sha256"]
            )
            mappings_ok &= data["table_mappings"].get(item["table"]) == item["path"]
            mappings_ok &= item["python_path"] == item["path"]
            row_total += actual_rows
            byte_total += actual_bytes
        totals_ok = data["totals"] == {
            "files": len(data["files"]),
            "rows": row_total,
            "bytes": byte_total,
        }
        v.check(
            slug,
            "manifest hashes, row counts, and byte counts match every Parquet",
            file_ok and totals_ok,
            f"files={len(data['files'])}; rows={row_total:,}; bytes={byte_total:,}",
        )
        v.check(
            slug,
            "DuckDB and Python mappings resolve to the same public files",
            mappings_ok,
            f"mapped_tables={len(data['table_mappings'])}",
        )


def validate_rollback(v: Validator) -> None:
    slug = "rollback-before-dawn"
    cutoff = pd.Timestamp("2025-03-20 11:40:00")

    cohort = frame(slug, "scenario.asset_cohort")
    assets = frame(slug, "iot.asset")
    sensors = frame(slug, "iot.sensor")
    readings = frame(slug, "iot.sensor_reading")
    alerts = frame(slug, "iot.device_alert")
    health = frame(slug, "iot.asset_health_daily")
    work_orders = frame(slug, "field_ops.work_order")
    statuses = frame(slug, "field_ops.work_order_status_event")
    weather = frame(slug, "external.weather_hourly")
    stations = frame(slug, "external.weather_station")

    region_counts = cohort.groupby("region_id")["asset_id"].nunique()
    v.check(
        slug,
        "asset denominator is balanced, unique, and independent of received telemetry",
        cohort["asset_id"].is_unique
        and len(cohort) == 18_000
        and len(region_counts) == 6
        and bool((region_counts == 3_000).all()),
        f"assets={len(cohort):,}; per_region={region_counts.to_dict()}",
    )

    asset_ids = set(assets["asset_id"])
    sensor_ids = set(sensors["sensor_id"])
    fk_ok = (
        set(cohort["asset_id"]) <= asset_ids
        and set(sensors["asset_id"]) <= asset_ids
        and set(readings["asset_id"]) <= asset_ids
        and set(readings["sensor_id"]) <= sensor_ids
        and set(alerts["asset_id"]) <= asset_ids
        and set(alerts["sensor_id"].dropna()) <= sensor_ids
    )
    pk_ok = (
        assets["asset_id"].is_unique
        and sensors["sensor_id"].is_unique
        and readings["sensor_reading_id"].is_unique
        and alerts["alert_id"].is_unique
    )
    v.check(
        slug,
        "asset, sensor, reading, and alert keys close without orphans",
        fk_ok and pk_ok,
        f"assets={len(assets):,}; sensors={len(sensors):,}; readings={len(readings):,}; alerts={len(alerts):,}",
    )

    incident = readings[
        readings["observed_at"].between("2025-03-14", cutoff, inclusive="both")
    ]
    silent = set(cohort["asset_id"]) - set(incident["asset_id"])
    v.check(
        slug,
        "silent assets remain visible in the incident denominator",
        len(incident) > 0 and len(silent) > 10_000,
        f"incident_readings={len(incident):,}; silent_assets={len(silent):,}",
    )

    firmware = sorted(int(value) for value in readings["firmware_major"].unique())
    post_cutoff = int((readings["warehouse_available_at"] > cutoff).sum())
    future_labels = int((health["failure_label_available_at"] > cutoff).sum())
    v.check(
        slug,
        "firmware transition and post-cutoff leakage candidates are both retained",
        firmware == [4, 5] and post_cutoff > 0 and future_labels > 0,
        f"firmware={firmware}; post_cutoff_telemetry={post_cutoff:,}; future_labels={future_labels:,}",
    )

    weather_join = weather.merge(
        stations[["weather_station_id", "region_id"]], on="weather_station_id", how="left"
    )
    winter = weather_join[
        weather_join["observed_at"].between(
            "2025-03-14", "2025-03-20 23:59:59", inclusive="both"
        )
        & (weather_join["condition_code"] == "SEVERE_WINTER")
    ]
    v.check(
        slug,
        "the incident weather footprint resolves to the three exposed regions",
        set(winter["region_id"]) == {"REG001", "REG002", "REG003"} and len(winter) > 0,
        f"severe_winter_rows={len(winter):,}; regions={sorted(winter['region_id'].unique())}",
    )

    event_counts = statuses.groupby("work_order_id").size()
    v.check(
        slug,
        "work-order event fanout is complete and must be reconciled before joining",
        set(statuses["work_order_id"]) == set(work_orders["work_order_id"])
        and bool((event_counts == 6).all()),
        f"work_orders={len(work_orders):,}; status_events={len(statuses):,}; min_max_events={event_counts.min()}..{event_counts.max()}",
    )


def validate_capacity(v: Validator) -> None:
    slug = "the-730-capacity-call"
    cutoff = pd.Timestamp("2025-03-20 07:30:00")
    roster = frame(slug, "scenario.current_appointment_roster")
    bulletin = frame(slug, "scenario.capacity_bulletin")
    geography = frame(slug, "scenario.appointment_geography")
    appointment = frame(slug, "field_ops.appointment")
    work_order = frame(slug, "field_ops.work_order")
    status = frame(slug, "field_ops.work_order_status_event")
    visit = frame(slug, "field_ops.visit")
    traffic = frame(slug, "external.traffic_area_hourly")

    forbidden = {
        "current_status_code",
        "completed_at",
        "first_time_fix_flag",
        "storm_disruption_flag",
        "final_resolution_code",
        "arrived_at",
        "departed_at",
        "travel_minutes",
        "onsite_minutes",
        "visit_outcome_code",
    }
    expected_roster = appointment[
        (appointment["scheduled_start_at"].dt.date == cutoff.date())
        & (appointment["scheduled_end_at"] >= cutoff)
    ]
    v.check(
        slug,
        "current roster is exact, unique, and outcome-withheld",
        len(roster) == 7
        and roster["appointment_id"].is_unique
        and set(roster["appointment_id"]) == set(expected_roster["appointment_id"])
        and not (forbidden & set(roster.columns)),
        f"roster_rows={len(roster)}; forbidden_columns_present={sorted(forbidden & set(roster.columns))}",
    )

    ids = set(appointment["appointment_id"])
    wids = set(work_order["work_order_id"])
    closure = (
        appointment["appointment_id"].is_unique
        and work_order["appointment_id"].is_unique
        and visit["appointment_id"].is_unique
        and set(work_order["appointment_id"]) == ids
        and set(visit["appointment_id"]) == ids
        and set(status["work_order_id"]) == wids
        and set(geography["appointment_id"]) == ids
    )
    v.check(
        slug,
        "appointment, work order, visit, status, and privacy-safe geography close relationally",
        closure,
        f"appointments={len(ids):,}; work_orders={len(wids):,}; visits={len(visit):,}; status_events={len(status):,}",
    )

    event_counts = status.groupby("work_order_id").size()
    first_arrival = visit.groupby("appointment_id")["arrived_at"].min()
    matured = appointment.set_index("appointment_id").join(first_arrival)
    matured = matured[matured["scheduled_end_at"] < cutoff - pd.Timedelta(days=28)]
    breach = matured["arrived_at"] > matured["scheduled_end_at"]
    v.check(
        slug,
        "event fanout and matured first-arrival target are both non-degenerate",
        bool((event_counts == 6).all())
        and len(matured) > 2_000
        and breach.any()
        and (~breach).any(),
        f"event_fanout={event_counts.min()}..{event_counts.max()}; matured={len(matured):,}; breach_rate={breach.mean():.6f}",
    )

    source_outcomes = {
        "completed_at": int(work_order["completed_at"].notna().sum()),
        "final_resolution_code": int(work_order["final_resolution_code"].notna().sum()),
        "visit_arrival": int(visit["arrived_at"].notna().sum()),
        "realized_storm": int(appointment["storm_disruption_flag"].sum()),
    }
    v.check(
        slug,
        "retrospective source retains forbidden fields so point-in-time discipline is testable",
        all(value > 0 for value in source_outcomes.values()),
        "; ".join(f"{key}={value:,}" for key, value in source_outcomes.items()),
    )

    revision_counts = traffic.groupby(["service_area_id", "observed_hour"]).size()
    v.check(
        slug,
        "traffic provider revisions are retained at an explicit revision grain",
        traffic["traffic_area_hourly_id"].is_unique and int((revision_counts > 1).sum()) > 0,
        f"revised_area_hours={int((revision_counts > 1).sum()):,}; max_revisions={revision_counts.max()}",
    )
    v.check(
        slug,
        "approved bulletin publishes capacity and action limits without employee-level absence data",
        len(bulletin) == 1
        and bulletin.iloc[0]["remaining_appointments"] == len(roster)
        and bulletin.iloc[0]["dispatcher_review_capacity"] < len(roster)
        and not any("employee" in column for column in bulletin.columns),
        f"roster={len(roster)}; reviews={int(bulletin.iloc[0]['dispatcher_review_capacity'])}; contacts={int(bulletin.iloc[0]['proactive_contact_capacity'])}",
    )


def validate_supply(v: Validator) -> None:
    slug = "forty-eight-hours-of-stock"
    cutoff = pd.Timestamp("2025-12-01 06:45:00")
    paths = {
        name: str(table_path(slug, f"supply.{name}"))
        for name in (
            "inventory_movement",
            "inventory_position_daily",
            "purchase_order",
            "purchase_order_line",
            "goods_receipt",
            "product_vendor",
        )
    }
    con = duckdb.connect()

    replay = con.execute(
        """
        SELECT
          count(*) FILTER (WHERE r.scanner_replay_flag),
          count(DISTINCT r.replay_of_inventory_movement_id) FILTER (WHERE r.scanner_replay_flag),
          count(*) FILTER (WHERE NOT r.scanner_replay_flag),
          count(*) FILTER (WHERE NOT r.scanner_replay_flag AND r.movement_type_code='OPENING_BALANCE'),
          count(*) FILTER (WHERE r.scanner_replay_flag AND (
            o.inventory_movement_id IS NULL OR o.scanner_replay_flag
            OR r.warehouse_id != o.warehouse_id OR r.product_id != o.product_id
            OR r.movement_at != o.movement_at OR r.movement_type_code != o.movement_type_code
            OR r.quantity_delta != o.quantity_delta OR r.reference_type_code != o.reference_type_code
            OR r.reference_number != o.reference_number OR r.scanner_device_code != o.scanner_device_code
            OR r.posted_at <= o.posted_at)),
          count(*) FILTER (WHERE (r.scanner_replay_flag AND r.replay_of_inventory_movement_id IS NULL)
            OR (NOT r.scanner_replay_flag AND r.replay_of_inventory_movement_id IS NOT NULL))
        FROM read_parquet(?) r
        LEFT JOIN read_parquet(?) o ON o.inventory_movement_id=r.replay_of_inventory_movement_id
        """,
        [paths["inventory_movement"], paths["inventory_movement"]],
    ).fetchone()
    v.check(
        slug,
        "2,400 scanner replays form exact one-to-one linked technical pairs",
        replay == (2_400, 2_400, 517_600, 2_160, 0, 0),
        f"replays={replay[0]:,}; distinct_originals={replay[1]:,}; physical={replay[2]:,}; openings={replay[3]:,}; invalid={replay[4]:,}; flag_link={replay[5]:,}",
    )

    receipt = con.execute(
        """
        WITH receipt_shape AS (
          SELECT count(*) receipt_rows,
            count(*) FILTER (WHERE rejected_quantity>0) rejected_rows,
            count(*) FILTER (WHERE rejected_quantity<0 OR rejected_quantity>received_quantity) invalid_rejections
          FROM read_parquet(?)
        ), split AS (
          SELECT count(*) split_lines FROM (
            SELECT purchase_order_line_id FROM read_parquet(?) GROUP BY 1 HAVING count(*)>1)
        ), physical_receipt AS (
          SELECT goods_receipt_id, count(*) movement_rows, min(warehouse_id) warehouse_id,
            min(product_id) product_id, min(movement_at) movement_at, sum(quantity_delta) accepted_quantity
          FROM read_parquet(?)
          WHERE goods_receipt_id IS NOT NULL AND NOT scanner_replay_flag GROUP BY 1
        ), mismatch AS (
          SELECT count(*) mismatches
          FROM read_parquet(?) gr
          JOIN read_parquet(?) pol USING (purchase_order_line_id)
          LEFT JOIN physical_receipt pr USING (goods_receipt_id)
          WHERE pr.goods_receipt_id IS NULL OR pr.movement_rows != 1 OR pr.warehouse_id != gr.warehouse_id
            OR pr.product_id != pol.product_id OR pr.movement_at != gr.received_at
            OR pr.accepted_quantity != gr.received_quantity-gr.rejected_quantity
        )
        SELECT receipt_rows,rejected_rows,invalid_rejections,split_lines,mismatches
        FROM receipt_shape,split,mismatch
        """,
        [
            paths["goods_receipt"],
            paths["goods_receipt"],
            paths["inventory_movement"],
            paths["goods_receipt"],
            paths["purchase_order_line"],
        ],
    ).fetchone()
    v.check(
        slug,
        "split and rejected receipts post accepted quantity exactly once",
        receipt[0] == 82_000 and receipt[1] == 11_573 and receipt[2] == 0 and receipt[3] == 16_080 and receipt[4] == 0,
        f"receipts={receipt[0]:,}; rejected_rows={receipt[1]:,}; invalid_rejections={receipt[2]:,}; split_lines={receipt[3]:,}; movement_mismatches={receipt[4]:,}",
    )

    po = con.execute(
        """
        WITH accepted AS (
          SELECT purchase_order_line_id,sum(received_quantity-rejected_quantity) accepted
          FROM read_parquet(?) GROUP BY 1
        ), rolled AS (
          SELECT purchase_order_id,
            sum(ordered_quantity-cancelled_quantity) net_ordered,
            sum(coalesce(accepted,0)) accepted
          FROM read_parquet(?) pol LEFT JOIN accepted USING(purchase_order_line_id) GROUP BY 1
        )
        SELECT count(*) FROM read_parquet(?) po JOIN rolled USING(purchase_order_id)
        WHERE CASE status_code
          WHEN 'RECEIVED' THEN NOT(net_ordered>0 AND accepted=net_ordered)
          WHEN 'PARTIAL' THEN NOT(accepted>0 AND accepted<net_ordered)
          WHEN 'OPEN' THEN NOT(net_ordered>0 AND accepted=0)
          WHEN 'CANCELLED' THEN NOT(net_ordered=0 AND accepted=0)
          ELSE true END
        """,
        [paths["goods_receipt"], paths["purchase_order_line"], paths["purchase_order"]],
    ).fetchone()[0]
    v.check(slug, "purchase-order status reconciles to accepted line quantity", po == 0, f"status_mismatches={po:,}")

    position = con.execute(
        """
        WITH movement_daily AS (
          SELECT warehouse_id,product_id,cast(movement_at AS DATE) event_date,sum(quantity_delta) quantity_delta
          FROM read_parquet(?) WHERE NOT scanner_replay_flag GROUP BY 1,2,3
        ), combined AS (
          SELECT warehouse_id,product_id,event_date,quantity_delta,NULL::BIGINT observed,false is_snapshot FROM movement_daily
          UNION ALL
          SELECT warehouse_id,product_id,snapshot_date,0,on_hand_quantity,true FROM read_parquet(?)
        ), collapsed AS (
          SELECT warehouse_id,product_id,event_date,sum(quantity_delta) quantity_delta,max(observed) observed,bool_or(is_snapshot) is_snapshot
          FROM combined GROUP BY 1,2,3
        ), reconciled AS (
          SELECT *,sum(quantity_delta) OVER(PARTITION BY warehouse_id,product_id ORDER BY event_date
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) expected FROM collapsed
        )
        SELECT count(*) FILTER(WHERE is_snapshot),
          count(*) FILTER(WHERE is_snapshot AND observed != expected)
        FROM reconciled
        """,
        [paths["inventory_movement"], paths["inventory_position_daily"]],
    ).fetchone()
    pos = frame(slug, "supply.inventory_position_daily", ["warehouse_id", "product_id", "snapshot_date"])
    possible = pos[["warehouse_id", "product_id"]].drop_duplicates().shape[0] * 1_096
    v.check(
        slug,
        "330,000 sparse positions have a unique grain and reconcile to physical on-hand",
        len(pos) == 330_000
        and not pos.duplicated().any()
        and len(pos) < possible
        and position == (330_000, 0),
        f"positions={len(pos):,}; complete_spine_rows={possible:,}; on_hand_mismatches={position[1]:,}",
    )

    demand = con.execute(
        """
        WITH issue AS (
          SELECT cast(substr(product_id,4) AS INTEGER)-1 product_position,
            cast(movement_at AS DATE) movement_date,extract(month FROM movement_at) movement_month,
            abs(quantity_delta) demand_units
          FROM read_parquet(?) WHERE movement_type_code='ISSUE' AND NOT scanner_replay_flag
        )
        SELECT
          count(*) FILTER(WHERE product_position%5=0 AND
            (date_diff('day',DATE '2023-01-01',movement_date)+product_position*3)%19>=2) intermittent_violations,
          avg(demand_units) FILTER(WHERE product_position%5=1 AND movement_month IN(11,12,1,2)) winter_peak,
          avg(demand_units) FILTER(WHERE product_position%5=1 AND movement_month NOT IN(11,12,1,2)) winter_off,
          avg(demand_units) FILTER(WHERE product_position%5=2 AND movement_month IN(6,7,8)) summer_peak,
          avg(demand_units) FILTER(WHERE product_position%5=2 AND movement_month NOT IN(6,7,8)) summer_off
        FROM issue
        """,
        [paths["inventory_movement"]],
    ).fetchone()
    v.check(
        slug,
        "intermittent active days and winter/summer seasonality survive extraction",
        demand[0] == 0 and demand[1] > 2 * demand[2] and demand[3] > 2 * demand[4],
        f"inactive_day_violations={demand[0]:,}; winter={demand[1]:.3f}/{demand[2]:.3f}; summer={demand[3]:.3f}/{demand[4]:.3f}",
    )

    lead = con.execute(
        """
        WITH final AS (SELECT purchase_order_line_id,max(received_at) received_at FROM read_parquet(?) GROUP BY 1)
        SELECT count(*),count(*) FILTER(WHERE cast(received_at AS DATE)<promised_date),
          count(*) FILTER(WHERE cast(received_at AS DATE)>promised_date+INTERVAL 7 DAY),
          count(DISTINCT date_diff('day',cast(ordered_at AS DATE),cast(received_at AS DATE))),
          min(date_diff('day',cast(ordered_at AS DATE),cast(received_at AS DATE))),
          max(date_diff('day',cast(ordered_at AS DATE),cast(received_at AS DATE)))
        FROM final JOIN read_parquet(?) USING(purchase_order_line_id) JOIN read_parquet(?) USING(purchase_order_id)
        """,
        [paths["goods_receipt"], paths["purchase_order_line"], paths["purchase_order"]],
    ).fetchone()
    v.check(
        slug,
        "realized final-receipt lead time varies around promise",
        lead[0] == 65_920 and lead[1] > 0 and lead[2] > 0 and lead[3] >= 30 and lead[4] == 1 and lead[5] == 83,
        f"received_lines={lead[0]:,}; early={lead[1]:,}; >7d_late={lead[2]:,}; distinct={lead[3]:,}; range={lead[4]}..{lead[5]}",
    )

    watchlist = frame(slug, "scenario.supply_watchlist")
    opening = frame(slug, "scenario.opening_balance")
    watchlist_products = set(watchlist["product_id"])
    expected_opening = con.execute(
        """
        SELECT warehouse_id,product_id,sum(quantity_delta) approved_opening_quantity
        FROM read_parquet(?)
        WHERE NOT scanner_replay_flag AND posted_at<=? AND product_id IN (SELECT unnest(?))
        GROUP BY 1,2 ORDER BY 1,2
        """,
        [paths["inventory_movement"], cutoff, list(watchlist_products)],
    ).df()
    submitted_opening = opening[
        ["warehouse_id", "product_id", "approved_opening_quantity"]
    ].sort_values(["warehouse_id", "product_id"]).reset_index(drop=True)
    opening_ok = (
        expected_opening[["warehouse_id", "product_id"]].equals(
            submitted_opening[["warehouse_id", "product_id"]]
        )
        and np.array_equal(
            expected_opening["approved_opening_quantity"].to_numpy(dtype=np.int64),
            submitted_opening["approved_opening_quantity"].to_numpy(dtype=np.int64),
        )
    )
    family_count = (
        (watchlist["product_id"].str.extract(r"(\d+)")[0].astype(int) - 1) % 5
    ).nunique()
    v.check(
        slug,
        "watchlist mixes demand families and approved opening balances recompute exactly",
        len(watchlist) == 30
        and family_count == 5
        and int((watchlist["workbook_claimed_cover_hours"] < 48).sum()) == 2
        and opening_ok,
        f"watchlist={len(watchlist)}; products={len(watchlist_products)}; families={family_count}; under_48h={int((watchlist['workbook_claimed_cover_hours'] < 48).sum())}; opening_rows={len(opening)}",
    )
    con.close()


def write_report(v: Validator, elapsed: float) -> int:
    failed = [item for item in v.checks if not item["passed"]]
    report = {
        "status": "PASS" if not failed else "FAIL",
        "elapsed_seconds": round(elapsed, 3),
        "summary": {
            "cases": len(SLUGS),
            "checks": len(v.checks),
            "failed": len(failed),
        },
        "checks": v.checks,
    }
    REPORT_ROOT.mkdir(parents=True, exist_ok=True)
    (REPORT_ROOT / "cases_04_06_validation.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    lines = [
        "# Case-pack validation: progression cases 04–06",
        "",
        f"**Status: {report['status']}**",
        "",
        f"{len(SLUGS)} cases / {len(v.checks)} exact checks / {len(failed)} failures.",
        "",
        "| Result | Case | Check | Detail |",
        "|---|---|---|---|",
    ]
    for item in v.checks:
        result = "PASS" if item["passed"] else "FAIL"
        detail = str(item["detail"]).replace("|", "/")
        check = item["check"].replace("|", "/")
        lines.append(f"| {result} | `{item['case']}` | {check} | {detail} |")
    (REPORT_ROOT / "cases_04_06_validation.md").write_text(
        "\n".join(lines) + "\n", encoding="utf-8"
    )
    print(json.dumps(report["summary"], indent=2))
    print(report["status"])
    return 0 if not failed else 1


def main() -> int:
    started = time.perf_counter()
    validator = Validator()
    validate_manifests(validator)
    validator.guarded("rollback-before-dawn", "rollback exact validations", lambda: validate_rollback(validator))
    validator.guarded("the-730-capacity-call", "capacity exact validations", lambda: validate_capacity(validator))
    validator.guarded("forty-eight-hours-of-stock", "supply exact validations", lambda: validate_supply(validator))
    return write_report(validator, time.perf_counter() - started)


if __name__ == "__main__":
    raise SystemExit(main())
