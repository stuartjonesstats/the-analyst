# The Queue Nobody Owns

> Simulation design brief. The **Private instructor truth** section and reveal
> mechanics are authoring material and must not appear in the learner workspace.

## Simulation card

| Field | Design |
|---|---|
| Learner role | Applied ML Analyst embedded with Customer Care Operations and the Care Platform team |
| Organizational moment | Tuesday, 2024-12-03, 08:20 ET. The support CRM dual-write has just ended, a morning intake queue is growing, and several teams say the same conversations belong somewhere else. |
| Initial request | Build and audit a text-routing candidate for new support conversations, decide which predictions—if any—may enter shadow operation, and specify abstention, human review, and monitoring before any automated routing. |
| Timebox | 12-18 hours for a prepared learner; 20-30 hours for a newer learner. It works well as a multi-session project: corpus construction, modeling/error analysis, then deployment review. |
| Primary level | Advanced applied NLP, model evaluation, and human-in-the-loop deployment |
| Decision pressure | Care leadership wants faster first response and asks to automate most of the queue. A wrong confident route can delay urgent service, expose restricted message text, or send a cancellation request to the wrong team. |
| Analysis cutoff | 2024-12-03 08:20 ET. Historical features must contain only intake information available by each routing decision. The current queue supplied by the scenario has labels and later messages withheld. |

## Role and organizational moment

Customer Care has five receiving teams—Tier 1, Tier 2, Billing, Retention, and
Field—and no one owns the overnight intake queue. A prototype notebook claims
that text can route tickets with high accuracy, but its feature-building cell
flattens the full frozen ticket and message history. Operations wants to put the
highest-confidence predictions into production by Friday.

The learner must first define the routing unit and target. A source ticket is not
necessarily one business interaction during the dual-write window; one ticket
may contain multiple conversations; one conversation contains multiple messages;
and messages from agents, bots, and internal staff can reveal what happened after
the initial route. The learner then builds a SQL corpus at conversation grain and
uses in-browser Python/scikit-learn to compare a naive baseline, a transparent
TF-IDF classifier, and a justified second model or representation.

The objective is not to prove that NLP must work. The corpus may support only a
shadow data-collection exercise or a principled refusal to automate. A credible
abstention policy and a plan to obtain the right labels are successful outcomes.

## Initial request

The Vice President of Customer Care writes:

> The unowned queue is adding hours to first response. Use the subject and the
> customer's opening message to recommend the receiving team. If the model is
> confident, I want it to route automatically; otherwise send it to a person.
> Tell me how much of the queue we can safely cover, what kinds of requests it
> gets wrong, and what we must learn in shadow before Friday.

Opening artifacts should include:

- a learner-safe intake queue with one conversation identifier, ticket subject,
  intake channel/language, and the opening customer text available by 08:20;
- the prototype notebook and its headline accuracy chart;
- a routing handbook describing the five teams and a supplied asymmetric
  misroute-cost matrix;
- a human-review capacity sheet and escalation rules for urgent, redaction-review,
  and non-English/unknown-language cases; and
- a restricted-data handling notice stating that message text must remain in the
  approved browser workbench and must not be copied into external services.

The scenario compiler must strip `assigned_team_code`, `category_code`, current
status, later messages, eventual outcomes, and instructor truth from the scoring
queue. Those values remain available only in appropriately matured historical
training records or the spoiler-isolated instructor pack.

## Data neighborhood

The entire catalog remains searchable. These are the intended nearby assets,
not a mandatory feature set.

