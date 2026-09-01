from __future__ import annotations

from datetime import datetime
from typing import Any

import numpy as np
import pyarrow as pa

from builder import WorldBuilder, codes, random_dates, random_timestamps, rng_for
from config import SCALE, WORLD_END, WORLD_START


def _fk(
    columns: list[str],
    references: str,
    referenced_columns: list[str] | None = None,
    *,
    nullable: bool = False,
    temporal_condition: str | None = None,
    warning: str | None = None,
) -> dict[str, Any]:
    record: dict[str, Any] = {
        "columns": columns,
        "references": references,
        "referenced_columns": referenced_columns or columns,
        "cardinality": "many-to-one",
        "nullable": nullable,
    }
    if temporal_condition:
        record["temporal_condition"] = temporal_condition
    if warning:
        record["warning"] = warning
    return record


def _nullable_strings(values: np.ndarray, missing: np.ndarray) -> pa.Array:
    return pa.array(values.astype(object), mask=missing)


def _nullable_dates(values: np.ndarray, missing: np.ndarray) -> pa.Array:
    return pa.array(values.astype("datetime64[D]"), mask=missing)


def _bounded_dates(
    rng: np.random.Generator,
    earliest: np.ndarray,
    *,
    end: str = "2025-12-31",
) -> np.ndarray:
    sampled = random_dates(rng, len(earliest), "2023-01-01", end)
    return np.maximum(sampled, earliest.astype("datetime64[D]"))


