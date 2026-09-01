# The Quarter That Moved

> Simulation design brief. The **Private instructor truth** section, reveal
> mechanics, and reference checks are authoring material and must not appear in
> the learner workspace.

## Simulation card

| Field | Design |
|---|---|
| Learner role | Commercial Data Transition Analyst supporting Finance and Commerce Analytics |
| Organizational moment | Monday, 2024-07-08, 08:40 ET. Meridian's first Q2 review after the HarborHome acquisition has been paused because the migrated order extract appears to contain duplicate orders and impossible negative processing times. |
| Initial request | Certify a Q2 view of order volume, booked revenue, and fulfillment timing; quantify the migration exceptions; and write a cutover reporting policy Finance can reuse next quarter. |
| Timebox | 5-8 hours for a prepared learner; 8-12 hours for a true beginner. It can run as one Saturday investigation plus a short evening handoff session. |
| Primary level | Foundation-to-intermediate Python wrangling and commercial reconciliation |
| Decision pressure | Finance needs a reviewable Q2 pack by end of day. Rejecting the entire migrated population delays close; accepting the source export unchanged may double-count revenue and misstate service performance. |
| Analysis cutoff | 2024-07-08 08:30 ET. Q2 occurrence dates end at 2024-06-30 23:59:59, but inclusion in the certified close also depends on whether each record was available to the warehouse by the analysis cutoff. |

## Complexity profile

| Dimension | Profile |
|---|---|
| Workload band | **Investigation** -- several related assets, a reusable data-cleaning workflow, and a conditional business certification |
| Expected effort | 5-8 prepared hours; 8-12 beginner hours |
| Core data breadth | Six primary assets across commerce, CRM, and catalog; one optional digital-attribution asset |
| Technical mode | Python primary; SQL supporting |
| Code depth | Multi-file profiling, reusable exception flags, assertions, reconciliations, and a certified analytical extract |
| Judgment depth | Separate source-system defects from valid canonical facts and decide what can be certified under a frozen close policy |
| Authentic artifacts | Five: canonical SQL fact, Python audit, exception register, reconciliation report, and certification memo |
| Available scaffolds | Supported, Guided, and Independent |
| Review mode | Deterministic structural checks plus instructor review of definitions, exception treatment, and certification language |

## Role and organizational moment

Meridian recently acquired HarborHome and moved part of its commerce history into
the corporate warehouse. The first combined quarterly report looked routine
until Finance tried to reproduce it. Some `source_order_id` values repeat. A
processing-time calculation using source timestamps produces negative values.
One analyst removed every duplicate-looking source number; another retained all
rows and produced substantially different volume and revenue.

The learner joins a temporary transition team. Their job is not to make the
migration look clean or to redesign the warehouse. They must determine which
fields describe a canonical business event, which fields preserve imperfect
source representations, and which close rule makes the Q2 pack reproducible.
This is the first case in which Python is the main working environment: the
learner must turn an untidy commercial extract into a documented, testable
workflow rather than a chain of one-off notebook cells.

## Initial request

The Commercial Controller writes:

> I stopped the Q2 review because the HarborHome orders look duplicated and some
> orders appear to have been processed before they were created. By 16:00 I need
> a certified count of Q2 orders, booked order value, and fulfillment timing. Do
> not throw away a whole acquired business because its old identifiers are ugly,
> but do not certify numbers we cannot reconcile. Give me an exception register
> and a rule we can run again at the next close.

Opening artifacts should include:

- `q2_commercial_close.csv`, a flat Finance export keyed by
  `source_order_id`, with header amounts and source timestamps;
- `harborhome_transition_notes.xlsx`, containing an incomplete field mapping
  and an unlabeled note that tenant namespaces were not carried into the first
  extract;
- `q2_fulfillment_review.csv`, produced from order and shipment events but using
  `source_recorded_at` for elapsed time;
- a screenshot of two totals that differ because one workbook uses a broad
  spreadsheet deduplication and the other counts warehouse rows; and
- the analysis cutoff and Finance's requirement that certified records be
  knowable by that cutoff.

The attachments are derived from the same estate. They disagree because their
key, clock, and inclusion rules differ, not because one contains a secret correct
answer.

## Data neighborhood

The whole catalog remains searchable. These assets form the intended nearby
neighborhood, not a required click path.

