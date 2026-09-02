from __future__ import annotations

import numpy as np
import pyarrow as pa

from builder import nullable, random_dates, random_timestamps, rng_for
from config import SCALE


SUPPLY_MOVEMENT_ROWS = 520_000
SUPPLY_SCANNER_REPLAY_PAIRS = 2_400
SUPPLY_OPENING_BALANCE_ROWS = SCALE["products"] * 3
SUPPLY_POSITION_ROWS = 330_000
SUPPLY_INTERMITTENT_CYCLE_DAYS = 19
SUPPLY_INTERMITTENT_ACTIVE_DAYS = 2


def _fk(column, references, referenced_column=None, *, nullable_fk=False, warning=None):
    return {
        "columns": [column],
        "references": references,
        "referenced_columns": [referenced_column or column],
        "nullable": nullable_fk,
        "warning": warning,
    }


def _enum(rng, values, n, probabilities=None):
    return rng.choice(np.asarray(values), size=n, p=probabilities)


def _ts_plus(base, rng, low_hours, high_hours):
    return base + rng.integers(low_hours, high_hours + 1, len(base)).astype("timedelta64[h]")


def _positions(context, master_key, ids):
    """Return row positions for string or numeric IDs in an aligned context array."""
    cache = context.setdefault("_position_cache", {})
    if master_key not in cache:
        cache[master_key] = {value: pos for pos, value in enumerate(context[master_key])}
    index = cache[master_key]
    values = np.asarray(ids)
    return np.fromiter((index[value] for value in values), dtype=np.int64, count=len(values))


def _aligned(context, master_key, value_key, ids):
    return np.asarray(context[value_key])[_positions(context, master_key, ids)]


def _site_region(context, site_ids):
    site_postal = _aligned(context, "site_id", "site_postal", site_ids)
    service_area = _aligned(context, "postal_area_id", "postal_service_area", site_postal)
    branch = _aligned(context, "service_area_id", "service_area_branch", service_area)
    return _aligned(context, "branch_id", "branch_region", branch)


def _grouped_time_sums(event_keys, event_days, event_values, query_keys, query_days, windows=()):
    """Return per-key cumulative and trailing sums at sparse query dates."""
    event_keys = np.asarray(event_keys, dtype=np.int32)
    event_days = np.asarray(event_days, dtype=np.int32)
    event_values = np.asarray(event_values, dtype=np.int64)
    query_keys = np.asarray(query_keys, dtype=np.int32)
    query_days = np.asarray(query_days, dtype=np.int32)

    event_order = np.lexsort((event_days, event_keys))
    sorted_event_keys = event_keys[event_order]
    sorted_event_days = event_days[event_order]
    sorted_event_values = event_values[event_order]
    query_order = np.lexsort((query_days, query_keys))
    sorted_query_keys = query_keys[query_order]
    sorted_query_days = query_days[query_order]

    cumulative_result = np.zeros(len(query_keys), dtype=np.int64)
    trailing_results = {window: np.zeros(len(query_keys), dtype=np.int64) for window in windows}
    for key in np.unique(sorted_query_keys):
        event_left = np.searchsorted(sorted_event_keys, key, side="left")
        event_right = np.searchsorted(sorted_event_keys, key, side="right")
        query_left = np.searchsorted(sorted_query_keys, key, side="left")
        query_right = np.searchsorted(sorted_query_keys, key, side="right")
        query_positions = query_order[query_left:query_right]
        days = sorted_event_days[event_left:event_right]
        values = sorted_event_values[event_left:event_right]
        cumulative = np.concatenate((np.array([0], dtype=np.int64), np.cumsum(values, dtype=np.int64)))
        target_days = sorted_query_days[query_left:query_right]
        end = np.searchsorted(days, target_days, side="right")
        cumulative_result[query_positions] = cumulative[end]
        for window in windows:
            start = np.searchsorted(days, target_days - window + 1, side="left")
            trailing_results[window][query_positions] = cumulative[end] - cumulative[start]
    return cumulative_result, trailing_results


def generate_operations(builder):
    """Generate operational, support, supply, fleet, IoT, and external domains."""
    _generate_iot(builder)
    _generate_field_ops(builder)
    _generate_support(builder)
    _generate_supply_facts(builder)
    _generate_fleet_facts(builder)
    _generate_external(builder)


def _generate_iot(builder):
    c = builder.context
    rng = rng_for("iot")
    n_assets = SCALE["assets"]
    asset_id = np.arange(1, n_assets + 1, dtype=np.int32)
    subscription_id = rng.choice(c["subscription_id"], n_assets)
    subscription_site = _aligned(c, "subscription_id", "subscription_site", subscription_id)
    site_id = np.where(rng.random(n_assets) < 0.88, subscription_site, rng.choice(c["site_id"], n_assets))
    product_id = rng.choice(c["product_id"], n_assets)
    installed_at = random_timestamps(rng, n_assets, "2023-01-01", "2025-10-31")
    install_source = _enum(rng, ["FIELD", "SELF", "PARTNER", "MIGRATED"], n_assets, [0.54, 0.24, 0.08, 0.14])
    acquired = (_positions(c, "site_id", site_id) % 11 == 0) & (installed_at < np.datetime64("2024-07-01"))
    builder.write(
        "iot",
        "asset",
        {
            "asset_id": asset_id,
            "asset_code": np.array([f"AST{x:08d}" for x in asset_id]),
            "product_id": product_id,
            "current_service_site_id": site_id,
            "subscription_id": subscription_id,
            "serial_number": np.array([f"MLS-{p}-{x:09d}" for x, p in zip(asset_id, product_id)]),
            "installed_at": installed_at,
            "install_source_code": install_source,
            "current_state_code": _enum(rng, ["HEALTHY", "DEGRADED", "OFFLINE", "RETIRED"], n_assets, [0.76, 0.11, 0.09, 0.04]),
            "acquired_legacy_flag": acquired,
            "warranty_end_date": (installed_at + rng.integers(365, 1096, n_assets).astype("timedelta64[D]")).astype("datetime64[D]"),
            "extract_as_of": np.full(n_assets, np.datetime64("2026-01-15T06:00:00")),
        },
        description="Installed equipment currently or formerly associated with a service site.",
        grain="One installed physical asset.",
        primary_key=["asset_id"],
        foreign_keys=[
            _fk("product_id", "catalog.product"),
            _fk("current_service_site_id", "crm.service_site", "service_site_id"),
            _fk("subscription_id", "billing.subscription"),
        ],
        owner="Connected Products",
        sensitivity="confidential",
        use_when="Connecting service, telemetry, and maintenance histories to a physical unit.",
        do_not_use_when="Treating an account as a single device or assuming current site is historical site.",
    )

    n_install = 72_000
    install_asset = rng.choice(asset_id, n_install)
    install_start = random_timestamps(rng, n_install, "2023-01-01", "2025-12-01")
    is_current = rng.random(n_install) < 0.78
    install_end = install_start + rng.integers(30, 700, n_install).astype("timedelta64[D]")
    builder.write(
        "iot",
        "asset_installation_history",
        {
            "installation_id": np.arange(1, n_install + 1, dtype=np.int64),
            "asset_id": install_asset,
            "service_site_id": site_id[install_asset - 1],
            "installed_at": install_start,
            "removed_at": nullable(install_end, is_current),
            "installation_reason_code": _enum(rng, ["NEW", "MOVE", "REPLACEMENT", "MIGRATION"], n_install, [0.65, 0.09, 0.16, 0.10]),
            "recorded_at": _ts_plus(install_start, rng, 0, 72),
        },
        description="Effective installation and removal episodes for physical assets.",
        grain="One asset-at-site installation period.",
        primary_key=["installation_id"],
        foreign_keys=[_fk("asset_id", "iot.asset"), _fk("service_site_id", "crm.service_site")],
        owner="Field Asset Registry",
        sensitivity="confidential",
        reliability="caution",
        quality_notes=["Legacy acquisition removals can arrive several days late."],
    )

    n_sensors = 72_000
    sensor_id = np.arange(1, n_sensors + 1, dtype=np.int32)
    sensor_asset = rng.choice(asset_id, n_sensors)
    sensor_type = _enum(rng, ["HEARTBEAT", "TEMPERATURE", "BATTERY", "SIGNAL", "MOTION", "PRESSURE"], n_sensors)
    builder.write(
        "iot",
        "sensor",
        {
            "sensor_id": sensor_id,
            "asset_id": sensor_asset,
            "sensor_type_code": sensor_type,
            "unit_code": np.where(sensor_type == "TEMPERATURE", "C", np.where(sensor_type == "BATTERY", "PCT", "INDEX")),
            "activated_at": installed_at[sensor_asset - 1] + rng.integers(0, 48, n_sensors).astype("timedelta64[h]"),
            "expected_frequency_minutes": rng.choice([5, 15, 30, 60, 240, 1440], n_sensors),
        },
        description="Logical telemetry channels belonging to installed assets.",
        grain="One sensor or logical measurement channel.",
        primary_key=["sensor_id"],
        foreign_keys=[_fk("asset_id", "iot.asset")],
        owner="Connected Products",
        sensitivity="internal",
    )

    n_read = 1_200_000
    read_sensor = rng.choice(sensor_id, n_read)
    read_asset = sensor_asset[read_sensor - 1]
    observed_at = random_timestamps(rng, n_read, "2023-07-01", "2025-12-31")
    read_region = _site_region(c, site_id[read_asset - 1])
    storm = (
        (observed_at >= np.datetime64("2025-03-14"))
        & (observed_at < np.datetime64("2025-03-21"))
        & np.isin(read_region, [1, 2])
    )
    firmware_window = (observed_at >= np.datetime64("2025-02-01")) & (observed_at < np.datetime64("2025-04-01"))
    missing_value = (rng.random(n_read) < 0.015) | (storm & (rng.random(n_read) < 0.42))
    base_value = rng.normal(50, 14, n_read).astype(np.float32)
    base_value += firmware_window.astype(np.float32) * rng.normal(2.5, 1.0, n_read).astype(np.float32)
    recorded_at = observed_at + rng.integers(0, 180, n_read).astype("timedelta64[m]")
    builder.write(
        "iot",
        "sensor_reading",
        {
            "sensor_reading_id": np.arange(1, n_read + 1, dtype=np.int64),
            "sensor_id": read_sensor,
            "asset_id": read_asset,
            "observed_at": observed_at,
            "source_recorded_at": recorded_at,
            "warehouse_available_at": recorded_at + rng.integers(1, 90, n_read).astype("timedelta64[m]"),
            "reading_value": nullable(base_value, missing_value),
            "quality_code": np.where(storm & missing_value, "STORM_GAP", np.where(missing_value, "MISSING", "VALID")),
            "firmware_major": np.where(observed_at >= np.datetime64("2025-02-01"), 5, 4).astype(np.int8),
            "region_id": read_region,
        },
        description="Observed telemetry readings with event, recording, and warehouse-availability times.",
        grain="One recorded sensor observation.",
        primary_key=["sensor_reading_id"],
        foreign_keys=[_fk("sensor_id", "iot.sensor"), _fk("asset_id", "iot.asset"), _fk("region_id", "core.region")],
        owner="IoT Platform",
        sensitivity="confidential",
        reliability="caution",
        quality_notes=["Storm-period missingness is informative.", "Firmware v5 changed measurement behavior."],
    )
    builder.add_anomaly(
        anomaly_id="A08",
        name="Weather-induced telemetry missingness",
        affected_tables=["iot.sensor_reading", "iot.asset_health_daily"],
        date_range="2025-03-14/2025-03-20",
        mechanism="Affected devices fail to report precisely when outages and failures rise.",
        breadcrumb="quality_code=STORM_GAP and external weather observations",
        learning_objective="Reason about missing-not-at-random operational telemetry.",
    )

    n_alert = 180_000
    alert_asset = rng.choice(asset_id, n_alert)
    alert_sensor = rng.choice(sensor_id, n_alert)
    alert_at = random_timestamps(rng, n_alert, "2023-07-01", "2025-12-31")
    builder.write(
        "iot",
        "device_alert",
        {
            "alert_id": np.arange(1, n_alert + 1, dtype=np.int64),
            "asset_id": alert_asset,
            "sensor_id": alert_sensor,
            "alert_at": alert_at,
            "alert_type_code": _enum(rng, ["OFFLINE", "BATTERY", "MOTION", "TEMP", "SIGNAL", "FAILURE_RISK"], n_alert),
            "severity_code": _enum(rng, ["INFO", "LOW", "MEDIUM", "HIGH"], n_alert, [0.20, 0.38, 0.31, 0.11]),
            "acknowledged_at": _ts_plus(alert_at, rng, 0, 96),
            "auto_generated_flag": rng.random(n_alert) < 0.93,
            "firmware_release_flag": (alert_at >= np.datetime64("2025-02-01")) & (alert_at < np.datetime64("2025-04-01")),
        },
        description="Device alerts derived from telemetry and business rules.",
        grain="One generated device alert.",
        primary_key=["alert_id"],
        foreign_keys=[_fk("asset_id", "iot.asset"), _fk("sensor_id", "iot.sensor")],
        owner="Connected Operations",
        sensitivity="confidential",
        reliability="caution",
    )

    n_health = 360_000
    health_asset = rng.choice(asset_id, n_health)
    health_date = random_dates(rng, n_health, "2023-07-01", "2025-12-31")
    health_region = _site_region(c, site_id[health_asset - 1])
    health_storm = (
        (health_date >= np.datetime64("2025-03-14"))
        & (health_date <= np.datetime64("2025-03-20"))
        & np.isin(health_region, [1, 2])
    )
    telemetry_completeness = np.clip(rng.beta(8, 2, n_health) - health_storm * rng.uniform(0.35, 0.8, n_health), 0, 1).astype(np.float32)
    cols = {
        "asset_health_daily_id": np.arange(1, n_health + 1, dtype=np.int64),
        "asset_id": health_asset,
        "health_date": health_date,
        "service_site_id": site_id[health_asset - 1],
        "region_id": health_region,
        "telemetry_completeness": telemetry_completeness,
        "health_score": np.clip(rng.normal(78, 18, n_health) - health_storm * 12, 0, 100).astype(np.float32),
        "alert_count_1d": rng.poisson(0.35 + health_storm * 1.8, n_health).astype(np.int16),
        "offline_minutes_1d": np.clip(rng.gamma(1.2, 45, n_health) + health_storm * rng.gamma(2, 180, n_health), 0, 1440).astype(np.int16),
        "firmware_major": np.where(health_date >= np.datetime64("2025-02-01"), 5, 4).astype(np.int8),
        "generated_at": health_date.astype("datetime64[s]") + np.timedelta64(1, "D") + np.timedelta64(5, "h"),
        "failure_within_30d": rng.random(n_health) < (0.025 + health_storm * 0.07),
        "failure_label_available_at": health_date.astype("datetime64[s]") + np.timedelta64(45, "D"),
    }
    for window in (7, 14, 30, 60, 90):
        cols[f"reading_count_{window}d"] = rng.poisson(window * 18 * np.maximum(telemetry_completeness, 0.05)).astype(np.int32)
        cols[f"alert_count_{window}d"] = rng.poisson(window * (0.25 + health_storm * 0.2)).astype(np.int16)
        cols[f"mean_signal_{window}d"] = np.clip(rng.normal(71, 13, n_health), 0, 100).astype(np.float32)
        cols[f"mean_battery_{window}d"] = np.clip(rng.normal(68, 21, n_health), 0, 100).astype(np.float32)
        cols[f"missing_rate_{window}d"] = np.clip(1 - telemetry_completeness + rng.normal(0, 0.03, n_health), 0, 1).astype(np.float32)
    builder.write(
        "iot",
        "asset_health_daily",
        cols,
        description="Daily asset-health feature snapshot combining telemetry, alerts, firmware, and delayed outcomes.",
        grain="One sampled asset-day analytical snapshot.",
        primary_key=["asset_health_daily_id"],
        foreign_keys=[_fk("asset_id", "iot.asset"), _fk("service_site_id", "crm.service_site"), _fk("region_id", "core.region")],
        owner="Connected Analytics",
        sensitivity="confidential",
        reliability="caution",
        quality_notes=["Contains eventual outcome fields that are not available at snapshot time.", "Missingness changes during severe weather."],
        do_not_use_when="Building point-in-time models without enforcing label and feature availability timestamps.",
    )
    c.update({"asset_id": asset_id, "asset_site": site_id, "sensor_id": sensor_id, "sensor_asset": sensor_asset})