| Asset | What one row means | Why it may matter | Important caution |
|---|---|---|---|
| `support.ticket` | One source-system support ticket | Supplies subject, intake channel, priority, source, eventual category, and current assigned team | `ticket_id` is a technical source key. Dual-written tickets can share an `interaction_fingerprint`. Current status, category, assigned team, solved time, response time, and reopen count are labels or later facts for an intake decision. |
| `support.conversation` | One conversation thread attached to a ticket | Defines the intended modeling and scoring grain, channel, language, and start time | Several conversations can attach to one ticket, and a conversation is not a customer or business interaction. Restricted handling applies. |
| `support.message` | One message in a conversation | Supplies sender, time, redaction state, body text, and attachment metadata | Only customer text available by the routing snapshot is eligible. Agent, bot, internal, later, PII-flagged, or review-required messages can leak outcomes or require abstention. |
| `support.ticket_status_event` | One observed support status transition | Supports outcome maturity and later operational monitoring | A direct join multiplies corpus rows. Status language and later events are not intake features. |
| `support.csat_response` | One returned survey per ticket | Optional long-run customer-impact guardrail | Sparse respondent outcome with mixed raw scales; it is not a routing label and arrives after resolution. |
| `support.knowledge_article` | One logical help article | Optional topic vocabulary or human-review aid | Current article state and generic topic do not establish the correct receiving team for a conversation. |
| `support.knowledge_article_view` | One article view event | Optional downstream monitoring context | Views are outcomes and have a different session/event grain; they must not be used to train an intake router. |
| `crm.account` | One commercial customer account | Optional account-history aggregation for later operational research | Confidential, several people can belong to one account, and current status is not an intake text feature. Account attributes can create unjustified differential treatment. |
| `crm.customer` | One known person or small-business party | Language/contact context may be tempting | Restricted synthetic PII; names and direct identifiers are unnecessary. `do_not_contact` governs outreach, not routing ownership. |
| `trust.data_access_log` | One logical governed data-access event | Supports monitoring of restricted corpus use | Client-reported row counts are not authoritative and access logs are not model-quality evidence. |
| `platform.model_registry` | One logical model product | Supports ownership, stage, criticality, and human-review documentation | Registry state does not validate this candidate. |
| `platform.model_version` | One trained model artifact version | Supports reproducibility and approval lineage | Stored validation summaries cannot replace reconstruction of this routing contract. |

The primary corpus should normally use ticket subject plus customer-authored text
available within a declared intake window. If no eligible customer message is
present, the row should be represented explicitly rather than silently dropped.

## Timeline and reveals

### 1. The prototype's suspicious feature row — opening

The prototype reports strong random-split accuracy. Its input includes the full
ticket row and all message text. Depending on how the learner reproduces it,
`assigned_team_code`, `category_code`, internal notes, agent resolutions, current
status, or later text can directly or indirectly disclose the label.

### 2. One conversation, many messages — evidence-triggered or minute 40

When the learner joins messages to conversations, evaluation changes with
message count. Care Platform asks what one training example means and whether
longer conversations should receive more weight. The correct corpus preserves
one conversation row and constructs text only from eligible messages.

### 3. The same interaction on both sides — evidence-triggered or minute 75

During the October-November dual-write, distinct `ticket_id` values can share an
`interaction_fingerprint`. Multiple conversations may also attach to one ticket.
A random row split can place closely related records in training and validation.
Split groups must therefore preserve the business interaction boundary as well
as chronology.

### 4. The target moves after intake — evidence-triggered or minute 110

An operations manager explains that `assigned_team_code` is the current/final
handling team in the frozen ticket extract, not a recorded first-route decision
or independently adjudicated "correct owner." Transfers are not represented as
a clean label history. The available target may be useful for retrospective
triage research, but it does not perfectly match the proposed intake action.

### 5. The confident hard cases — after first error analysis

Redaction-review rows, PII-flagged text, non-English/unknown language, very short
intake text, and rare receiving teams show different error behavior. Overall
accuracy hides these slices. Operations would rather abstain than confidently
misroute an urgent or retention case.

### 6. The second model barely changes the answer — after challenger evaluation

A character/word model, linear SVM, Naive Bayes, or other transparent challenger
may change individual errors without establishing a safe coverage level.
Repeated templates and weak target alignment limit what algorithm choice can
repair. The learner is asked to explain whether the bottleneck is representation,
labels, data generation, decision definition, or all four.

### 7. The Friday deployment challenge — after threshold proposal

Leadership asks for a single confidence threshold and an automated-route
percentage. Confidence must be evaluated for calibration and class-specific
harm. A high top-class probability is not evidence of semantic understanding,
and the model has not yet been tested as part of the live routing workflow.

### 8. Shadow is a data product — final reveal

Care Operations agrees that a shadow phase can capture the intake-time human
route, later transfers, review reason, correction, resolution latency, and
whether the model recommendation was shown. The learner must define this event
contract, monitoring, access limits, and the evidence gate for any future live
action.

