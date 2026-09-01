# Too Good to Ship

> Simulation design brief. The **Private instructor truth** section and reveal
> mechanics are authoring material and must not appear in the learner workspace.

## Simulation card

| Field | Design |
|---|---|
| Learner role | Model Risk Analyst embedded with ML Governance |
| Organizational moment | Tuesday, 2026-01-20, 09:15 ET. A contractor-built account cancellation model has reported near-perfect offline discrimination and Product wants to move it from a demo into customer outreach. |
| Initial request | Audit the suspicious result, decide whether the candidate can ship, and specify the smallest safe path to a credible model or alternative decision rule. |
| Timebox | 2.5-3.5 hours; 2 hours with a guided audit checklist. |
| Primary level | Advanced analytics / introductory model risk and leakage audit |
| Decision pressure | Product has reserved an afternoon campaign slot and interprets the headline metric as proof. ML Governance has not approved the candidate. |
| Analysis cutoff | The frozen estate extracted 2026-01-15. Every predictor must be evaluated against the proposed outreach decision time, not merely against extract availability. |

## Role and organizational moment

The learner is asked to review **Project Beacon**, a proposed 90-day account
cancellation risk model. A contractor notebook reports an AUC near 1.0 using the
wide account feature snapshot. The Product lead calls it "the clearest model
we've ever built" and wants a list of high-risk accounts for retention outreach.

The learner is not expected to optimize an algorithm. The core job is to audit
the data contract, reproduce the validation design, trace when features and labels
became knowable, identify invalid evidence, and make a deployability decision.
They should salvage what is supportable rather than treating model rejection as
the end of the work.

## Initial request

The ML Governance director writes:

> Please reproduce Beacon's headline result and tell me by 13:00 whether the
> evidence supports deployment. If it does not, identify every material failure
> mode, quarantine anything unsafe, and propose the fastest credible alternative.
> Product also wants the high-risk account file, so include handling constraints.

Opening artifacts:

- `beacon_training.ipynb`, which loads the account snapshot, chooses numeric
  columns by wildcard, removes only technical identifiers, and makes a random
  row-level 80/20 split;
- `beacon_validation.html`, showing a near-perfect ROC curve and no temporal,
  account-overlap, or segment diagnostics;
- `campaign_request.md`, requesting the top 10,000 account IDs and reasons;
- a model-intake form with target stated as cancellation in the 90 days following
  the feature timestamp, but the exact operational scoring time left vague.

The harness should make the notebook inspectable. The learner must not be forced
to train a large model to find the central issue.

## Data neighborhood

| Asset | What one row means | Why it may matter | Important caution |
|---|---|---|---|
| `platform.account_feature_snapshot` | One account at one feature-as-of timestamp; multiple snapshots per account are expected | 213-column candidate feature set, account, feature time, feature-set version, and source watermark | Restricted. The final three columns are realized future outcomes. Upstream availability can lag events by up to 96 hours. Column convenience is not a predictor contract. |
| `platform.model_registry` | One logical model product | Existing decision products, owners, criticality, stage, and human-review requirements | Registration does not prove validity for a new use. Beacon is not approved merely because similar models exist. |
| `platform.model_version` | One trained model version | Training cutoff, feature-set version, code lineage, approval state, and validation summary | A headline metric is metadata to audit, not ground truth. Date and approval inconsistencies should be escalated rather than silently repaired. |
| `platform.model_prediction` | One scored account request by one model version | Feature as-of time, score, threshold, decision lineage, experiment arm, and explanation | Historical predictions may use different model versions and do not validate Beacon. Restricted model output should remain purpose-limited. |
| `crm.account_status_event` | One account status transition | Candidate construction of an independently derived cancellation label | Occurrence date is not necessarily the same as warehouse availability, and reason codes require a target policy. |
| `billing.subscription_event` | One subscription lifecycle event | Alternative account/subscription cancellation evidence | Subscription and account grains differ; one account may have several subscriptions. |
| `billing.payment_attempt` | One payment attempt | Historical payment behavior and future-payment outcome audit | Attempts and accounts are many-to-one; migration-era events can arrive late and raw decline taxonomies change. |
| `support.ticket` | One source-system ticket | Historical support-contact features and duplicate audit | The CRM dual-write window creates source-ticket duplicates; feature generation may inherit that definition. |
| `platform.pipeline`, `platform.pipeline_run`, `platform.data_quality_result` | One pipeline, run, or check result | Lineage and reliability evidence for feature production | Successful orchestration is not proof that predictors are point-in-time valid. Check results have their own grain. |