def _generate_field_ops(builder):
    c = builder.context
    rng = rng_for("field_ops")
    n = SCALE["work_orders"]
    work_order_id = np.arange(1, n + 1, dtype=np.int64)
    asset_id = rng.choice(c["asset_id"], n)
    site_id = c["asset_site"][asset_id - 1]
    account_id = _aligned(c, "site_id", "site_account", site_id)
    postal_id = _aligned(c, "site_id", "site_postal", site_id)
    service_area_id = _aligned(c, "postal_area_id", "postal_service_area", postal_id)
    branch_id = _aligned(c, "service_area_id", "service_area_branch", service_area_id)
    created_at = random_timestamps(rng, n, "2023-01-01", "2025-12-15")
    appointment_id = np.arange(1, n + 1, dtype=np.int64)
    scheduled_start = created_at + rng.integers(4, 24 * 18, n).astype("timedelta64[h]")
    scheduled_end = scheduled_start + rng.integers(1, 5, n).astype("timedelta64[h]")
    storm = (
        (scheduled_start >= np.datetime64("2025-03-14"))
        & (scheduled_start < np.datetime64("2025-03-21"))
        & np.isin(_aligned(c, "branch_id", "branch_region", branch_id), c["region_id"][:2])
    )
    builder.write(
        "field_ops",
        "appointment",
        {
            "appointment_id": appointment_id,
            "account_id": account_id,
            "service_site_id": site_id,
            "branch_id": branch_id,
            "booked_at": created_at,
            "scheduled_start_at": scheduled_start,
            "scheduled_end_at": scheduled_end,
            "appointment_type_code": _enum(rng, ["INSTALL", "REPAIR", "INSPECTION", "MAINTENANCE"], n, [0.18, 0.47, 0.12, 0.23]),
            "booking_channel_code": _enum(rng, ["PHONE", "WEB", "APP", "AGENT", "SYSTEM"], n),
            "storm_disruption_flag": storm,
        },
        description="Customer-facing booked service windows.",
        grain="One booked service appointment.",
        primary_key=["appointment_id"],
        foreign_keys=[_fk("account_id", "crm.account"), _fk("service_site_id", "crm.service_site"), _fk("branch_id", "core.branch")],
        owner="Service Scheduling",
        sensitivity="confidential",
    )
    technician = rng.choice(c["technician_id"], n)
    status = _enum(rng, ["COMPLETED", "CANCELLED", "PARTS_REQUIRED", "NO_ACCESS", "OPEN"], n, [0.73, 0.06, 0.08, 0.05, 0.08])
    completed_at = scheduled_start + rng.integers(1, 9, n).astype("timedelta64[h]") + storm * rng.integers(12, 96, n).astype("timedelta64[h]")
    first_fix = (rng.random(n) < (0.79 - storm * 0.08)) & (status == "COMPLETED")
    builder.write(
        "field_ops",
        "work_order",
        {
            "work_order_id": work_order_id,
            "work_order_code": np.array([f"WO{x:09d}" for x in work_order_id]),
            "appointment_id": appointment_id,
            "account_id": account_id,
            "service_site_id": site_id,
            "asset_id": asset_id,
            "subscription_id": rng.choice(c["subscription_id"], n),
            "branch_id": branch_id,
            "created_at": created_at,
            "warehouse_available_at": created_at + rng.integers(2, 240, n).astype("timedelta64[m]"),
            "requested_service_code": _enum(rng, ["NO_POWER", "OFFLINE", "FALSE_ALERT", "INSTALL", "PREVENTIVE", "OTHER"], n),
            "priority_code": _enum(rng, ["P1", "P2", "P3", "P4"], n, [0.05, 0.18, 0.47, 0.30]),
            "current_status_code": status,
            "assigned_employee_id": technician,
            "scheduled_start_at": scheduled_start,
            "completed_at": nullable(completed_at, status != "COMPLETED"),
            "first_time_fix_flag": first_fix,
            "storm_disruption_flag": storm,
            "final_resolution_code": np.where(status == "COMPLETED", _enum(rng, ["REPAIRED", "REPLACED", "CONFIGURED", "NO_FAULT"], n), "UNRESOLVED"),
            "extract_as_of": np.full(n, np.datetime64("2026-01-15T06:00:00")),
        },
        description="Current work-order record combining request, scheduling, and final operational fields.",
        grain="One requested unit of field work.",
        primary_key=["work_order_id"],
        foreign_keys=[
            _fk("appointment_id", "field_ops.appointment"), _fk("account_id", "crm.account"),
            _fk("service_site_id", "crm.service_site"), _fk("asset_id", "iot.asset"),
            _fk("subscription_id", "billing.subscription"), _fk("branch_id", "core.branch"),
            _fk("assigned_employee_id", "workforce.employee", "employee_id"),
        ],
        owner="Field Service",
        sensitivity="confidential",
        reliability="caution",
        quality_notes=["Current-status extract contains post-assignment outcomes and should not be used directly as a point-in-time feature table."],
    )

    stages = np.array(["CREATED", "SCHEDULED", "ASSIGNED", "EN_ROUTE", "ONSITE", "COMPLETED"])
    event_wo = np.repeat(work_order_id, len(stages))
    event_stage = np.tile(stages, n)
    stage_hours = np.tile(np.array([0, 2, 6, 24, 26, 29]), n)
    event_time = np.repeat(created_at, len(stages)) + stage_hours.astype("timedelta64[h]")
    event_emp = np.repeat(technician, len(stages))
    n_events = len(event_wo)
    builder.write(
        "field_ops",
        "work_order_status_event",
        {
            "work_order_status_event_id": np.arange(1, n_events + 1, dtype=np.int64),
            "work_order_id": event_wo,
            "status_code": event_stage,
            "occurred_at": event_time,
            "source_recorded_at": event_time + rng.integers(0, 120, n_events).astype("timedelta64[m]"),
            "employee_id": event_emp,
            "source_system_code": np.where(event_wo % 13 == 0, "HARBOR_DISPATCH", "MERIDIAN_FIELD"),
        },
        description="Append-only lifecycle history for work orders.",
        grain="One recorded work-order status transition.",
        primary_key=["work_order_status_event_id"],
        foreign_keys=[_fk("work_order_id", "field_ops.work_order"), _fk("employee_id", "workforce.employee")],
        owner="Field Service Platform",
        sensitivity="confidential",
    )

    visit_id = np.arange(1, n + 1, dtype=np.int64)
    arrival = scheduled_start + rng.integers(-30, 180, n).astype("timedelta64[m]") + storm * rng.integers(60, 600, n).astype("timedelta64[m]")
    departure = arrival + rng.integers(25, 240, n).astype("timedelta64[m]")
    builder.write(
        "field_ops",
        "visit",
        {
            "visit_id": visit_id,
            "work_order_id": work_order_id,
            "appointment_id": appointment_id,
            "employee_id": technician,
            "service_site_id": site_id,
            "arrived_at": arrival,
            "departed_at": departure,
            "travel_minutes": np.clip(rng.gamma(2.2, 19, n) + storm * 35, 3, 480).astype(np.int16),
            "onsite_minutes": ((departure - arrival) / np.timedelta64(1, "m")).astype(np.int16),
            "customer_present_flag": rng.random(n) > 0.06,
            "visit_outcome_code": np.where(first_fix, "FIXED", _enum(rng, ["FOLLOWUP", "NO_ACCESS", "PARTS", "ESCALATE"], n)),
        },
        description="Actual technician arrivals, departures, and visit outcomes.",
        grain="One physical or attempted service visit.",
        primary_key=["visit_id"],
        foreign_keys=[_fk("work_order_id", "field_ops.work_order"), _fk("appointment_id", "field_ops.appointment"), _fk("employee_id", "workforce.employee"), _fk("service_site_id", "crm.service_site")],
        owner="Field Service",
        sensitivity="confidential",
    )

    n_parts = 260_000
    part_wo = rng.choice(work_order_id, n_parts)
    builder.write(
        "field_ops",
        "work_order_part",
        {
            "work_order_part_id": np.arange(1, n_parts + 1, dtype=np.int64),
            "work_order_id": part_wo,
            "visit_id": part_wo,
            "product_id": rng.choice(c["product_id"], n_parts),
            "quantity_used": rng.integers(1, 5, n_parts, dtype=np.int16),
            "unit_cost_cents": rng.integers(125, 65_000, n_parts, dtype=np.int64),
            "recorded_at": completed_at[part_wo - 1] + rng.integers(0, 12, n_parts).astype("timedelta64[h]"),
        },
        description="Parts consumed, returned, or recorded against field work.",
        grain="One product line recorded against one service visit.",
        primary_key=["work_order_part_id"],
        foreign_keys=[_fk("work_order_id", "field_ops.work_order"), _fk("visit_id", "field_ops.visit"), _fk("product_id", "catalog.product")],
        owner="Field Service",
        sensitivity="internal",
    )

    n_notes = 210_000
    note_wo = rng.choice(work_order_id, n_notes)
    templates = np.array([
        "Customer reports intermittent connection after recent update.",
        "Unable to reproduce fault; reviewed alert history with customer.",
        "Replacement component required before work can be completed.",
        "Site access delayed; customer requested a new appointment window.",
        "Configuration corrected and device verified online.",
    ])
    builder.write(
        "field_ops",
        "work_order_note",
        {
            "note_id": np.arange(1, n_notes + 1, dtype=np.int64),
            "work_order_id": note_wo,
            "employee_id": technician[note_wo - 1],
            "created_at": created_at[note_wo - 1] + rng.integers(1, 72, n_notes).astype("timedelta64[h]"),
            "note_type_code": _enum(rng, ["TECHNICIAN", "DISPATCH", "CUSTOMER", "SYSTEM"], n_notes),
            "note_text": rng.choice(templates, n_notes),
            "contains_synthetic_pii_flag": rng.random(n_notes) < 0.025,
        },
        description="Free-text technician, dispatcher, customer, and system notes.",
        grain="One note attached to one work order.",
        primary_key=["note_id"],
        foreign_keys=[_fk("work_order_id", "field_ops.work_order"), _fk("employee_id", "workforce.employee")],
        owner="Field Service",
        sensitivity="restricted",
    )

    analytics_cols = {
        "work_order_id": work_order_id,
        "account_id": account_id,
        "service_site_id": site_id,
        "asset_id": asset_id,
        "branch_id": branch_id,
        "created_at": created_at,
        "scheduled_start_at": scheduled_start,
        "assigned_employee_id": technician,
        "priority_code": _enum(rng, ["P1", "P2", "P3", "P4"], n),
        "first_time_fix_flag": first_fix,
        "final_resolution_code": np.where(status == "COMPLETED", "RESOLVED", "UNRESOLVED"),
        "completion_hours": np.clip(((completed_at - created_at) / np.timedelta64(1, "h")), 0, 2000).astype(np.float32),
        "generated_at": np.full(n, np.datetime64("2026-01-15T05:00:00")),
    }
    for window in (7, 30, 60, 90, 180):
        analytics_cols[f"account_prior_work_orders_{window}d"] = rng.poisson(max(1, window / 75), n).astype(np.int16)
        analytics_cols[f"asset_prior_alerts_{window}d"] = rng.poisson(max(1, window / 30), n).astype(np.int16)
        analytics_cols[f"branch_backlog_mean_{window}d"] = rng.gamma(3, 12, n).astype(np.float32)
        analytics_cols[f"technician_fix_rate_{window}d"] = np.clip(rng.beta(12, 3, n), 0, 1).astype(np.float32)
        analytics_cols[f"parts_availability_rate_{window}d"] = np.clip(rng.beta(10, 2, n), 0, 1).astype(np.float32)
    builder.write(
        "field_ops",
        "work_order_analytics",
        analytics_cols,
        description="Convenient analytical work-order row mixing point-in-time predictors with final outcomes.",
        grain="One work order in the current analytical extract.",
        primary_key=["work_order_id"],
        foreign_keys=[_fk("work_order_id", "field_ops.work_order"), _fk("account_id", "crm.account"), _fk("service_site_id", "crm.service_site"), _fk("asset_id", "iot.asset"), _fk("branch_id", "core.branch"), _fk("assigned_employee_id", "workforce.employee", "employee_id")],
        owner="Service Analytics",
        sensitivity="confidential",
        reliability="caution",
        quality_notes=["Final resolution and completion fields leak future information for assignment-time models."],
    )
    builder.add_anomaly(
        anomaly_id="A14",
        name="One-to-many work-order fanout",
        affected_tables=["field_ops.work_order", "field_ops.work_order_part", "field_ops.work_order_status_event"],
        date_range="2023-01-01/2025-12-31",
        mechanism="Joining work orders to both parts and status histories multiplies rows.",
        breadcrumb="Catalog relationship cardinalities and count-distinct reconciliation.",
        learning_objective="Recognize grain changes and join fanout.",
    )
    c.update({
        "work_order_id": work_order_id,
        "work_order_account": account_id,
        "work_order_site": site_id,
        "work_order_asset": asset_id,
        "work_order_created": created_at,
        "visit_id": visit_id,
        "visit_employee": technician,
    })