| Asset | What one row means | Why it may matter | Important caution |
|---|---|---|---|
| `commerce.order` | One canonical order header | Canonical `order_id`, retained source identifier, captured header amounts, source system, created time, and warehouse availability | `source_order_id` is not globally unique. Current order status is not a historical event stream. |
| `commerce.order_event` | One recorded lifecycle event for an order | Sequence-aware creation, authorization, cancellation, and fulfillment timing | Several events belong to one order. Acquired source clocks can precede canonical occurrence time. |
| `commerce.order_line` | One commercial line item captured when the order was placed | Reconciles line value, discounts, tax, quantity, and product mix to the order header | Joining lines to events creates many-to-many fanout unless each side is reduced first. |
| `commerce.shipment_event` | One carrier or local-fleet tracking event | Delivery lead time and fulfillment confirmation | An order normally has several shipment events; event rows are not shipments or orders. |
| `crm.account` | One customer account | Identifies commercial relationship and acquisition context | Account is not order grain; current account attributes should not overwrite captured order facts. |
| `catalog.product_price_history` | One product, channel, and effective price period | Tests whether historical list-price context could explain apparent amount differences | List price is not captured transaction value. Effective-period joins can multiply a line if boundaries are mishandled. |
| `growth.session` | One web or mobile session | Optional sensitivity for attribution reports that use visitor or converted-order links | `visitor_id` is not a person and was reset/reused for part of the acquired estate. It is unnecessary for core financial certification. |

The public catalog descriptions and quality notes should be visible from the
start. The anomaly ledger and generator implementation remain instructor
materials.

## Python and SQL roles

### SQL owns the governed commercial fact

The learner should use SQL to establish stable database grains and a reviewable
Q2 extract:

- select Q2 canonical orders under an explicit occurrence and availability rule;
- reduce order and shipment events to one row per `order_id` before joining;
- aggregate order lines to header grain and reconcile captured values;
- retain source-system exception indicators without using them as deletion
  instructions; and
- emit a compact, documented fact table for Python analysis.

### Python owns the migration audit and repeatable cleaning workflow

Python should do work that is awkward or opaque in a single SQL statement:

- load and compare CSV/XLSX-style attachments with the governed extract;
- profile key collisions, timestamp deltas, latency, missingness, and amount
  differences by source system and period;
- create reusable functions for exception flags rather than editing individual
  rows;
- assert grain, range, reconciliation, and cutoff invariants;
- visualize affected populations and before/after sensitivities; and
- write the certified extract and exception register with deterministic code.

The learner should not be required to reproduce the same transformation twice
in both languages. SQL establishes relational truth and a stable analytical
grain; Python makes the source-quality audit inspectable, reusable, and
communicable.

## Timeline and reveals

### 1. The collision is real -- opening

Profiling the Finance export shows repeated `source_order_id` values concentrated
in the acquired source during Q2. Canonical `order_id` remains unique. A broad
`drop_duplicates()` on the source identifier changes both count and revenue, but
the opening material does not say whether the repeats are duplicate business
events.

### 2. A namespace was left behind -- evidence-triggered or hour 1

When the learner compares source system, account acquisition context, and key
collision patterns, the transition lead explains that HarborHome order numbers
were only unique inside retired tenant namespaces. The first corporate extract
preserved the local number but omitted its tenant component. The corporate
`order_id` was assigned during ingestion and is the canonical warehouse key.

This reveal supports a key policy; it does not authorize blind trust in every
row or deletion of every collision.

### 3. The five-hour impossibility -- evidence-triggered or hour 2

When the learner plots `source_recorded_at - created_at`, compares source clocks
with event occurrence, or investigates negative processing duration, an
integration engineer confirms that some HarborHome local-naive timestamps were
parsed as UTC. The affected source representation is roughly five hours behind
the canonical event clock. The learner must decide which clock answers event
timing, ingestion timing, and close availability.

### 4. Price is context, not the receipt -- evidence-triggered or hour 3

If the learner attempts to reconstruct revenue from the product price history,
the Commerce owner explains that order lines retain the price, discount, and tax
captured at purchase. Catalog history is useful for list-price context and
effective-period diagnostics, but it does not replace transaction values.

### 5. Finance asks what was knowable -- after first reconciliation or hour 4

The Controller asks:

> If a June 30 order reached the warehouse after our close snapshot, is it in
> this certified pack, a late-arrival exception, or both? I need a rule that
> does not change when somebody reruns the notebook next week.

This forces a distinction among business occurrence, imperfect source record
time, and warehouse availability. A frozen certification needs an explicit
cutoff plus a late-arrival treatment.

### 6. Optional attribution follow-up -- stretch only

Growth asks whether HarborHome's Q2 digital conversion rate can be placed beside
the certified revenue. Inspection of `growth.session` reveals reset and reused
visitor identifiers during the same acquisition window. The strongest response
may be to keep the financial certification in scope and open a separate
identity-grain investigation instead of attaching a weak attribution claim.

