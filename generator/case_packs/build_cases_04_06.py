#!/usr/bin/env python3
"""Build the browser data packs for progression cases 04 through 06.

The full generated world is the source of truth.  These extracts preserve the
decision grain, relational closure, and the planted data mechanisms needed by
the three cases while keeping the GitHub Pages payload practical.

Run from the repository root with the Python environment that supplies pandas
and PyArrow, for example::

    PYTHONPATH=.vendor /opt/anaconda3/bin/python3 \
      generator/case_packs/build_cases_04_06.py
"""

from __future__ import annotations

import hashlib
import json
import shutil
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "parquet"
PUBLIC = ROOT / "web" / "public" / "data" / "cases"
REVISION = "2026.09.01"
CATALOG_SNAPSHOT = "2026-01-15"


@dataclass
class Pack:
    case_id: str
    slug: str
    analysis_cutoff: str
    output: Path = field(init=False)
    files: list[dict[str, Any]] = field(default_factory=list)
    mappings: dict[str, str] = field(default_factory=dict)
    cautions: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.output = PUBLIC / self.slug
        if self.output.exists():
            shutil.rmtree(self.output)
        self.output.mkdir(parents=True)

    def write(
        self,
        table_name: str,
        frame: pd.DataFrame,
        *,
        source_table: str | None = None,
        note: str,
    ) -> None:
        schema_name, table = table_name.split(".", 1)
        relative = Path(schema_name) / f"{table}.parquet"
        destination = self.output / relative
        destination.parent.mkdir(parents=True, exist_ok=True)

        arrow_table = pa.Table.from_pandas(frame.reset_index(drop=True), preserve_index=False)
        pq.write_table(
            arrow_table,
            destination,
            compression="zstd",
            compression_level=9,
            use_dictionary=True,
            write_statistics=True,
            row_group_size=50_000,
        )
        digest = hashlib.sha256(destination.read_bytes()).hexdigest()
        public_path = f"/data/cases/{self.slug}/{relative.as_posix()}"
        self.files.append(
            {
                "table": table_name,
                "source_table": source_table,
                "path": public_path,
                "python_path": public_path,
                "rows": len(frame),
                "bytes": destination.stat().st_size,
                "sha256": digest,
                "columns": list(frame.columns),
                "note": note,
            }
        )
        self.mappings[table_name] = public_path

    def finish(self, *, selection: dict[str, Any], mechanisms: dict[str, Any]) -> None:
        # Exact planted-mechanism counts belong in the authoring validation
        # report, not in the learner-served manifest. Keeping them out of the
        # browser pack prevents the data register from becoming a spoiler key.
        del mechanisms
        manifest = {
            "manifest_version": "1.0",
            "case_id": self.case_id,
            "slug": self.slug,
            "revision": REVISION,
            "catalog_snapshot": CATALOG_SNAPSHOT,
            "analysis_cutoff": self.analysis_cutoff,
            "generated_from": "the-analyst synthetic enterprise world",
            "selection": selection,
            "files": self.files,
            "table_mappings": self.mappings,
            "learner_cautions": self.cautions,
            "validation_reference": "generator/case_packs/reports/cases_04_06_validation.md",
            "totals": {
                "files": len(self.files),
                "rows": sum(item["rows"] for item in self.files),
                "bytes": sum(item["bytes"] for item in self.files),
            },
        }
        (self.output / "manifest.json").write_text(
            json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
        )


def read(table_name: str, columns: list[str] | None = None) -> pd.DataFrame:
    schema_name, table = table_name.split(".", 1)
    return pd.read_parquet(SOURCE / schema_name / f"{table}.parquet", columns=columns)


