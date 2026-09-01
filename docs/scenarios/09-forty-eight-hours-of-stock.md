# Forty-Eight Hours of Stock

> Simulation design brief. The **Private instructor truth** section and reveal
> mechanics are authoring material and must not appear in the learner workspace.

## Simulation card

| Field | Design |
|---|---|
| Learner role | Supply Planning Data Scientist embedded with Supply Chain Planning, Procurement, and Warehouse Operations |
| Organizational moment | Monday, 2025-12-01, 06:45 ET. An overnight workbook says several SKU/warehouse positions have less than 48 hours of cover, the 07:30 supply call is approaching, and December service demand is beginning. |
| Initial request | Produce a 21-day SKU/warehouse inventory-risk outlook and a constrained action file recommending hold, transfer, expedite, substitute, or manual review. Explain which parts of the “48 hours” alert survive reconciliation. |
| Timebox | 12-18 hours for a prepared learner; 20-30 hours for a newer learner. It works well as a six-hour data build followed by a forecasting/simulation session and an operations handoff. |
| Primary level | Advanced forecasting, inventory-risk simulation, and operational decision design |
| Decision pressure | Planners have limited transfer lanes, expedite capacity, approval bandwidth, and budget. A false alarm wastes freight and destabilizes donor warehouses; a missed lumpy requirement can strand field work. |
| Analysis cutoff | 2025-12-01 06:45 ET. The historical daily series ends on 2025-11-30 and the forecast window is 2025-12-01 through 2025-12-21 inclusive. Scenario artifacts define the approved opening balance and timestamp convention; later movements, receipts, snapshots, and outcomes in the frozen extract are future information. |

## Role and organizational moment

The learner joins the corporate supply room before the Monday planning call. A
buyer has circulated a workbook that divides a sampled inventory position by
average demand on issue days and labels the result “days of stock.” It flags a
mixed watchlist of replacement parts, consumables, equipment, and accessories
across all three distribution centers. The headline may be directionally useful,
wrong, or right for the wrong reasons.

The underlying estate is much larger than the workbook. Stock is represented by
technical movement events, including scanner replays; the daily position extract
is sparse; no issue row can mean zero demand; purchase-order lines can arrive in
parts and include rejected units; and vendor lead time is a distribution rather
than the promise printed on one order. Some demand is intermittent, some is
seasonal, and some is less structured. Those differences matter more than a
single leaderboard forecast score.

The learner must build a reconciled SQL evidence layer, then make Python the core
analytical environment for rolling-origin backtests, demand-path generation,
lead-time uncertainty, and inventory-risk simulation. The goal is not to name a
universal winning forecaster. It is to make a time-bounded supply decision while
showing what can and cannot be known.

## Initial request

The Vice President of Supply Chain writes:

> The overnight file says we have less than 48 hours on several items. Give me a
> 21-day view by item and warehouse before the supply call. Tell us what to move,
> expedite, substitute, or leave alone. We have a fixed freight budget, limited
> buyer calls, and we cannot create a shortage at the donor warehouse to solve
> one here. I need probabilities and ranges, not a point forecast dressed up as
> certainty.

Opening artifacts should include:

- a watchlist at one row per `warehouse_id` and `product_id`, showing the product
  name/SKU, planner ownership, the workbook's claimed cover, and a reason the
  pair entered review—but not a correct action;
- a 06:30 controller-approved opening-balance file for the watchlist, with the
  authoritative decision timestamp and source convention stated explicitly;
- the workbook SQL or calculation notes that produced the “under 48 hours”
  label;
- a 21-day action-constraint sheet defining transfer lanes and lead times,
  available freight and expedite budget, buyer-review slots, donor reserve
  policy, and maximum actions;
- a product/substitution approval note explaining that some approved substitutes
  still require customer or technical approval; and
- a vendor-contact bulletin containing only information approved for the 06:45
  decision. Later receipt outcomes must not be included.

The scenario compiler should select a stable, versioned watchlist large enough
to include intermittent, winter-peaking, summer-peaking, and comparison histories
at more than one warehouse. It should retain the real `catalog.product` names and
SKUs rather than renaming rows “Product A.” Selection criteria may be published;
the watchlist must not encode a hidden correct action.