## Authentic work products

1. `q2_commercial_fact.sql`, producing one documented row per canonical order
   with header value, reconciled line value, selected lifecycle milestones,
   fulfillment fields, source context, cutoff status, and exception flags.
2. `commercial_migration_audit.ipynb` or an equivalent Python workspace that
   profiles attachments and warehouse data, implements reusable checks, shows
   key/timestamp/latency distributions, and runs sensitivity analyses.
3. `q2_exception_register.csv`, containing deterministic exception categories,
   counts, materiality, affected source/window, disposition, and owner without
   exposing unnecessary customer detail.
4. A reconciliation report showing source export, canonical warehouse, included
   close population, late-arrival population, and header-to-line totals with a
   clear bridge between them.
5. A one-page certification memo that states what is certified, under which
   grain and clocks, what remains qualified, how fulfillment timing was defined,
   and the proposed reusable cutover reporting policy.

## Ambiguity and defensible outcome space

The case does not require a single reporting philosophy. Several outcomes can be
professionally defensible:

- certify canonical order count and captured booked value under the frozen
  availability cutoff, with late arrivals carried into a documented adjustment;
- certify occurrence-quarter operations separately from close-as-known Finance
  numbers, provided the two views are labeled and reconciled;
- publish fulfillment timing only for orders with an admissible milestone pair,
  accompanied by coverage and exception rates;
- defer the attribution add-on while certifying the commercial facts that have
  stable keys and clocks; or
- qualify a portion of the acquired population pending owner review if the
  learner quantifies the materiality and gives a concrete release condition.

Choices become indefensible when they treat a source identifier as the business
primary key, delete colliding rows without evidence, use a source ingestion clock
as event occurrence, recompute captured revenue from current/list prices, join
multiple event streams without reducing grain, or allow the certified result to
change with the notebook run date.

## Private instructor truth

The generated estate encodes acquisition anomaly `A-TXN-ACQ-01` in Q2 2024.
The important truths are:

1. HarborHome source order numbers are tenant-local. During 2024-04-01 through
   2024-06-30, the omitted namespace causes repeated `source_order_id` values.
   The canonical `commerce.order.order_id` remains unique and should anchor
   commercial reconciliation.
2. For the affected acquired population, `source_recorded_at` was shifted about
   five hours behind the canonical occurrence clock because local-naive values
   were interpreted as UTC. `created_at` on the order and `occurred_at` on
   events retain the intended event chronology; `warehouse_available_at`
   answers what the warehouse knew by a close cutoff.
3. `order_total_cents` and the captured fields on `commerce.order_line` are valid
   transaction facts and can be reconciled at order grain. The price-history
   table is not a substitute ledger and should not be used to overwrite
   discounts or captured sale prices.
4. Order events, order lines, and shipment events are independently one-to-many
   from orders. A direct join across them can multiply both value and duration
   evidence even when every source row is valid.
5. The same acquisition also creates a visitor-identity quality problem
   (`A-TXN-ACQ-02`) in `growth.session`. It is an optional scope-control test,
   not required evidence for the Q2 financial certification.

There is no secret preferred policy for booked versus fulfilled reporting or
late-arrival adjustment. The invariant is that the learner's certified output
must use canonical grain, captured commercial value, named clocks, an explicit
cutoff, and a reproducible exception policy.

## Planted traps

- Calling `drop_duplicates(subset="source_order_id")` and treating the removed
  rows as duplicate business orders.
- Grouping only by `source_order_id` and silently combining unrelated canonical
  orders.
- Treating `source_recorded_at` as order creation or fulfillment occurrence.
- Correcting timestamps row by row instead of defining a source/window rule and
  preserving the original field.
- Joining order lines, lifecycle events, and shipment events in one wide frame
  before aggregating each to order grain.
- Summing order header value after a line- or event-level join.
- Reconstructing actual revenue with catalog list prices rather than captured
  line values.
- Using current order status to infer the exact state known at the close cutoff.
- Filtering on occurrence time while ignoring `warehouse_available_at` for a
  frozen close view.
- Reporting mean fulfillment time without coverage, cancellation policy, and
  clear start/end milestones.
- Expanding into visitor-level attribution merely because the data is nearby.
- Patching the supplied CSV manually so that the final result cannot be rerun.

## Scaffold levels

### Supported

- The workspace opens with attachment loaders, a data-dictionary panel, and a
  Python notebook containing empty functions for profiling, exception flags,
  and assertions.