## Authentic work products

1. `conversation_routing_mart.sql`, or equivalent reproducible SQL, producing one
   row per conversation with eligible intake text, target provenance, decision
   time, label-available time, interaction group, and data-handling flags.
2. A Python package or notebook containing a naive baseline, a word-level TF-IDF
   pipeline, and a justified second model or representation such as character
   n-grams, calibrated linear SVM, Complement Naive Bayes, or combined word/char
   features.
3. A temporal and interaction-group-aware evaluation covering macro-F1,
   per-class precision/recall, confusion, calibration or confidence reliability,
   coverage-risk curves, expected misroute cost, latency, and simple baselines.
4. A structured error-analysis register with sampled false routes, error type,
   language/channel/source/redaction slice, probable cause, and proposed response.
   Restricted text excerpts must be minimized or token-redacted.
5. A routing decision contract defining eligible population, target, abstention,
   class-specific or global thresholds, mandatory human-review cases, escalation,
   review capacity, and prohibited automatic actions.
6. A model/data card covering corpus construction, vocabulary handling, label
   limitations, split design, intended use, excluded use, restricted handling,
   performance uncertainty, and disposition.
7. A shadow-deployment and monitoring specification defining events, human labels,
   exposure, feedback, correction, coverage, error costs, class/language/channel
   drift, calibration, latency, override, rollback, and promotion gates.
8. A concise Care leadership readout answering whether anything can enter shadow,
   whether any class can be live-routed now, and what evidence—not optimism—would
   change that answer.

## Ambiguity and defensible outcome space

Several outcomes can be defensible if they match the honest evaluation:

- reject live automation and run a non-visible shadow process solely to collect
  intake-time route and transfer labels;
- allow recommendations to be displayed to trained human routers while all
  actions remain human-confirmed;
- use a high-precision, low-coverage suggestion for one or more well-supported
  classes while mandatory review handles every other row, if temporal slice
  evidence truly supports it;
- deploy no learned model but use the project to improve queue ownership,
  routing taxonomy, and data capture; or
- rebuild the corpus and target before any shadow scoring because the available
  current/final team label cannot validate the desired intake decision.

It is not defensible to ship the prototype unchanged, claim safety from overall
accuracy, route redaction-review/PII cases automatically, use a confidence score
without coverage and error-cost analysis, expose restricted text to an external
service, or describe the classifier as understanding customer intent.

## Private instructor truth

The current generated estate deliberately places a hard ceiling on legitimate
routing performance:

1. **Message content is weak and repetitive.** `support.message.body_text` is
   drawn from five synthetic templates. The templates are sampled independently
   of ticket category and assigned team. Sentiment is also independently
   generated.
2. **Subjects and routing labels are not a coherent intent system.** Ticket
   subject, `category_code`, and `assigned_team_code` are generated separately.
   Any striking clean-holdout result should trigger a leakage, split, or sampling
   audit rather than celebration.
3. **The available label does not exactly represent the action.**
   `assigned_team_code` is the frozen current/final team. The estate does not
   contain a clean initial-route event, transfer history, or adjudicated correct
   owner. A high-quality learner should identify this target gap.
4. **Full message history leaks operational response.** Agent and internal
   templates can mention corrections, replacements, technicians, or
   entitlement—the consequences of work already performed. Later customer
   messages also occur after the proposed intake decision.
5. **Entity leakage remains possible.** Dual-write tickets share
   `interaction_fingerprint`, and multiple conversations can attach to a ticket.
   Chronological splitting alone does not guarantee interaction separation.
6. **Restricted handling is part of validity.** Text is synthetic but treated as
   restricted. PII flags, redaction-review states, and non-English/unknown
   language require explicit workflow behavior, not only model metrics.

The intended invariant is not that one classifier wins. With a properly
constructed corpus, signal may be insufficient for responsible live routing.
That is an acceptable and likely conclusion. The substantive success is to
demonstrate why the prototype result is invalid, establish honest baselines,
quantify coverage/error tradeoffs, and design a shadow event contract that could
produce the missing labels.

If the data generator later receives a richer scenario-specific corpus with
controlled text-label signal, this instructor truth and any deterministic
fixtures must be versioned with that pack. Do not silently retain a hidden
accuracy target from one corpus version.