## Data neighborhood

The full catalog remains searchable. These are the intended nearby assets, not a
mandatory recipe.

| Asset | What one row means | Why it may matter | Important caution |
|---|---|---|---|
| `supply.inventory_movement` | One posted technical inventory event | Reconstructs physical on-hand, issues, returns, receipts, adjustments, and transfer movements | Scanner replay rows are exact technical repeats linked to an original. Exclude replays from the physical ledger, but retain them in an audit. `posted_at` and `movement_at` answer different time questions. |
| `supply.inventory_position_daily` | One sampled warehouse/product/date position | Supplies reconciled sampled on-hand and trailing demand/receipt fields for audit | It is a sparse sample, not a daily spine. `stockout_hours_*` is an operational estimate, not a physical identity or forecast label. |
| `supply.purchase_order` | One purchase-order header | Supplies vendor, destination warehouse, order date, expected date, and current status | Header status is not line quantity. Current frozen status can contain information unavailable at an earlier forecast origin. |
| `supply.purchase_order_line` | One product line on a purchase order | Supplies ordered/cancelled quantity, price, and line promise | Join receipts and header attributes only after preserving line grain. Four lines per order mean header joins can multiply quantities. |
| `supply.goods_receipt` | One receipt event for one PO line | Supports accepted quantity, split receipts, inspection, and realized lead-time analysis | `received_quantity` is gross presented quantity. Accepted quantity is gross minus rejected; one line may have several receipts. |
| `supply.product_vendor` | One approved product/vendor sourcing relationship | Supplies effective sourcing options, contract cost, lead time, primary flag, and minimum order quantity | Contract lead time is a promise, not realized uncertainty. Apply effective dates and do not assume the primary vendor is the only defensible option. |
| `supply.vendor` | One supplier or service vendor | Supplies risk tier and standard terms for pooling lead-time evidence | A risk tier can support grouping, but it does not prove the future performance of one vendor or order. |
| `supply.warehouse` | One distribution center | Defines the three stock locations, regions, and warehouse timezones | A warehouse is not a branch or customer destination. Cross-timezone cutoffs need one stated convention. |
| `catalog.product` | One product/SKU | Supplies product name, type, lifecycle state, and unit cost | Product type does not reveal its demand process. Current master attributes still require an as-of decision rule where effective dates matter. |
| `catalog.product_substitution` | One ranked approved substitute for a requested product | Defines feasible substitution candidates and approval requirements | Approval is effective-dated. A listed substitute does not prove equivalent customer impact or available stock. |
| `core.business_calendar` | One calendar date | Provides the complete date spine needed to represent zero-demand days | Cross-join only the declared warehouse/product cohort and analysis interval; the full Cartesian estate is unnecessary. |

Transfer movements share a business reference but remain signed technical events.
The learner should reconcile them before using historical transfers as evidence;
the scenario does not grant that every plausible matching rule is physically
correct.

## Python and SQL roles

### SQL owns the reconciled, point-in-time evidence layer

SQL should produce small governed facts with explicit grain and cutoff:

1. `physical_movement_fact`: non-replay movements with event and posting time,
   signed physical quantity, movement class, business reference, and audit link
   back to the source technical event.
2. `demand_daily`: a complete date-by-warehouse-by-product spine for the declared
   cohort, with absent issue events represented as zero and returns/adjustments
   kept separate rather than netted into demand.
3. `inventory_opening`: cumulative physical ledger by decision cutoff, reconciled
   to sampled position rows where a comparable snapshot exists and to the
   controller-approved scenario opening balance.
4. `po_line_asof`: one row per purchase-order line and forecast origin, containing
   net ordered quantity, accepted quantity known by that origin, remaining
   quantity, first/final accepted receipt times when matured, promise, vendor,
   destination, and status provenance.
5. `vendor_lead_time_history`: matured line-level lead-time evidence, with first
   and final receipt definitions kept distinct and rejected quantity handled
   explicitly.