def build_rollback() -> None:
    pack = Pack("OP-250320", "rollback-before-dawn", "2025-03-20T11:40:00-04:00")
    pack.cautions = [
        "The extract deliberately contains rows and outcome labels that became available after the incident cutoff.",
        "Received telemetry is not the denominator for expected telemetry; silent assets remain in scenario.asset_cohort.",
        "Alerts, telemetry absence, work requests, and confirmed physical failures are different grains and concepts.",
    ]

    health = read("iot.asset_health_daily")
    health["health_date"] = pd.to_datetime(health["health_date"])
    selection_window = health[
        health["health_date"].between("2025-01-15", "2025-04-20", inclusive="both")
    ]
    asset_regions = (
        selection_window.sort_values(["asset_id", "health_date"])
        .drop_duplicates("asset_id", keep="last")[["asset_id", "region_id"]]
    )
    chosen_assets = (
        asset_regions.sort_values("asset_id")
        .groupby("region_id", group_keys=False)
        .head(3_000)
        .sort_values("asset_id")
    )
    asset_ids = set(chosen_assets["asset_id"])

    all_assets = read("iot.asset")
    assets = all_assets[all_assets["asset_id"].isin(asset_ids)].sort_values("asset_id")
    installations = read("iot.asset_installation_history")
    installations = installations[
        installations["asset_id"].isin(asset_ids)
        & (installations["installed_at"] <= pd.Timestamp("2025-04-20 23:59:59"))
        & (
            installations["removed_at"].isna()
            | (installations["removed_at"] >= pd.Timestamp("2025-01-15"))
        )
    ].sort_values(["asset_id", "installed_at"])

    all_sensors = read("iot.sensor")
    sensors = all_sensors[all_sensors["asset_id"].isin(asset_ids)].sort_values("sensor_id")

    readings = read("iot.sensor_reading")
    readings = readings[
        readings["asset_id"].isin(asset_ids)
        & readings["observed_at"].between(
            "2025-01-15", "2025-04-20 23:59:59", inclusive="both"
        )
    ].sort_values(["observed_at", "sensor_reading_id"])

    alerts = read("iot.device_alert")
    alerts = alerts[
        alerts["asset_id"].isin(asset_ids)
        & alerts["alert_at"].between(
            "2025-01-15", "2025-04-20 23:59:59", inclusive="both"
        )
    ].sort_values(["alert_at", "alert_id"])

    # Alerts carry both an asset and a sensor reference. The full synthetic
    # estate does not require those two references to describe the same asset,
    # so retain every referenced sensor and its owning asset rather than
    # silently breaking either foreign key in the compact pack.
    referenced_sensor_ids = set(sensors["sensor_id"]) | set(alerts["sensor_id"].dropna())
    sensors = all_sensors[all_sensors["sensor_id"].isin(referenced_sensor_ids)].sort_values(
        "sensor_id"
    )
    related_asset_ids = asset_ids | set(sensors["asset_id"])
    assets = all_assets[all_assets["asset_id"].isin(related_asset_ids)].sort_values("asset_id")

    health = health[
        health["asset_id"].isin(asset_ids)
        & health["health_date"].between("2025-01-15", "2025-04-20", inclusive="both")
    ].sort_values(["health_date", "asset_id"])

    station = read("external.weather_station")
    weather = read("external.weather_hourly")
    weather = weather[
        weather["observed_at"].between(
            "2025-02-01", "2025-04-01 23:59:59", inclusive="both"
        )
    ].sort_values(["observed_at", "weather_station_id"])

    work_orders = read("field_ops.work_order")
    work_orders = work_orders[
        work_orders["asset_id"].isin(asset_ids)
        & work_orders["created_at"].between(
            "2025-02-01", "2025-04-20 23:59:59", inclusive="both"
        )
    ].sort_values(["created_at", "work_order_id"])
    work_order_ids = set(work_orders["work_order_id"])
    status_events = read("field_ops.work_order_status_event")
    status_events = status_events[
        status_events["work_order_id"].isin(work_order_ids)
    ].sort_values(["work_order_id", "occurred_at", "source_recorded_at"])

    world_events = read("core.world_event")
    world_events = world_events[
        (world_events["started_at"] <= pd.Timestamp("2025-04-20 23:59:59"))
        & (world_events["ended_at"] >= pd.Timestamp("2025-01-15"))
    ].sort_values("started_at")

    sensor_summary = sensors.groupby("asset_id", as_index=False).agg(
        expected_channels=("sensor_id", "nunique"),
        expected_readings_per_day=(
            "expected_frequency_minutes",
            lambda value: float(np.sum(1_440 / value)),
        ),
    )
    cohort = (
        chosen_assets.merge(sensor_summary, on="asset_id", how="left")
        .fillna({"expected_channels": 0, "expected_readings_per_day": 0.0})
        .sort_values("asset_id")
    )
    cohort["cohort_rule"] = "3,000 catalogued assets per region with a health observation in the case window"

    pack.write(
        "scenario.asset_cohort",
        cohort,
        note="Stable asset denominator by incident region, including devices with no received reading in a period.",
    )
    pack.write("iot.asset", assets, source_table="iot.asset", note="Asset master; current site and state are not historical facts.")
    pack.write("iot.asset_installation_history", installations, source_table="iot.asset_installation_history", note="Effective installation periods for historical site assignment.")
    pack.write("iot.sensor", sensors, source_table="iot.sensor", note="Expected channel frequency supplies the telemetry denominator.")
    pack.write("iot.sensor_reading", readings, source_table="iot.sensor_reading", note="Observed, recorded, and warehouse-available clocks are separate; v5 changes measurement behavior.")
    pack.write("iot.device_alert", alerts, source_table="iot.device_alert", note="Generated alerts are not confirmed physical failures and can repeat by asset.")
    pack.write("iot.asset_health_daily", health, source_table="iot.asset_health_daily", note="Sampled analytical rows include delayed 30-day outcomes unavailable at the incident cutoff.")
    pack.write("external.weather_station", station, source_table="external.weather_station", note="Station-to-region bridge; several stations may describe one region.")
    pack.write("external.weather_hourly", weather, source_table="external.weather_hourly", note="Hourly regional exposure evidence, not device-level causal proof.")
    pack.write("field_ops.work_order", work_orders, source_table="field_ops.work_order", note="Frozen extract mixes request-time facts and eventual operational outcomes.")
    pack.write("field_ops.work_order_status_event", status_events, source_table="field_ops.work_order_status_event", note="Status history requires source-recorded cutoffs and pre-aggregation.")
    pack.write("core.region", read("core.region"), source_table="core.region", note="Stable corporate region reference.")
    pack.write("core.branch", read("core.branch"), source_table="core.branch", note="Branch-to-region and timezone reference.")
    pack.write("core.world_event", world_events, source_table="core.world_event", note="Registered context is useful but not a complete causal label.")

    storm_readings = readings[
        readings["observed_at"].between("2025-03-14", "2025-03-20 11:40")
    ]
    silent_assets = len(asset_ids - set(storm_readings["asset_id"]))
    pack.finish(
        selection={
            "asset_cohort": "3,000 lexicographically first eligible assets per region",
            "asset_count": len(asset_ids),
            "telemetry_window": ["2025-01-15", "2025-04-20"],
            "weather_window": ["2025-02-01", "2025-04-01"],
        },
        mechanisms={
            "firmware_versions_retained": sorted(int(v) for v in readings["firmware_major"].unique()),
            "incident_window_received_readings": len(storm_readings),
            "cohort_assets_silent_during_incident_window": silent_assets,
            "post_cutoff_warehouse_rows": int((readings["warehouse_available_at"] > pd.Timestamp("2025-03-20 11:40")).sum()),
            "future_failure_labels": int((health["failure_label_available_at"] > pd.Timestamp("2025-03-20 11:40")).sum()),
            "status_event_fanout_ratio": round(len(status_events) / max(len(work_orders), 1), 3),
        },
    )