## Timeline and reveals

### 1. Reproduction succeeds — opening

Running the supplied notebook reproduces an implausibly strong result. This is
deliberate. The environment should not reward the learner for stopping at
reproducibility. A successful run establishes what the code did, not whether it
answers the operational question.

### 2. The last three columns — evidence-triggered or minute 25

Schema inspection reveals:

- `future_90d_cancelled_flag`;
- `future_90d_payment_failure_count`;
- `eventual_lifetime_value_cents`.

The notebook's wildcard feature selection leaves the target itself and both
other realized outcomes in the predictor matrix. The catalog explicitly warns
that these are future outcomes, not predictors.

### 3. One account on both sides — evidence-triggered or minute 50

When the learner checks the snapshot grain, they find multiple snapshots per
account. A random row split can place observations from the same account in both
training and validation and mixes earlier with later calendar regimes. Grouped
temporal validation is needed to approximate a future scoring decision.

### 4. Event time is not feature time — evidence-triggered or minute 75

The feature-store owner explains that `feature_as_of_at` is the scoring reference
time and `source_watermark_at` captures how far upstream data had actually
progressed. Some event-derived features can be hours or days stale because source
events arrive with delay. Recomputing them from the frozen extract without an
availability rule can introduce subtler point-in-time leakage even after the
obvious future columns are removed.

### 5. "Just drop future_*" is challenged — minute 100

The Product data scientist proposes dropping columns whose names start with
`future_` and rerunning the random split. `eventual_lifetime_value_cents` does not
follow that prefix. More importantly, name-based exclusion does not solve account
overlap, temporal split design, target definition, source-watermark enforcement,
or feature-generation lineage. The learner should propose an explicit predictor
allow-list and validation contract.

### 6. The campaign file request — after audit decision

Product asks for raw account IDs, scores, and top explanations immediately, even
if the model remains in shadow. The feature table and model outputs are restricted.
The learner must specify minimum necessary access, purpose limitation, review,
and whether any customer action is permissible before validation and governance
approval.

## Authentic work products

1. An audit notebook or report that reproduces the submitted result, inventories
   predictors, demonstrates leakage, measures account overlap, and tests a
   time/group-aware split.
2. A machine-readable predictor allow-list or compact feature contract naming
   permitted columns, exclusions, availability rule, target, entity grain, and
   decision cutoff.
3. A validation design covering temporal holdout, account grouping, segment and
   calendar stability, calibration, threshold/cost considerations, and at least
   one naive baseline.
4. A deployability memo with disposition: reject, quarantine, rebuild for shadow,
   or replace with a simpler rule; plus owners and evidence required for the next
   gate.
5. A handling note for account-level scores and explanations, including why a
   campaign export is or is not currently allowed.

## Ambiguity and defensible outcome space

The current artifact's headline validation is invalid, so "ship Beacon unchanged"
is not a defensible outcome. The response to that finding remains deliberately
open:

- Quarantine the notebook and rebuild a smaller allow-listed model with grouped
  temporal validation before shadow scoring.
- Use a transparent rules-based triage or existing approved shadow model while a
  clean label and point-in-time training set are produced.
- Salvage parts of the pipeline but not the model, provided the learner identifies
  which transformations can be independently verified.
- Pause customer action entirely because target definition, intervention costs,
  or governance approval are insufficient, while proposing a concrete evidence
  plan.
- Permit a tightly governed, non-customer-facing retrospective analysis if it is
  clearly separated from deployment and raw export.

Different clean feature allow-lists, holdout windows, baselines, and operational
thresholds may all be defensible. The simulation tests whether the learner can
invalidate bad evidence without pretending the remaining design choices have one
answer.

## Private instructor truth

At least four distinct validity failures are planted:

1. **Direct/future-outcome leakage.** `platform.account_feature_snapshot`
   intentionally co-locates realized outcomes with predictors (`A13`). Wildcard
   selection captures the target and/or closely related future outcomes. The
   non-prefixed eventual lifetime value is designed to defeat a superficial
   `future_*` exclusion.
2. **Entity leakage.** The table has multiple snapshots per account. Random row
   splitting permits the same account to appear on both sides and understates
   generalization uncertainty.
3. **Temporal invalidity.** A random split mixes calendar periods. Predictors must
   be restricted to information available by each decision time, using
   `feature_as_of_at`, `source_watermark_at`, and underlying availability clocks.
