# Meridian Living Systems world bible

## Purpose

Meridian Living Systems is a synthetic, internally coherent data estate for learning
data work through evidence, judgment, verification, and handoff. It is not a
collection of unrelated exercise files. Tables should be interpreted as parts
of one organization whose definitions, operational processes, limitations, and
history persist across assignments.

All people, organizations, identifiers, events, and records in this estate are
synthetic. They must not be mistaken for production or personally identifiable
data.

## Canonical timeline

- Simulated operational window: **2023-01-01T00:00:00** through **2025-12-31T23:59:59**.
- Extract-as-of timestamp: **2026-01-15T06:00:00**.
- A table's refresh timestamp and its latest event timestamp are different
  concepts. A recent file can still contain delayed events.
- Point-in-time analysis must use information that would have been observable
  by the decision cutoff, not facts added later.

## Current estate footprint

- Registered assets: **96**.
- Registered rows: **16,548,418**.
- Schemas: `billing`, `catalog`, `commerce`, `core`, `crm`, `external`, `field_ops`, `finance`, `fleet`, `growth`, `iot`, `platform`, `supply`, `support`, `trust`, `workforce`.
- Listed owners: Billing Operations, Commerce Analytics, Commerce Platform, Connected Analytics, Connected Operations, Connected Products, Controllership, Customer Care, Customer Data Office, Customer Insights, Data Partnerships, Data Platform, Data Reliability, Digital Analytics, Enterprise Data Governance, FP&A, Field Asset Registry, Field Logistics, Field Operations Planning, Field Operations Training, Field Service, Field Service Platform, Finance Data Management, Fleet Operations, Fulfillment Operations, Growth Science, IoT Platform, Knowledge Management, ML Governance, ML Platform, Market Intelligence, Merchandising Data, People Operations, People Operations Learning, Pricing Operations, Privacy Office, Procurement, Security, Service Analytics, Service Scheduling, Subscription Operations, Subscription Product Management, Supplier Management, Supply Analytics, Supply Chain Operations, Supply Chain Planning, Warehouse Operations, Workforce Management, Workforce Planning.

These counts describe the current generated snapshot, not a promise that every
asset is relevant to every task.

## World rules

1. **Grain comes before calculation.** Identify what one row represents before
   filtering, joining, grouping, or modeling.
2. **Time is part of the data model.** Distinguish event time, ingestion time,
   effective periods, snapshots, and the time at which a value became knowable.
3. **Relationships are evidence, not permission.** A matching key does not make
   a join valid. Check cardinality, match rate, fan-out, and temporal conditions.
4. **Reliability is use-specific.** A table can be fit for monthly reporting but
   unsafe for a same-day operational decision.
5. **Missing and conflicting values have causes.** Nulls, duplicates, delayed
   updates, and definition changes should be investigated rather than silently
   removed.
6. **Sensitive data remains sensitive.** Use the least detailed data needed for
   the decision and respect preview, export, and aggregation constraints.
7. **Simple, reproducible evidence is valuable.** A defensible baseline and a
   clear limitation are preferable to an impressive result with invalid logic.
8. **Responsible refusal is a valid outcome.** If the available evidence cannot
   support a requested conclusion, document why and propose the next safe step.

## Navigating the estate

Start with the business question, then use the catalog to locate an asset whose
purpose, grain, time coverage, and fitness match that question. Explore its
table neighborhood before searching the whole estate. Neighborhoods show nearby
assets and relationships; they do not identify a single correct analytical
path.

For each candidate asset, ask:

- What does one row represent?
- Who owns the asset, and is it authoritative for this concept?
- What period is covered, and when was the latest event observable?
- What is the current reliability and freshness status?
- What should this asset explicitly not be used for?
- Which fields are sensitive?
- If joined, what row multiplication or unmatched records should be expected?

## Documentation precedence

The generated catalog describes the released snapshot. Quest briefs describe a
stakeholder's request and may be incomplete or mistaken. Observed data is still
evidence that must be profiled and verified. When documentation and observed
behavior disagree, preserve the discrepancy in the decision log rather than
quietly choosing one account.

## Safe learner interpretation

Catalog badges are starting evidence, not truth scores. `verified` means checks
passed for stated uses at the recorded snapshot. It does not certify every
possible use. `internal` does not mean harmless, and synthetic data should still
be handled according to the scenario's stated controls.