def build_capacity() -> None:
    pack = Pack("FO-250320", "the-730-capacity-call", "2025-03-20T07:30:00-04:00")
    branch_id = "BR0020"
    cutoff = pd.Timestamp("2025-03-20 07:30:00")
    pack.cautions = [
        "The source work-order, visit, appointment, and shift extracts contain realized outcomes that are forbidden as scoring-time features.",
        "The approved scenario bulletin is the only authoritative current weather/capacity snapshot for the 07:30 decision.",
        "Traffic revisions lack a universal availability clock; a historical revision policy must be declared.",
    ]

    branches = read("core.branch")
    branch = branches[branches["branch_id"] == branch_id].copy()
    region_id = branch.iloc[0]["region_id"]

    appointments = read("field_ops.appointment")
    appointments = appointments[appointments["branch_id"] == branch_id].sort_values(
        ["scheduled_start_at", "appointment_id"]
    )
    appointment_ids = set(appointments["appointment_id"])
    work_orders = read("field_ops.work_order")
    work_orders = work_orders[work_orders["appointment_id"].isin(appointment_ids)].sort_values(
        ["scheduled_start_at", "work_order_id"]
    )
    work_order_ids = set(work_orders["work_order_id"])
    visits = read("field_ops.visit")
    visits = visits[visits["work_order_id"].isin(work_order_ids)].sort_values(
        ["appointment_id", "arrived_at", "visit_id"]
    )
    status_events = read("field_ops.work_order_status_event")
    status_events = status_events[
        status_events["work_order_id"].isin(work_order_ids)
    ].sort_values(["work_order_id", "occurred_at", "source_recorded_at"])

    shifts = read("workforce.shift")
    shifts = shifts[shifts["branch_id"] == branch_id].sort_values(
        ["scheduled_start_at", "shift_id"]
    )
    shift_employees = set(shifts["employee_id"])
    roles = read("workforce.employee_role_history")
    roles = roles[
        roles["employee_id"].isin(shift_employees)
        & (roles["branch_id"] == branch_id)
    ].sort_values(["employee_id", "effective_from"])

    service_sites = read("crm.service_site")
    site_ids = set(appointments["service_site_id"])
    safe_sites = service_sites[service_sites["service_site_id"].isin(site_ids)][
        ["service_site_id", "postal_area_id", "site_type", "created_date", "is_active"]
    ]
    postal = read("core.postal_area")
    geography = (
        appointments[["appointment_id", "service_site_id"]]
        .merge(safe_sites, on="service_site_id", how="left")
        .merge(
            postal[["postal_area_id", "service_area_id", "region_id", "state_code"]],
            on="postal_area_id",
            how="left",
        )
        .drop(columns=["postal_area_id"])
        .drop_duplicates("appointment_id")
        .sort_values("appointment_id")
    )
    service_area_ids = set(geography["service_area_id"].dropna())
    service_areas = read("core.service_area")
    service_areas = service_areas[service_areas["service_area_id"].isin(service_area_ids)]
    traffic = read("external.traffic_area_hourly")
    traffic = traffic[
        traffic["service_area_id"].isin(service_area_ids)
        & (traffic["observed_hour"] <= cutoff)
    ].sort_values(["service_area_id", "observed_hour", "revision_number"])

    weather_station = read("external.weather_station")
    weather_station = weather_station[weather_station["region_id"] == region_id]
    weather_station_ids = set(weather_station["weather_station_id"])
    weather = read("external.weather_hourly")
    weather = weather[
        weather["weather_station_id"].isin(weather_station_ids)
        & (weather["observed_at"] <= cutoff)
    ].sort_values(["observed_at", "weather_station_id"])

    roster = appointments[
        (appointments["scheduled_start_at"].dt.date == cutoff.date())
        & (appointments["scheduled_end_at"] >= cutoff)
    ].merge(
        work_orders[
            [
                "work_order_id",
                "appointment_id",
                "created_at",
                "warehouse_available_at",
                "requested_service_code",
                "priority_code",
            ]
        ],
        on="appointment_id",
        how="left",
        validate="one_to_one",
    )
    roster = roster[
        [
            "appointment_id",
            "work_order_id",
            "branch_id",
            "booked_at",
            "scheduled_start_at",
            "scheduled_end_at",
            "appointment_type_code",
            "booking_channel_code",
            "created_at",
            "warehouse_available_at",
            "requested_service_code",
            "priority_code",
        ]
    ].sort_values(["scheduled_end_at", "appointment_id"])

    current_weather = weather[weather["observed_at"] <= cutoff].sort_values(
        "observed_at"
    ).groupby("weather_station_id", as_index=False).tail(1)
    today_shifts = shifts[
        (shifts["scheduled_start_at"].dt.date == cutoff.date())
        & (shifts["scheduled_start_at"] <= cutoff)
        & (shifts["scheduled_end_at"] > cutoff)
    ]
    bulletin = pd.DataFrame(
        [
            {
                "decision_at": cutoff,
                "branch_id": branch_id,
                "timezone_name": branch.iloc[0]["timezone_name"],
                "region_id": region_id,
                "remaining_appointments": len(roster),
                "scheduled_staff_on_shift": int(today_shifts["employee_id"].nunique()),
                "dispatcher_review_capacity": 4,
                "proactive_contact_capacity": 3,
                "emergency_reroute_capacity": 2,
                "missed_window_cost_units": 480,
                "unnecessary_contact_cost_units": 35,
                "dispatcher_review_cost_units": 12,
                "emergency_reroute_cost_units": 220,
                "mean_temperature_c": float(current_weather["temperature_c"].mean()),
                "mean_snowfall_mm": float(current_weather["snowfall_mm"].mean()),
                "mean_wind_speed_kph": float(current_weather["wind_speed_kph"].mean()),
                "source_note": "Controller-approved aggregate at 07:25; no employee-level absence detail is approved for modeling.",
            }
        ]
    )

    pack.write("scenario.current_appointment_roster", roster, note="Outcome-withheld remaining appointment roster for the 07:30 decision.")
    pack.write("scenario.capacity_bulletin", bulletin, note="Approved 07:25 current-weather, aggregate-capacity, cost, and action limits.")
    pack.write("scenario.appointment_geography", geography, note="Privacy-minimized appointment-to-service-area bridge; raw address and coordinates are excluded.")
    pack.write("field_ops.appointment", appointments, source_table="field_ops.appointment", note="Historical and current service windows; realized storm flag is a forbidden outcome feature.")
    pack.write("field_ops.work_order", work_orders, source_table="field_ops.work_order", note="Frozen source includes final fields unavailable at historical morning cutoffs.")
    pack.write("field_ops.work_order_status_event", status_events, source_table="field_ops.work_order_status_event", note="Reconstruct state with occurred and source-recorded clocks before aggregating.")
    pack.write("field_ops.visit", visits, source_table="field_ops.visit", note="First arrival creates the matured breach label; all visit facts are post-decision.")
    pack.write("workforce.shift", shifts, source_table="workforce.shift", note="Scheduled branch capacity; final shift status is not proof of morning availability.")
    pack.write("workforce.employee_role_history", roles, source_table="workforce.employee_role_history", note="Restricted effective role history for aggregate feasibility checks only.")
    pack.write("external.weather_station", weather_station, source_table="external.weather_station", note="Region-to-weather-station bridge.")
    pack.write("external.weather_hourly", weather, source_table="external.weather_hourly", note="Historical weather through the cutoff; later same-day conditions are omitted.")
    pack.write("external.traffic_area_hourly", traffic, source_table="external.traffic_area_hourly", note="Provider revisions are retained; historical availability is not universally known.")
    pack.write("core.branch", branch, source_table="core.branch", note="Selected branch, region, and timezone.")
    pack.write("core.service_area", service_areas, source_table="core.service_area", note="Service-area operational geography for traffic aggregation.")
    pack.write("core.business_calendar", read("core.business_calendar"), source_table="core.business_calendar", note="Complete date reference for temporal folds and day features.")

    first_arrival = visits.groupby("appointment_id")["arrived_at"].min()
    labeled = appointments.set_index("appointment_id").join(first_arrival)
    labeled = labeled[labeled["scheduled_end_at"] < cutoff - pd.Timedelta(days=28)]
    breach = labeled["arrived_at"] > labeled["scheduled_end_at"]
    repeated_traffic = int(
        traffic.duplicated(["service_area_id", "observed_hour"], keep=False).sum()
    )
    pack.finish(
        selection={
            "branch_id": branch_id,
            "branch_region": region_id,
            "appointment_population": "all appointments assigned to BR0020",
            "current_roster_rule": "scheduled_end_at >= 2025-03-20 07:30 on the selected local date",
        },
        mechanisms={
            "matured_historical_appointments": len(labeled),
            "matured_breach_rate": round(float(breach.mean()), 6),
            "current_roster_rows": len(roster),
            "status_event_fanout_ratio": round(len(status_events) / len(work_orders), 3),
            "traffic_rows_in_revised_area_hours": repeated_traffic,
            "source_rows_with_forbidden_completed_at": int(work_orders["completed_at"].notna().sum()),
        },
    )