This simulation uses anomaly `A05` for business-interaction duplicates. The
five-template/independent-label fact comes from the current support generator and
must remain spoiler-isolated.

## Planted traps

- Flattening the full ticket row into text and accidentally including
  `assigned_team_code`, `category_code`, current status, or resolution fields.
- Concatenating agent, bot, and internal messages with the customer's intake
  message.
- Accepting a message timestamp earlier than its conversation's documented start
  instead of flagging or excluding the inconsistent record.
- Using messages sent after the declared routing decision.
- Treating every message as an independent training example and weighting long
  conversations more heavily.
- Randomly splitting conversations while the same ticket or interaction appears
  on both sides.
- Treating `ticket_id` as the business-interaction key through the dual-write
  period.
- Dropping conversations without eligible customer text and silently changing
  the scoring population.
- Optimizing overall accuracy despite class imbalance and asymmetric misroute
  harm.
- Selecting an abstention threshold on the final test set.
- Treating `predict_proba` or calibrated scores as semantic certainty.
- Reading model coefficients as causal explanations of customer needs.
- Displaying unredacted message excerpts in an error-analysis export.
- Translating or sending restricted text through an unapproved external service.
- Automatically routing urgent, PII-flagged, redaction-review, non-English, or
  unknown-language cases without explicit evidence and policy authority.
- Calling a shadow system safe merely because its recommendation is hidden from
  agents; shadow still processes restricted data and needs monitoring.

## Scaffold levels

### Supported

- A corpus template supplies columns for conversation, ticket, interaction
  group, feature time, label time, eligible text, text-present flag, language,
  redaction state, and target provenance.
- Starter SQL demonstrates ordered aggregation of customer-only text into one
  conversation row and a duplicate-group audit without selecting a target.
- A Python shell includes a `DummyClassifier`, a word TF-IDF/logistic-regression
  pipeline, temporal/group split utilities, and empty evaluation/error-analysis
  functions.
- A challenger template demonstrates how a second pipeline can change
  representation without changing the evaluation contract.
- Routing-contract, error-register, model-card, and shadow-event templates are
  preloaded.

### Guided

- The learner receives the table neighborhood, routing handbook, cost matrix,
  review capacity, and restricted-handling notice.
- Hints appear when non-customer/later messages enter the corpus, interaction
  groups cross splits, label fields enter features, or review-required rows are
  marked for automatic action.
- Text representation, second model, thresholds, and deployment disposition
  remain learner-owned.

### Independent

- Only the Care request, learner-safe intake queue, prototype notebook, routing
  handbook, governance notice, catalog, and SQL/Python workbench are provided.
- The learner defines the corpus, target contract, baselines, challenger,
  validation, error taxonomy, abstention, and shadow instrumentation.
- A principled no-model or data-collection recommendation is accepted.

## Completion criteria

A complete submission:

- defines conversation, ticket, business interaction, message, and account
  grains and chooses a defensible modeling unit;
- builds one conversation row from only intake-eligible text and explicitly
  represents rows without eligible customer text;
- documents the target's current/final-team limitation and does not smuggle label
  or post-route information into features;
- keeps duplicate interaction/ticket groups together and uses a forward temporal
  evaluation period;
- compares a naive baseline, word TF-IDF model, and justified second model or
  representation in reproducible scikit-learn pipelines;
- reports macro and per-class performance, confidence reliability, coverage,
  asymmetric error cost, and relevant operational slices;
- performs structured error analysis rather than showing only aggregate metrics;
- defines abstention and mandatory human review for sensitive or unsupported
  populations;
- keeps restricted text in the approved environment and minimizes excerpts in
  exports;
- refuses unsupported live automation even when leadership requests a coverage
  percentage;
- provides a shadow data contract that can collect intake decisions, transfers,
  corrections, exposure, and outcomes; and
- states concrete promotion, pause, and rollback evidence without claiming the
  model understands intent.

## Complexity profile

Scale: 1 is foundational and 5 is capstone-level.