6. `action_options`: effective vendor, minimum-order, substitution, open-line,
   warehouse, transfer-lane, and approval facts available at 06:45.

SQL should not fit a forecasting model, choose the best action, or silently fill
unknown future receipt dates. It creates the auditable inputs and reconciliation
evidence on which Python depends.

### Python owns forecasting, uncertainty, and constrained decisions

Python should:

- profile demand behavior at SKU/warehouse grain and compare at least one simple
  all-days baseline with an intermittent-demand baseline such as Croston/SBA,
  TSB, an occurrence-size decomposition, or a justified equivalent;
- run expanding or rolling-origin backtests with a 21-day horizon and several
  origins, keeping model choice and tuning inside the training side of each fold;
- report more than one view of error, including scale-aware and decision-aware
  evidence. MAE, bias, WAPE/MASE where defined, pinball loss, service shortfall,
  and inventory cost answer different questions;
- produce non-negative demand paths or coherent predictive quantiles rather than
  treating one point forecast as the future;
- estimate or resample realized final-receipt lead-time uncertainty using a
  defensible pooling rule when a SKU/vendor history is sparse;
- simulate the 21-day inventory path from the approved opening balance under
  demand, receipt timing/acceptance, transfer, and substitution assumptions;
- summarize stockout probability, shortage units, time at risk, remaining-stock
  distribution, and relevant cost for every watchlist pair; and
- emit a seeded, reproducible action file that obeys the supplied budget,
  capacity, effective-date, minimum-order, donor-reserve, and approval rules.

The Python package may use vectorized NumPy/pandas simulation, a transparent
forecasting library available in the fixed runtime, or learner-written methods.
No package or estimator is mandatory. If empirical evidence cannot support a
probability model for a thin series, a conservative scenario range and manual
review can be more defensible than false precision.

## Timeline and reveals

Reveals should respond to learner evidence or use the timed fallback. They add
operational context without disclosing a preferred forecaster or action set.

### 1. The 48-hour workbook reproduces — opening

The spreadsheet calculation can be reproduced, but it averages demand only on
days with issue rows and uses whichever sampled position happens to be latest
for each pair. It does not prove that those rows describe the same date or that
zero-demand days were included.

### 2. The scanner sent some events twice — evidence-triggered or minute 45

When the movement ledger does not reconcile, Warehouse Systems shares the
November incident note. Replayed events have their own technical IDs and posting
times but link to the original physical movement. Deleting every apparent
duplicate by a broad value-based rule could also delete legitimate repeated
work.

### 3. “Daily” is a sampled extract — evidence-triggered or minute 80

Supply Analytics confirms that `inventory_position_daily` is a unique sparse
sample assembled for operational reporting. A missing position row is not a
zero-stock day. The calendar and physical movement ledger must carry the daily
series.

### 4. The dock received it; inventory did not accept all of it — after the first PO reconciliation

Warehouse Operations explains gross, rejected, and accepted receipt quantity.
Some lines were delivered in more than one receipt. A first receipt may restore
some supply, while final receipt time answers whether the line was completely
fulfilled.

### 5. The ETA is not a distribution — after the first forecast or hour 4

Procurement asks the learner to replace promised or contract lead time with an
honest uncertainty treatment. Sparse SKU/vendor combinations may require
pooling by vendor, risk tier, or another disclosed hierarchy. The learner must
show how that choice changes stockout risk.

### 6. Pick the winning metric — after the first backtest table

A planning manager asks which model “wins.” One method has better unit MAE,
another has less bias on intermittent items, and a third protects high-cost
shortages at the expense of stock. The learner must define the decision loss and
retain performance by meaningful series type rather than crown a universal
model from one aggregate.

### 7. A transfer can move the shortage — after the first action file

The warehouse directors apply the constraint sheet: donor reserve must survive
the same risk simulation; lane and handling capacity are limited; minimum order
quantities still apply; and some substitutions require approval. The action file
must be regenerated, not patched by prose.

### 8. The executive stress test — final reveal

Leadership asks for the decision under a documented winter-demand stress and a
vendor-delay stress. These are scenarios, not new truths. The learner must show
which actions remain stable, which become review cases, and which assumptions
would change the recommendation before money moves.