def supply_watchlist(
    movement: pd.DataFrame, position: pd.DataFrame, cutoff: pd.Timestamp
) -> tuple[pd.DataFrame, list[str]]:
    keys = ["warehouse_id", "product_id"]
    physical = movement[
        (~movement["scanner_replay_flag"]) & (movement["posted_at"] <= cutoff)
    ]
    issues = physical[
        (physical["movement_type_code"] == "ISSUE")
        & (physical["movement_at"] >= cutoff - pd.Timedelta(days=90))
    ].copy()
    issue_daily = (
        issues.assign(
            demand_units=-issues["quantity_delta"],
            demand_date=issues["movement_at"].dt.floor("D"),
        )
        .groupby(keys + ["demand_date"], as_index=False)["demand_units"]
        .sum()
    )
    issue_day_mean = issue_daily.groupby(keys)["demand_units"].mean().rename(
        "mean_units_per_issue_day"
    )
    all_day_mean = (
        issue_daily.groupby(keys)["demand_units"].sum() / 90
    ).rename("mean_units_per_calendar_day")
    latest = (
        position[position["snapshot_date"] <= cutoff.date()]
        .sort_values("snapshot_date")
        .groupby(keys, as_index=False)
        .tail(1)
        .set_index(keys)
        .join(issue_day_mean)
        .join(all_day_mean)
        .reset_index()
    )
    latest["workbook_available_units"] = (
        latest["on_hand_quantity"]
        - latest["allocated_quantity"]
        - latest["backorder_quantity"]
    )
    latest["workbook_claimed_cover_hours"] = (
        24 * latest["workbook_available_units"] / latest["mean_units_per_issue_day"]
    )
    latest["calendar_day_cover_recomputed"] = (
        latest["workbook_available_units"] / latest["mean_units_per_calendar_day"]
    )
    latest["position_age_days"] = (
        cutoff.normalize() - pd.to_datetime(latest["snapshot_date"])
    ).dt.days
    latest["product_number"] = latest["product_id"].str.extract(r"(\d+)")[0].astype(int)
    latest["generator_family"] = (latest["product_number"] - 1) % 5

    selected_rows: list[pd.DataFrame] = []
    for family in range(5):
        family_rows = latest[latest["generator_family"] == family].sort_values(
            ["workbook_claimed_cover_hours", "position_age_days", "product_id"]
        ).head(6)
        selected_rows.append(family_rows)
    watchlist = pd.concat(selected_rows, ignore_index=True).sort_values(
        ["workbook_claimed_cover_hours", "warehouse_id", "product_id"]
    )
    watchlist["watchlist_reason_code"] = np.select(
        [
            watchlist["workbook_claimed_cover_hours"] < 48,
            watchlist["workbook_claimed_cover_hours"] < 168,
            watchlist["position_age_days"] > 7,
        ],
        ["UNDER_48_HOURS", "UNDER_7_DAYS", "STALE_POSITION_REVIEW"],
        default="SEASONAL_STRESS_SAMPLE",
    )
    watchlist["decision_at"] = cutoff
    public = watchlist[
        [
            "warehouse_id",
            "product_id",
            "snapshot_date",
            "on_hand_quantity",
            "allocated_quantity",
            "backorder_quantity",
            "workbook_available_units",
            "mean_units_per_issue_day",
            "workbook_claimed_cover_hours",
            "position_age_days",
            "watchlist_reason_code",
            "decision_at",
        ]
    ].copy()
    return public, sorted(set(public["product_id"]))