def _generate_support(builder):
    c = builder.context
    rng = rng_for("support")
    n = SCALE["tickets"]
    ticket_id = np.arange(1, n + 1, dtype=np.int64)
    account_id = rng.choice(c["account_id"], n)
    site_id = np.where(
        rng.random(n) < 0.9,
        rng.choice(c["site_id"], n),
        rng.choice(c["site_id"], n),
    )
    opened_at = random_timestamps(rng, n)
    dual_write = (opened_at >= np.datetime64("2024-10-01")) & (opened_at < np.datetime64("2024-12-01"))
    subject_pool = np.array([
        "Device intermittently offline", "Unexpected invoice amount", "Installation scheduling question",
        "Mobile application login issue", "Temperature reading appears wrong", "Replacement part status",
        "Cancel or change service", "Noise after recent maintenance", "Account ownership update",
    ])
    channel = _enum(rng, ["PHONE", "EMAIL", "CHAT", "WEB", "PARTNER"], n, [0.23, 0.28, 0.25, 0.2, 0.04])
    priority = _enum(rng, ["URGENT", "HIGH", "NORMAL", "LOW"], n, [0.03, 0.15, 0.67, 0.15])
    status = _enum(rng, ["SOLVED", "CLOSED", "PENDING", "OPEN", "SPAM"], n, [0.5, 0.34, 0.08, 0.07, 0.01])
    resolution_hours = np.clip(rng.lognormal(3.25, 1.15, n), 0.1, 1400)
    solved_at = opened_at + (resolution_hours * 3600).astype("timedelta64[s]")
    fingerprint = np.array([f"INT-{x:09d}" for x in ticket_id])
    duplicate_source = dual_write & (rng.random(n) < 0.22)
    duplicate_of = np.maximum(1, ticket_id - rng.integers(1, 80, n))
    fingerprint[duplicate_source] = np.array([f"INT-{x:09d}" for x in duplicate_of[duplicate_source]])
    builder.write(
        "support", "ticket",
        {
            "ticket_id": ticket_id,
            "ticket_number": np.array([f"TKT-{x:09d}" for x in ticket_id]),
            "interaction_fingerprint": fingerprint,
            "account_id": account_id,
            "service_site_id": site_id,
            "opened_at": opened_at,
            "channel_code": channel,
            "priority_code": priority,
            "current_status_code": status,
            "subject": rng.choice(subject_pool, n),
            "category_code": _enum(rng, ["DEVICE", "BILLING", "INSTALL", "APP", "ACCOUNT", "CANCEL"], n),
            "source_system_code": np.where(dual_write, _enum(rng, ["ZENDESK", "CRM_MIRROR"], n), "ZENDESK"),
            "solved_at": nullable(solved_at, ~np.isin(status, ["SOLVED", "CLOSED"])),
            "first_response_minutes": np.clip(rng.lognormal(3.0, 1.0, n), 1, 5000).astype(np.int32),
            "reopen_count": rng.poisson(0.18, n).astype(np.int16),
            "assigned_team_code": _enum(rng, ["TIER1", "TIER2", "BILLING", "RETENTION", "FIELD"], n),
            "dual_write_window_flag": dual_write,
            "extract_as_of": np.full(n, np.datetime64("2026-01-15T06:00:00")),
        },
        description="Customer support cases from operational and migration-era sources.",
        grain="One source-system ticket; interaction_fingerprint is the cross-system reconciliation key.",
        primary_key=["ticket_id"],
        foreign_keys=[_fk("account_id", "crm.account"), _fk("service_site_id", "crm.service_site", "service_site_id")],
        owner="Customer Care", sensitivity="confidential", reliability="caution",
        quality_notes=["A two-month dual-write window creates business-event duplicates across distinct ticket IDs."],
    )

    n_events = 430_000
    event_ticket = rng.choice(ticket_id, n_events).astype(np.int64)
    event_at = opened_at[event_ticket - 1] + rng.integers(0, 1_200, n_events).astype("timedelta64[h]")
    builder.write(
        "support", "ticket_status_event",
        {
            "ticket_status_event_id": np.arange(1, n_events + 1, dtype=np.int64),
            "ticket_id": event_ticket,
            "event_at": event_at,
            "from_status_code": _enum(rng, ["NEW", "OPEN", "PENDING", "SOLVED"], n_events),
            "to_status_code": _enum(rng, ["OPEN", "PENDING", "SOLVED", "CLOSED"], n_events),
            "actor_type_code": _enum(rng, ["AGENT", "CUSTOMER", "SYSTEM", "PARTNER"], n_events),
            "reason_code": _enum(rng, ["REPLY", "WAITING", "RESOLUTION", "AUTO_CLOSE", "REOPEN"], n_events),
        },
        description="Append-only status changes for support cases.", grain="One observed status transition.",
        primary_key=["ticket_status_event_id"], foreign_keys=[_fk("ticket_id", "support.ticket")],
        owner="Customer Care", sensitivity="internal",
    )

    n_conversations = 112_000
    conversation_id = np.arange(1, n_conversations + 1, dtype=np.int64)
    conversation_ticket = rng.choice(ticket_id, n_conversations).astype(np.int64)
    builder.write(
        "support", "conversation",
        {
            "conversation_id": conversation_id,
            "ticket_id": conversation_ticket,
            "started_at": opened_at[conversation_ticket - 1] + rng.integers(0, 48, n_conversations).astype("timedelta64[h]"),
            "channel_code": _enum(rng, ["EMAIL", "CHAT", "VOICE_TRANSCRIPT", "SMS"], n_conversations),
            "participant_count": rng.integers(2, 6, n_conversations, dtype=np.int16),
            "language_code": _enum(rng, ["en", "es", "fr", "unknown"], n_conversations, [0.86, 0.09, 0.03, 0.02]),
        },
        description="Conversation containers attached to support tickets.", grain="One conversation thread.",
        primary_key=["conversation_id"], foreign_keys=[_fk("ticket_id", "support.ticket")],
        owner="Customer Care", sensitivity="restricted",
    )
    n_messages = 360_000
    message_conversation = rng.choice(conversation_id, n_messages).astype(np.int64)
    message_ticket = conversation_ticket[message_conversation - 1]
    message_time = opened_at[message_ticket - 1] + rng.integers(0, 1_000, n_messages).astype("timedelta64[h]")
    bodies = np.array([
        "Could you confirm when this started and whether the indicator is blinking?",
        "I restarted the unit twice but the issue returned this morning.",
        "The account has been corrected; the adjustment will appear on the next statement.",
        "A technician can arrive during the requested service window.",
        "Internal note: verify entitlement before offering a replacement.",
    ])
    builder.write(
        "support", "message",
        {
            "message_id": np.arange(1, n_messages + 1, dtype=np.int64),
            "conversation_id": message_conversation,
            "sent_at": message_time,
            "sender_type_code": _enum(rng, ["CUSTOMER", "AGENT", "BOT", "INTERNAL"], n_messages, [0.41, 0.43, 0.09, 0.07]),
            "body_text": rng.choice(bodies, n_messages),
            "attachment_count": rng.poisson(0.12, n_messages).astype(np.int16),
            "redaction_state_code": _enum(rng, ["NONE", "AUTO_REDACTED", "REVIEW_REQUIRED"], n_messages, [0.93, 0.055, 0.015]),
            "sentiment_score": np.clip(rng.normal(-0.03, 0.52, n_messages), -1, 1).astype(np.float32),
            "contains_synthetic_pii_flag": rng.random(n_messages) < 0.018,
        },
        description="Synthetic support messages with redaction and sentiment metadata.", grain="One message in one conversation.",
        primary_key=["message_id"], foreign_keys=[_fk("conversation_id", "support.conversation")],
        owner="Customer Care", sensitivity="restricted", reliability="caution",
        quality_notes=["Message text is synthetic but intentionally treated as restricted for realistic governance practice."],
    )

    n_csat = 48_000
    csat_ticket = rng.choice(ticket_id[np.isin(status, ["SOLVED", "CLOSED"])], n_csat, replace=False)
    acquired_scale = _positions(c, "site_id", site_id[csat_ticket - 1]) % 11 == 0
    raw_score = np.where(acquired_scale, rng.integers(1, 11, n_csat), rng.integers(1, 6, n_csat)).astype(np.int16)
    builder.write(
        "support", "csat_response",
        {
            "csat_response_id": np.arange(1, n_csat + 1, dtype=np.int64),
            "ticket_id": csat_ticket,
            "submitted_at": solved_at[csat_ticket - 1] + rng.integers(1, 240, n_csat).astype("timedelta64[h]"),
            "score_raw": raw_score,
            "scale_max": np.where(acquired_scale, 10, 5).astype(np.int16),
            "score_normalized": ((raw_score - 1) / np.where(acquired_scale, 9, 4)).astype(np.float32),
            "comment_present_flag": rng.random(n_csat) < 0.31,
            "survey_source_code": np.where(acquired_scale, "LEGACY_SURVEY", "CARE_SURVEY"),
        },
        description="Post-resolution satisfaction surveys retaining original rating scale.", grain="One returned survey per ticket.",
        primary_key=["csat_response_id"], foreign_keys=[_fk("ticket_id", "support.ticket")],
        owner="Customer Insights", sensitivity="confidential", reliability="caution",
        quality_notes=["Scores use both 1-5 and 1-10 scales; score_normalized is the comparable field."],
    )

    n_articles = 520
    article_id = np.arange(1, n_articles + 1, dtype=np.int32)
    builder.write(
        "support", "knowledge_article",
        {
            "article_id": article_id,
            "article_slug": np.array([f"kb-{x:05d}" for x in article_id]),
            "title": np.array([f"Meridian help article {x}: troubleshooting and service" for x in article_id]),
            "topic_code": _enum(rng, ["DEVICE", "BILLING", "INSTALL", "APP", "ACCOUNT"], n_articles),
            "current_state_code": _enum(rng, ["PUBLISHED", "DRAFT", "ARCHIVED"], n_articles, [0.8, 0.08, 0.12]),
            "created_date": random_dates(rng, n_articles),
            "owner_team_code": _enum(rng, ["CARE", "PRODUCT", "FIELD", "FINANCE"], n_articles),
        },
        description="Knowledge-base article registry.", grain="One logical knowledge article.",
        primary_key=["article_id"], owner="Knowledge Management",
    )
    n_views = 190_000
    builder.write(
        "support", "knowledge_article_view",
        {
            "article_view_id": np.arange(1, n_views + 1, dtype=np.int64),
            "article_id": rng.choice(article_id, n_views),
            "viewed_at": random_timestamps(rng, n_views),
            "viewer_type_code": _enum(rng, ["CUSTOMER", "AGENT", "BOT"], n_views, [0.57, 0.39, 0.04]),
            "session_token": np.array([f"KBV-{x % 75000:07d}" for x in range(n_views)]),
            "helpful_vote": nullable(rng.choice([True, False], n_views), rng.random(n_views) < 0.85),
        },
        description="Knowledge article view and optional helpfulness telemetry.", grain="One article view event.",
        primary_key=["article_view_id"], foreign_keys=[_fk("article_id", "support.knowledge_article")],
        owner="Knowledge Management", sensitivity="internal",
    )
    builder.add_anomaly(
        anomaly_id="A05", name="Support dual-write duplicates",
        affected_tables=["support.ticket", "support.ticket_status_event"], date_range="2024-10-01/2024-11-30",
        mechanism="CRM migration wrote the same interaction to Zendesk and a CRM mirror under different ticket IDs.",
        breadcrumb="interaction_fingerprint repeats while ticket_id remains unique.",
        learning_objective="Define a business key and reconcile duplicates without deleting legitimate repeat contacts.",
    )
    c.update({"ticket_id": ticket_id, "ticket_account": account_id, "ticket_site": site_id})