## Authentic work products

1. `supply_evidence_layer.sql`, or equivalent modular SQL, producing the complete
   demand spine, physical movement fact, reconciled opening inventory, as-of PO
   line fact, matured lead-time history, and action-option fact.
2. A reconciliation report showing technical versus physical movement counts,
   replay handling, ledger-to-sampled-position comparisons, demand-window checks,
   receipt acceptance, split-line handling, and row counts through every join.
3. A Python forecasting package or notebook with all-days and intermittent-demand
   baselines, rolling-origin folds, per-series and portfolio evaluation, and a
   declared selection or ensemble policy.
4. A seeded Python inventory-risk simulator that combines demand paths, approved
   opening balances, accepted supply, uncertain final lead times, and candidate
   actions over 21 days.
5. `inventory_risk_21d.parquet`, one row per watchlist warehouse/product, with
   model/version, forecast origin, demand quantiles, stockout probability,
   shortage and ending-stock distributions, expected cost, and data-quality
   flags.
6. `supply_actions.csv`, one row per proposed action, containing warehouse and
   product, `action_code`, integer quantity, source warehouse/PO line/substitute
   references where applicable, expected cost, risk before/after, approval state,
   decision owner, rationale code, and model/run identifier.
7. A forecast/model card documenting series construction, zero policy, forecast
   horizon, fold dates, baselines, metric tradeoffs, uncertainty construction,
   pooling, limitations, and reproducibility controls.
8. A two-page supply-call brief and decision log explaining which 48-hour alerts
   survived, the constrained actions, stable versus assumption-sensitive choices,
   monitoring, expiration time, and conditions for human override.

## Ambiguity and defensible outcome space

Several different recommendation sets can be defensible:

- transfer a limited quantity when both recipient risk and donor reserve remain
  acceptable across disclosed demand paths;
- expedite an eligible open or partial line when delay uncertainty, shortage
  cost, remaining accepted quantity, budget, and buyer capacity support it;
- propose an effective substitute with explicit customer/technical approval and
  separate demand impact rather than pretending units are automatically
  interchangeable;
- hold inventory and monitor because the 48-hour alert disappears after a
  complete date spine and physical reconciliation;
- reserve scarce action capacity for high-consequence uncertainty rather than
  the largest point forecast; or
- route a thin or unstable series to manual review because the estate cannot
  support a trustworthy probability estimate.

There is no hidden best forecast metric, required model family, stockout
threshold, or correct portfolio of actions. It is not defensible to count
scanner replays as stock movements, train on issue-event rows as if they were a
daily series, use future receipts or snapshots, call expected date a confidence
interval, optimize only average forecast error, or solve a recipient shortage by
creating an unmodeled donor shortage.

## Private instructor truth

The repaired supply estate guarantees the following mechanisms. These are
instructor evidence, not a target answer:

1. **Technical events are not physical movements.** The 520,000-row movement
   table contains 517,600 physical rows and 2,400 November 2025 scanner replays.
   Every replay links one-to-one to a distinct non-replay original with identical
   physical fields and a later posting. The defensible physical ledger excludes
   `scanner_replay_flag=true`; a broad value deduplication is not required.
2. **The sampled positions reconcile but do not form a spine.** There are 330,000
   unique sampled warehouse/product/date positions. On every sampled date,
   `on_hand_quantity` equals cumulative non-replay physical movement through that
   date. The 7/14/30/60/90-day demand and receipt fields also reconcile exactly
   to physical issue and accepted-receipt movements. Missing snapshot rows remain
   missing observations, not zero stock.
3. **The demand challenge is real.** One fifth of products are intermittent and
   lumpy, with issues possible only on two product-specific days in a 19-day
   cycle. One fifth have a winter peak, one fifth a summer peak, and the
   remainder provide less strongly seasonal comparisons. In the released data,
   winter and summer peak issue means each exceed twice their off-peak means.
   Absence of an issue event is a zero-demand day.