def build_supply() -> None:
    pack = Pack("SP-251201", "forty-eight-hours-of-stock", "2025-12-01T06:45:00-05:00")
    cutoff = pd.Timestamp("2025-12-01 06:45:00")
    pack.cautions = [
        "inventory_movement is a technical-event ledger; explicit scanner replays must not be counted as physical movements.",
        "inventory_position_daily is a sparse sample, not a complete daily stock spine.",
        "received quantity is gross; accepted quantity is received minus rejected, and one PO line may have several receipts.",
        "The pack deliberately retains rows after the forecast origin so every transformation must enforce its own cutoff.",
    ]

    movement = read("supply.inventory_movement")
    position = read("supply.inventory_position_daily")
    purchase_order = read("supply.purchase_order")
    purchase_order_line = read("supply.purchase_order_line")
    receipt = read("supply.goods_receipt")
    product_vendor = read("supply.product_vendor")
    vendor = read("supply.vendor")
    warehouse = read("supply.warehouse")
    product = read("catalog.product")
    substitution = read("catalog.product_substitution")
    calendar = read("core.business_calendar")

    watchlist, watchlist_products = supply_watchlist(movement, position, cutoff)
    physical = movement[
        (~movement["scanner_replay_flag"]) & (movement["posted_at"] <= cutoff)
    ]
    opening = (
        physical[physical["product_id"].isin(watchlist_products)]
        .groupby(["warehouse_id", "product_id"], as_index=False)["quantity_delta"]
        .sum()
        .rename(columns={"quantity_delta": "approved_opening_quantity"})
    )
    opening["decision_at"] = cutoff
    opening["source_convention"] = "sum non-replay physical quantity_delta with posted_at <= decision_at"

    constraints = pd.DataFrame(
        [
            {"constraint_code": "FREIGHT_BUDGET_UNITS", "scope_from": None, "scope_to": None, "value": 24_000, "unit": "cost_units", "note": "Total transfer and expedite spend."},
            {"constraint_code": "BUYER_REVIEW_SLOTS", "scope_from": None, "scope_to": None, "value": 8, "unit": "actions", "note": "Maximum buyer-reviewed expedites/substitutions."},
            {"constraint_code": "MAX_PROPOSED_ACTIONS", "scope_from": None, "scope_to": None, "value": 15, "unit": "actions", "note": "Portfolio-wide action capacity."},
            {"constraint_code": "DONOR_RESERVE_DAYS", "scope_from": None, "scope_to": None, "value": 10, "unit": "calendar_days", "note": "Minimum simulated donor cover after transfer."},
            {"constraint_code": "TRANSFER_LANE", "scope_from": "WH001", "scope_to": "WH002", "value": 2, "unit": "lead_days", "note": "Approved lane; reciprocal lane is a separate row."},
            {"constraint_code": "TRANSFER_LANE", "scope_from": "WH002", "scope_to": "WH001", "value": 2, "unit": "lead_days", "note": "Approved lane."},
            {"constraint_code": "TRANSFER_LANE", "scope_from": "WH001", "scope_to": "WH003", "value": 3, "unit": "lead_days", "note": "Approved lane."},
            {"constraint_code": "TRANSFER_LANE", "scope_from": "WH003", "scope_to": "WH001", "value": 3, "unit": "lead_days", "note": "Approved lane."},
            {"constraint_code": "TRANSFER_LANE", "scope_from": "WH002", "scope_to": "WH003", "value": 4, "unit": "lead_days", "note": "Approved lane."},
            {"constraint_code": "TRANSFER_LANE", "scope_from": "WH003", "scope_to": "WH002", "value": 4, "unit": "lead_days", "note": "Approved lane."},
        ]
    )

    pack.write("scenario.supply_watchlist", watchlist, note="Thirty review pairs selected across several demand histories; workbook calculations are claims, not answers.")
    pack.write("scenario.opening_balance", opening, note="Controller-approved opening quantity for each watchlist product at all three donor/recipient warehouses.")
    pack.write("scenario.action_constraints", constraints, note="Published portfolio budget, review, donor-reserve, and transfer-lane limits.")
    pack.write("supply.inventory_movement", movement, source_table="supply.inventory_movement", note="Full technical movement ledger, including linked scanner replays and later rows.")
    pack.write("supply.inventory_position_daily", position, source_table="supply.inventory_position_daily", note="Full sparse sampled position history with reconciled trailing fields.")
    pack.write("supply.purchase_order", purchase_order, source_table="supply.purchase_order", note="Full PO header population; current status must not be projected backward.")
    pack.write("supply.purchase_order_line", purchase_order_line, source_table="supply.purchase_order_line", note="Full PO line population; ordered and cancelled quantity remain at line grain.")
    pack.write("supply.goods_receipt", receipt, source_table="supply.goods_receipt", note="Full split and rejected receipt-event population.")
    pack.write("supply.product_vendor", product_vendor, source_table="supply.product_vendor", note="Effective approved vendor-product relationships, costs, lead times, and MOQs.")
    pack.write("supply.vendor", vendor, source_table="supply.vendor", note="Vendor terms and risk tiers for transparent uncertainty pooling.")
    pack.write("supply.warehouse", warehouse, source_table="supply.warehouse", note="Three warehouse locations, regions, capacity, and timezone.")
    pack.write("catalog.product", product, source_table="catalog.product", note="Real synthetic SKU names, types, lifecycle state, and unit costs.")
    pack.write("catalog.product_substitution", substitution, source_table="catalog.product_substitution", note="Effective substitution options and customer-approval requirements.")
    pack.write("core.business_calendar", calendar, source_table="core.business_calendar", note="Complete date spine for explicit zero-demand days.")

    replay_count = int(movement["scanner_replay_flag"].sum())
    receipt_counts = receipt.groupby("purchase_order_line_id").size()
    received_line_ids = set(receipt["purchase_order_line_id"])
    line_orders = purchase_order_line[
        purchase_order_line["purchase_order_line_id"].isin(received_line_ids)
    ].merge(
        purchase_order[["purchase_order_id", "ordered_at"]], on="purchase_order_id", how="left"
    )
    final_receipt = receipt.groupby("purchase_order_line_id")["received_at"].max()
    lead = (
        line_orders.set_index("purchase_order_line_id")["ordered_at"].to_frame()
        .join(final_receipt)
        .dropna()
    )
    # The estate contract defines realized lead at calendar-date grain.
    lead_days = (
        lead["received_at"].dt.normalize() - lead["ordered_at"].dt.normalize()
    ).dt.days
    pack.finish(
        selection={
            "supply_domain": "full supply domain retained; non-supply world tables omitted",
            "watchlist": "six lowest naive-cover pairs from each of five deterministic product strata",
            "watchlist_rows": len(watchlist),
            "watchlist_products": len(watchlist_products),
        },
        mechanisms={
            "technical_movement_rows": len(movement),
            "physical_movement_rows": len(movement) - replay_count,
            "scanner_replay_rows": replay_count,
            "sparse_position_rows": len(position),
            "receipt_rows_with_rejection": int((receipt["rejected_quantity"] > 0).sum()),
            "po_lines_with_split_receipts": int((receipt_counts > 1).sum()),
            "realized_final_lead_time_days": {
                "minimum": int(lead_days.min()),
                "maximum": int(lead_days.max()),
            },
            "workbook_pairs_under_48_hours": int((watchlist["workbook_claimed_cover_hours"] < 48).sum()),
            "rows_after_forecast_origin": int((movement["posted_at"] > cutoff).sum()),
        },
    )


def main() -> None:
    build_rollback()
    build_capacity()
    build_supply()
    print(f"Built case packs in {PUBLIC}")


if __name__ == "__main__":
    main()
