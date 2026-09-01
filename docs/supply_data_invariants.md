# Supply-domain generator invariants

This document records the exact generator contracts behind the synthetic supply
estate. These are validation and instructor-support facts, not a learner answer
key. They describe what the generator guarantees while preserving the
investigative work needed to choose grains, reconstruct demand, define forecast
windows, and communicate uncertainty.

## Technical events and physical movements

`supply.inventory_movement` has a technical-event grain. The generated table
contains 520,000 rows:

- 517,600 physical movements, including one opening balance for each of the
  2,160 warehouse-product pairs; and
- exactly 2,400 November 2025 scanner replay rows.

Every replay row has `scanner_replay_flag = true` and a non-null
`replay_of_inventory_movement_id`. The link resolves to one distinct,
non-replay original. A replay and its original have identical warehouse,
product, movement time, movement type, quantity, business reference, and
scanner device. The replay is posted later. Non-replay rows have a null replay
link.

The defensible physical ledger is therefore the movement table after excluding
`scanner_replay_flag` rows. The duplicate technical records remain present so a
learner must distinguish event identity from physical-movement identity rather
than receiving a pre-deduplicated source.

## Goods receipts and purchase orders

Each generated purchase order has four unique line numbers. Every line product
is an approved product for the header vendor in `supply.product_vendor`.

`supply.goods_receipt.received_quantity` is gross quantity presented at the
dock. `rejected_quantity` is the rejected subset, so accepted quantity is:

```text
received_quantity - rejected_quantity
```

The generator guarantees that rejected quantity is non-negative and never
exceeds received quantity. Some receipt rows contain rejected units, and some
purchase-order lines have multiple receipt events. A split line's accepted
quantities sum to its realized accepted total.

Every goods receipt links to exactly one non-replay `RECEIPT` inventory movement
through `inventory_movement.goods_receipt_id`. That movement has the same
warehouse, product, and timestamp, and its `quantity_delta` equals accepted—not
gross—quantity. A scanner replay may repeat the technical receipt event, but it
is excluded from the physical posting invariant.

Purchase-order status is derived from the accepted receipt rollup:

| Status | Exact generator condition |
|---|---|
| `RECEIVED` | Net ordered quantity is positive and accepted quantity equals it. |
| `PARTIAL` | Accepted quantity is positive and below net ordered quantity. |
| `OPEN` | Net ordered quantity is positive and accepted quantity is zero. |
| `CANCELLED` | Net ordered quantity and accepted quantity are both zero. |

## Realized lead time

Line promises begin with the approved product-vendor contract lead time.
Realized receipt time varies around that promise according to supplier risk and
an independently generated disruption component. Generated realized lead time
is bounded to 1–90 days. The frozen estate contains both early receipts and
receipts more than a week late; it is not a disguised copy of promised lead
time.

For lines with multiple receipts, realized lead time for line-level supplier
analysis normally uses the final receipt. First-receipt and final-receipt lead
times answer different operational questions and should not be silently
interchanged.

## Physical inventory positions

`supply.inventory_position_daily` contains 330,000 unique
warehouse-product-snapshot-date rows sampled without replacement between
2024-01-01 and 2025-12-31. It is deliberately not a complete date spine.

For every sampled position, `on_hand_quantity` equals the cumulative sum of all
non-replay movement deltas for that warehouse and product through the end of the
snapshot date. Opening-balance movements make the ledger self-contained and
keep generated physical balances non-negative.

For each declared window of 7, 14, 30, 60, and 90 days:

- `demand_units_{window}d` equals the absolute quantity of non-replay `ISSUE`
  movements in the inclusive trailing window; and
- `receipt_units_{window}d` equals accepted quantity from non-replay `RECEIPT`
  movements in the same window.

`on_order_quantity` is also generated from ordered net quantities less accepted
receipts observable by the snapshot date. `stockout_hours_*` remains an
operational shortfall estimate; it is not asserted as a physical-ledger
identity.

## Demand process

Demand is carried by physical `ISSUE` movements, not by an independently drawn
snapshot feature.

Product families use deterministic generator assignments based on product
position:

- one fifth are intermittent and lumpy;
- one fifth have a winter peak;
- one fifth have a summer peak; and
- the remainder provide less strongly seasonal comparison products.

Intermittent-product issues can occur only on two product-specific active days
in each 19-day cycle. Absence of an issue row is a zero-demand day, so a learner
must construct an appropriate calendar spine rather than treat event rows as a
complete daily series.

Winter and summer families retain random event quantities, but the generator
applies materially larger demand factors in their respective peak months. The
validation suite checks the realized frozen data, not merely the generator
formula: peak mean issue quantity must exceed twice the corresponding off-peak
mean for both families.

## Deterministic validation boundary

The validation suite verifies exact data-generation facts:

- replay/link agreement and field-for-field replay pairing;
- rejected-quantity bounds, split receipts, and PO status reconciliation;
- one physical accepted-quantity posting per goods receipt;
- approved vendor-product combinations;
- realized early and late lead-time variation;
- unique inventory-position business grain;
- zero mismatches between sampled on-hand and the physical ledger;
- zero mismatches across all declared demand and receipt windows;
- zero intermittent-demand active-day violations; and
- a realized seasonal peak/off-peak ratio greater than two for both seasonal
  families.

These checks establish generator integrity. They do not grade whether a learner
chose the right forecast horizon, aggregation grain, validation design, loss
function, or business recommendation.