4. **Gross receipts are not usable receipts.** `received_quantity -
   rejected_quantity` is accepted stock. The released estate has receipt rows
   with rejected units and 16,080 purchase-order lines with split receipt events.
   Every receipt posts accepted quantity exactly once to a non-replay `RECEIPT`
   movement with the same warehouse, product, and timestamp.
5. **Purchase-order status reconciles to accepted quantity.** At purchase-order
   header grain, `RECEIVED` means net ordered quantity is fully accepted,
   `PARTIAL` means it is partly accepted, `OPEN` means it is positive with no
   accepted quantity, and `CANCELLED` means net and accepted quantity are both
   zero. Every PO line product is approved for the header vendor. Those facts
   establish data integrity, not a required action.
6. **Realized lead time varies.** Among received lines, the observed final-receipt
   lead time spans 1 to 83 days; the estate contains both early receipts and many
   receipts more than seven days late. Final receipt time and first receipt time
   answer different questions. A promise-date-only simulation is knowingly
   under-specified.
7. **No generated mechanism chooses the winner.** The generator does not encode
   a preferred forecast metric, estimator, uncertainty method, threshold, or
   transfer/expedite/substitution portfolio. Future realized demand can support a
   retrospective lesson after the exercise, but it is not a secret rubric for
   grading the 06:45 decision.

The strongest submission may use Croston/SBA, TSB, a hurdle or count model,
empirical bootstrapping, a seasonal naive method, an ensemble, or a simpler
policy by series. Instructor review should reward construction of zeros,
rolling-origin honesty, distributional calibration, risk/cost reasoning,
constraint compliance, and visible uncertainty—not an algorithm brand.

These truths come from the validated generator contracts in
[`supply_data_invariants.md`](../supply_data_invariants.md). Do not place that
document or this section in the learner workspace. If the supply generator or
watchlist version changes, rerun the exact invariant suite and version this pack;
do not retain fixture counts or expected conclusions silently.

## Planted traps

- Summing all movement rows and treating scanner replays as additional physical
  demand, receipt, transfer, or adjustment.
- Deduplicating on a loose set of equal values instead of using the explicit
  replay flag/link, thereby deleting legitimate repeated movements.
- Using `posted_at` as demand day without discussing event time and decision
  observability.
- Treating the latest available sampled position for every pair as if all pairs
  share one snapshot date.
- Filling absent `inventory_position_daily` rows with zero stock.
- Modeling only issue-event days and inflating average daily demand by dropping
  structural zeros.
- Using a random train/test split or letting later dates tune a model scored on
  earlier forecast origins.
- Comparing only portfolio RMSE or WAPE and hiding bias or failure on intermittent
  and high-consequence series.
- Selecting a model on the final untouched rolling-origin fold.
- Allowing negative forecasts or incoherent quantiles without a documented
  transformation.
- Treating a p90 demand forecast as a 90% service guarantee without simulating
  inventory and supply uncertainty.
- Joining PO headers, lines, and receipt events directly and multiplying ordered
  quantity or cost.
- Treating gross receipt quantity as accepted stock or first receipt as full
  fulfillment.
- Using frozen current PO status or future receipt facts at historical forecast
  origins.
- Replacing realized lead-time uncertainty with `expected_date`, promised date,
  contract lead time, or one portfolio average.
- Sampling demand and lead time independently without stating that assumption or
  testing stress dependence.
- Treating an effective substitution record as proof of unrestricted operational
  equivalence.
- Recommending a transfer without simulating the donor's reserve and lane
  capacity.
- Optimizing the action file without an untouched recomputation of its budget,
  quantities, references, and approvals.

## Scaffold levels

### Supported

- A SQL project supplies empty contracts for the physical movement fact, complete
  demand spine, PO-line as-of fact, lead-time history, and action options.
- Starter queries demonstrate a calendar cross join for a two-SKU fixture, an
  explicit replay audit, and receipt pre-aggregation without completing the
  learner's watchlist mart.
- A Python shell includes fold-boundary utilities, a mean/all-zero baseline,
  interfaces for an intermittent-demand method, quantile evaluation, and a
  seeded inventory-path simulator with key functions left incomplete.