def _generate_supply_facts(builder):
    c = builder.context
    rng = rng_for("supply_facts")

    # Purchase orders have four real line numbers apiece, and every ordered
    # product is approved for the header vendor in product_vendor.
    n_po = 24_000
    po_id = np.arange(1, n_po + 1, dtype=np.int64)
    po_vendor_idx = rng.integers(0, len(c["vendor_id"]), n_po)
    vendor_id = c["vendor_id"][po_vendor_idx]
    po_warehouse_idx = rng.integers(0, len(c["warehouse_id"]), n_po)
    warehouse_id = c["warehouse_id"][po_warehouse_idx]
    ordered_at = random_timestamps(rng, n_po, "2023-01-01", "2025-09-30T23:59:59")
    po_status = _enum(
        rng,
        ["RECEIVED", "PARTIAL", "OPEN", "CANCELLED"],
        n_po,
        [0.46, 0.23, 0.28, 0.03],
    )

    n_lines = 96_000
    line_id = np.arange(1, n_lines + 1, dtype=np.int64)
    line_po_pos = np.repeat(np.arange(n_po, dtype=np.int32), 4)
    line_po = po_id[line_po_pos]
    line_number = np.tile(np.arange(1, 5, dtype=np.int16), n_po)
    line_product = np.empty(n_lines, dtype=c["product_id"].dtype)
    pv_products = np.asarray(c["product_vendor_product"])
    pv_vendors = np.asarray(c["product_vendor_vendor"])
    vendor_product_pools = {
        vendor: np.unique(pv_products[pv_vendors == vendor]) for vendor in c["vendor_id"]
    }
    for po_position, vendor in enumerate(vendor_id):
        pool = vendor_product_pools[vendor]
        if not len(pool):
            pool = c["product_id"]
        start = po_position * 4
        line_product[start:start + 4] = rng.choice(pool, 4, replace=len(pool) < 4)

    contract_lookup = {}
    for product, vendor, cost, lead in zip(
        c["product_vendor_product"],
        c["product_vendor_vendor"],
        c["product_vendor_contract_unit_cost_cents"],
        c["product_vendor_contract_lead_time_days"],
    ):
        contract_lookup.setdefault((product, vendor), (int(cost), int(lead)))
    contract_pairs = [contract_lookup[(product, vendor_id[po_pos])] for product, po_pos in zip(line_product, line_po_pos)]
    unit_cost = np.fromiter((pair[0] for pair in contract_pairs), dtype=np.int64, count=n_lines)
    contract_lead_days = np.fromiter((pair[1] for pair in contract_pairs), dtype=np.int16, count=n_lines)
    ordered_qty = rng.integers(2, 241, n_lines, dtype=np.int32)
    cancelled_quantity = np.where(po_status[line_po_pos] == "CANCELLED", ordered_qty, 0).astype(np.int32)
    net_ordered_quantity = ordered_qty - cancelled_quantity
    line_order_day = ordered_at[line_po_pos].astype("datetime64[D]")
    promised_date = line_order_day + contract_lead_days.astype("timedelta64[D]")

    # Realized lead time varies around contract by supplier risk and occasional
    # disruption. It is deliberately not a deterministic copy of promise time.
    risk = np.asarray(c["vendor_risk_tier"])[po_vendor_idx[line_po_pos]]
    risk_mean = np.select([risk == "low", risk == "medium", risk == "high"], [0.0, 3.0, 8.0])
    risk_std = np.select([risk == "low", risk == "medium", risk == "high"], [3.0, 5.0, 8.0])
    lead_variation = np.rint(rng.normal(risk_mean, risk_std)).astype(np.int16)
    disruption = rng.random(n_lines) < 0.08
    lead_variation += np.where(disruption, rng.integers(5, 22, n_lines), 0).astype(np.int16)
    realized_lead_days = np.clip(contract_lead_days.astype(np.int32) + lead_variation, 1, 90)
    final_receipt_at = (
        line_order_day.astype("datetime64[s]")
        + realized_lead_days.astype("timedelta64[D]")
        + rng.integers(0, 24, n_lines).astype("timedelta64[h]")
    )

    accepted_target = np.zeros(n_lines, dtype=np.int32)
    received_line = po_status[line_po_pos] == "RECEIVED"
    partial_line = po_status[line_po_pos] == "PARTIAL"
    accepted_target[received_line] = net_ordered_quantity[received_line]
    partial_fraction = rng.uniform(0.30, 0.86, partial_line.sum())
    accepted_target[partial_line] = np.clip(
        np.floor(net_ordered_quantity[partial_line] * partial_fraction).astype(np.int32),
        1,
        net_ordered_quantity[partial_line] - 1,
    )

    receipt_line_positions = np.flatnonzero(accepted_target > 0)
    n_receipts = 82_000
    n_split = n_receipts - len(receipt_line_positions)
    split_candidates = receipt_line_positions[
        (accepted_target[receipt_line_positions] >= 2)
        & (realized_lead_days[receipt_line_positions] >= 3)
    ]
    if n_split < 0 or n_split > len(split_candidates):
        raise RuntimeError(
            f"Cannot construct {n_receipts:,} receipts from {len(receipt_line_positions):,} receiving lines"
        )
    split_lines = rng.choice(split_candidates, n_split, replace=False)
    is_split = np.zeros(n_lines, dtype=bool)
    is_split[split_lines] = True
    first_accepted = accepted_target.copy()
    first_accepted[split_lines] = (
        np.floor(rng.random(n_split) * (accepted_target[split_lines] - 1)).astype(np.int32) + 1
    )
    second_accepted = accepted_target[split_lines] - first_accepted[split_lines]
    receipt_line_pos = np.concatenate((receipt_line_positions, split_lines))
    receipt_accepted = np.concatenate((first_accepted[receipt_line_positions], second_accepted)).astype(np.int32)
    first_receipt_at = final_receipt_at[receipt_line_positions].copy()
    split_base_mask = is_split[receipt_line_positions]
    max_early_days = np.maximum(realized_lead_days[receipt_line_positions[split_base_mask]] - 1, 1)
    early_days = (
        np.floor(rng.random(split_base_mask.sum()) * np.minimum(max_early_days, 7)).astype(np.int16) + 1
    )
    first_receipt_at[split_base_mask] -= early_days.astype("timedelta64[D]")
    receipt_at = np.concatenate((first_receipt_at, final_receipt_at[split_lines]))
    receipt_rejected = np.where(
        rng.random(n_receipts) < 0.14,
        rng.integers(1, 8, n_receipts),
        0,
    ).astype(np.int16)
    receipt_received = receipt_accepted + receipt_rejected.astype(np.int32)
    goods_receipt_id = np.arange(1, n_receipts + 1, dtype=np.int64)
    inspection_code = np.where(
        receipt_rejected > 0,
        "PARTIAL_REJECT",
        _enum(rng, ["PASS", "WAIVED", "PENDING"], n_receipts, [0.91, 0.07, 0.02]),
    )

    expected_day_number = promised_date.astype(np.int64)
    expected_by_po = np.full(n_po, expected_day_number.min(), dtype=np.int64)
    np.maximum.at(expected_by_po, line_po_pos, expected_day_number)
    builder.write(
        "supply", "purchase_order",
        {
            "purchase_order_id": po_id,
            "purchase_order_number": np.array([f"PO-{x:08d}" for x in po_id]),
            "vendor_id": vendor_id,
            "warehouse_id": warehouse_id,
            "ordered_at": ordered_at,
            "expected_date": expected_by_po.astype("datetime64[D]"),
            "status_code": po_status,
            "currency_code": _enum(rng, ["USD", "CAD", "EUR"], n_po, [0.94, 0.04, 0.02]),
            "buyer_employee_id": rng.choice(c["employee_id"], n_po),
            "source_system_code": _enum(rng, ["ERP", "LEGACY_ERP"], n_po, [0.89, 0.11]),
        },
        description="Purchase-order headers for parts and equipment procurement.", grain="One purchase order.",
        primary_key=["purchase_order_id"],
        foreign_keys=[_fk("vendor_id", "supply.vendor"), _fk("warehouse_id", "supply.warehouse"), _fk("buyer_employee_id", "workforce.employee", "employee_id")],
        owner="Procurement", sensitivity="confidential",
    )
    builder.write(
        "supply", "purchase_order_line",
        {
            "purchase_order_line_id": line_id,
            "purchase_order_id": line_po,
            "line_number": line_number,
            "product_id": line_product,
            "ordered_quantity": ordered_qty,
            "unit_cost_cents": unit_cost,
            "extended_cost_cents": ordered_qty.astype(np.int64) * unit_cost,
            "promised_date": promised_date,
            "cancelled_quantity": cancelled_quantity,
        },
        description="Products and quantities ordered on purchase orders.", grain="One line item on a purchase order.",
        primary_key=["purchase_order_line_id"],
        foreign_keys=[_fk("purchase_order_id", "supply.purchase_order"), _fk("product_id", "catalog.product")],
        owner="Procurement", sensitivity="confidential",
    )
    receipt_line = line_id[receipt_line_pos]
    receipt_po_pos = line_po_pos[receipt_line_pos]
    builder.write(
        "supply", "goods_receipt",
        {
            "goods_receipt_id": goods_receipt_id,
            "purchase_order_line_id": receipt_line,
            "warehouse_id": warehouse_id[receipt_po_pos],
            "received_at": receipt_at,
            "received_quantity": receipt_received,
            "rejected_quantity": receipt_rejected,
            "lot_number": np.array([f"LOT-{x % 19000:06d}" for x in goods_receipt_id]),
            "inspection_code": inspection_code,
        },
        description="Warehouse receipts against individual purchase-order lines.", grain="One receipt event for one PO line.",
        primary_key=["goods_receipt_id"],
        foreign_keys=[_fk("purchase_order_line_id", "supply.purchase_order_line"), _fk("warehouse_id", "supply.warehouse")],
        owner="Warehouse Operations", sensitivity="internal", reliability="caution",
        quality_notes=[
            "received_quantity is gross quantity presented; rejected_quantity is the rejected subset.",
            "Some lines arrive in multiple partial receipt events; accepted quantity is received minus rejected.",
        ],
    )

    # Build the physical stock ledger first, then append technical scanner
    # replays linked to their acknowledged original event.
    n_products = len(c["product_id"])
    n_warehouses = len(c["warehouse_id"])
    n_inventory_keys = n_products * n_warehouses
    n_opening = n_inventory_keys
    if n_opening != SUPPLY_OPENING_BALANCE_ROWS:
        raise RuntimeError(
            f"Expected {SUPPLY_OPENING_BALANCE_ROWS:,} warehouse-product opening balances; got {n_opening:,}"
        )
    n_operational = SUPPLY_MOVEMENT_ROWS - SUPPLY_SCANNER_REPLAY_PAIRS - n_opening - n_receipts

    receipt_product_pos = _positions(c, "product_id", line_product[receipt_line_pos]).astype(np.int32)
    receipt_warehouse_pos = po_warehouse_idx[receipt_po_pos].astype(np.int32)
    receipt_key = receipt_warehouse_pos * n_products + receipt_product_pos

    operational_product_pos = rng.integers(0, n_products, n_operational, dtype=np.int32)
    operational_warehouse_pos = rng.integers(0, n_warehouses, n_operational, dtype=np.int32)
    operational_time = random_timestamps(rng, n_operational, "2023-01-02", "2025-12-31T23:59:59")
    operational_type = _enum(
        rng,
        ["ISSUE", "TRANSFER_IN", "TRANSFER_OUT", "ADJUSTMENT", "RETURN"],
        n_operational,
        [0.55, 0.13, 0.13, 0.11, 0.08],
    )

    issue = operational_type == "ISSUE"
    intermittent = issue & (operational_product_pos % 5 == 0)
    day = operational_time.astype("datetime64[D]")
    seconds = operational_time - day.astype("datetime64[s]")
    day_number = (day - np.datetime64("2023-01-01", "D")).astype(np.int32)
    intermittent_remainder = (
        day_number + operational_product_pos * 3
    ) % SUPPLY_INTERMITTENT_CYCLE_DAYS
    shift_forward = np.where(
        intermittent_remainder < SUPPLY_INTERMITTENT_ACTIVE_DAYS,
        0,
        SUPPLY_INTERMITTENT_CYCLE_DAYS - intermittent_remainder,
    )
    shifted_day = day + shift_forward.astype("timedelta64[D]")
    world_end_day = np.datetime64("2025-12-31", "D")
    shift_backward = np.maximum(intermittent_remainder - (SUPPLY_INTERMITTENT_ACTIVE_DAYS - 1), 0)
    shifted_day = np.where(
        shifted_day <= world_end_day,
        shifted_day,
        day - shift_backward.astype("timedelta64[D]"),
    )
    operational_time[intermittent] = (
        shifted_day[intermittent].astype("datetime64[s]") + seconds[intermittent]
    )

    operational_qty = rng.integers(1, 30, n_operational, dtype=np.int32)
    demand_base = (rng.poisson(5.5, n_operational) + 1).astype(np.float64)
    movement_month = operational_time.astype("datetime64[M]").astype(np.int64) % 12 + 1
    winter_seasonal = issue & (operational_product_pos % 5 == 1)
    summer_seasonal = issue & (operational_product_pos % 5 == 2)
    winter_peak = np.isin(movement_month, [11, 12, 1, 2])
    summer_peak = np.isin(movement_month, [6, 7, 8])
    demand_factor = np.ones(n_operational, dtype=np.float64)
    demand_factor[winter_seasonal] = np.where(winter_peak[winter_seasonal], 2.45, 0.82)
    demand_factor[summer_seasonal] = np.where(summer_peak[summer_seasonal], 2.25, 0.86)
    demand_factor[intermittent] = rng.uniform(1.8, 3.8, intermittent.sum())
    operational_qty[issue] = np.maximum(
        1, np.rint(demand_base[issue] * demand_factor[issue]).astype(np.int32)
    )
    operational_sign = np.ones(n_operational, dtype=np.int32)
    operational_sign[np.isin(operational_type, ["ISSUE", "TRANSFER_OUT"])] = -1
    adjustment = operational_type == "ADJUSTMENT"
    operational_sign[adjustment] = rng.choice(np.array([-1, 1], dtype=np.int32), adjustment.sum())
    operational_delta = operational_qty * operational_sign
    operational_key = operational_warehouse_pos * n_products + operational_product_pos

    ordinary_key = np.concatenate((receipt_key, operational_key))
    ordinary_time = np.concatenate((receipt_at, operational_time))
    ordinary_delta = np.concatenate((receipt_accepted, operational_delta)).astype(np.int32)
    ordinary_order = np.lexsort((ordinary_time, ordinary_key))
    sorted_key = ordinary_key[ordinary_order]
    sorted_delta = ordinary_delta[ordinary_order]
    opening_quantity = np.full(n_inventory_keys, 250, dtype=np.int32)
    for key in range(n_inventory_keys):
        left = np.searchsorted(sorted_key, key, side="left")
        right = np.searchsorted(sorted_key, key, side="right")
        if left == right:
            continue
        minimum = int(np.cumsum(sorted_delta[left:right], dtype=np.int64).min())
        opening_quantity[key] = max(250, 50 - minimum)

    opening_key = np.arange(n_inventory_keys, dtype=np.int32)
    opening_warehouse_pos = opening_key // n_products
    opening_product_pos = opening_key % n_products
    physical_warehouse_pos = np.concatenate((opening_warehouse_pos, receipt_warehouse_pos, operational_warehouse_pos))
    physical_product_pos = np.concatenate((opening_product_pos, receipt_product_pos, operational_product_pos))
    physical_time = np.concatenate(
        (
            np.full(n_opening, np.datetime64("2023-01-01T00:00:00", "s")),
            receipt_at,
            operational_time,
        )
    )
    physical_type = np.concatenate(
        (
            np.full(n_opening, "OPENING_BALANCE"),
            np.full(n_receipts, "RECEIPT"),
            operational_type,
        )
    )
    physical_delta = np.concatenate((opening_quantity, receipt_accepted, operational_delta)).astype(np.int32)
    physical_reference_type = np.concatenate(
        (
            np.full(n_opening, "COUNT"),
            np.full(n_receipts, "PO"),
            np.select(
                [
                    operational_type == "ISSUE",
                    np.isin(operational_type, ["TRANSFER_IN", "TRANSFER_OUT"]),
                    operational_type == "ADJUSTMENT",
                    operational_type == "RETURN",
                ],
                ["WORK_ORDER", "TRANSFER", "COUNT", "RETURN"],
                default="COUNT",
            ),
        )
    )
    opening_reference = np.array(
        [
            f"OPEN-{c['warehouse_id'][warehouse]}-{c['product_id'][product]}"
            for warehouse, product in zip(opening_warehouse_pos, opening_product_pos)
        ]
    )
    receipt_reference = np.array([f"GR-{receipt_id:08d}" for receipt_id in goods_receipt_id])
    operational_reference = np.array([f"MOV-{index:09d}" for index in range(1, n_operational + 1)])
    physical_reference = np.concatenate((opening_reference, receipt_reference, operational_reference))
    physical_scanner = np.concatenate(
        (
            np.full(n_opening, "SYSTEM"),
            np.array([f"SCN-{receipt_id % 380:04d}" for receipt_id in goods_receipt_id]),
            np.array([f"SCN-{index % 380:04d}" for index in range(1, n_operational + 1)]),
        )
    )
    physical_goods_receipt_id = np.concatenate(
        (
            np.zeros(n_opening, dtype=np.int64),
            goods_receipt_id,
            np.zeros(n_operational, dtype=np.int64),
        )
    )
    physical_posted_at = physical_time + rng.integers(0, 97, len(physical_time)).astype("timedelta64[h]")
    physical_id = np.arange(1, len(physical_time) + 1, dtype=np.int64)

    november_candidate = np.flatnonzero(
        (physical_time >= np.datetime64("2025-11-01T00:00:00"))
        & (physical_time < np.datetime64("2025-12-01T00:00:00"))
        & (physical_scanner != "SYSTEM")
    )
    if len(november_candidate) < SUPPLY_SCANNER_REPLAY_PAIRS:
        raise RuntimeError("Not enough November scanner events to build replay pairs")
    replay_source = np.sort(
        rng.choice(november_candidate, SUPPLY_SCANNER_REPLAY_PAIRS, replace=False)
    )
    movement_id = np.arange(1, SUPPLY_MOVEMENT_ROWS + 1, dtype=np.int64)
    movement_warehouse_pos = np.concatenate((physical_warehouse_pos, physical_warehouse_pos[replay_source]))
    movement_product_pos = np.concatenate((physical_product_pos, physical_product_pos[replay_source]))
    movement_time = np.concatenate((physical_time, physical_time[replay_source]))
    move_type = np.concatenate((physical_type, physical_type[replay_source]))
    signed_qty = np.concatenate((physical_delta, physical_delta[replay_source]))
    reference_type = np.concatenate((physical_reference_type, physical_reference_type[replay_source]))
    reference_number = np.concatenate((physical_reference, physical_reference[replay_source]))
    scanner_device = np.concatenate((physical_scanner, physical_scanner[replay_source]))
    goods_receipt_link = np.concatenate(
        (physical_goods_receipt_id, physical_goods_receipt_id[replay_source])
    )
    replay_of = np.concatenate(
        (
            np.zeros(len(physical_id), dtype=np.int64),
            physical_id[replay_source],
        )
    )
    scanner_replay = replay_of > 0
    posted_at = np.concatenate(
        (
            physical_posted_at,
            physical_posted_at[replay_source]
            + rng.integers(1, 73, SUPPLY_SCANNER_REPLAY_PAIRS).astype("timedelta64[h]"),
        )
    )
    builder.write(
        "supply", "inventory_movement",
        {
            "inventory_movement_id": movement_id,
            "warehouse_id": c["warehouse_id"][movement_warehouse_pos],
            "product_id": c["product_id"][movement_product_pos],
            "movement_at": movement_time,
            "movement_type_code": move_type,
            "quantity_delta": signed_qty,
            "reference_type_code": reference_type,
            "reference_number": reference_number,
            "scanner_device_code": scanner_device,
            "scanner_replay_flag": scanner_replay,
            "replay_of_inventory_movement_id": nullable(replay_of, replay_of == 0),
            "goods_receipt_id": nullable(goods_receipt_link, goods_receipt_link == 0),
            "posted_at": posted_at,
        },
        description="Signed stock movements from purchasing, field usage, transfers, and adjustments.",
        grain="One posted technical inventory event; replay rows link to the original physical movement.",
        primary_key=["inventory_movement_id"],
        foreign_keys=[
            _fk("warehouse_id", "supply.warehouse"),
            _fk("product_id", "catalog.product"),
            _fk(
                "replay_of_inventory_movement_id",
                "supply.inventory_movement",
                "inventory_movement_id",
                nullable_fk=True,
                warning="Only scanner replay rows populate this self-reference.",
            ),
            _fk("goods_receipt_id", "supply.goods_receipt", nullable_fk=True),
        ],
        owner="Warehouse Operations", reliability="caution",
        quality_notes=[
            "November 2025 scanner replays are exact technical duplicates linked through replay_of_inventory_movement_id.",
            "Exclude scanner_replay_flag rows when reconstructing physical stock; source events remain for auditability.",
            "RECEIPT quantity_delta equals accepted goods quantity, not gross presented quantity.",
        ],
    )

    # Positions are a unique sparse sample, but every sampled on-hand value and
    # trailing demand/receipt measure reconciles to the physical movement ledger.
    position_start = np.datetime64("2024-01-01", "D")
    position_end = np.datetime64("2025-12-31", "D")
    n_position_days = int((position_end - position_start) / np.timedelta64(1, "D")) + 1
    sampled_combo = np.sort(
        rng.choice(n_inventory_keys * n_position_days, SUPPLY_POSITION_ROWS, replace=False)
    )
    position_key = (sampled_combo // n_position_days).astype(np.int32)
    position_day_offset = (sampled_combo % n_position_days).astype(np.int32)
    date = position_start + position_day_offset.astype("timedelta64[D]")
    position_warehouse_pos = position_key // n_products
    position_product_pos = position_key % n_products

    physical_key = physical_warehouse_pos * n_products + physical_product_pos
    physical_day_number = physical_time.astype("datetime64[D]").astype(np.int32)
    position_day_number = date.astype(np.int32)
    on_hand, _ = _grouped_time_sums(
        physical_key,
        physical_day_number,
        physical_delta,
        position_key,
        position_day_number,
    )
    demand_event = physical_type == "ISSUE"
    _, demand_by_window = _grouped_time_sums(
        physical_key[demand_event],
        physical_day_number[demand_event],
        -physical_delta[demand_event],
        position_key,
        position_day_number,
        windows=(7, 14, 30, 60, 90),
    )
    receipt_event = physical_type == "RECEIPT"
    _, receipt_by_window = _grouped_time_sums(
        physical_key[receipt_event],
        physical_day_number[receipt_event],
        physical_delta[receipt_event],
        position_key,
        position_day_number,
        windows=(7, 14, 30, 60, 90),
    )

    line_key = po_warehouse_idx[line_po_pos] * n_products + _positions(c, "product_id", line_product)
    order_event_keys = np.concatenate((line_key, receipt_key))
    order_event_days = np.concatenate(
        (line_order_day.astype(np.int32), receipt_at.astype("datetime64[D]").astype(np.int32))
    )
    order_event_values = np.concatenate((net_ordered_quantity, -receipt_accepted)).astype(np.int64)
    on_order, _ = _grouped_time_sums(
        order_event_keys,
        order_event_days,
        order_event_values,
        position_key,
        position_day_number,
    )
    if np.any(on_hand < 0) or np.any(on_order < 0):
        raise RuntimeError("Reconciled supply position produced a negative balance")

    allocated_quantity = np.floor(on_hand * rng.uniform(0.02, 0.34, SUPPLY_POSITION_ROWS)).astype(np.int32)
    available_quantity = np.maximum(on_hand - allocated_quantity, 0)
    backorder_quantity = np.maximum(demand_by_window[7] - available_quantity, 0).astype(np.int32)
    cols = {
        "inventory_position_daily_id": np.arange(1, SUPPLY_POSITION_ROWS + 1, dtype=np.int64),
        "snapshot_date": date,
        "warehouse_id": c["warehouse_id"][position_warehouse_pos],
        "product_id": c["product_id"][position_product_pos],
        "on_hand_quantity": on_hand.astype(np.int32),
        "allocated_quantity": allocated_quantity,
        "on_order_quantity": on_order.astype(np.int32),
        "backorder_quantity": backorder_quantity,
        "unit_cost_cents": c["product_unit_cost_cents"][position_product_pos],
        "last_count_date": date - rng.integers(0, 120, SUPPLY_POSITION_ROWS).astype("timedelta64[D]"),
    }
    for window in (7, 14, 30, 60, 90):
        demand_units = demand_by_window[window]
        cols[f"demand_units_{window}d"] = demand_units.astype(np.float32)
        cols[f"receipt_units_{window}d"] = receipt_by_window[window].astype(np.float32)
        estimated_shortfall = np.maximum(demand_units - available_quantity, 0)
        cols[f"stockout_hours_{window}d"] = np.minimum(
            estimated_shortfall * 6, 24 * window
        ).astype(np.float32)
    builder.write(
        "supply", "inventory_position_daily", cols,
        description="Sampled daily product/warehouse positions reconciled to physical ledger movements.",
        grain="One sampled product, warehouse, and snapshot-date position.", primary_key=["inventory_position_daily_id"],
        foreign_keys=[_fk("warehouse_id", "supply.warehouse"), _fk("product_id", "catalog.product")],
        owner="Supply Analytics", reliability="caution",
        quality_notes=[
            "The extract is a unique sparse sample, not a complete warehouse-product date spine.",
            "on_hand_quantity and trailing demand/receipt units reconcile exactly after scanner replays are excluded.",
            "stockout_hours fields are operational shortfall estimates rather than a physical ledger identity.",
        ],
    )
    builder.add_anomaly(
        anomaly_id="A12", name="Warehouse scanner retry replay",
        affected_tables=["supply.inventory_movement"], date_range="2025-11-01/2025-11-30",
        mechanism="Offline handhelds replayed acknowledged movements after reconnecting.",
        breadcrumb="scanner_replay_flag and replay_of_inventory_movement_id identify linked technical duplicates.",
        learning_objective="Distinguish technical event identity from physical stock movement identity.",
    )


def _generate_fleet_facts(builder):
    c = builder.context
    rng = rng_for("fleet_facts")
    n_routes = 110_000
    route_id = np.arange(1, n_routes + 1, dtype=np.int64)
    vehicle_id = rng.choice(c["vehicle_id"], n_routes)
    technician_id = rng.choice(c["technician_id"], n_routes)
    route_date = random_dates(rng, n_routes)
    optimizer = route_date >= np.datetime64("2025-05-01")
    builder.write(
        "fleet", "route",
        {
            "route_id": route_id,
            "route_date": route_date,
            "vehicle_id": vehicle_id,
            "technician_employee_id": technician_id,
            "branch_id": rng.choice(c["branch_id"], n_routes),
            "planned_stop_count": rng.integers(1, 11, n_routes, dtype=np.int16),
            "planned_distance_km": rng.gamma(4, 24, n_routes).astype(np.float32),
            "actual_distance_km": rng.gamma(4, 26, n_routes).astype(np.float32),
            "optimizer_version": np.where(optimizer, "ORION-2", "LEGACY-RULES"),
            "route_state_code": _enum(rng, ["COMPLETED", "PARTIAL", "CANCELLED"], n_routes, [0.91, 0.07, 0.02]),
        },
        description="Daily technician vehicle routes before and after dispatch optimization.", grain="One vehicle-technician route on one date.",
        primary_key=["route_id"],
        foreign_keys=[_fk("vehicle_id", "fleet.vehicle"), _fk("technician_employee_id", "workforce.employee", "employee_id"), _fk("branch_id", "core.branch")],
        owner="Field Logistics",
    )
    n_stops = 320_000
    stop_route = rng.choice(route_id, n_stops).astype(np.int64)
    stop_wo = rng.choice(c["work_order_id"], n_stops).astype(np.int64)
    planned = c["work_order_created"][stop_wo - 1] + rng.integers(1, 240, n_stops).astype("timedelta64[h]")
    builder.write(
        "fleet", "route_stop",
        {
            "route_stop_id": np.arange(1, n_stops + 1, dtype=np.int64),
            "route_id": stop_route,
            "work_order_id": stop_wo,
            "stop_sequence": rng.integers(1, 14, n_stops, dtype=np.int16),
            "planned_arrival_at": planned,
            "actual_arrival_at": planned + rng.integers(-60, 180, n_stops).astype("timedelta64[m]"),
            "service_minutes": np.clip(rng.lognormal(3.6, 0.7, n_stops), 5, 600).astype(np.int16),
            "stop_result_code": _enum(rng, ["COMPLETED", "NO_ACCESS", "RESCHEDULED", "CANCELLED"], n_stops, [0.85, 0.06, 0.07, 0.02]),
        },
        description="Planned and actual field-service stops within routes.", grain="One work-order stop on one route.",
        primary_key=["route_stop_id"], foreign_keys=[_fk("route_id", "fleet.route"), _fk("work_order_id", "field_ops.work_order")],
        owner="Field Logistics", reliability="caution",
        quality_notes=["A work order can appear on multiple routes after rescheduling."],
    )
    n_ping = 540_000
    ping_route = rng.choice(route_id, n_ping).astype(np.int64)
    region_id = rng.choice(c["region_id"], n_ping)
    region_pos = _positions(c, "region_id", region_id)
    lat_centers = np.array([42.36, 40.71, 39.95, 33.75, 41.88, 38.91])
    lon_centers = np.array([-71.06, -74.0, -75.17, -84.39, -87.63, -77.04])
    builder.write(
        "fleet", "gps_ping",
        {
            "gps_ping_id": np.arange(1, n_ping + 1, dtype=np.int64),
            "route_id": ping_route,
            "vehicle_id": vehicle_id[ping_route - 1],
            "recorded_at": route_date[ping_route - 1].astype("datetime64[s]") + rng.integers(6, 22, n_ping).astype("timedelta64[h]"),
            "latitude": (lat_centers[region_pos] + rng.normal(0, 0.55, n_ping)).astype(np.float64),
            "longitude": (lon_centers[region_pos] + rng.normal(0, 0.7, n_ping)).astype(np.float64),
            "speed_kph": np.clip(rng.gamma(2, 18, n_ping), 0, 135).astype(np.float32),
            "heading_degrees": rng.integers(0, 360, n_ping, dtype=np.int16),
            "accuracy_meters": rng.lognormal(2.1, 0.8, n_ping).astype(np.float32),
            "ignition_on_flag": rng.random(n_ping) < 0.83,
        },
        description="Synthetic vehicle location telemetry for completed and partial routes.", grain="One GPS device ping.",
        primary_key=["gps_ping_id"], foreign_keys=[_fk("route_id", "fleet.route"), _fk("vehicle_id", "fleet.vehicle")],
        owner="Fleet Operations", sensitivity="restricted",
    )
    n_fuel = 58_000
    builder.write(
        "fleet", "fuel_charge",
        {
            "fuel_charge_id": np.arange(1, n_fuel + 1, dtype=np.int64),
            "vehicle_id": rng.choice(c["vehicle_id"], n_fuel),
            "charged_at": random_timestamps(rng, n_fuel),
            "fuel_type_code": _enum(rng, ["GASOLINE", "DIESEL", "ELECTRIC"], n_fuel, [0.56, 0.22, 0.22]),
            "quantity": rng.gamma(3, 6, n_fuel).astype(np.float32),
            "unit_code": _enum(rng, ["GALLON", "KWH"], n_fuel, [0.78, 0.22]),
            "amount_cents": rng.integers(350, 18_000, n_fuel, dtype=np.int64),
            "merchant_postal_code": np.array([f"{x:05d}" for x in rng.integers(1000, 99999, n_fuel)]),
        },
        description="Fuel and public charging transactions for fleet vehicles.", grain="One card or charging-network transaction.",
        primary_key=["fuel_charge_id"], foreign_keys=[_fk("vehicle_id", "fleet.vehicle")],
        owner="Fleet Operations", sensitivity="confidential",
    )
    n_maint = 11_000
    builder.write(
        "fleet", "maintenance_event",
        {
            "maintenance_event_id": np.arange(1, n_maint + 1, dtype=np.int64),
            "vehicle_id": rng.choice(c["vehicle_id"], n_maint),
            "opened_date": random_dates(rng, n_maint),
            "maintenance_type_code": _enum(rng, ["PREVENTIVE", "REPAIR", "TIRE", "INSPECTION", "RECALL"], n_maint),
            "vendor_id": rng.choice(c["vendor_id"], n_maint),
            "odometer_km": rng.integers(2_000, 290_000, n_maint, dtype=np.int32),
            "downtime_hours": rng.gamma(2, 14, n_maint).astype(np.float32),
            "cost_cents": rng.integers(3_000, 420_000, n_maint, dtype=np.int64),
        },
        description="Preventive and corrective maintenance performed on fleet vehicles.", grain="One vehicle maintenance event.",
        primary_key=["maintenance_event_id"], foreign_keys=[_fk("vehicle_id", "fleet.vehicle"), _fk("vendor_id", "supply.vendor")],
        owner="Fleet Operations", sensitivity="confidential",
    )
    builder.add_anomaly(
        anomaly_id="A10", name="Dispatch optimizer regime change",
        affected_tables=["fleet.route", "fleet.route_stop", "field_ops.appointment"], date_range="2025-05-01/2025-12-31",
        mechanism="A new optimizer altered route density and technician assignment patterns by region.",
        breadcrumb="optimizer_version provides an explicit regime indicator.",
        learning_objective="Avoid treating a policy-induced distribution shift as an employee performance effect.",
    )


def _generate_external(builder):
    c = builder.context
    rng = rng_for("external")
    n_station = 12
    station_id = np.arange(1, n_station + 1, dtype=np.int16)
    station_region = np.tile(c["region_id"], 2)
    lat = np.array([42.36, 40.71, 39.95, 33.75, 41.88, 38.91] * 2) + rng.normal(0, 0.25, n_station)
    lon = np.array([-71.06, -74.0, -75.17, -84.39, -87.63, -77.04] * 2) + rng.normal(0, 0.25, n_station)
    builder.write(
        "external", "weather_station",
        {
            "weather_station_id": station_id,
            "station_code": np.array([f"WX-{x:03d}" for x in station_id]),
            "region_id": station_region,
            "station_name": np.array([f"Meridian reference station {x}" for x in station_id]),
            "latitude": lat,
            "longitude": lon,
            "elevation_meters": rng.integers(2, 440, n_station, dtype=np.int16),
            "provider_code": _enum(rng, ["NOAA_SYNTH", "AIRPORT_SYNTH"], n_station),
        },
        description="Synthetic reference weather stations mapped to operating regions.", grain="One weather station.",
        primary_key=["weather_station_id"], foreign_keys=[_fk("region_id", "core.region")],
        owner="Data Partnerships",
    )
    hours = np.arange(np.datetime64("2023-01-01T00"), np.datetime64("2026-01-01T00"), np.timedelta64(1, "h"))
    n_weather = len(hours) * n_station
    weather_station = np.repeat(station_id, len(hours))
    observed_at = np.tile(hours, n_station).astype("datetime64[s]")
    day_cycle = np.sin((np.arange(n_weather) % 24) / 24 * 2 * np.pi)
    annual_cycle = np.sin((observed_at.astype("datetime64[D]") - np.datetime64("2023-01-01"))
                          .astype(int) / 365.25 * 2 * np.pi)
    region = station_region[weather_station - 1]
    region_pos = _positions(c, "region_id", region)
    temperature = 15 + 10 * annual_cycle + 4 * day_cycle + (region_pos - 2) * 0.8 + rng.normal(0, 3, n_weather)
    storm = (observed_at >= np.datetime64("2025-03-14")) & (observed_at < np.datetime64("2025-03-21")) & np.isin(region, c["region_id"][:3])
    builder.write(
        "external", "weather_hourly",
        {
            "weather_observation_id": np.arange(1, n_weather + 1, dtype=np.int64),
            "weather_station_id": weather_station,
            "observed_at": observed_at,
            "temperature_c": temperature.astype(np.float32),
            "dew_point_c": (temperature - rng.gamma(2, 2, n_weather)).astype(np.float32),
            "relative_humidity_pct": np.clip(rng.normal(62, 22, n_weather), 5, 100).astype(np.float32),
            "precipitation_mm": np.where(storm, rng.gamma(4, 3, n_weather), rng.exponential(0.45, n_weather)).astype(np.float32),
            "snowfall_mm": np.where(storm, rng.gamma(5, 5, n_weather), 0).astype(np.float32),
            "wind_speed_kph": np.where(storm, rng.normal(48, 15, n_weather), rng.gamma(2, 6, n_weather)).clip(0).astype(np.float32),
            "wind_gust_kph": np.where(storm, rng.normal(78, 19, n_weather), rng.gamma(2.4, 8, n_weather)).clip(0).astype(np.float32),
            "pressure_hpa": rng.normal(1013, 12, n_weather).astype(np.float32),
            "visibility_km": np.where(storm, rng.uniform(0.1, 3, n_weather), rng.uniform(5, 30, n_weather)).astype(np.float32),
            "condition_code": np.where(storm, "SEVERE_WINTER", _enum(rng, ["CLEAR", "CLOUD", "RAIN", "SNOW", "FOG"], n_weather)),
            "quality_flag": _enum(rng, ["OBSERVED", "ESTIMATED", "SUSPECT"], n_weather, [0.96, 0.035, 0.005]),
        },
        description="Hourly weather observations covering all company operating regions.", grain="One station-hour observation.",
        primary_key=["weather_observation_id"], foreign_keys=[_fk("weather_station_id", "external.weather_station")],
        owner="Data Partnerships", reliability="verified",
    )
    n_traffic = 380_000
    traffic_at = random_timestamps(rng, n_traffic)
    builder.write(
        "external", "traffic_area_hourly",
        {
            "traffic_area_hourly_id": np.arange(1, n_traffic + 1, dtype=np.int64),
            "service_area_id": rng.choice(c["service_area_id"], n_traffic),
            "observed_hour": traffic_at.astype("datetime64[h]").astype("datetime64[s]"),
            "congestion_index": np.clip(rng.normal(1.25, 0.48, n_traffic), 0.35, 4.5).astype(np.float32),
            "average_speed_kph": np.clip(rng.normal(44, 16, n_traffic), 3, 105).astype(np.float32),
            "incident_count": rng.poisson(0.16, n_traffic).astype(np.int16),
            "provider_coverage_pct": np.clip(rng.beta(10, 2, n_traffic) * 100, 0, 100).astype(np.float32),
            "revision_number": rng.choice([1, 1, 1, 1, 2], n_traffic).astype(np.int16),
        },
        description="Sampled service-area traffic conditions from a licensed provider.", grain="One provider revision for a sampled service-area hour.",
        primary_key=["traffic_area_hourly_id"], foreign_keys=[_fk("service_area_id", "core.service_area")],
        owner="Data Partnerships", reliability="caution",
        quality_notes=["Some area-hours have a revised second observation; choose a revision policy before aggregation."],
    )
    n_holiday = 540
    holiday_date = random_dates(rng, n_holiday)
    builder.write(
        "external", "holiday_calendar",
        {
            "holiday_calendar_id": np.arange(1, n_holiday + 1, dtype=np.int32),
            "region_id": rng.choice(c["region_id"], n_holiday),
            "holiday_date": holiday_date,
            "holiday_name": _enum(rng, ["Federal holiday", "State holiday", "School break", "Local event", "Company closure"], n_holiday),
            "holiday_scope_code": _enum(rng, ["FEDERAL", "STATE", "LOCAL", "COMPANY"], n_holiday),
            "expected_service_impact_code": _enum(rng, ["NONE", "LOW", "MODERATE", "HIGH"], n_holiday),
        },
        description="Regional holidays, closures, and major local events.", grain="One dated calendar event in one region.",
        primary_key=["holiday_calendar_id"], foreign_keys=[_fk("region_id", "core.region")], owner="Workforce Planning",
    )
    energy_dates = np.arange(np.datetime64("2023-01-01"), np.datetime64("2026-01-01"), np.timedelta64(1, "D"))
    n_energy = len(energy_dates) * len(c["region_id"]) * 3
    energy_region = np.repeat(c["region_id"], len(energy_dates) * 3)
    energy_date = np.tile(np.repeat(energy_dates, 3), len(c["region_id"]))
    utility_type = np.tile(["ELECTRIC", "NATURAL_GAS", "HEATING_OIL"], len(energy_dates) * len(c["region_id"]))
    builder.write(
        "external", "energy_price_daily",
        {
            "energy_price_daily_id": np.arange(1, n_energy + 1, dtype=np.int64),
            "region_id": energy_region,
            "price_date": energy_date,
            "utility_type_code": utility_type,
            "unit_price": rng.lognormal(-1.3, 0.45, n_energy).astype(np.float32),
            "unit_code": np.where(utility_type == "ELECTRIC", "KWH", np.where(utility_type == "NATURAL_GAS", "THERM", "GALLON")),
            "source_revision": rng.integers(1, 4, n_energy, dtype=np.int16),
        },
        description="Daily synthetic residential energy prices by region and utility type.", grain="One region, date, and utility-type price.",
        primary_key=["energy_price_daily_id"], foreign_keys=[_fk("region_id", "core.region")], owner="Market Intelligence",
    )
    demo_rows = len(c["postal_area_id"]) * 3
    demo_postal = np.repeat(c["postal_area_id"], 3)
    demo_year = np.tile([2023, 2024, 2025], len(c["postal_area_id"])).astype(np.int16)
    builder.write(
        "external", "postal_demographic_annual",
        {
            "postal_demographic_annual_id": np.arange(1, demo_rows + 1, dtype=np.int32),
            "postal_area_id": demo_postal,
            "calendar_year": demo_year,
            "population_estimate": rng.integers(900, 85_000, demo_rows, dtype=np.int32),
            "household_count": rng.integers(350, 35_000, demo_rows, dtype=np.int32),
            "median_household_income": rng.integers(28_000, 190_000, demo_rows, dtype=np.int32),
            "owner_occupied_pct": rng.uniform(20, 94, demo_rows).astype(np.float32),
            "median_home_age_years": rng.uniform(4, 95, demo_rows).astype(np.float32),
            "broadband_access_pct": rng.uniform(55, 99.5, demo_rows).astype(np.float32),
            "estimate_margin_pct": rng.uniform(1, 18, demo_rows).astype(np.float32),
        },
        description="Annual modeled demographic estimates at synthetic postal-area level.", grain="One postal area and calendar year estimate.",
        primary_key=["postal_demographic_annual_id"], foreign_keys=[_fk("postal_area_id", "core.postal_area")],
        owner="Market Intelligence", reliability="caution",
        quality_notes=["Modeled estimates contain sampling uncertainty and must not be interpreted as household-level facts."],
    )
    builder.add_anomaly(
        anomaly_id="A07", name="March 2025 winter storm",
        affected_tables=["external.weather_hourly", "iot.sensor_reading", "field_ops.work_order", "fleet.route"],
        date_range="2025-03-14/2025-03-20", mechanism="Severe weather affected Northeast operations, telemetry, demand, and travel simultaneously.",
        breadcrumb="condition_code='SEVERE_WINTER' in stations mapped to regions 1-3.",
        learning_objective="Separate a shared external cause from a product, employee, or model effect.",
    )