def generate_foundation(builder: WorldBuilder) -> None:
    """Generate Meridian's shared dimensions and master data.

    The arrays placed in ``builder.context`` are deliberately aligned: for
    example, ``context["account_customer"][i]`` is the primary customer for
    ``context["account_id"][i]``. Downstream generators can therefore sample
    integer positions without rebuilding lookup dictionaries.
    """

    # ------------------------------------------------------------------ core
    region_id = codes("REG", SCALE["regions"], 3)
    region_names = np.array(
        [
            "North Coast",
            "Great Lakes",
            "Mid-Atlantic",
            "Sunbelt",
            "Mountain",
            "Pacific",
        ][: len(region_id)],
        dtype=object,
    )
    region_tz = np.array(
        [
            "America/New_York",
            "America/Chicago",
            "America/New_York",
            "America/Chicago",
            "America/Denver",
            "America/Los_Angeles",
        ][: len(region_id)],
        dtype=object,
    )
    region_centers = np.array(
        [
            (42.8, -71.7),
            (42.2, -87.5),
            (39.2, -76.8),
            (32.8, -84.0),
            (39.2, -105.2),
            (37.9, -121.5),
        ][: len(region_id)],
        dtype=float,
    )
    builder.write(
        "core",
        "region",
        {
            "region_id": region_id,
            "region_name": region_names,
            "timezone_name": region_tz,
            "market_code": np.array([f"MKT-{i + 1:02d}" for i in range(len(region_id))]),
            "active_from": np.full(len(region_id), np.datetime64("2018-01-01", "D")),
            "active_to": pa.nulls(len(region_id), type=pa.date32()),
        },
        description="Stable corporate sales and service regions.",
        grain="One row per corporate region.",
        primary_key=["region_id"],
        owner="Enterprise Data Governance",
        use_when="Use for stable regional reporting and timezone assignment.",
    )

    n_branches = SCALE["branches"]
    branch_id = codes("BR", n_branches, 4)
    branch_region_idx = np.arange(n_branches) % len(region_id)
    rng = rng_for("foundation.core.branch")
    rng.shuffle(branch_region_idx)
    branch_region = region_id[branch_region_idx]
    branch_opened = random_dates(rng, n_branches, "2016-01-01", "2022-12-15")
    branch_lat = region_centers[branch_region_idx, 0] + rng.normal(0, 1.0, n_branches)
    branch_lon = region_centers[branch_region_idx, 1] + rng.normal(0, 1.3, n_branches)
    builder.write(
        "core",
        "branch",
        {
            "branch_id": branch_id,
            "branch_name": np.array(
                [f"{region_names[branch_region_idx[i]]} Service Branch {i + 1:02d}" for i in range(n_branches)]
            ),
            "region_id": branch_region,
            "opened_date": branch_opened,
            "branch_type": rng.choice(
                np.array(["full_service", "field_only", "sales_and_service"]),
                n_branches,
                p=[0.62, 0.21, 0.17],
            ),
            "timezone_name": region_tz[branch_region_idx],
            "latitude": np.round(branch_lat, 5),
            "longitude": np.round(branch_lon, 5),
            "is_active": np.ones(n_branches, dtype=bool),
        },
        description="Current branch master used by sales, service, fleet, and workforce systems.",
        grain="One row per operating branch.",
        primary_key=["branch_id"],
        foreign_keys=[_fk(["region_id"], "core.region")],
        owner="Enterprise Data Governance",
        use_when="Use as the canonical branch-to-region mapping.",
    )

    n_areas = SCALE["service_areas"]
    service_area_id = codes("SA", n_areas, 4)
    rng = rng_for("foundation.core.service_area")
    service_area_branch_idx = np.arange(n_areas) % n_branches
    rng.shuffle(service_area_branch_idx)
    service_area_branch = branch_id[service_area_branch_idx]
    service_area_region = branch_region[service_area_branch_idx]
    builder.write(
        "core",
        "service_area",
        {
            "service_area_id": service_area_id,
            "service_area_name": np.array([f"Service Territory {i + 1:03d}" for i in range(n_areas)]),
            "default_branch_id": service_area_branch,
            "region_id": service_area_region,
            "dispatch_zone": np.array([f"DZ-{i % 24 + 1:02d}" for i in range(n_areas)]),
            "urbanicity": rng.choice(
                np.array(["urban", "suburban", "rural"]), n_areas, p=[0.32, 0.49, 0.19]
            ),
            "effective_from": np.full(n_areas, np.datetime64("2019-01-01", "D")),
            "effective_to": pa.nulls(n_areas, type=pa.date32()),
        },
        description="Dispatch and market territories, each with a default servicing branch.",
        grain="One row per current service territory.",
        primary_key=["service_area_id"],
        foreign_keys=[
            _fk(["default_branch_id"], "core.branch", ["branch_id"]),
            _fk(["region_id"], "core.region"),
        ],
        owner="Field Operations Planning",
    )

    n_postal = SCALE["postal_areas"]
    postal_area_id = codes("PA", n_postal, 5)
    rng = rng_for("foundation.core.postal_area")
    postal_service_area_idx = np.arange(n_postal) % n_areas
    rng.shuffle(postal_service_area_idx)
    postal_service_area = service_area_id[postal_service_area_idx]
    postal_branch = service_area_branch[postal_service_area_idx]
    postal_region = service_area_region[postal_service_area_idx]
    branch_idx_by_id = {value: i for i, value in enumerate(branch_id)}
    postal_branch_idx = np.array([branch_idx_by_id[x] for x in postal_branch], dtype=np.int32)
    postal_lat = branch_lat[postal_branch_idx] + rng.normal(0, 0.32, n_postal)
    postal_lon = branch_lon[postal_branch_idx] + rng.normal(0, 0.42, n_postal)
    builder.write(
        "core",
        "postal_area",
        {
            "postal_area_id": postal_area_id,
            "postal_code": np.array([f"M{i + 10000:05d}" for i in range(n_postal)]),
            "service_area_id": postal_service_area,
            "region_id": postal_region,
            "municipality_name": np.array([f"Meridian Municipality {i % 210 + 1:03d}" for i in range(n_postal)]),
            "state_code": np.array([f"S{branch_region_idx[postal_branch_idx[i]] + 1}" for i in range(n_postal)]),
            "latitude": np.round(postal_lat, 5),
            "longitude": np.round(postal_lon, 5),
        },
        description="Synthetic postal geographies mapped to service territories.",
        grain="One row per postal area.",
        primary_key=["postal_area_id"],
        foreign_keys=[
            _fk(["service_area_id"], "core.service_area"),
            _fk(["region_id"], "core.region"),
        ],
        owner="Enterprise Data Governance",
        sensitivity="internal",
    )

    n_org = SCALE["org_units"]
    org_unit_id = codes("OU", n_org, 4)
    rng = rng_for("foundation.core.org_unit")
    corporate_units = min(18, n_org)
    org_branch_missing = np.arange(n_org) < corporate_units
    org_branch = np.empty(n_org, dtype=object)
    org_branch[:] = None
    if n_org > corporate_units:
        org_branch[corporate_units:] = branch_id[np.arange(n_org - corporate_units) % n_branches]
    parent_values = np.empty(n_org, dtype=object)
    parent_values[:] = None
    for i in range(6, corporate_units):
        parent_values[i] = org_unit_id[i % 6]
    for i in range(corporate_units, n_org):
        parent_values[i] = org_unit_id[6 + (i % max(1, corporate_units - 6))]
    function_names = np.array(
        [
            "Executive",
            "Finance",
            "Customer Experience",
            "Field Operations",
            "Commerce",
            "Data and Technology",
            "People",
            "Supply Chain",
            "Fleet",
            "Risk and Compliance",
        ]
    )
    builder.write(
        "core",
        "org_unit",
        {
            "org_unit_id": org_unit_id,
            "org_unit_name": np.array([f"{function_names[i % len(function_names)]} Unit {i + 1:02d}" for i in range(n_org)]),
            "function_name": function_names[np.arange(n_org) % len(function_names)],
            "parent_org_unit_id": pa.array(parent_values),
            "branch_id": pa.array(org_branch),
            "cost_center_code": np.array([f"CC-{1000 + i}" for i in range(n_org)]),
            "active_from": random_dates(rng, n_org, "2017-01-01", "2022-12-31"),
            "active_to": pa.nulls(n_org, type=pa.date32()),
        },
        description="Department and team hierarchy used for ownership and workforce assignment.",
        grain="One row per current organizational unit.",
        primary_key=["org_unit_id"],
        foreign_keys=[
            _fk(["parent_org_unit_id"], "core.org_unit", nullable=True),
            _fk(["branch_id"], "core.branch", nullable=True),
        ],
        owner="People Operations",
    )

    start_day = np.datetime64(WORLD_START[:10], "D")
    end_day = np.datetime64(WORLD_END[:10], "D")
    calendar_date = np.arange(start_day, end_day + np.timedelta64(1, "D"), dtype="datetime64[D]")
    date_objects = [datetime.strptime(str(day), "%Y-%m-%d") for day in calendar_date]
    builder.write(
        "core",
        "business_calendar",
        {
            "calendar_date": calendar_date,
            "calendar_year": np.array([x.year for x in date_objects], dtype=np.int16),
            "calendar_quarter": np.array([(x.month - 1) // 3 + 1 for x in date_objects], dtype=np.int8),
            "calendar_month": np.array([x.month for x in date_objects], dtype=np.int8),
            "month_name": np.array([x.strftime("%B") for x in date_objects]),
            "day_of_week": np.array([x.weekday() + 1 for x in date_objects], dtype=np.int8),
            "day_name": np.array([x.strftime("%A") for x in date_objects]),
            "is_weekend": np.array([x.weekday() >= 5 for x in date_objects]),
            "is_month_end": np.array(
                [i == len(calendar_date) - 1 or date_objects[i + 1].month != x.month for i, x in enumerate(date_objects)]
            ),
            "fiscal_year": np.array([x.year if x.month >= 4 else x.year - 1 for x in date_objects], dtype=np.int16),
            "fiscal_period": np.array([(x.month - 4) % 12 + 1 for x in date_objects], dtype=np.int8),
        },
        description="Canonical daily calendar with calendar and April-start fiscal attributes.",
        grain="One row per calendar date in the generated world.",
        primary_key=["calendar_date"],
        owner="Finance Data Management",
    )

    n_world_events = 180
    world_event_id = codes("WE", n_world_events, 5)
    rng = rng_for("foundation.core.world_event")
    event_started = np.sort(random_timestamps(rng, n_world_events, WORLD_START, WORLD_END))
    duration_hours = rng.choice(
        np.array([4, 8, 24, 72, 168, 336, 720]), n_world_events, p=[0.05, 0.08, 0.24, 0.2, 0.2, 0.13, 0.1]
    )
    event_ended = np.minimum(
        event_started + duration_hours.astype("timedelta64[h]"), np.datetime64(WORLD_END, "s")
    )
    event_scope = rng.choice(np.array(["global", "region", "branch"]), n_world_events, p=[0.14, 0.36, 0.5])
    event_branch_idx = rng.integers(0, n_branches, n_world_events)
    event_region = branch_region[event_branch_idx].astype(object)
    event_branch = branch_id[event_branch_idx].astype(object)
    event_region[event_scope == "global"] = None
    event_branch[event_scope != "branch"] = None
    event_types = np.array(
        [
            "severe_weather",
            "product_launch",
            "vendor_disruption",
            "promotion",
            "billing_migration",
            "mobile_release",
            "staffing_shortage",
            "policy_change",
            "firmware_issue",
            "data_pipeline_incident",
        ]
    )
    event_type = rng.choice(event_types, n_world_events)
    builder.write(
        "core",
        "world_event",
        {
            "world_event_id": world_event_id,
            "event_type": event_type,
            "event_name": np.array([f"{event_type[i].replace('_', ' ').title()} {i + 1:03d}" for i in range(n_world_events)]),
            "scope": event_scope,
            "region_id": pa.array(event_region),
            "branch_id": pa.array(event_branch),
            "started_at": event_started,
            "ended_at": event_ended,
            "severity": rng.choice(np.array(["low", "medium", "high", "critical"]), n_world_events, p=[0.25, 0.45, 0.24, 0.06]),
            "public_summary": np.array([f"Canonical world-state event affecting {event_scope[i]} operations." for i in range(n_world_events)]),
        },
        description="Canonical business and technical events that create coherent cross-domain effects.",
        grain="One row per world-state event.",
        primary_key=["world_event_id"],
        foreign_keys=[
            _fk(["region_id"], "core.region", nullable=True),
            _fk(["branch_id"], "core.branch", nullable=True),
        ],
        owner="Enterprise Data Governance",
        use_when="Use to explain known disruptions and policy changes across domains.",
        do_not_use_when="Do not assume every downstream anomaly is linked to a registered world event.",
    )

    # --------------------------------------------------------------- catalog
    n_categories = 55
    category_id = codes("CAT", n_categories, 3)
    category_names = np.array(
        [
            "Climate Systems",
            "Water Systems",
            "Air Quality",
            "Electrical",
            "Home Monitoring",
            "Installation Supplies",
            "Replacement Parts",
            "Filters and Consumables",
            "Safety Equipment",
            "Accessories",
        ]
        + [f"Specialty Category {i:02d}" for i in range(1, n_categories - 9)]
    )[:n_categories]
    category_parent = np.empty(n_categories, dtype=object)
    category_parent[:] = None
    if n_categories > 10:
        category_parent[10:] = category_id[np.arange(n_categories - 10) % 10]
    builder.write(
        "catalog",
        "product_category",
        {
            "category_id": category_id,
            "category_name": category_names,
            "parent_category_id": pa.array(category_parent),
            "category_level": np.where(np.arange(n_categories) < 10, 1, 2).astype(np.int8),
            "is_serviceable": np.array([(i % 5) != 3 for i in range(n_categories)]),
        },
        description="Two-level product and part hierarchy.",
        grain="One row per product category.",
        primary_key=["category_id"],
        foreign_keys=[_fk(["parent_category_id"], "catalog.product_category", nullable=True)],
        owner="Merchandising Data",
    )

    n_products = SCALE["products"]
    product_id = codes("PRD", n_products, 5)
    rng = rng_for("foundation.catalog.product")
    leaf_categories = category_id[min(10, n_categories) :]
    if len(leaf_categories) == 0:
        leaf_categories = category_id
    product_category = rng.choice(leaf_categories, n_products)
    product_type = rng.choice(
        np.array(["equipment", "replacement_part", "consumable", "accessory"]),
        n_products,
        p=[0.24, 0.34, 0.28, 0.14],
    )
    product_cost = rng.integers(450, 85_000, n_products, dtype=np.int64)
    margin_multiplier = rng.uniform(1.22, 2.4, n_products)
    product_price = np.maximum(product_cost + 100, np.round(product_cost * margin_multiplier).astype(np.int64))
    product_active_from = random_dates(rng, n_products, "2018-01-01", "2025-06-30")
    product_retired = rng.random(n_products) < 0.08
    product_active_to = random_dates(rng, n_products, "2024-01-01", "2025-12-31")
    product_active_to = np.maximum(product_active_to, product_active_from + np.timedelta64(30, "D"))
    builder.write(
        "catalog",
        "product",
        {
            "product_id": product_id,
            "sku": np.array([f"MLS-{i + 100000:06d}" for i in range(n_products)]),
            "product_name": np.array([f"Meridian {product_type[i].replace('_', ' ').title()} {i + 1:04d}" for i in range(n_products)]),
            "category_id": product_category,
            "product_type": product_type,
            "brand_name": rng.choice(np.array(["Meridian", "Cirrus", "Hearthline", "Northstar", "Third Party"]), n_products),
            "unit_cost_cents": product_cost,
            "current_list_price_cents": product_price,
            "warranty_months": rng.choice(np.array([0, 6, 12, 24, 36, 60]), n_products, p=[0.12, 0.08, 0.3, 0.25, 0.17, 0.08]),
            "is_connected_capable": (product_type == "equipment") & (rng.random(n_products) < 0.58),
            "active_from": product_active_from,
            "active_to": _nullable_dates(product_active_to, ~product_retired),
            "lifecycle_status": np.where(product_retired, "retired", "active"),
        },
        description="Canonical product, equipment, part, consumable, and accessory master.",
        grain="One row per product/SKU.",
        primary_key=["product_id"],
        foreign_keys=[_fk(["category_id"], "catalog.product_category")],
        owner="Merchandising Data",
    )

    n_plans = 18
    service_plan_id = codes("PLAN", n_plans, 3)
    plan_tiers = np.array(["basic", "standard", "premium"])[np.arange(n_plans) % 3]
    plan_base_price = np.array([1_999, 3_999, 6_999])[np.arange(n_plans) % 3] + (np.arange(n_plans) // 3) * 250
    builder.write(
        "catalog",
        "service_plan",
        {
            "service_plan_id": service_plan_id,
            "plan_name": np.array([f"{plan_tiers[i].title()} Care Plan {i + 1:02d}" for i in range(n_plans)]),
            "plan_tier": plan_tiers,
            "covered_category_id": category_id[np.arange(n_plans) % min(10, n_categories)],
            "included_visits_per_year": np.array([1, 2, 4])[np.arange(n_plans) % 3].astype(np.int8),
            "priority_service": plan_tiers == "premium",
            "current_monthly_price_cents": plan_base_price.astype(np.int64),
            "active_from": np.full(n_plans, np.datetime64("2020-01-01", "D")),
            "active_to": pa.nulls(n_plans, type=pa.date32()),
        },
        description="Current subscription and service-plan definitions.",
        grain="One row per service plan.",
        primary_key=["service_plan_id"],
        foreign_keys=[_fk(["covered_category_id"], "catalog.product_category", ["category_id"])],
        owner="Subscription Product Management",
    )

    price_period_starts = np.array(["2023-01-01", "2024-01-01", "2025-01-01"], dtype="datetime64[D]")
    channels = np.array(["web", "branch"])
    n_price_rows = n_products * len(price_period_starts) * len(channels)
    price_product_idx = np.repeat(np.arange(n_products), len(price_period_starts) * len(channels))
    price_period_idx = np.tile(np.repeat(np.arange(len(price_period_starts)), len(channels)), n_products)
    price_channel = np.tile(channels, n_products * len(price_period_starts))
    rng = rng_for("foundation.catalog.product_price_history")
    historical_factor = np.array([0.91, 0.96, 1.0])[price_period_idx]
    channel_factor = np.where(price_channel == "web", 0.985, 1.0)
    effective_price = np.round(product_price[price_product_idx] * historical_factor * channel_factor).astype(np.int64)
    price_ends = np.array(["2023-12-31", "2024-12-31", "2025-12-31"], dtype="datetime64[D]")[price_period_idx]
    builder.write(
        "catalog",
        "product_price_history",
        {
            "product_price_id": codes("PP", n_price_rows, 7),
            "product_id": product_id[price_product_idx],
            "channel_code": price_channel,
            "effective_from": price_period_starts[price_period_idx],
            "effective_to": price_ends,
            "list_price_cents": effective_price,
            "minimum_price_cents": np.round(effective_price * rng.uniform(0.72, 0.9, n_price_rows)).astype(np.int64),
            "currency_code": np.full(n_price_rows, "USD"),
        },
        description="Channel-specific product list-price history.",
        grain="One row per product, channel, and effective price period.",
        primary_key=["product_price_id"],
        foreign_keys=[_fk(["product_id"], "catalog.product")],
        owner="Pricing Operations",
        use_when="Use for point-in-time price reconstruction rather than current product price.",
    )

    n_plan_prices = n_plans * len(price_period_starts)
    plan_price_plan_idx = np.repeat(np.arange(n_plans), len(price_period_starts))
    plan_price_period_idx = np.tile(np.arange(len(price_period_starts)), n_plans)
    builder.write(
        "catalog",
        "plan_price_history",
        {
            "plan_price_id": codes("PLP", n_plan_prices, 5),
            "service_plan_id": service_plan_id[plan_price_plan_idx],
            "effective_from": price_period_starts[plan_price_period_idx],
            "effective_to": np.array(["2023-12-31", "2024-12-31", "2025-12-31"], dtype="datetime64[D]")[plan_price_period_idx],
            "monthly_price_cents": np.round(
                plan_base_price[plan_price_plan_idx] * np.array([0.9, 0.95, 1.0])[plan_price_period_idx]
            ).astype(np.int64),
            "currency_code": np.full(n_plan_prices, "USD"),
        },
        description="Point-in-time monthly subscription pricing.",
        grain="One row per service plan and annual price period.",
        primary_key=["plan_price_id"],
        foreign_keys=[_fk(["service_plan_id"], "catalog.service_plan")],
        owner="Subscription Product Management",
    )

    rng = rng_for("foundation.catalog.product_substitution")
    substitution_rows = n_products * 2
    requested_idx = np.repeat(np.arange(n_products), 2)
    category_to_indices = {
        category: np.flatnonzero(product_category == category) for category in np.unique(product_category)
    }
    substitute_idx = np.empty(substitution_rows, dtype=np.int32)
    for i, product_pos in enumerate(requested_idx):
        candidates = category_to_indices[product_category[product_pos]]
        choice = int(rng.choice(candidates))
        if choice == product_pos and len(candidates) > 1:
            choice = int(candidates[(np.flatnonzero(candidates == choice)[0] + 1) % len(candidates)])
        substitute_idx[i] = choice
    builder.write(
        "catalog",
        "product_substitution",
        {
            "substitution_id": codes("SUB", substitution_rows, 6),
            "requested_product_id": product_id[requested_idx],
            "substitute_product_id": product_id[substitute_idx],
            "substitution_rank": np.tile(np.array([1, 2], dtype=np.int8), n_products),
            "approved_from": np.full(substitution_rows, np.datetime64("2023-01-01", "D")),
            "approved_to": pa.nulls(substitution_rows, type=pa.date32()),
            "requires_customer_approval": rng.random(substitution_rows) < 0.24,
        },
        description="Approved alternatives used during inventory shortages.",
        grain="One ranked substitute product for a requested product.",
        primary_key=["substitution_id"],
        foreign_keys=[
            _fk(["requested_product_id"], "catalog.product", ["product_id"]),
            _fk(["substitute_product_id"], "catalog.product", ["product_id"]),
        ],
        owner="Supply Chain Planning",
    )

    # -------------------------------------------------------------------- crm
    n_customers = SCALE["customers"]
    customer_id = codes("CUS", n_customers, 7)
    rng = rng_for("foundation.crm.customer")
    customer_type = rng.choice(np.array(["person", "small_business"]), n_customers, p=[0.94, 0.06])
    customer_created = random_dates(rng, n_customers, "2018-01-01", "2025-11-30")
    first_names = np.array(["Alex", "Avery", "Cameron", "Casey", "Devon", "Emery", "Jordan", "Morgan", "Quinn", "Riley", "Taylor", "Skyler"])
    last_names = np.array(["Adams", "Bennett", "Chen", "Diaz", "Ellis", "Foster", "Gupta", "Howard", "Ibrahim", "Jones", "Kim", "Lopez", "Martin", "Nguyen", "Owens", "Patel"])
    first_choice = rng.choice(first_names, n_customers)
    last_choice = rng.choice(last_names, n_customers)
    display_name = np.where(
        customer_type == "person",
        np.char.add(np.char.add(first_choice, " "), last_choice),
        np.array([f"Synthetic Business {i + 1:05d}" for i in range(n_customers)]),
    )
    customer_home_region = rng.choice(region_id, n_customers)
    builder.write(
        "crm",
        "customer",
        {
            "customer_id": customer_id,
            "customer_number": np.array([f"C-{i + 1000000}" for i in range(n_customers)]),
            "customer_type": customer_type,
            "display_name": display_name,
            "created_date": customer_created,
            "home_region_id": customer_home_region,
            "preferred_language": rng.choice(np.array(["en", "es", "fr", "zh", "other"]), n_customers, p=[0.83, 0.09, 0.025, 0.02, 0.035]),
            "preferred_contact_channel": rng.choice(np.array(["email", "sms", "phone", "mail"]), n_customers, p=[0.55, 0.23, 0.17, 0.05]),
            "source_system_code": rng.choice(np.array(["CRM_MAIN", "CRM_LEGACY_A", "CRM_LEGACY_B"]), n_customers, p=[0.75, 0.16, 0.09]),
            "do_not_contact": rng.random(n_customers) < 0.035,
        },
        description="Canonical synthetic customer-party master; names and contact attributes are fabricated.",
        grain="One row per known person or small-business party.",
        primary_key=["customer_id"],
        foreign_keys=[_fk(["home_region_id"], "core.region", ["region_id"])],
        owner="Customer Data Office",
        sensitivity="restricted-synthetic-pii",
        quality_notes=["All identities are synthetic; display names intentionally repeat."],
    )

    n_accounts = SCALE["accounts"]
    account_id = codes("ACC", n_accounts, 7)
    rng = rng_for("foundation.crm.account")
    account_customer_idx = np.arange(n_accounts) % n_customers
    rng.shuffle(account_customer_idx)
    account_customer = customer_id[account_customer_idx]
    account_created = np.maximum(
        random_dates(rng, n_accounts, "2019-01-01", "2025-11-30"), customer_created[account_customer_idx]
    )
    account_branch_idx = rng.integers(0, n_branches, n_accounts)
    account_branch = branch_id[account_branch_idx]
    account_status = rng.choice(
        np.array(["active", "paused", "closed", "collections"]),
        n_accounts,
        p=[0.82, 0.07, 0.08, 0.03],
    )
    builder.write(
        "crm",
        "account",
        {
            "account_id": account_id,
            "account_number": np.array([f"A-{i + 2000000}" for i in range(n_accounts)]),
            "primary_customer_id": account_customer,
            "home_branch_id": account_branch,
            "opened_date": account_created,
            "account_type": rng.choice(np.array(["residential", "small_business", "property_manager"]), n_accounts, p=[0.86, 0.1, 0.04]),
            "current_status": account_status,
            "lifecycle_segment": rng.choice(np.array(["new", "established", "at_risk", "high_value", "dormant"]), n_accounts, p=[0.12, 0.48, 0.14, 0.11, 0.15]),
            "acquisition_channel": rng.choice(np.array(["organic", "branch", "paid_search", "referral", "acquisition_migration"]), n_accounts, p=[0.29, 0.2, 0.19, 0.13, 0.19]),
            "paperless_billing": rng.random(n_accounts) < 0.78,
        },
        description="Commercial relationship master; several customers can belong to one account.",
        grain="One row per customer account.",
        primary_key=["account_id"],
        foreign_keys=[
            _fk(["primary_customer_id"], "crm.customer", ["customer_id"]),
            _fk(["home_branch_id"], "core.branch", ["branch_id"]),
        ],
        owner="Customer Data Office",
        sensitivity="confidential",
    )

    rng = rng_for("foundation.crm.account_member")
    n_secondary_members = int(round(n_accounts * 0.22))
    member_account_idx = np.concatenate([np.arange(n_accounts), rng.integers(0, n_accounts, n_secondary_members)])
    member_customer_idx = np.concatenate([account_customer_idx, rng.integers(0, n_customers, n_secondary_members)])
    is_primary = np.concatenate([np.ones(n_accounts, dtype=bool), np.zeros(n_secondary_members, dtype=bool)])
    member_effective_from = np.maximum(
        account_created[member_account_idx], customer_created[member_customer_idx]
    )
    builder.write(
        "crm",
        "account_member",
        {
            "account_member_id": codes("AM", len(member_account_idx), 7),
            "account_id": account_id[member_account_idx],
            "customer_id": customer_id[member_customer_idx],
            "member_role": np.where(is_primary, "primary", rng.choice(np.array(["authorized", "billing", "occupant"]), len(member_account_idx))),
            "is_primary": is_primary,
            "effective_from": member_effective_from,
            "effective_to": pa.nulls(len(member_account_idx), type=pa.date32()),
        },
        description="Effective membership of customers in commercial accounts.",
        grain="One customer-account membership period.",
        primary_key=["account_member_id"],
        foreign_keys=[
            _fk(["account_id"], "crm.account"),
            _fk(["customer_id"], "crm.customer"),
        ],
        owner="Customer Data Office",
        sensitivity="confidential",
    )

    n_sites = SCALE["sites"]
    site_id = codes("SITE", n_sites, 7)
    rng = rng_for("foundation.crm.service_site")
    site_account_idx = np.arange(n_sites) % n_accounts
    rng.shuffle(site_account_idx)
    site_account = account_id[site_account_idx]
    site_account_branch = account_branch[site_account_idx]
    postal_by_branch = {
        branch: np.flatnonzero(postal_branch == branch) for branch in branch_id
    }
    site_postal_idx = np.empty(n_sites, dtype=np.int32)
    cross_branch = rng.random(n_sites) < 0.07
    for i, branch in enumerate(site_account_branch):
        if cross_branch[i]:
            site_postal_idx[i] = int(rng.integers(0, n_postal))
        else:
            options = postal_by_branch[branch]
            site_postal_idx[i] = int(rng.choice(options))
    site_postal = postal_area_id[site_postal_idx]
    site_created = np.maximum(
        random_dates(rng, n_sites, "2019-01-01", "2025-11-30"), account_created[site_account_idx]
    )
    site_lat = postal_lat[site_postal_idx] + rng.normal(0, 0.015, n_sites)
    site_lon = postal_lon[site_postal_idx] + rng.normal(0, 0.018, n_sites)
    builder.write(
        "crm",
        "service_site",
        {
            "service_site_id": site_id,
            "account_id": site_account,
            "postal_area_id": site_postal,
            "site_name": np.array([f"Service Site {i + 1:07d}" for i in range(n_sites)]),
            "address_line_1": np.array([f"{100 + i % 9800} Meridian Way" for i in range(n_sites)]),
            "municipality_name": np.array([f"Meridian Municipality {site_postal_idx[i] % 210 + 1:03d}" for i in range(n_sites)]),
            "site_type": rng.choice(np.array(["single_family", "multi_unit", "small_business", "managed_property"]), n_sites, p=[0.64, 0.17, 0.13, 0.06]),
            "created_date": site_created,
            "latitude": np.round(site_lat, 6),
            "longitude": np.round(site_lon, 6),
            "access_notes_present": rng.random(n_sites) < 0.19,
            "is_active": rng.random(n_sites) >= 0.045,
        },
        description="Synthetic physical locations at which products are installed or field service occurs.",
        grain="One row per serviceable physical site.",
        primary_key=["service_site_id"],
        foreign_keys=[
            _fk(["account_id"], "crm.account"),
            _fk(["postal_area_id"], "core.postal_area"),
        ],
        owner="Customer Data Office",
        sensitivity="restricted-synthetic-location",
        quality_notes=["Addresses and coordinates are synthetic."],
    )

    n_contacts = int(round(n_customers * 1.38))
    rng = rng_for("foundation.crm.contact_point")
    contact_customer_idx = np.concatenate(
        [np.arange(n_customers), rng.integers(0, n_customers, n_contacts - n_customers)]
    )
    rng.shuffle(contact_customer_idx)
    contact_type = rng.choice(np.array(["email", "mobile", "landline", "mail"]), n_contacts, p=[0.49, 0.34, 0.1, 0.07])
    contact_values = np.empty(n_contacts, dtype=object)
    for i, kind in enumerate(contact_type):
        if kind == "email":
            contact_values[i] = f"customer{contact_customer_idx[i] + 1}@example.invalid"
        elif kind in ("mobile", "landline"):
            contact_values[i] = f"+1-555-{(contact_customer_idx[i] // 10000) % 1000:03d}-{contact_customer_idx[i] % 10000:04d}"
        else:
            contact_values[i] = f"MAIL-{contact_customer_idx[i] + 1:07d}"
    contact_verified = rng.random(n_contacts) < np.where(contact_type == "mail", 0.72, 0.9)
    contact_id = codes("CP", n_contacts, 7)
    builder.write(
        "crm",
        "contact_point",
        {
            "contact_point_id": contact_id,
            "customer_id": customer_id[contact_customer_idx],
            "contact_type": contact_type,
            "contact_value": contact_values,
            "is_verified": contact_verified,
            "is_primary": rng.random(n_contacts) < 0.7,
            "effective_from": customer_created[contact_customer_idx],
            "effective_to": pa.nulls(n_contacts, type=pa.date32()),
        },
        description="Synthetic email, telephone, and mailing contact points.",
        grain="One contact point for one customer and effective period.",
        primary_key=["contact_point_id"],
        foreign_keys=[_fk(["customer_id"], "crm.customer")],
        owner="Customer Data Office",
        sensitivity="restricted-synthetic-pii",
        quality_notes=["Values are non-routable synthetic identifiers."],
    )

    n_consent = 110_000
    rng = rng_for("foundation.crm.consent_event")
    consent_contact_idx = rng.integers(0, n_contacts, n_consent)
    consent_customer_idx = contact_customer_idx[consent_contact_idx]
    consent_at = _bounded_dates(rng, customer_created[consent_customer_idx])
    builder.write(
        "crm",
        "consent_event",
        {
            "consent_event_id": codes("CE", n_consent, 7),
            "customer_id": customer_id[consent_customer_idx],
            "contact_point_id": contact_id[consent_contact_idx],
            "purpose_code": rng.choice(np.array(["service", "marketing", "analytics", "research"]), n_consent, p=[0.38, 0.42, 0.16, 0.04]),
            "channel_code": contact_type[consent_contact_idx],
            "consent_action": rng.choice(np.array(["grant", "withdraw", "refresh"]), n_consent, p=[0.68, 0.18, 0.14]),
            "occurred_date": consent_at,
            "policy_version": rng.choice(np.array(["v1.0", "v1.1", "v2.0", "v2.1"]), n_consent),
            "source_system_code": rng.choice(np.array(["CRM_MAIN", "WEB_CONSENT", "CALL_CENTER"]), n_consent, p=[0.52, 0.34, 0.14]),
        },
        description="Append-only consent actions by purpose and contact channel.",
        grain="One consent action for one customer/contact/purpose.",
        primary_key=["consent_event_id"],
        foreign_keys=[
            _fk(["customer_id"], "crm.customer"),
            _fk(["contact_point_id"], "crm.contact_point"),
        ],
        owner="Privacy Office",
        sensitivity="restricted",
        use_when="Use the latest applicable event at the decision time; do not treat rows independently.",
    )

    rng = rng_for("foundation.crm.account_status_event")
    nonactive_idx = np.flatnonzero(account_status != "active")
    status_account_idx = np.concatenate([np.arange(n_accounts), nonactive_idx])
    status_type = np.concatenate([np.full(n_accounts, "opened"), account_status[nonactive_idx]])
    status_dates = np.concatenate(
        [
            account_created,
            _bounded_dates(rng, account_created[nonactive_idx]),
        ]
    )
    status_order = np.lexsort((status_dates, status_account_idx))
    builder.write(
        "crm",
        "account_status_event",
        {
            "account_status_event_id": codes("ASE", len(status_account_idx), 7),
            "account_id": account_id[status_account_idx[status_order]],
            "status_code": status_type[status_order],
            "occurred_date": status_dates[status_order],
            "reason_code": rng.choice(np.array(["customer_request", "payment", "migration", "inactivity", "normal_open"]), len(status_order)),
            "source_system_code": rng.choice(np.array(["CRM_MAIN", "BILLING_CORE", "CRM_LEGACY_A"]), len(status_order), p=[0.64, 0.25, 0.11]),
        },
        description="Append-only account lifecycle transitions.",
        grain="One status transition for one account.",
        primary_key=["account_status_event_id"],
        foreign_keys=[_fk(["account_id"], "crm.account")],
        owner="Customer Data Office",
    )

    # ------------------------------------------------------------- workforce
    n_employees = SCALE["employees"]
    n_technicians = SCALE["technicians"]
    employee_id = codes("EMP", n_employees, 5)
    rng = rng_for("foundation.workforce.employee")
    permutation = rng.permutation(n_employees)
    technician_idx = np.sort(permutation[:n_technicians])
    remaining = permutation[n_technicians:]
    job_family = np.full(n_employees, "corporate", dtype=object)
    job_family[technician_idx] = "field_technician"
    family_specs = [
        ("customer_support", 120),
        ("warehouse", 75),
        ("sales", 80),
        ("finance", 50),
        ("data_platform", 35),
        ("field_management", 45),
    ]
    cursor = 0
    for family, count in family_specs:
        take = min(count, len(remaining) - cursor)
        if take > 0:
            job_family[remaining[cursor : cursor + take]] = family
            cursor += take
    employee_branch_idx = rng.integers(0, n_branches, n_employees)
    branch_required = np.isin(job_family, ["field_technician", "customer_support", "warehouse", "sales", "field_management"])
    employee_branch_missing = (~branch_required) & (rng.random(n_employees) < 0.72)
    employee_branch = branch_id[employee_branch_idx].astype(object)
    employee_branch[employee_branch_missing] = None
    org_branch_values = np.array(org_branch, dtype=object)
    employee_org_idx = np.empty(n_employees, dtype=np.int32)
    for i in range(n_employees):
        if employee_branch[i] is None:
            options = np.arange(corporate_units)
        else:
            options = np.flatnonzero(org_branch_values == employee_branch[i])
            if len(options) == 0:
                options = np.arange(corporate_units)
        employee_org_idx[i] = int(rng.choice(options))
    employee_start = random_dates(rng, n_employees, "2017-01-01", "2025-09-30")
    ended = rng.random(n_employees) < 0.11
    employee_end = np.maximum(random_dates(rng, n_employees, "2023-01-01", "2025-12-31"), employee_start + np.timedelta64(30, "D"))
    manager_values = np.empty(n_employees, dtype=object)
    manager_values[:] = None
    manager_pool = permutation[: min(24, n_employees)]
    for i in range(n_employees):
        if i not in manager_pool:
            manager_values[i] = employee_id[int(rng.choice(manager_pool))]
    employee_first = rng.choice(first_names, n_employees)
    employee_last = rng.choice(last_names, n_employees)
    job_titles = {
        "field_technician": "Field Service Technician",
        "customer_support": "Customer Support Specialist",
        "warehouse": "Warehouse Operations Associate",
        "sales": "Customer Solutions Advisor",
        "finance": "Finance Analyst",
        "data_platform": "Data Platform Specialist",
        "field_management": "Field Operations Manager",
        "corporate": "Corporate Services Associate",
    }
    builder.write(
        "workforce",
        "employee",
        {
            "employee_id": employee_id,
            "employee_number": np.array([f"E-{i + 10000}" for i in range(n_employees)]),
            "display_name": np.char.add(np.char.add(employee_first, " "), employee_last),
            "job_family": job_family,
            "job_title": np.array([job_titles[x] for x in job_family]),
            "org_unit_id": org_unit_id[employee_org_idx],
            "home_branch_id": pa.array(employee_branch),
            "manager_employee_id": pa.array(manager_values),
            "employment_type": rng.choice(np.array(["full_time", "part_time", "contract"]), n_employees, p=[0.82, 0.14, 0.04]),
            "hire_date": employee_start,
            "termination_date": _nullable_dates(employee_end, ~ended),
            "current_status": np.where(ended, "terminated", rng.choice(np.array(["active", "leave"]), n_employees, p=[0.97, 0.03])),
        },
        description="Synthetic employee master without protected demographic attributes.",
        grain="One row per employee identity.",
        primary_key=["employee_id"],
        foreign_keys=[
            _fk(["org_unit_id"], "core.org_unit"),
            _fk(["home_branch_id"], "core.branch", ["branch_id"], nullable=True),
            _fk(["manager_employee_id"], "workforce.employee", ["employee_id"], nullable=True),
        ],
        owner="People Operations",
        sensitivity="restricted-synthetic-employee",
        quality_notes=["All employee identities are synthetic; protected attributes are intentionally absent."],
    )

    rng = rng_for("foundation.workforce.employee_role_history")
    prior_role_employees = rng.choice(np.arange(n_employees), int(n_employees * 0.32), replace=False)
    role_employee_idx = np.concatenate([np.arange(n_employees), prior_role_employees])
    role_current = np.concatenate([np.ones(n_employees, dtype=bool), np.zeros(len(prior_role_employees), dtype=bool)])
    role_from = np.concatenate(
        [employee_start, np.maximum(employee_start[prior_role_employees], np.datetime64("2018-01-01", "D"))]
    )
    role_to = np.concatenate(
        [np.full(n_employees, np.datetime64("2025-12-31", "D")), employee_start[prior_role_employees]]
    )
    builder.write(
        "workforce",
        "employee_role_history",
        {
            "employee_role_id": codes("ER", len(role_employee_idx), 6),
            "employee_id": employee_id[role_employee_idx],
            "org_unit_id": org_unit_id[employee_org_idx[role_employee_idx]],
            "branch_id": pa.array(employee_branch[role_employee_idx]),
            "job_family": job_family[role_employee_idx],
            "job_title": np.array([job_titles[x] for x in job_family[role_employee_idx]]),
            "effective_from": role_from,
            "effective_to": _nullable_dates(role_to, role_current),
            "is_current": role_current,
        },
        description="Effective-dated role, team, and branch assignments.",
        grain="One employee role assignment period.",
        primary_key=["employee_role_id"],
        foreign_keys=[
            _fk(["employee_id"], "workforce.employee"),
            _fk(["org_unit_id"], "core.org_unit"),
            _fk(["branch_id"], "core.branch", nullable=True),
        ],
        owner="People Operations",
        sensitivity="restricted",
    )

    rng = rng_for("foundation.workforce.skill_certification")
    cert_rows = max(1, n_technicians * 5)
    cert_technician_idx = rng.choice(technician_idx, cert_rows, replace=True)
    cert_product_idx = rng.integers(0, n_products, cert_rows)
    cert_earned = random_dates(rng, cert_rows, "2020-01-01", "2025-10-31")
    cert_expires = cert_earned + rng.choice(np.array([365, 730, 1095]), cert_rows).astype("timedelta64[D]")
    builder.write(
        "workforce",
        "skill_certification",
        {
            "certification_id": codes("CERT", cert_rows, 6),
            "employee_id": employee_id[cert_technician_idx],
            "product_id": product_id[cert_product_idx],
            "certification_type": rng.choice(np.array(["install", "repair", "inspection", "advanced_diagnostics"]), cert_rows),
            "earned_date": cert_earned,
            "expiry_date": cert_expires,
            "certification_status": np.where(cert_expires > np.datetime64("2025-12-31", "D"), "current", "expired"),
        },
        description="Product-level field-technician qualifications.",
        grain="One employee-product certification period.",
        primary_key=["certification_id"],
        foreign_keys=[
            _fk(["employee_id"], "workforce.employee"),
            _fk(["product_id"], "catalog.product"),
        ],
        owner="Field Operations Training",
        sensitivity="restricted",
    )

    rng = rng_for("foundation.workforce.shift")
    frontline_idx = np.flatnonzero(~employee_branch_missing & ~ended)
    n_shifts = max(100_000, n_employees * 350)
    technician_share = rng.random(n_shifts) < 0.62
    shift_employee_idx = np.empty(n_shifts, dtype=np.int32)
    shift_employee_idx[technician_share] = rng.choice(technician_idx, technician_share.sum())
    shift_employee_idx[~technician_share] = rng.choice(frontline_idx, (~technician_share).sum())
    shift_days = random_dates(rng, n_shifts, WORLD_START[:10], WORLD_END[:10])
    shift_hours = rng.choice(np.array([6, 7, 8, 9, 10, 12, 14]), n_shifts, p=[0.05, 0.12, 0.42, 0.08, 0.08, 0.2, 0.05])
    shift_starts = (
        shift_days.astype("datetime64[h]") + shift_hours.astype("timedelta64[h]")
    ).astype("datetime64[s]")
    shift_duration = rng.choice(np.array([4, 6, 8, 10, 12]), n_shifts, p=[0.04, 0.1, 0.73, 0.1, 0.03])
    shift_id = codes("SH", n_shifts, 8)
    builder.write(
        "workforce",
        "shift",
        {
            "shift_id": shift_id,
            "employee_id": employee_id[shift_employee_idx],
            "branch_id": np.array(employee_branch[shift_employee_idx]),
            "scheduled_start_at": shift_starts,
            "scheduled_end_at": shift_starts + shift_duration.astype("timedelta64[h]"),
            "shift_role": job_family[shift_employee_idx],
            "shift_status": rng.choice(np.array(["worked", "worked", "worked", "cancelled", "no_show"]), n_shifts),
            "source_system_code": rng.choice(np.array(["WFM_MAIN", "WFM_LEGACY"]), n_shifts, p=[0.88, 0.12]),
        },
        description="Scheduled shifts for field and branch-based employees.",
        grain="One scheduled employee shift.",
        primary_key=["shift_id"],
        foreign_keys=[
            _fk(["employee_id"], "workforce.employee"),
            _fk(["branch_id"], "core.branch"),
        ],
        owner="Workforce Management",
        sensitivity="restricted",
    )

    rng = rng_for("foundation.workforce.absence")
    n_absence = max(4_000, int(n_employees * 9))
    absence_shift_idx = rng.choice(np.arange(n_shifts), n_absence, replace=False)
    absence_start = shift_starts[absence_shift_idx]
    builder.write(
        "workforce",
        "absence",
        {
            "absence_id": codes("ABS", n_absence, 6),
            "employee_id": employee_id[shift_employee_idx[absence_shift_idx]],
            "shift_id": shift_id[absence_shift_idx],
            "absence_start_at": absence_start,
            "absence_end_at": absence_start + rng.choice(np.array([4, 8, 16, 24, 40]), n_absence).astype("timedelta64[h]"),
            "absence_category": rng.choice(np.array(["sick", "personal", "family", "weather", "unplanned_other"]), n_absence),
            "is_paid": rng.random(n_absence) < 0.78,
        },
        description="Synthetic employee absence episodes linked to scheduled shifts.",
        grain="One absence episode affecting a scheduled shift.",
        primary_key=["absence_id"],
        foreign_keys=[
            _fk(["employee_id"], "workforce.employee"),
            _fk(["shift_id"], "workforce.shift"),
        ],
        owner="People Operations",
        sensitivity="highly-restricted-synthetic",
    )

    rng = rng_for("foundation.workforce.training_completion")
    n_training = max(5_000, n_employees * 9)
    training_employee_idx = rng.integers(0, n_employees, n_training)
    builder.write(
        "workforce",
        "training_completion",
        {
            "training_completion_id": codes("TC", n_training, 6),
            "employee_id": employee_id[training_employee_idx],
            "course_code": rng.choice(np.array(["SAFE-101", "PRIV-101", "CUST-201", "FIELD-210", "DATA-110", "EQUIP-310"]), n_training),
            "completed_date": _bounded_dates(rng, employee_start[training_employee_idx]),
            "result": rng.choice(np.array(["passed", "passed", "passed", "failed", "expired"]), n_training),
            "delivery_mode": rng.choice(np.array(["online", "classroom", "field_assessment"]), n_training),
        },
        description="Employee learning completions and failed attempts.",
        grain="One employee-course completion attempt.",
        primary_key=["training_completion_id"],
        foreign_keys=[_fk(["employee_id"], "workforce.employee")],
        owner="People Operations Learning",
        sensitivity="restricted",
    )

    # ------------------------------------------------------- supply masters
    n_vendors = SCALE["vendors"]
    vendor_id = codes("VEN", n_vendors, 4)
    rng = rng_for("foundation.supply.vendor")
    vendor_region = rng.choice(region_id, n_vendors)
    vendor_type = rng.choice(
        np.array(["manufacturer", "distributor", "service_provider", "logistics"]),
        n_vendors,
        p=[0.42, 0.34, 0.14, 0.1],
    )
    vendor_payment_terms_days = rng.choice(
        np.array([15, 30, 45, 60]), n_vendors, p=[0.1, 0.55, 0.25, 0.1]
    )
    vendor_standard_lead_time_days = rng.integers(2, 46, n_vendors, dtype=np.int16)
    vendor_risk_tier = rng.choice(
        np.array(["low", "medium", "high"]),
        n_vendors,
        p=[0.58, 0.34, 0.08],
    )
    builder.write(
        "supply",
        "vendor",
        {
            "vendor_id": vendor_id,
            "vendor_name": np.array([f"Synthetic Supplier {i + 1:03d}" for i in range(n_vendors)]),
            "vendor_type": vendor_type,
            "home_region_id": vendor_region,
            "payment_terms_days": vendor_payment_terms_days,
            "standard_lead_time_days": vendor_standard_lead_time_days,
            "risk_tier": vendor_risk_tier,
            "active_from": random_dates(rng, n_vendors, "2017-01-01", "2022-12-31"),
            "active_to": pa.nulls(n_vendors, type=pa.date32()),
        },
        description="Canonical synthetic supplier and service-vendor master.",
        grain="One row per vendor.",
        primary_key=["vendor_id"],
        foreign_keys=[_fk(["home_region_id"], "core.region", ["region_id"])],
        owner="Supplier Management",
        sensitivity="confidential",
    )

    n_warehouses = 3
    warehouse_id = codes("WH", n_warehouses, 3)
    warehouse_region_idx = np.linspace(0, len(region_id) - 1, n_warehouses, dtype=int)
    warehouse_postal_idx = np.array(
        [int(rng.choice(np.flatnonzero(postal_region == region_id[idx]))) for idx in warehouse_region_idx]
    )
    warehouse_manager_pool = np.flatnonzero(job_family == "warehouse")
    builder.write(
        "supply",
        "warehouse",
        {
            "warehouse_id": warehouse_id,
            "warehouse_name": np.array([f"Meridian Distribution Center {i + 1}" for i in range(n_warehouses)]),
            "region_id": region_id[warehouse_region_idx],
            "postal_area_id": postal_area_id[warehouse_postal_idx],
            "manager_employee_id": employee_id[rng.choice(warehouse_manager_pool, n_warehouses, replace=False)],
            "opened_date": random_dates(rng, n_warehouses, "2016-01-01", "2021-12-31"),
            "floor_area_sqft": rng.integers(85_000, 260_001, n_warehouses, dtype=np.int32),
            "capacity_units": rng.integers(180_000, 520_001, n_warehouses, dtype=np.int32),
            "timezone_name": region_tz[warehouse_region_idx],
            "is_active": np.ones(n_warehouses, dtype=bool),
        },
        description="Distribution-center master used by purchasing, inventory, and fulfillment.",
        grain="One row per distribution center.",
        primary_key=["warehouse_id"],
        foreign_keys=[
            _fk(["region_id"], "core.region"),
            _fk(["postal_area_id"], "core.postal_area"),
            _fk(["manager_employee_id"], "workforce.employee", ["employee_id"]),
        ],
        owner="Supply Chain Operations",
    )

    rng = rng_for("foundation.supply.product_vendor")
    product_vendor_rows = n_products * 2
    pv_product_idx = np.repeat(np.arange(n_products), 2)
    pv_vendor_idx = rng.integers(0, n_vendors, product_vendor_rows)
    pv_contract_unit_cost_cents = np.round(
        product_cost[pv_product_idx] * rng.uniform(0.88, 1.12, product_vendor_rows)
    ).astype(np.int64)
    pv_contract_lead_time_days = rng.integers(2, 46, product_vendor_rows, dtype=np.int16)
    builder.write(
        "supply",
        "product_vendor",
        {
            "product_vendor_id": codes("PV", product_vendor_rows, 6),
            "product_id": product_id[pv_product_idx],
            "vendor_id": vendor_id[pv_vendor_idx],
            "vendor_product_code": np.array([f"VP-{pv_vendor_idx[i] + 1:03d}-{pv_product_idx[i] + 1:05d}" for i in range(product_vendor_rows)]),
            "is_primary_vendor": np.tile(np.array([True, False]), n_products),
            "contract_unit_cost_cents": pv_contract_unit_cost_cents,
            "contract_lead_time_days": pv_contract_lead_time_days,
            "minimum_order_quantity": rng.choice(np.array([1, 5, 10, 25, 50]), product_vendor_rows),
            "effective_from": np.full(product_vendor_rows, np.datetime64("2023-01-01", "D")),
            "effective_to": pa.nulls(product_vendor_rows, type=pa.date32()),
        },
        description="Approved vendor sourcing options for each product.",
        grain="One product-vendor sourcing relationship.",
        primary_key=["product_vendor_id"],
        foreign_keys=[
            _fk(["product_id"], "catalog.product"),
            _fk(["vendor_id"], "supply.vendor"),
        ],
        owner="Supplier Management",
    )

    # ---------------------------------------------------------- fleet master
    n_vehicles = SCALE["vehicles"]
    vehicle_id = codes("VEH", n_vehicles, 5)
    rng = rng_for("foundation.fleet.vehicle")
    vehicle_branch_idx = rng.integers(0, n_branches, n_vehicles)
    vehicle_branch = branch_id[vehicle_branch_idx]
    acquired_date = random_dates(rng, n_vehicles, "2017-01-01", "2025-06-30")
    vehicle_type = rng.choice(np.array(["service_van", "cargo_van", "light_truck", "pool_car"]), n_vehicles, p=[0.58, 0.21, 0.14, 0.07])
    vehicle_status = rng.choice(np.array(["active", "maintenance", "retired"]), n_vehicles, p=[0.9, 0.07, 0.03])
    builder.write(
        "fleet",
        "vehicle",
        {
            "vehicle_id": vehicle_id,
            "fleet_number": np.array([f"F-{i + 1000}" for i in range(n_vehicles)]),
            "home_branch_id": vehicle_branch,
            "vehicle_type": vehicle_type,
            "fuel_type": rng.choice(np.array(["gasoline", "diesel", "hybrid", "electric"]), n_vehicles, p=[0.45, 0.27, 0.17, 0.11]),
            "acquired_date": acquired_date,
            "model_year": np.array([str(day).split("-")[0] for day in acquired_date], dtype=np.int16),
            "cargo_capacity_kg": rng.integers(250, 2_200, n_vehicles, dtype=np.int32),
            "telematics_enabled": rng.random(n_vehicles) < 0.88,
            "current_status": vehicle_status,
        },
        description="Fleet vehicle master for route, GPS, maintenance, and technician assignment data.",
        grain="One row per fleet vehicle.",
        primary_key=["vehicle_id"],
        foreign_keys=[_fk(["home_branch_id"], "core.branch", ["branch_id"])],
        owner="Fleet Operations",
    )

    active_vehicle_idx = np.flatnonzero(vehicle_status != "retired")
    rng = rng_for("foundation.fleet.vehicle_assignment_history")
    current_assignment_rows = len(active_vehicle_idx)
    prior_assignment_rows = int(round(n_vehicles * 1.4))
    assignment_vehicle_idx = np.concatenate(
        [active_vehicle_idx, rng.integers(0, n_vehicles, prior_assignment_rows)]
    )
    assignment_employee_idx = rng.choice(technician_idx, len(assignment_vehicle_idx))
    assignment_current = np.concatenate(
        [np.ones(current_assignment_rows, dtype=bool), np.zeros(prior_assignment_rows, dtype=bool)]
    )
    assignment_start = random_dates(rng, len(assignment_vehicle_idx), "2020-01-01", "2025-11-30")
    assignment_end = np.minimum(
        assignment_start + rng.integers(30, 700, len(assignment_vehicle_idx)).astype("timedelta64[D]"),
        np.datetime64("2025-12-31", "D"),
    )
    builder.write(
        "fleet",
        "vehicle_assignment_history",
        {
            "vehicle_assignment_id": codes("VA", len(assignment_vehicle_idx), 5),
            "vehicle_id": vehicle_id[assignment_vehicle_idx],
            "employee_id": employee_id[assignment_employee_idx],
            "effective_from": assignment_start,
            "effective_to": _nullable_dates(assignment_end, assignment_current),
            "is_primary_assignment": rng.random(len(assignment_vehicle_idx)) < 0.8,
        },
        description="Effective-dated technician use of fleet vehicles.",
        grain="One employee-vehicle assignment period.",
        primary_key=["vehicle_assignment_id"],
        foreign_keys=[
            _fk(["vehicle_id"], "fleet.vehicle"),
            _fk(["employee_id"], "workforce.employee"),
        ],
        owner="Fleet Operations",
    )

    # ----------------------------------------------- generic legacy crosswalk
    rng = rng_for("foundation.core.legacy_id_xref")
    xref_specs = [
        ("customer", customer_id, 0.72),
        ("account", account_id, 0.31),
        ("service_site", site_id, 0.12),
        ("product", product_id, 1.0),
        ("employee", employee_id, 1.0),
        ("vendor", vendor_id, 1.0),
        ("vehicle", vehicle_id, 1.0),
    ]
    xref_type: list[str] = []
    xref_canonical: list[str] = []
    xref_system: list[str] = []
    xref_source: list[str] = []
    system_options = {
        "customer": ["CRM_LEGACY_A", "CRM_LEGACY_B"],
        "account": ["CRM_LEGACY_A", "BILLING_LEGACY"],
        "service_site": ["FIELD_LEGACY", "CRM_LEGACY_A"],
        "product": ["ERP_LEGACY", "CATALOG_OLD"],
        "employee": ["HR_LEGACY", "WFM_LEGACY"],
        "vendor": ["ERP_LEGACY", "AP_LEGACY"],
        "vehicle": ["FLEET_LEGACY", "WFM_LEGACY"],
    }
    for entity_type, ids, share in xref_specs:
        count = max(1, int(round(len(ids) * share)))
        positions = rng.choice(np.arange(len(ids)), count, replace=False)
        for serial, position in enumerate(positions, start=1):
            system = system_options[entity_type][serial % len(system_options[entity_type])]
            xref_type.append(entity_type)
            xref_canonical.append(str(ids[position]))
            xref_system.append(system)
            xref_source.append(f"{system}-{entity_type[:3].upper()}-{serial:08d}")
    n_xref = len(xref_type)
    builder.write(
        "core",
        "legacy_id_xref",
        {
            "source_system_code": np.array(xref_system),
            "entity_type": np.array(xref_type),
            "source_key": np.array(xref_source),
            "canonical_entity_id": np.array(xref_canonical),
            "valid_from": random_dates(rng, n_xref, "2018-01-01", "2024-12-31"),
            "valid_to": pa.nulls(n_xref, type=pa.date32()),
            "match_method": rng.choice(np.array(["migration_key", "deterministic_match", "reviewed_match"]), n_xref, p=[0.74, 0.21, 0.05]),
            "match_confidence": np.round(rng.uniform(0.86, 1.0, n_xref), 4),
        },
        description="Generic source-key to canonical-entity crosswalk for acquired and retired systems.",
        grain="One source-system identifier for one canonical entity and validity period.",
        primary_key=["source_system_code", "entity_type", "source_key"],
        owner="Enterprise Data Governance",
        reliability="partially-verified",
        use_when="Use to reconcile legacy identifiers before joining acquired-system records.",
        do_not_use_when="Do not join canonical_entity_id across entity types without filtering entity_type.",
        quality_notes=["The canonical target is polymorphic, so it is documented rather than enforced as a physical FK."],
    )

    # ------------------------------------------------------------ shared IDs
    builder.context.update(
        {
            "region_id": np.asarray(region_id),
            "branch_id": np.asarray(branch_id),
            "branch_region": np.asarray(branch_region),
            "branch_timezone": np.asarray(region_tz[branch_region_idx]),
            "branch_latitude": np.asarray(branch_lat),
            "branch_longitude": np.asarray(branch_lon),
            "service_area_id": np.asarray(service_area_id),
            "service_area_branch": np.asarray(service_area_branch),
            "service_area_region": np.asarray(service_area_region),
            "postal_area_id": np.asarray(postal_area_id),
            "postal_service_area": np.asarray(postal_service_area),
            "postal_branch": np.asarray(postal_branch),
            "postal_region": np.asarray(postal_region),
            "postal_latitude": np.asarray(postal_lat),
            "postal_longitude": np.asarray(postal_lon),
            "org_unit_id": np.asarray(org_unit_id),
            "calendar_date": np.asarray(calendar_date),
            "world_event_id": np.asarray(world_event_id),
            "world_event_type": np.asarray(event_type),
            "world_event_started": np.asarray(event_started),
            "customer_id": np.asarray(customer_id),
            "customer_created": np.asarray(customer_created),
            "customer_region": np.asarray(customer_home_region),
            "account_id": np.asarray(account_id),
            "account_customer": np.asarray(account_customer),
            "account_created": np.asarray(account_created),
            "account_branch": np.asarray(account_branch),
            "account_status": np.asarray(account_status),
            "site_id": np.asarray(site_id),
            "site_account": np.asarray(site_account),
            "site_postal": np.asarray(site_postal),
            "site_created": np.asarray(site_created),
            "site_latitude": np.asarray(site_lat),
            "site_longitude": np.asarray(site_lon),
            "product_category_id": np.asarray(category_id),
            "product_id": np.asarray(product_id),
            "product_category": np.asarray(product_category),
            "product_type": np.asarray(product_type),
            "product_unit_cost_cents": np.asarray(product_cost),
            "product_list_price_cents": np.asarray(product_price),
            "service_plan_id": np.asarray(service_plan_id),
            "service_plan_price_cents": np.asarray(plan_base_price),
            "employee_id": np.asarray(employee_id),
            "employee_branch": np.asarray(employee_branch),
            "employee_org_unit": np.asarray(org_unit_id[employee_org_idx]),
            "employee_job_family": np.asarray(job_family),
            "employee_hire_date": np.asarray(employee_start),
            "technician_id": np.asarray(employee_id[technician_idx]),
            "technician_employee_index": np.asarray(technician_idx),
            "shift_id": np.asarray(shift_id),
            "shift_employee": np.asarray(employee_id[shift_employee_idx]),
            "shift_branch": np.asarray(employee_branch[shift_employee_idx]),
            "shift_start": np.asarray(shift_starts),
            "vehicle_id": np.asarray(vehicle_id),
            "vehicle_branch": np.asarray(vehicle_branch),
            "vendor_id": np.asarray(vendor_id),
            "vendor_standard_lead_time_days": np.asarray(vendor_standard_lead_time_days),
            "vendor_risk_tier": np.asarray(vendor_risk_tier),
            "product_vendor_product": np.asarray(product_id[pv_product_idx]),
            "product_vendor_vendor": np.asarray(vendor_id[pv_vendor_idx]),
            "product_vendor_contract_unit_cost_cents": np.asarray(pv_contract_unit_cost_cents),
            "product_vendor_contract_lead_time_days": np.asarray(pv_contract_lead_time_days),
            "warehouse_id": np.asarray(warehouse_id),
            "warehouse_region": np.asarray(region_id[warehouse_region_idx]),
            "warehouse_postal": np.asarray(postal_area_id[warehouse_postal_idx]),
        }
    )