- Small hand-checkable fixtures cover one intermittent series, a split/rejected
  receipt, and a donor/recipient constraint.
- Reconciliation, forecast-card, action-file, and supply-call templates are
  preloaded.

### Guided

- The learner receives the data neighborhood, watchlist, approved opening
  balance, cutoff convention, action constraints, and a rolling-origin calendar.
- Hints appear when replays enter the physical ledger, the daily spine loses
  zero-demand dates, PO joins fan out, gross receipts enter stock, quantiles cross,
  future rows cross an origin, or an action violates an exact supplied constraint.
- Demand classification, pooling, forecasters, metrics, simulation distributions,
  stress assumptions, and final actions remain learner-owned.

### Independent

- Only the executive request, overnight workbook, watchlist, opening balance,
  constraint sheet, vendor bulletin, catalog, and SQL/Python workbench are
  supplied.
- The learner defines all facts, fold origins, baselines, evaluation, uncertainty,
  inventory simulation, constraint logic, action disposition, and monitoring.
- A mixed portfolio of actions, monitoring, and responsible manual review is as
  valid as a larger optimization if supported by evidence.

## Completion criteria

A complete submission:

- states the warehouse/product/date, movement-event, PO-line, receipt-event,
  vendor-product, substitution, forecast-origin, and action grains;
- distinguishes technical events from physical movements and reconciles replay
  handling without broad deduplication;
- constructs a complete all-days demand spine with explicit zeros and keeps
  returns, transfers, receipts, and adjustments separate from issues;
- reconciles approved opening inventory to physical ledger evidence and sampled
  positions where comparable;
- builds one row per PO line at each relevant origin using accepted—not gross—
  receipts, with split receipts and cutoff handled correctly;
- defines first versus final lead time and uses a defensible sparse-history
  pooling rule;
- runs multiple 21-day rolling-origin folds and protects an untouched final
  origin from selection;
- compares simple and intermittent-demand baselines, reports bias and
  distribution/decision evidence, and avoids a universal winner claim unless
  the data truly supports it;
- creates non-negative probabilistic paths or coherent quantiles and documents
  dependence, capping, and reproducibility assumptions;
- simulates recipient and donor inventory with demand and lead-time uncertainty;
- emits a referentially valid, integer-quantity action file within every supplied
  budget, capacity, reserve, effective-date, and approval constraint;
- separates forecast uncertainty, inventory risk, action value, and causal claims;
  and
- delivers a concise decision, sensitivity/stress view, monitoring plan, and
  override/expiration rule without implying false precision.

## Complexity profile

Scale: 1 is foundational and 5 is advanced independent practice.

| Dimension | Rating | Why |
|---|---:|---|
| SQL | 4 | A daily spine, replay-aware physical ledger, as-of PO-line fact, accepted receipts, lead-time history, and join reconciliation are required. |
| Python | 5 | Rolling-origin baselines, intermittent-demand forecasting, quantiles or simulation, lead-time resampling, inventory paths, and constrained action generation are core. |
| Data complexity | 5 | Technical events, sparse snapshots, product/warehouse series, PO headers/lines, split receipts, vendors, substitutions, and several clocks interact. |
| Statistical reasoning | 5 | Sparse demand, seasonal shift, temporal validation, metric disagreement, pooled uncertainty, quantile calibration, and compound inventory risk matter. |
| Ambiguity | 5 | Model, metric, service posture, stress assumptions, and action portfolio remain open to defensible judgment. |
| Deliverable load | 5 | SQL facts, reconciliation, forecasting package, simulator, risk book, action file, model card, and executive handoff are required. |

## Deterministic checks

Mechanical checks should recompute exact data and contract invariants. They must
not guess whether a narrative is wise or require one hidden forecast result.

Safe deterministic checks include:

- the submitted daily mart contains exactly one row for every declared
  date/warehouse/product combination, has no duplicate grain, and represents
  source-absent issue days as zero;
- demand quantity equals the absolute sum of non-replay `ISSUE` deltas for the
  same key/window, while receipt, return, transfer, and adjustment quantities do
  not enter that field;