- A starter SQL view selects Q2 orders but leaves the key, availability rule,
  event reductions, and revenue reconciliation unfinished.
- Prompts ask for row count, distinct `order_id`, distinct `source_order_id`,
  timestamp-delta distribution, header/line bridge, and late-arrival count.
- The memo template names grain, clocks, cutoff, exception policy, coverage, and
  certification scope.

### Guided

- The learner receives the data neighborhood, opening attachments, and blank
  reconciliation/exception templates.
- Hints appear on broad source-key deduplication, negative source latency,
  event/line fanout, or price-history substitution.
- The learner writes the Python profiling workflow and SQL fact without starter
  transformation code.

### Independent

- Only the Controller request, three opening attachments, catalog, cutoff, and
  open SQL/Python workbench are supplied.
- Reveal messages remain available through evidence-based questions.
- The learner owns the certification scope, close policy, visuals, and exception
  taxonomy.

## Completion criteria

A complete submission:

- identifies canonical order grain and demonstrates why the source identifier
  cannot serve as a global primary key;
- profiles collision, missingness, amount, and timestamp behavior by source and
  relevant period in Python;
- preserves source fields and implements reusable, documented exception flags;
- reduces line, order-event, and shipment-event data to stable grains before
  joining;
- reconciles captured header and line values with explicit row-count and amount
  bridges;
- defines booked value and fulfillment timing without substituting current or
  list price for captured transaction facts;
- names occurrence, source-record, and warehouse-availability clocks and uses
  the analysis cutoff consistently;
- quantifies excluded, late-arriving, and qualified populations rather than
  hiding them;
- produces rerunnable SQL and Python with meaningful assertions; and
- gives Finance a bounded certification and a reusable next-close policy whose
  certainty matches the evidence.

## Safe mechanical checks

The harness may verify facts that are invariant across defensible approaches:

- submitted SQL parses and the certified fact has at most one row per
  `order_id`;
- the reported analysis cutoff is fixed and no certified row has an availability
  timestamp after it unless explicitly marked as a late-arrival exception;
- order-header counts and captured amounts reconcile to the learner's saved
  bridge within exact arithmetic rules;
- the saved header-to-line bridge has one row per `order_id`, exact captured
  amount arithmetic, and row counts that reconcile to its source extracts;
- source fields are preserved and exception flags are reproducibly derived;
- required output columns, data types, provenance, and run metadata are present;
- Python checks execute from a clean state and deterministic steps reproduce the
  saved artifacts; and
- the learner projection contains no instructor-only anomaly material.

The harness must **not** grade by matching one total, looking for particular
keywords or code strings, requiring a five-hour correction to be implemented in
one exact way, or inferring from prose whether the certification is sound. It
must not require a particular chart, late-arrival accounting policy, fulfillment
estimator, or certification disposition. Those judgments require instructor
review of the full evidence chain.

## Curriculum fit

| Curriculum capability | How the work demonstrates it |
|---|---|
| Python and Pandas foundations | Files are loaded, typed, profiled, transformed with reusable functions, asserted, and exported from a clean run. |
| Data cleaning and EDA | Key collisions, timestamp deltas, missingness, latency, and amount differences are diagnosed as populations with causes. |
| SQL and relational grain | Canonical orders, lines, lifecycle events, and shipment events are reduced and reconciled without fanout. |
| Visualization | Collision and latency distributions plus reconciliation bridges make migration effects inspectable. |
| Commercial metric design | Order volume, booked value, fulfillment time, coverage, and close inclusion receive explicit contracts. |
| Reproducibility | Manual spreadsheet repair is replaced by deterministic exception rules, assertions, provenance, and a frozen cutoff. |
| Responsible communication | The learner certifies supportable facts, qualifies unresolved populations, and resists scope expansion into weak attribution. |

## Source anchors

- [`world_bible.md`](../world_bible.md): canonical grains, time versus
  knowledge time, reproducibility, and missing/conflicting-value rules.
- [`schema_inventory.md`](../schema_inventory.md): commerce, CRM, catalog, and
  growth asset grains and reliability labels.
- [`data_catalog.json`](../../catalog/data_catalog.json): order, order-event,
  order-line, shipment-event, account, price-history, and session columns plus
  quality warnings.
- [`relationships.json`](../../catalog/relationships.json): many-to-one links
  from lines and events to canonical orders and from orders to accounts.
- [`anomaly_ledger.json`](../../catalog/anomaly_ledger.json): private acquisition
  anomalies `A-TXN-ACQ-01` and optional `A-TXN-ACQ-02`.
