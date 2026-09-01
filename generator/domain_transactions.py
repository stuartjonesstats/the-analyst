from __future__ import annotations

from typing import Any

import numpy as np

from builder import nullable, random_timestamps, rng_for
from config import SCALE, WORLD_END, WORLD_START


def _context(builder: Any, *names: str, required: bool = True) -> np.ndarray | None:
    """Return the first available foundation-context value as a NumPy array."""
    for name in names:
        if name in builder.context:
            return np.asarray(builder.context[name])
    if required:
        joined = ", ".join(names)
        raise KeyError(f"generate_transactions requires one of these context keys: {joined}")
    return None


def _codes(prefix: str, n: int, width: int = 7) -> np.ndarray:
    """Generate compact fixed-width identifiers without a large Python list."""
    return np.char.mod(f"{prefix}%0{width}d", np.arange(1, n + 1, dtype=np.int64))


def _ingestion_times(
    occurred_at: np.ndarray,
    label: str,
    *,
    recorded_minutes: tuple[int, int] = (1, 30),
    available_minutes: tuple[int, int] = (5, 180),
    delayed_mask: np.ndarray | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """Create source-recorded and warehouse-available clocks for an event."""
    rng = rng_for(f"transactions:{label}:ingestion")
    n = len(occurred_at)
    recorded = occurred_at.astype("datetime64[s]") + rng.integers(
        recorded_minutes[0] * 60,
        recorded_minutes[1] * 60 + 1,
        n,
        dtype=np.int64,
    ).astype("timedelta64[s]")
    available = recorded + rng.integers(
        available_minutes[0] * 60,
        available_minutes[1] * 60 + 1,
        n,
        dtype=np.int64,
    ).astype("timedelta64[s]")
    if delayed_mask is not None and np.any(delayed_mask):
        extra_hours = rng.integers(18, 121, int(delayed_mask.sum()), dtype=np.int64)
        available[delayed_mask] += extra_hours.astype("timedelta64[h]")
    return recorded, available


def _foundation(builder: Any) -> dict[str, np.ndarray]:
    account_id = _context(builder, "account_id", "account_ids")
    site_id = _context(builder, "site_id", "site_ids")
    product_id = _context(builder, "product_id", "product_ids")

    site_account = _context(
        builder,
        "site_account",
        "site_account_id",
        required=False,
    )
    if site_account is None:
        site_account = account_id[np.arange(len(site_id), dtype=np.int64) % len(account_id)]
    if len(site_account) != len(site_id):
        raise ValueError("site_account must have one value per site_id")

    product_price = _context(
        builder,
        "product_price_cents",
        "product_unit_price_cents",
        "product_list_price_cents",
        required=False,
    )
    if product_price is None:
        price_rng = rng_for("transactions:foundation:fallback-product-price")
        product_price = price_rng.integers(1_499, 89_999, len(product_id), dtype=np.int64)
    product_price = np.asarray(product_price, dtype=np.int64)
    if len(product_price) != len(product_id):
        raise ValueError("product price context must have one value per product_id")

    account_source = _context(
        builder,
        "account_source_system",
        "account_source",
        required=False,
    )
    if account_source is not None and len(account_source) == len(account_id):
        normalized = np.char.lower(np.asarray(account_source).astype(str))
        acquired = np.char.find(normalized, "harbor") >= 0
        acquired |= np.char.find(normalized, "legacy") >= 0
        acquired |= np.char.find(normalized, "acquir") >= 0
        if not np.any(acquired):
            acquired = np.arange(len(account_id), dtype=np.int64) % 9 == 0
    else:
        # Stable fallback: approximately eleven percent of accounts came from the
        # acquired HarborHome estate.
        acquired = np.arange(len(account_id), dtype=np.int64) % 9 == 0

    return {
        "account_id": account_id,
        "site_id": site_id,
        "site_account": np.asarray(site_account),
        "product_id": product_id,
        "product_price": product_price,
        "acquired_account": account_id[acquired],
    }


def _generate_commerce(builder: Any, foundation: dict[str, np.ndarray]) -> None:
    rng = rng_for("transactions:commerce")
    account_id = foundation["account_id"]
    site_id = foundation["site_id"]
    site_account = foundation["site_account"]
    product_id = foundation["product_id"]
    product_price = foundation["product_price"]
    acquired_accounts = foundation["acquired_account"]

    n_orders = int(SCALE.get("orders", 220_000))
    order_id = _codes("ORD", n_orders)
    order_created = np.sort(random_timestamps(rng, n_orders, WORLD_START, WORLD_END))
    chosen_site = rng.integers(0, len(site_id), n_orders, dtype=np.int64)
    order_site = site_id[chosen_site]
    order_account = site_account[chosen_site]

    is_acquired = np.isin(order_account, acquired_accounts)
    acquisition_window = (
        (order_created >= np.datetime64("2024-04-01T00:00:00", "s"))
        & (order_created < np.datetime64("2024-07-01T00:00:00", "s"))
        & is_acquired
    )

    line_count = rng.choice(
        np.array([1, 2, 3, 4], dtype=np.int8),
        size=n_orders,
        p=[0.48, 0.31, 0.15, 0.06],
    )
    order_index = np.repeat(np.arange(n_orders, dtype=np.int64), line_count)
    n_lines = len(order_index)
    order_line_id = _codes("OLN", n_lines)
    order_line_order = order_id[order_index]
    product_index = rng.integers(0, len(product_id), n_lines, dtype=np.int64)
    order_line_product = product_id[product_index]
    quantity = rng.choice(
        np.array([1, 2, 3, 4], dtype=np.int8),
        size=n_lines,
        p=[0.78, 0.16, 0.05, 0.01],
    )
    unit_price_cents = product_price[product_index]
    gross_cents = unit_price_cents * quantity.astype(np.int64)
    discount_rate_bp = rng.choice(
        np.array([0, 500, 1_000, 1_500, 2_000], dtype=np.int16),
        size=n_lines,
        p=[0.60, 0.16, 0.13, 0.08, 0.03],
    )
    discount_cents = gross_cents * discount_rate_bp // 10_000
    taxable_cents = gross_cents - discount_cents
    tax_cents = np.rint(taxable_cents * rng.uniform(0.045, 0.095, n_lines)).astype(np.int64)
    line_total_cents = taxable_cents + tax_cents
    line_starts = np.cumsum(line_count, dtype=np.int64) - line_count
    subtotal_cents = np.add.reduceat(gross_cents - discount_cents, line_starts)
    order_tax_cents = np.add.reduceat(tax_cents, line_starts)
    order_total_cents = subtotal_cents + order_tax_cents

    age_days = (
        np.datetime64(WORLD_END, "s") - order_created
    ).astype("timedelta64[D]").astype(np.int64)
    canceled = rng.random(n_orders) < 0.068
    status = np.full(n_orders, "delivered", dtype="U16")
    status[canceled] = "canceled"
    status[(~canceled) & (age_days <= 2)] = "processing"
    status[(~canceled) & (age_days > 2) & (age_days <= 7)] = "shipped"

    source_system = np.where(is_acquired, "harbor_oms", "meridian_oms")
    source_order_id = order_id.copy()
    # HarborHome order numbers were unique only inside a retired tenant. The
    # tenant was omitted from the acquired extract, creating intentional key
    # collisions without corrupting Meridian's canonical order_id.
    source_order_id[acquisition_window] = np.char.mod(
        "HH-%06d",
        np.arange(int(acquisition_window.sum()), dtype=np.int64) % 1_200,
    )
    order_recorded, order_available = _ingestion_times(
        order_created, "order", delayed_mask=acquisition_window
    )
    order_recorded[acquisition_window] -= np.timedelta64(5, "h")

    channel = rng.choice(
        np.array(["web", "mobile_app", "contact_center", "field_sales"]),
        n_orders,
        p=[0.55, 0.24, 0.13, 0.08],
    )
    currency = np.full(n_orders, "USD", dtype="U3")

    builder.write(
        "commerce",
        "order",
        {
            "order_id": order_id,
            "source_order_id": source_order_id,
            "account_id": order_account,
            "site_id": order_site,
            "order_status": status,
            "sales_channel": channel,
            "currency": currency,
            "line_count": line_count,
            "subtotal_cents": subtotal_cents,
            "tax_cents": order_tax_cents,
            "order_total_cents": order_total_cents,
            "created_at": order_created,
            "source_recorded_at": order_recorded,
            "warehouse_available_at": order_available,
            "source_system": source_system,
        },
        description="Current commerce order header, including canonical and source identifiers.",
        grain="One row per canonical order",
        primary_key=["order_id"],
        foreign_keys=[
            {"columns": ["account_id"], "references": "crm.account"},
            {
                "columns": ["site_id"],
                "references": "crm.service_site",
                "referenced_columns": ["service_site_id"],
            },
        ],
        owner="Commerce Analytics",
        reliability="verified-with-known-exceptions",
        use_when="Order-level revenue, channel, lifecycle, and fulfillment analysis.",
        do_not_use_when="Do not treat source_order_id as globally unique or as the order primary key.",
        quality_notes=[
            "HarborHome source order numbers collide during the acquisition migration.",
            "Source timestamps from part of the acquired estate were parsed as UTC despite being local time.",
        ],
    )

    line_occurred = order_created[order_index]
    line_recorded, line_available = _ingestion_times(line_occurred, "order-line")
    builder.write(
        "commerce",
        "order_line",
        {
            "order_line_id": order_line_id,
            "order_id": order_line_order,
            "product_id": order_line_product,
            "quantity": quantity,
            "unit_price_cents": unit_price_cents,
            "discount_cents": discount_cents,
            "tax_cents": tax_cents,
            "line_total_cents": line_total_cents,
            "created_at": line_occurred,
            "source_recorded_at": line_recorded,
            "warehouse_available_at": line_available,
        },
        description="Commercial line items at the price and tax captured when an order was placed.",
        grain="One row per order line",
        primary_key=["order_line_id"],
        foreign_keys=[
            {"columns": ["order_id"], "references": "commerce.order"},
            {"columns": ["product_id"], "references": "catalog.product"},
        ],
        owner="Commerce Analytics",
        use_when="Product mix, basket, discount, and item-level revenue analysis.",
        do_not_use_when="Do not join product_id to a current catalog price to reconstruct historical revenue.",
    )

    # Three lifecycle events per order keeps the event stream substantial while
    # retaining a simple, auditable state transition for beginners.
    event_position = np.tile(np.arange(3, dtype=np.int8), n_orders)
    event_order_index = np.repeat(np.arange(n_orders, dtype=np.int64), 3)
    n_order_events = len(event_order_index)
    order_event_id = _codes("OEV", n_order_events)
    order_event_type = np.full(n_order_events, "payment_authorized", dtype="U24")
    order_event_type[event_position == 0] = "order_created"
    offset_seconds = np.zeros(n_order_events, dtype=np.int64)
    middle = event_position == 1
    final = event_position == 2
    offset_seconds[middle] = rng.integers(60, 7_201, int(middle.sum()), dtype=np.int64)
    offset_seconds[final] = np.where(
        canceled[event_order_index[final]],
        rng.integers(7_201, 86_401, int(final.sum()), dtype=np.int64),
        rng.integers(86_400, 864_001, int(final.sum()), dtype=np.int64),
    )
    final_order_type = np.select(
        [
            status == "canceled",
            status == "delivered",
            status == "shipped",
        ],
        ["order_canceled", "order_fulfilled", "order_shipped"],
        default="picking_started",
    )
    order_event_type[final] = final_order_type[event_order_index[final]]
    order_event_at = order_created[event_order_index] + offset_seconds.astype("timedelta64[s]")
    order_event_at = np.minimum(order_event_at, np.datetime64(WORLD_END, "s"))
    event_acquisition = acquisition_window[event_order_index]
    event_recorded, event_available = _ingestion_times(
        order_event_at, "order-event", delayed_mask=event_acquisition
    )
    event_recorded[event_acquisition] -= np.timedelta64(5, "h")
    builder.write(
        "commerce",
        "order_event",
        {
            "order_event_id": order_event_id,
            "order_id": order_id[event_order_index],
            "event_type": order_event_type,
            "event_sequence": event_position + 1,
            "occurred_at": order_event_at,
            "source_recorded_at": event_recorded,
            "warehouse_available_at": event_available,
            "source_system": source_system[event_order_index],
        },
        description="Append-oriented order lifecycle event stream from commerce source systems.",
        grain="One row per recorded order event",
        primary_key=["order_event_id"],
        foreign_keys=[{"columns": ["order_id"], "references": "commerce.order"}],
        owner="Commerce Platform",
        reliability="verified-with-known-exceptions",
        use_when="Sequence-aware order funnel and processing-time analysis.",
        do_not_use_when="Do not assume source_recorded_at is event time on acquired HarborHome records.",
        quality_notes=["Some acquired source clocks are five hours behind canonical event time."],
    )

    fulfilled_order_index = np.flatnonzero(status == "delivered")
    shipment_order_index = np.repeat(fulfilled_order_index, 3)
    shipment_position = np.tile(np.arange(3, dtype=np.int8), len(fulfilled_order_index))
    n_shipment_events = len(shipment_order_index)
    shipment_event_id = _codes("SHE", n_shipment_events)
    shipment_type = np.array(["label_created", "in_transit", "delivered"])[shipment_position]
    shipment_offset_seconds = np.empty(n_shipment_events, dtype=np.int64)
    label_rows = shipment_position == 0
    transit_rows = shipment_position == 1
    delivered_rows = shipment_position == 2
    shipment_offset_seconds[label_rows] = rng.integers(
        3_600, 43_201, int(label_rows.sum()), dtype=np.int64
    )
    shipment_offset_seconds[transit_rows] = rng.integers(
        86_400, 259_201, int(transit_rows.sum()), dtype=np.int64
    )
    shipment_offset_seconds[delivered_rows] = rng.integers(
        345_600, 864_001, int(delivered_rows.sum()), dtype=np.int64
    )
    shipment_at = order_created[shipment_order_index] + shipment_offset_seconds.astype(
        "timedelta64[s]"
    )
    shipment_at = np.minimum(shipment_at, np.datetime64(WORLD_END, "s"))
    shipment_recorded, shipment_available = _ingestion_times(
        shipment_at, "shipment-event", available_minutes=(5, 360)
    )
    builder.write(
        "commerce",
        "shipment_event",
        {
            "shipment_event_id": shipment_event_id,
            "order_id": order_id[shipment_order_index],
            "site_id": order_site[shipment_order_index],
            "event_type": shipment_type,
            "carrier_code": rng.choice(
                np.array(["NORTHSTAR", "RAPIDPOST", "LOCAL_FLEET"]),
                n_shipment_events,
                p=[0.49, 0.37, 0.14],
            ),
            "occurred_at": shipment_at,
            "source_recorded_at": shipment_recorded,
            "warehouse_available_at": shipment_available,
        },
        description="Carrier and local-fleet tracking events for fulfilled orders.",
        grain="One row per shipment tracking event",
        primary_key=["shipment_event_id"],
        foreign_keys=[
            {"columns": ["order_id"], "references": "commerce.order"},
            {
                "columns": ["site_id"],
                "references": "crm.service_site",
                "referenced_columns": ["service_site_id"],
            },
        ],
        owner="Fulfillment Operations",
        use_when="Delivery lead time, carrier performance, and fulfillment experience analysis.",
        do_not_use_when="Do not count event rows as shipments; an order normally has several events.",
    )

    builder.context.update(
        {
            "order_id": order_id,
            "order_account": np.asarray(order_account),
            "order_site": np.asarray(order_site),
            "order_created": np.asarray(order_created),
            "order_line_id": order_line_id,
            "order_line_order": np.asarray(order_line_order),
            "order_line_product": np.asarray(order_line_product),
        }
    )

    builder.add_anomaly(
        anomaly_id="A-TXN-ACQ-01",
        tables=["commerce.order", "commerce.order_event"],
        date_range=["2024-04-01", "2024-06-30"],
        selector="HarborHome accounts during acquisition cutover",
        rate=f"{int(acquisition_window.sum()):,} order headers plus their events",
        root_cause="The acquired OMS exported local-naive timestamps and tenant-local order numbers without tenant identifiers.",
        symptom="source_order_id is non-unique and source_recorded_at can precede canonical occurred_at by about five hours.",
        public_clue="Source-system and warehouse-availability fields make the affected population isolatable.",
        learning_objective="Distinguish canonical keys and event time from imperfect source-system representations.",
        allowed_invariant_violations=[
            "source_order_id uniqueness",
            "source_recorded_at >= occurred_at for the affected source",
        ],
    )


def _generate_billing(builder: Any, foundation: dict[str, np.ndarray]) -> None:
    rng = rng_for("transactions:billing")
    site_id = foundation["site_id"]
    site_account = foundation["site_account"]

    n_subscriptions = int(SCALE.get("subscriptions", 40_000))
    subscription_id = _codes("SUB", n_subscriptions)
    subscription_start = np.sort(
        random_timestamps(rng, n_subscriptions, WORLD_START, "2025-11-30T23:59:59")
    )
    chosen_site = rng.integers(0, len(site_id), n_subscriptions, dtype=np.int64)
    subscription_site = site_id[chosen_site]
    subscription_account = site_account[chosen_site]
    plan_code = rng.choice(
        np.array(["ESSENTIAL", "PLUS", "PREMIER"]),
        n_subscriptions,
        p=[0.48, 0.37, 0.15],
    )
    plan_price = np.select(
        [plan_code == "ESSENTIAL", plan_code == "PLUS"],
        [1_999, 3_499],
        default=5_999,
    ).astype(np.int64)

    intended_cancel = rng.random(n_subscriptions) < 0.19
    cancel_after_days = rng.integers(75, 850, n_subscriptions, dtype=np.int64)
    candidate_cancel = subscription_start + cancel_after_days.astype("timedelta64[D]")
    canceled = intended_cancel & (candidate_cancel <= np.datetime64(WORLD_END, "s"))
    subscription_status = np.full(n_subscriptions, "active", dtype="U12")
    subscription_status[canceled] = "canceled"
    past_due = (~canceled) & (rng.random(n_subscriptions) < 0.045)
    subscription_status[past_due] = "past_due"
    cancel_at = np.minimum(candidate_cancel, np.datetime64(WORLD_END, "s"))

    sub_recorded, sub_available = _ingestion_times(subscription_start, "subscription")
    builder.write(
        "billing",
        "subscription",
        {
            "subscription_id": subscription_id,
            "account_id": subscription_account,
            "site_id": subscription_site,
            "plan_code": plan_code,
            "monthly_price_cents": plan_price,
            "subscription_status": subscription_status,
            "started_at": subscription_start,
            "canceled_at": nullable(cancel_at, ~canceled),
            "source_recorded_at": sub_recorded,
            "warehouse_available_at": sub_available,
        },
        description="Current subscription contract state for monitoring and priority-service plans.",
        grain="One row per subscription contract",
        primary_key=["subscription_id"],
        foreign_keys=[
            {"columns": ["account_id"], "references": "crm.account"},
            {
                "columns": ["site_id"],
                "references": "crm.service_site",
                "referenced_columns": ["service_site_id"],
            },
        ],
        owner="Subscription Operations",
        use_when="Current subscription populations, plan mix, tenure, and recurring-revenue analysis.",
        do_not_use_when="Do not use the current status as a point-in-time historical label without subscription events.",
        quality_notes=["Current state includes corrections received through the frozen extract."],
    )

    sub_event_position = np.tile(np.arange(5, dtype=np.int8), n_subscriptions)
    sub_event_index = np.repeat(np.arange(n_subscriptions, dtype=np.int64), 5)
    n_sub_events = len(sub_event_index)
    subscription_event_id = _codes("SEV", n_sub_events)
    effective_end = np.where(canceled, cancel_at, np.datetime64(WORLD_END, "s"))
    life_seconds = (
        effective_end - subscription_start
    ).astype("timedelta64[s]").astype(np.int64)
    sub_event_offset = np.zeros(n_sub_events, dtype=np.int64)
    activated_rows = sub_event_position == 1
    first_bill_rows = sub_event_position == 2
    review_rows = sub_event_position == 3
    final_sub_rows = sub_event_position == 4
    sub_event_offset[activated_rows] = rng.integers(
        900, 86_401, int(activated_rows.sum()), dtype=np.int64
    )
    sub_event_offset[first_bill_rows] = 30 * 86_400
    sub_event_offset[review_rows] = life_seconds[sub_event_index[review_rows]] // 2
    sub_event_offset[final_sub_rows] = life_seconds[sub_event_index[final_sub_rows]]
    sub_event_at = subscription_start[sub_event_index] + sub_event_offset.astype(
        "timedelta64[s]"
    )
    sub_event_type = np.full(n_sub_events, "renewal_processed", dtype="U24")
    sub_event_type[sub_event_position == 0] = "subscription_created"
    sub_event_type[sub_event_position == 1] = "subscription_activated"
    sub_event_type[sub_event_position == 2] = "plan_billed"
    sub_event_type[sub_event_position == 3] = "account_reviewed"
    sub_event_type[final_sub_rows] = np.where(
        canceled[sub_event_index[final_sub_rows]],
        "subscription_canceled",
        "renewal_processed",
    )
    sub_event_recorded, sub_event_available = _ingestion_times(
        sub_event_at, "subscription-event"
    )
    builder.write(
        "billing",
        "subscription_event",
        {
            "subscription_event_id": subscription_event_id,
            "subscription_id": subscription_id[sub_event_index],
            "event_type": sub_event_type,
            "event_sequence": sub_event_position + 1,
            "plan_code": plan_code[sub_event_index],
            "occurred_at": sub_event_at,
            "source_recorded_at": sub_event_recorded,
            "warehouse_available_at": sub_event_available,
        },
        description="Lifecycle events used to reconstruct subscription state at a historical cutoff.",
        grain="One row per subscription lifecycle event",
        primary_key=["subscription_event_id"],
        foreign_keys=[
            {"columns": ["subscription_id"], "references": "billing.subscription"}
        ],
        owner="Subscription Operations",
        use_when="Historical subscription state and churn timing analysis.",
        do_not_use_when="Do not count lifecycle events as subscriptions.",
    )

    end_for_invoice = np.where(canceled, cancel_at, np.datetime64(WORLD_END, "s"))
    billable_days = (
        end_for_invoice - subscription_start
    ).astype("timedelta64[D]").astype(np.int64)
    invoice_count = np.clip(billable_days // 30 + 1, 1, 36).astype(np.int16)
    invoice_subscription_index = np.repeat(
        np.arange(n_subscriptions, dtype=np.int64), invoice_count
    )
    n_invoices = len(invoice_subscription_index)
    invoice_starts = np.cumsum(invoice_count, dtype=np.int64) - invoice_count
    invoice_sequence = np.arange(n_invoices, dtype=np.int64) - np.repeat(
        invoice_starts, invoice_count
    )
    invoice_id = _codes("INV", n_invoices)
    invoice_account = subscription_account[invoice_subscription_index]
    invoice_at = subscription_start[invoice_subscription_index] + (
        invoice_sequence * 30
    ).astype("timedelta64[D]")
    due_at = invoice_at + np.timedelta64(14, "D")
    invoice_amount = plan_price[invoice_subscription_index]

    migration_window_invoice = (
        (invoice_at >= np.datetime64("2025-09-01T00:00:00", "s"))
        & (invoice_at < np.datetime64("2025-10-16T00:00:00", "s"))
    )
    fail_probability = np.full(n_invoices, 0.074)
    fail_probability[migration_window_invoice] = 0.218
    initial_failure = rng.random(n_invoices) < fail_probability
    retry_invoice_index = np.flatnonzero(initial_failure & (rng.random(n_invoices) < 0.74))
    payment_invoice_index = np.concatenate(
        [np.arange(n_invoices, dtype=np.int64), retry_invoice_index]
    )
    payment_attempt_number = np.concatenate(
        [np.ones(n_invoices, dtype=np.int8), np.full(len(retry_invoice_index), 2, dtype=np.int8)]
    )
    n_payments = len(payment_invoice_index)
    payment_id = _codes("PAY", n_payments)
    payment_account = invoice_account[payment_invoice_index]
    payment_at = invoice_at[payment_invoice_index] + rng.integers(
        1_800, 64_801, n_payments, dtype=np.int64
    ).astype("timedelta64[s]")
    retry_rows = payment_attempt_number == 2
    payment_at[retry_rows] += np.timedelta64(2, "D")

    payment_success = np.ones(n_payments, dtype=bool)
    payment_success[:n_invoices] = ~initial_failure
    payment_success[retry_rows] = rng.random(int(retry_rows.sum())) < 0.78
    payment_status = np.where(payment_success, "succeeded", "failed")
    payment_amount = invoice_amount[payment_invoice_index]

    raw_decline_code = np.full(n_payments, "", dtype="U24")
    failed_rows = ~payment_success
    failed_before = failed_rows & (payment_at < np.datetime64("2025-09-01T00:00:00", "s"))
    failed_after = failed_rows & (payment_at >= np.datetime64("2025-10-01T00:00:00", "s"))
    failed_mixed = failed_rows & ~(failed_before | failed_after)
    raw_decline_code[failed_before] = rng.choice(
        np.array(["card_declined", "insufficient_funds", "expired_card"]),
        int(failed_before.sum()),
        p=[0.45, 0.38, 0.17],
    )
    raw_decline_code[failed_after] = rng.choice(
        np.array(["D01", "D05", "R03", "TKN_REFRESH"]),
        int(failed_after.sum()),
        p=[0.34, 0.28, 0.19, 0.19],
    )
    if np.any(failed_mixed):
        raw_decline_code[failed_mixed] = rng.choice(
            np.array(["card_declined", "insufficient_funds", "D01", "D05", "TKN_REFRESH"]),
            int(failed_mixed.sum()),
        )

    migration_payment = (
        (payment_at >= np.datetime64("2025-09-01T00:00:00", "s"))
        & (payment_at < np.datetime64("2025-10-16T00:00:00", "s"))
    )
    payment_recorded, payment_available = _ingestion_times(
        payment_at,
        "payment",
        delayed_mask=migration_payment & failed_rows,
    )

    successful_invoice = ~initial_failure
    if len(retry_invoice_index):
        retry_success_invoice = retry_invoice_index[payment_success[n_invoices:]]
        successful_invoice[retry_success_invoice] = True
    paid_at = invoice_at + np.timedelta64(1, "h")
    paid_at[initial_failure & successful_invoice] += np.timedelta64(2, "D")
    invoice_status = np.where(successful_invoice, "paid", "past_due").astype("U12")
    future_due = due_at > np.datetime64(WORLD_END, "s")
    invoice_status[future_due & ~successful_invoice] = "open"
    voided = (~successful_invoice) & (~future_due) & (rng.random(n_invoices) < 0.08)
    invoice_status[voided] = "void"
    invoice_recorded, invoice_available = _ingestion_times(
        invoice_at,
        "invoice",
        delayed_mask=migration_window_invoice,
    )

    builder.write(
        "billing",
        "invoice",
        {
            "invoice_id": invoice_id,
            "subscription_id": subscription_id[invoice_subscription_index],
            "account_id": invoice_account,
            "billing_sequence": invoice_sequence + 1,
            "invoice_status": invoice_status,
            "amount_due_cents": invoice_amount,
            "currency": np.full(n_invoices, "USD", dtype="U3"),
            "issued_at": invoice_at,
            "due_at": due_at,
            "paid_at": nullable(paid_at, ~successful_invoice),
            "source_recorded_at": invoice_recorded,
            "warehouse_available_at": invoice_available,
        },
        description="Recurring subscription invoices with point-in-time issue, due, and settlement fields.",
        grain="One row per issued invoice",
        primary_key=["invoice_id"],
        foreign_keys=[
            {"columns": ["subscription_id"], "references": "billing.subscription"},
            {"columns": ["account_id"], "references": "crm.account"},
        ],
        owner="Billing Operations",
        reliability="verified-with-known-exceptions",
        use_when="Billed recurring revenue, collections, invoice aging, and subscription economics.",
        do_not_use_when="Do not infer cash collection from invoice_status without checking payment attempts.",
        quality_notes=["Billing-cutover invoices arrived later than normal in the warehouse."],
    )

    builder.write(
        "billing",
        "payment_attempt",
        {
            "payment_id": payment_id,
            "invoice_id": invoice_id[payment_invoice_index],
            "account_id": payment_account,
            "attempt_number": payment_attempt_number,
            "payment_status": payment_status,
            "requested_amount_cents": payment_amount,
            "settled_amount_cents": np.where(payment_success, payment_amount, 0),
            "raw_decline_code": nullable(raw_decline_code, payment_success),
            "processor": np.where(
                payment_at < np.datetime64("2025-09-01T00:00:00", "s"),
                "legacy_pay",
                "nova_pay",
            ),
            "occurred_at": payment_at,
            "source_recorded_at": payment_recorded,
            "warehouse_available_at": payment_available,
        },
        description="Every authorization or collection attempt, including failures and retries.",
        grain="One row per payment attempt",
        primary_key=["payment_id"],
        foreign_keys=[
            {"columns": ["invoice_id"], "references": "billing.invoice"},
            {"columns": ["account_id"], "references": "crm.account"},
        ],
        owner="Billing Operations",
        reliability="verified-with-known-exceptions",
        use_when="Payment success, retries, decline analysis, and cash collection timing.",
        do_not_use_when="Do not count requested_amount_cents as settled cash and do not compare raw decline codes across processors without mapping them.",
        quality_notes=[
            "Decline taxonomy changed during the September 2025 processor migration.",
            "The migration also caused a real, temporary increase in token and authorization failures.",
        ],
    )

    builder.context.update(
        {
            "subscription_id": subscription_id,
            "subscription_account": np.asarray(subscription_account),
            "subscription_site": np.asarray(subscription_site),
            "invoice_id": invoice_id,
            "invoice_account": np.asarray(invoice_account),
            "payment_id": payment_id,
            "payment_account": np.asarray(payment_account),
        }
    )

    builder.add_anomaly(
        anomaly_id="A-TXN-BILL-01",
        tables=["billing.invoice", "billing.payment_attempt"],
        date_range=["2025-09-01", "2025-10-15"],
        selector="Invoices and attempts processed during the NovaPay cutover",
        rate=f"{int(migration_window_invoice.sum()):,} invoices in the cutover window",
        root_cause="A payment-processor migration changed decline-code taxonomy, forced token refreshes, and delayed ingestion.",
        symptom="Failure rates and raw decline labels jump while some failed attempts arrive 18-120 hours late.",
        public_clue="Processor, raw code, event time, and warehouse-availability clocks are retained.",
        learning_objective="Separate a real operational incident from a simultaneous measurement-definition change.",
        allowed_invariant_violations=[
            "stable raw decline-code categories over time",
            "normal warehouse ingestion latency during cutover",
        ],
    )


def _generate_growth(builder: Any, foundation: dict[str, np.ndarray]) -> None:
    rng = rng_for("transactions:growth")
    account_id = foundation["account_id"]
    site_id = foundation["site_id"]
    site_account = foundation["site_account"]
    acquired_accounts = foundation["acquired_account"]
    order_id = builder.context["order_id"]
    order_account = builder.context["order_account"]
    order_site = builder.context["order_site"]
    order_created = builder.context["order_created"]

    n_sessions = 450_000
    linked_count = min(165_000, len(order_id))
    linked_orders = np.sort(rng.choice(len(order_id), linked_count, replace=False))
    random_count = n_sessions - linked_count
    linked_start = order_created[linked_orders] - rng.integers(
        300, 10_801, linked_count, dtype=np.int64
    ).astype("timedelta64[s]")
    linked_start = np.maximum(linked_start, np.datetime64(WORLD_START, "s"))
    random_start = random_timestamps(rng, random_count, WORLD_START, WORLD_END)
    session_start_unsorted = np.concatenate([linked_start, random_start])
    random_site_index = rng.integers(0, len(site_id), random_count, dtype=np.int64)
    session_site_unsorted = np.concatenate([order_site[linked_orders], site_id[random_site_index]])
    session_account_unsorted = np.concatenate(
        [order_account[linked_orders], site_account[random_site_index]]
    )
    converted_order_unsorted = np.full(n_sessions, "", dtype=order_id.dtype)
    converted_order_unsorted[:linked_count] = order_id[linked_orders]
    anonymous_unsorted = np.zeros(n_sessions, dtype=bool)
    anonymous_unsorted[linked_count:] = rng.random(random_count) < 0.38

    sort_order = np.argsort(session_start_unsorted, kind="stable")
    session_start = session_start_unsorted[sort_order]
    session_site = session_site_unsorted[sort_order]
    session_account = session_account_unsorted[sort_order]
    converted_order = converted_order_unsorted[sort_order]
    anonymous = anonymous_unsorted[sort_order]
    converted = converted_order != ""
    session_id = _codes("SES", n_sessions)
    account_strings = np.asarray(account_id).astype(str)
    session_account_strings = np.asarray(session_account).astype(str)
    account_sort = np.argsort(account_strings, kind="stable")
    sorted_accounts = account_strings[account_sort]
    account_positions = np.searchsorted(sorted_accounts, session_account_strings)
    if np.any(account_positions >= len(sorted_accounts)):
        raise ValueError("Every session account must resolve to the account_id foundation array")
    if np.any(sorted_accounts[account_positions] != session_account_strings):
        raise ValueError("Every session account must resolve to the account_id foundation array")
    session_account_index = account_sort[account_positions]
    visitor_number = (
        session_account_index.astype(np.int64) * 2
        + rng.integers(0, 2, n_sessions, dtype=np.int64)
        + 1
    )
    visitor_number[anonymous] = (
        len(account_id) * 2 + np.arange(n_sessions, dtype=np.int64)[anonymous] + 1
    )
    visitor_id = np.char.mod("VIS%08d", visitor_number)
    session_account_context = session_account.copy()
    session_account_context[anonymous] = ""

    channel = rng.choice(
        np.array(["organic_search", "paid_search", "email", "direct", "partner", "social"]),
        n_sessions,
        p=[0.29, 0.19, 0.16, 0.20, 0.07, 0.09],
    )
    device_type = rng.choice(
        np.array(["mobile", "desktop", "tablet"]),
        n_sessions,
        p=[0.57, 0.36, 0.07],
    )
    session_recorded, session_available = _ingestion_times(
        session_start, "session", available_minutes=(10, 240)
    )
    acquired_session = np.isin(session_account, acquired_accounts)
    acquisition_tracking_window = (
        acquired_session
        & (session_start >= np.datetime64("2024-04-01T00:00:00", "s"))
        & (session_start < np.datetime64("2024-07-01T00:00:00", "s"))
    )
    visitor_id[acquisition_tracking_window] = np.char.mod(
        "HVIS%06d",
        np.arange(int(acquisition_tracking_window.sum()), dtype=np.int64) % 1_200,
    )

    experiment_id = _codes("EXP", 8, width=3)
    experiment_name = np.array(
        [
            "guided_checkout",
            "annual_plan_prompt",
            "service_badge",
            "bundle_recommendation",
            "mobile_navigation",
            "priority_install_copy",
            "retention_offer",
            "holiday_delivery_banner",
        ]
    )
    experiment_start = np.array(
        [
            "2023-04-01", "2023-09-01", "2024-02-01", "2024-08-01",
            "2025-01-01", "2025-04-15", "2025-08-01", "2025-10-15",
        ],
        dtype="datetime64[D]",
    )
    experiment_end = np.array(
        [
            "2023-07-31", "2023-12-31", "2024-06-30", "2024-11-30",
            "2025-04-30", "2025-07-31", "2025-10-31", "2025-12-31",
        ],
        dtype="datetime64[D]",
    )
    primary_metric = np.array(
        [
            "checkout_completion", "plan_start", "product_detail_click", "bundle_attach",
            "pages_per_session", "install_booking", "retained_30d", "checkout_completion",
        ]
    )
    builder.write(
        "growth",
        "experiment",
        {
            "experiment_id": experiment_id,
            "experiment_name": experiment_name,
            "start_date": experiment_start,
            "end_date": experiment_end,
            "primary_metric": primary_metric,
            "assignment_unit": np.full(8, "session", dtype="U8"),
            "status": np.full(8, "completed", dtype="U10"),
        },
        description="Registry of customer-growth experiments and their predeclared primary metrics.",
        grain="One row per experiment",
        primary_key=["experiment_id"],
        owner="Growth Science",
        use_when="Experiment metadata, active windows, and metric definitions.",
        do_not_use_when="Do not infer assignment or outcomes from the registry alone.",
    )

    assignment_session_parts: list[np.ndarray] = []
    assignment_experiment_parts: list[np.ndarray] = []
    for index in range(len(experiment_id)):
        eligible = np.flatnonzero(
            (session_start.astype("datetime64[D]") >= experiment_start[index])
            & (session_start.astype("datetime64[D]") <= experiment_end[index])
        )
        take = min(42_000, len(eligible))
        chosen = rng.choice(eligible, take, replace=False)
        assignment_session_parts.append(chosen)
        assignment_experiment_parts.append(np.full(take, index, dtype=np.int16))
    assignment_session_index = np.concatenate(assignment_session_parts)
    assignment_experiment_index = np.concatenate(assignment_experiment_parts)
    assignment_sort = np.argsort(session_start[assignment_session_index], kind="stable")
    assignment_session_index = assignment_session_index[assignment_sort]
    assignment_experiment_index = assignment_experiment_index[assignment_sort]
    n_assignments = len(assignment_session_index)
    assignment_id = _codes("EAS", n_assignments)
    variant = np.where(rng.random(n_assignments) < 0.5, "control", "treatment")
    assigned_at = session_start[assignment_session_index]
    exposed_at = assigned_at + rng.integers(2, 181, n_assignments, dtype=np.int64).astype(
        "timedelta64[s]"
    )
    assignment_recorded, assignment_available = _ingestion_times(
        exposed_at, "experiment-assignment"
    )
    builder.write(
        "growth",
        "experiment_assignment",
        {
            "assignment_id": assignment_id,
            "experiment_id": experiment_id[assignment_experiment_index],
            "session_id": session_id[assignment_session_index],
            "account_id": nullable(
                session_account[assignment_session_index],
                anonymous[assignment_session_index],
            ),
            "variant": variant,
            "assigned_at": assigned_at,
            "first_exposed_at": exposed_at,
            "source_recorded_at": assignment_recorded,
            "warehouse_available_at": assignment_available,
        },
        description="Randomized experiment assignment and first-exposure records at session grain.",
        grain="One row per experiment-session assignment",
        primary_key=["assignment_id"],
        foreign_keys=[
            {"columns": ["experiment_id"], "references": "growth.experiment"},
            {"columns": ["session_id"], "references": "growth.session"},
            {
                "columns": ["account_id"],
                "references": "crm.account",
                "nullable": True,
            },
        ],
        owner="Growth Science",
        use_when="Intent-to-treat experiment analysis using the declared assignment unit.",
        do_not_use_when="Do not join to web events without first preserving assignment grain; that creates event-count weighting.",
    )

    treated_session = np.zeros(n_sessions, dtype=bool)
    navigation_treatment = (variant == "treatment") & (assignment_experiment_index == 4)
    treated_session[assignment_session_index[navigation_treatment]] = True
    web_event_count = rng.choice(
        np.array([2, 3, 4], dtype=np.int8),
        n_sessions,
        p=[0.35, 0.45, 0.20],
    )
    # The navigation treatment deliberately has a small real effect on depth;
    # this is process behavior, not a post-generation label edit.
    web_event_count = np.minimum(web_event_count + treated_session.astype(np.int8), 5)
    session_duration_seconds = (
        web_event_count.astype(np.int64) * rng.integers(35, 181, n_sessions, dtype=np.int64)
    )
    builder.write(
        "growth",
        "session",
        {
            "session_id": session_id,
            "visitor_id": visitor_id,
            "account_id": nullable(session_account, anonymous),
            "site_id": nullable(session_site, anonymous),
            "acquisition_channel": channel,
            "device_type": device_type,
            "event_count": web_event_count,
            "session_duration_seconds": session_duration_seconds,
            "converted_order_id": nullable(converted_order, ~converted),
            "started_at": session_start,
            "source_recorded_at": session_recorded,
            "warehouse_available_at": session_available,
        },
        description="Web and mobile sessions, including anonymous visits and attributable order conversions.",
        grain="One row per digital session",
        primary_key=["session_id"],
        foreign_keys=[
            {
                "columns": ["account_id"],
                "references": "crm.account",
                "nullable": True,
            },
            {
                "columns": ["site_id"],
                "references": "crm.service_site",
                "referenced_columns": ["service_site_id"],
                "nullable": True,
            },
            {
                "columns": ["converted_order_id"],
                "references": "commerce.order",
                "referenced_columns": ["order_id"],
                "nullable": True,
            },
        ],
        owner="Digital Analytics",
        reliability="verified-with-known-exceptions",
        use_when="Traffic, attribution, digital funnel, conversion, and experiment analysis.",
        do_not_use_when="Do not equate visitor_id with a person; acquisition cutover reset and reused some identifiers.",
        quality_notes=["HarborHome visitor identifiers were reset during acquisition integration."],
    )

    web_session_index = np.repeat(np.arange(n_sessions, dtype=np.int64), web_event_count)
    n_web_events = len(web_session_index)
    web_event_starts = np.cumsum(web_event_count, dtype=np.int64) - web_event_count
    web_event_position = np.arange(n_web_events, dtype=np.int64) - np.repeat(
        web_event_starts, web_event_count
    )
    web_event_id = _codes("WEB", n_web_events, width=8)
    web_event_type = rng.choice(
        np.array(["product_view", "search", "add_to_cart", "plan_view", "support_view"]),
        n_web_events,
        p=[0.42, 0.17, 0.16, 0.15, 0.10],
    )
    first_event = web_event_position == 0
    last_event = web_event_position == (web_event_count[web_session_index] - 1)
    web_event_type[first_event] = "page_view"
    converted_last = last_event & converted[web_session_index]
    web_event_type[converted_last] = "purchase"
    event_offset_seconds = web_event_position * 120 + rng.integers(
        0, 61, n_web_events, dtype=np.int64
    )
    event_offset_seconds[first_event] = 0
    web_event_at = session_start[web_session_index] + event_offset_seconds.astype(
        "timedelta64[s]"
    )
    web_recorded, web_available = _ingestion_times(
        web_event_at, "web-event", available_minutes=(10, 300)
    )
    page_path = np.select(
        [
            web_event_type == "purchase",
            web_event_type == "add_to_cart",
            web_event_type == "plan_view",
            web_event_type == "support_view",
            web_event_type == "search",
        ],
        ["/checkout/complete", "/cart", "/plans", "/support", "/search"],
        default="/products/detail",
    )
    page_path[first_event] = "/home"
    builder.write(
        "growth",
        "web_event",
        {
            "web_event_id": web_event_id,
            "session_id": session_id[web_session_index],
            "event_sequence": web_event_position + 1,
            "event_type": web_event_type,
            "page_path": page_path,
            "occurred_at": web_event_at,
            "source_recorded_at": web_recorded,
            "warehouse_available_at": web_available,
        },
        description="Ordered digital interaction events emitted within customer sessions.",
        grain="One row per web or app interaction event",
        primary_key=["web_event_id"],
        foreign_keys=[{"columns": ["session_id"], "references": "growth.session"}],
        owner="Digital Analytics",
        use_when="Pathing, funnel, engagement, and experiment-outcome analysis.",
        do_not_use_when="Do not join directly to experiment assignments and aggregate rows without controlling event-count fanout.",
        quality_notes=["Event volume is an outcome and should not be mistaken for independent sampling units."],
    )

    builder.context.update(
        {
            "session_id": session_id,
            "session_account": np.asarray(session_account_context),
            "experiment_id": experiment_id,
        }
    )

    builder.add_anomaly(
        anomaly_id="A-TXN-ACQ-02",
        tables=["growth.session"],
        date_range=["2024-04-01", "2024-06-30"],
        selector="HarborHome digital sessions during identity-platform cutover",
        rate=f"{int(acquisition_tracking_window.sum()):,} sessions",
        root_cause="The acquired site issued new visitor identifiers and omitted its former tenant namespace.",
        symptom="One customer can appear under multiple visitor IDs, while a subset of legacy-style IDs repeat.",
        public_clue="Account attribution, visitor IDs, and cutover dates permit a scoped identity-quality audit.",
        learning_objective="Choose an analytical identity grain rather than assuming a browser identifier is a person.",
        allowed_invariant_violations=["visitor_id uniqueness across the acquisition cutover"],
    )


def generate_transactions(builder: Any) -> None:
    """Generate coherent commerce, billing, and growth transaction domains.

    Foundation dimensions must already have populated account, site, and product
    context arrays. This function publishes NumPy context arrays used by service,
    support, finance, and analytical-snapshot generators downstream.
    """
    foundation = _foundation(builder)
    _generate_commerce(builder, foundation)
    _generate_billing(builder, foundation)
    _generate_growth(builder, foundation)