- the physical ledger contains no replay rows, every excluded replay resolves to
  its stated original, and cumulative quantity reconciles to submitted sampled
  positions on comparable keys/dates;
- accepted receipt quantity equals `received_quantity - rejected_quantity`, is
  non-negative, and the submitted PO-line fact has one reconciled row per
  purchase-order line rather than one row per receipt join;
- each as-of PO-line row contains only movements/receipts observable under the
  declared origin rule, and remaining quantity recomputes from net ordered minus
  accepted quantity;
- every rolling-origin fold has training dates strictly before its forecast
  interval, contains the declared 21 forecast dates for every scored series, and
  leaves the designated final origin unused for model selection;
- forecast, quantile, and simulation outputs are numeric, finite, non-negative,
  complete at the declared grain, and satisfy monotone submitted quantiles;
- rerunning the submitted simulator with the declared seed and fixed fixture
  reproduces the same summary within a stated numerical tolerance;
- the risk book contains one row per watchlist warehouse/product and probabilities
  lie in `[0,1]`;
- every action code is allowed, quantities are non-negative integers, referenced
  warehouses/products/PO lines/substitutes exist, and action-specific references
  match the recipient product/location and cutoff-effective option;
- expedite quantity does not exceed as-of remaining quantity, substitute
  approval state honors `requires_customer_approval`, transfer source differs
  from destination, and recomputed action totals do not exceed the supplied
  budget/capacity constraints; and
- the machine-readable action export conforms to its published schema and carries
  model/run ID, decision timestamp, owner, and expiration time.

Checks for source correctness should execute the submitted transformations or
compare their emitted facts with recomputed reference facts. Searching SQL or
Python text for words such as “Croston,” “seed,” or “replay” is not evidence that
the logic is correct.

Unsafe checks include requiring a particular package or model, a secret MAE or
stockout-probability threshold, one exact action portfolio, a fixed simulation
answer under learner-owned distributions, prose similarity to an instructor
memo, or a claim that the lowest backtest metric implies the best operational
choice. Instructor judgment remains responsible for forecast design, pooling,
stress plausibility, risk appetite, and decision quality under
[`checking_policy.md`](../checking_policy.md).

## Curriculum fit

| Curriculum capability | How the work demonstrates it |
|---|---|
| SQL grain and reconciliation | Technical movements become a physical ledger; header/line/receipt fanout is controlled and exact quantities reconcile. |
| Time-series construction | A complete daily panel represents zero-demand days and preserves forecast-origin cutoffs. |
| Python forecasting | Learners implement or use baselines for intermittent and seasonal demand with rolling-origin evaluation. |
| Statistical uncertainty | Quantiles or simulated paths combine demand and realized lead-time variation rather than reporting a point forecast alone. |
| Operational simulation | Inventory paths translate forecasts into recipient/donor shortage risk over a fixed horizon. |
| Decision optimization | Transfers, expedites, substitutions, holds, and review compete under exact budget, capacity, reserve, MOQ, and approval constraints. |
| Professional judgment | Metric disagreement, sparse evidence, stress assumptions, false precision, and multiple valid actions are communicated honestly. |
| Reproducible handoff | Governed SQL facts, seeded Python, versioned risk/action files, a model card, and an expiring decision brief can be rerun. |

## Source anchors

- [`world_bible.md`](../world_bible.md): event/availability time, grain,
  relationship, reliability, and responsible-refusal rules.
- [`schema_inventory.md`](../schema_inventory.md): supply, catalog, and calendar
  grains, widths, row counts, and reliability states.
- [`supply_data_invariants.md`](../supply_data_invariants.md): private authoring
  and validation support for replay, receipt, PO, lead-time, position, and demand
  mechanisms; never ship it to the learner workspace.
- [`data_catalog.json`](../../catalog/data_catalog.json): supply quality notes,
  source columns, lifecycle/effective fields, and reliability metadata.
- [`relationships.json`](../../catalog/relationships.json): movement, receipt,
  PO, warehouse, product, vendor, substitution, and replay relationships.
- [`checking_policy.md`](../checking_policy.md): deterministic-check and
  instructor-judgment boundary.