| Dimension | Rating | Why |
|---|---:|---|
| SQL | 4 | Ordered message aggregation, intake cutoffs, target maturation, duplicate grouping, and one-to-many reconciliation are required. |
| Python | 5 | Learners build and compare text pipelines, calibration/confidence analysis, error tooling, abstention, and deployable scoring artifacts. |
| Data complexity | 4 | Ticket, interaction, conversation, message, status, source, language, redaction, and access boundaries interact. |
| Statistical reasoning | 4 | Grouped temporal validation, class imbalance, asymmetric cost, calibration, coverage-risk, and slice uncertainty matter. |
| Ambiguity | 5 | The best outcome may be limited suggestions, shadow-only collection, taxonomy work, or refusal. |
| Deliverable load | 5 | Corpus SQL, two models, evaluation, error register, routing contract, model card, leadership readout, and shadow plan are required. |

## Deterministic checks

Deterministic checks should execute submitted artifacts and test exact invariants.
They must not infer semantic quality from keywords or require one hidden score.

Safe checks include:

- the corpus contains exactly one row per declared `conversation_id` and its row
  count reconciles to the documented cohort;
- every included message belongs to the row's conversation, has
  `sender_type_code='CUSTOMER'`, has `sent_at` on or after the conversation's
  `started_at`, and has `sent_at` no later than the declared intake feature
  cutoff;
- submitted feature matrices exclude exact target/leakage fields including
  `assigned_team_code`, `category_code`, `current_status_code`, `solved_at`,
  `first_response_minutes`, `reopen_count`, status-event outcomes, and later
  message metadata;
- no `interaction_fingerprint` or `ticket_id` group occurs in both training and
  untouched validation, and the training period ends before validation begins;
- at least one inspectable scikit-learn pipeline contains a
  `TfidfVectorizer`, all declared model pipelines fit and score in the fixed
  environment, and predictions align one-to-one with the scoring queue;
- emitted class probabilities or confidence values are finite and in `[0,1]`;
  where a probability vector is supplied, it sums to one within numerical
  tolerance;
- every automatic-route recommendation satisfies the submitted threshold and
  contract, while PII-flagged, redaction-review, unsupported-language, and
  mandatory-review rows abstain;
- restricted `body_text`, account identifiers, and customer identifiers are
  absent from exported leadership/action summaries; and
- the shadow event schema contains prediction version, decision time, candidate
  route, score, abstention/review state, human route, exposure, correction,
  transfer, and outcome placeholders.

Unsafe checks include requiring a particular classifier, matching a secret
macro-F1, grading error analysis by prose similarity, searching source code for
"human review," or treating a high confidence value as correct. Instructor
review should determine whether the target, evidence, abstention, and deployment
judgment are professionally defensible under
[`checking_policy.md`](../checking_policy.md).

## Curriculum fit

| Curriculum capability | How the work demonstrates it |
|---|---|
| Text data modeling | Restricted event text is converted into a documented, stable conversation-level corpus. |
| SQL grain discipline | Ticket duplicates, conversation/message fanout, intake time, and target maturity are reconciled. |
| Python NLP | TF-IDF and transparent classifiers are packaged in reproducible scikit-learn pipelines. |
| Model evaluation | Grouped temporal splits, per-class metrics, calibration, cost, coverage, and error analysis replace headline accuracy. |
| Human-in-the-loop design | Abstention, mandatory review, capacity, override, and shadow instrumentation are explicit. |
| Responsible deployment | Label fitness, restricted handling, multilingual gaps, and no-model outcomes constrain automation. |

## Source anchors

- [`world_bible.md`](../world_bible.md): business keys, grain, cutoff,
  observability, sensitivity, and responsible-refusal rules.
- [`schema_inventory.md`](../schema_inventory.md): support ticket,
  conversation, message, status, survey, CRM, trust, and model-lifecycle grains.
- [`data_catalog.json`](../../catalog/data_catalog.json): support dual-write,
  message sensitivity/redaction, survey scale, and model registry descriptions.
- [`relationships.json`](../../catalog/relationships.json): ticket-to-conversation,
  conversation-to-message, ticket history, account, survey, and model
  relationships.
- [`anomaly_ledger.json`](../../catalog/anomaly_ledger.json): private authoring
  context for anomaly `A05`; never ship it to the learner workspace.
- [`checking_policy.md`](../checking_policy.md): deterministic-check and manual
  judgment boundary.