4. **Deployment/governance gap.** The source and predictions are restricted;
   offline discrimination alone does not establish calibration, threshold value,
   intervention safety, human review, or approval.

The exact post-audit AUC is not a grading target and may vary with the learner's
allow-list and split. A clean model may still have useful signal. The invariant
instructor judgment is that the submitted near-perfect result cannot support
deployment. High-quality learners then make a proportionate salvage decision
instead of merely announcing "leakage."

The generated model registry also contains lineage and approval states that
reward skeptical inspection. These records are context, not a secret instruction
to select an existing model as the answer.

## Planted traps

- Celebrating reproducibility as validation.
- Dropping only the named target while retaining other future outcomes.
- Excluding only columns prefixed `future_` and retaining `eventual_*`.
- Randomly splitting snapshot rows without grouping by account.
- Applying a temporal split while allowing later-arriving source data into
  earlier features.
- Treating `feature_as_of_at` as proof that every source value was available then.
- Using current `crm.account.current_status` as a historical target.
- Joining account, subscription, payment, and support facts without stable-grain
  aggregation.
- Selecting the best holdout period after seeing its performance.
- Comparing a new candidate to registry AUC fields without reconstructing their
  validation contracts.
- Exporting account-level scores or feature rows because the data is synthetic.
- Rebuilding a complex model before testing a simple baseline and intervention
  value.

## Scaffold levels

### Supported

- An audit checklist prompts for target, entity grain, predictor inventory,
  knowledge time, split unit, split time, baseline, metric, and approval.
- The workbench can diff the notebook's selected columns against the catalog's
  warnings.
- Starter code reports account overlap across a supplied split but does not choose
  a correct split.
- An allow-list template and model-risk disposition template are provided.

### Guided

- The learner receives the data neighborhood and inspectable notebook.
- Hints appear if the target remains in `X`, future-outcome fields remain, or the
  same account occurs on both sides.
- Availability and watermark reasoning is prompted only after obvious leakage is
  addressed.

### Independent

- Only the intake request, candidate notebook, validation report, campaign
  request, catalog, and workbench are supplied.
- The learner decides the audit sequence and remediation depth.
- The harness accepts a principled refusal, a shadow rebuild plan, or a simpler
  alternative when supported by evidence.

## Completion criteria

A complete submission:

- reproduces or inspects the submitted pipeline sufficiently to explain the
  headline result;
- identifies the feature-snapshot grain and inventories all predictor columns;
- detects the direct and related future-outcome leakage, including non-prefixed
  outcomes;
- measures or otherwise demonstrates account overlap in the submitted split;
- proposes a temporal and entity-aware validation design tied to an operational
  scoring time;
- enforces or specifies a source-availability rule rather than relying on event
  timestamps alone;
- uses an explicit predictor allow-list and independently defined target;
- distinguishes discrimination from calibration, threshold utility, and safe
  intervention;
- blocks unsupported customer action and restricted raw export;
- assigns a clear model disposition and concrete evidence for the next gate; and
- communicates the failure without overstating that no valid model could ever be
  built.

## Curriculum fit

| Curriculum capability | How the work demonstrates it |
|---|---|
| Leakage auditing | Direct target, proxy outcome, entity, temporal, and availability leakage are separated. |
| Validation design | Account grouping, forward holdout, stability checks, and baselines replace a random row split. |
| Feature contracts | An explicit allow-list, target policy, entity grain, and knowledge-time rule are authored. |
| Model evaluation | AUC is placed alongside calibration, threshold cost, intervention value, and uncertainty. |
| ML governance | Registry state, lineage, restricted handling, human review, and approval gates inform deployment. |
| Responsible refusal | The learner stops unsafe customer action while offering a practical path forward. |

## Source anchors

- [`world_bible.md`](../world_bible.md): decision cutoff, observability,
  reproducibility, sensitivity, and responsible-refusal rules.
- [`schema_inventory.md`](../schema_inventory.md): feature, registry, prediction,
  pipeline, account, billing, and support grains.
- [`data_catalog.json`](../../catalog/data_catalog.json): 213-column feature-store
  warning, final future outcomes, source watermark, and model metadata.
- [`relationships.json`](../../catalog/relationships.json): account, model,
  subscription, payment, and support relationships.
- [`anomaly_ledger.json`](../../catalog/anomaly_ledger.json): private anomaly
  `A13`, future-outcome columns in the feature extract.
