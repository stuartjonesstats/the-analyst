# The Monday Scorecard

> Simulation design brief. The **Private instructor truth** section and reveal
> mechanics are authoring material and must not appear in the learner workspace.

## Simulation card

| Field | Design |
|---|---|
| Learner role | Junior Customer Insights Analyst, temporarily supporting Customer Care |
| Organizational moment | Monday, 2024-12-02, 08:05 ET. The October-November CRM migration has just ended, and the executive staff meeting starts at 09:30. |
| Initial request | Reconcile two support scorecards that disagree about Q4-to-date satisfaction, provide the number leadership should use, and say whether customer experience improved. |
| Timebox | 75-90 minutes; a 45-minute facilitated version is possible with the guided scaffold. |
| Primary level | Foundation / early analyst |
| Decision pressure | A Chief of Staff needs one slide before the meeting; Customer Care and Customer Insights each believe their report is correct. |
| Analysis cutoff | 2024-12-02 08:05 ET. Surveys submitted later and status changes learned later are not available. |

## Role and organizational moment

The learner has been at Meridian Living Systems for three weeks. Their manager is
in transit and asks them to cover a routine-looking scorecard reconciliation.
Customer Care reports satisfaction from its ticket export. Customer Insights
reports satisfaction from the survey platform. One trend is marked green and the
other amber. Ticket volume also appears to jump during the recently completed
CRM cutover.

The political stakes are modest but real: neither team wants its dashboard
declared wrong, and the Chief of Staff wants a sentence simple enough to repeat.
This is the learner's first opportunity to discover that a metric dispute is
often a question about grain, cohort, scale, and denominator rather than
arithmetic.

## Initial request

The opening inbox message should read approximately:

> Care's scorecard and the CX deck disagree on Q4-to-date CSAT, and both teams say their
> query is standard. Please give me the number we should put on the 09:30 slide,
> whether it is up or down, and a short explanation I can use if challenged. We
> also need to know whether the October-November contact spike was real.

The learner receives two small, plausible attachments generated from the same
estate:

- `care_q4_to_date_scorecard.csv`, grouped by ticket-open month and source ticket ID;
- `cx_survey_trend.csv`, covering Q3 and Q4-to-date, grouped by survey-submit month and using the survey
  platform's normalized score;
- a one-paragraph message saying only that the CRM migration "finished over the
  weekend."

The attachments should disagree without either containing fabricated rows.
They answer different estimands.

## Data neighborhood

The learner can search the whole catalog. These tables form the intended nearby
neighborhood, not a required path.

| Asset | What one row means | Why it may matter | Important caution |
|---|---|---|---|
| `support.ticket` | One source-system ticket | Opened cohort, channel, category, response time, source system, and `interaction_fingerprint` | Distinct `ticket_id` values can describe the same interaction during the dual-write window. Current status and solved time reflect the frozen extract. |
| `support.csat_response` | One returned survey per ticket | Raw score, original scale, comparable normalized score, submit time, and survey source | Returned surveys are respondents, not all customers. Both 1-5 and 1-10 scales occur. |
| `support.ticket_status_event` | One observed ticket status transition | Reconstruct whether a ticket was solved by the decision cutoff | Joining the history directly changes grain; use an as-of rule before counting tickets. |
| `support.conversation` | One conversation thread | Distinguishes tickets from customer conversations and channels | Restricted; generally unnecessary for the requested aggregate. |
| `support.message` | One message in a conversation | Optional investigation of repeat contacts or sentiment | Restricted free text. It should not be opened or exported merely because it is available. |
| `crm.account` | One customer account | Optional account-level weighting or segmentation | Confidential and not evidence that one account equals one person or one interaction. |

The catalog descriptions and warnings should be visible from the start. The
anomaly ledger must remain hidden.

## Timeline and reveals

Reveals should respond to learner evidence, not force a single click path. Timed
fallbacks keep the simulation moving.

### 1. Competing definitions — opening

The two report owners respond to questions:

- Customer Care defines volume as source tickets opened in the month and reports
  the mean raw survey score joined to those tickets.
- Customer Insights cohorts returned surveys by submit month, uses
  `score_normalized`, and does not report contact volume.

Neither answer is labeled incorrect.

### 2. The survey vendor note — evidence-triggered or minute 20

When the learner profiles `scale_max`, opens the CSAT quality note, or asks the
survey owner, they receive a vendor-change note: part of the population uses a
1-5 scale and part uses a 1-10 scale. The normalized field is the maintained
cross-scale measure.

### 3. The migration handoff — evidence-triggered or minute 35

When the learner compares ticket IDs with `interaction_fingerprint`, groups by
source system, or asks Support Systems about the cutover, an engineer explains
that Zendesk and the CRM mirror were dual-writing in October and November.
Separate ticket IDs do not always mean separate customer interactions. The
engineer warns that some genuine repeat contacts can look similar, so deleting
every repeated account/category combination is unsafe.

### 4. The executive follow-up — after first draft or minute 55

The Chief of Staff asks:

> Can I say "customers were happier," or only that survey respondents scored us
> higher? And if one number hides the migration issue, give me the better
> sentence, not the prettier number.

This turns an apparently mechanical reconciliation into an estimand and
communication decision.

## Authentic work products

The learner submits a small professional handoff rather than a quiz answer:

1. `metric_reconciliation.sql` or an equivalent saved notebook containing the
   cohort, deduplication, scale, and denominator logic plus basic reconciliation
   checks.
2. A one-page metric note naming the recommended headline measure, its grain,
   numerator, denominator, time basis, duplicate policy, and limitations.
3. An updated executive scorecard with at least satisfaction, response coverage,
   and interaction volume. One compact chart is enough.
4. A three-to-five-sentence reply that distinguishes an observed respondent
   trend from a claim about all customers.

The scorecard may use one headline number, paired measures, or a refusal to
collapse the evidence into one value if that choice is well defended.

## Ambiguity and defensible outcome space

There is no mandated headline metric. Several outcomes can be professionally
defensible:

- Recommend normalized mean CSAT among returned surveys, accompanied by response
  coverage and a warning that it does not estimate satisfaction among all
  customers.
- Recommend a threshold measure such as share of respondents above an explicit
  normalized cutoff because leadership finds it more interpretable.
- Keep opened-cohort and submitted-cohort measures side by side because they
  answer different operational questions.
- Decline to state whether "customers" became happier while still reporting a
  precise trend for survey respondents.

Choices become indefensible when they average raw scores across different scales,
count migration mirror records as separate interactions without disclosure,
silently switch cohort dates, or infer population sentiment from respondents
without qualification.

## Private instructor truth

The estate contains three separate reasons the reports can diverge:

1. `support.csat_response` retains both 1-5 and 1-10 scores. Raw means are not
   comparable across those populations; `score_normalized` is the maintained
   cross-scale field.
2. `support.ticket` is explicitly a source-ticket grain. During 2024-10-01
   through 2024-11-30, a CRM migration created distinct ticket IDs for some
   shared `interaction_fingerprint` values. The fingerprint is the intended
   reconciliation key, but it is evidence to profile rather than permission to
   discard every repeated-looking record.
3. Only a subset of tickets receive returned CSAT surveys. The estate does not
   support a clean assumption that nonrespondents have the same satisfaction as
   respondents.

Both starting scorecards can be arithmetically correct under their definitions.
The strongest early-learner performance makes the estimand explicit, reconciles
the migration population, and narrows the executive claim. Instructors should
not grade toward a secret preferred aggregation.

This simulation primarily operationalizes anomaly `A05` in
`catalog/anomaly_ledger.json`, plus the CSAT quality note in the generated catalog.

## Planted traps

- Averaging `score_raw` across `scale_max=5` and `scale_max=10`.
- Treating `ticket_id` as the business interaction key because it is the primary
  key.
- Using a broad `DISTINCT` and accidentally collapsing legitimate records.
- Counting the same survey more than once after a one-to-many status-history
  join.
- Comparing tickets opened in one month with surveys submitted in another
  without naming the cohort difference.
- Using `current_status_code` to decide what was solved at the historical cutoff.
- Reading restricted message bodies when aggregate metadata is sufficient.
- Reporting "customer satisfaction" without response coverage or respondent
  language.
- Choosing whichever query reproduces the executive's preferred arrow.

## Scaffold levels

### Supported

- The workbench opens on `support.ticket` and `support.csat_response`.
- Grain and sensitivity are shown inline.
- Starter checks prompt the learner to profile `scale_max`, compare row counts to
  distinct `interaction_fingerprint`, and choose opened versus submitted cohort.
- A metric-note template supplies fields for population, grain, numerator,
  denominator, time, exclusions, and limitation.

### Guided

- The learner receives the table neighborhood but no starter query.
- Optional hints appear after repeated invalid joins or raw-scale aggregation.
- The executive reply template is blank except for "What we observed" and "What
  we cannot conclude."

### Independent

- Only the inbox request, two attachments, catalog, and open workbench are
  supplied.
- Reveal messages remain available through sensible questions and evidence
  triggers.
- No answer-shape hint requires a single score.

## Completion criteria

Completion is based on evidence and judgment, not matching one number. A complete
submission:

- states the grain of both primary tables;
- makes scale handling explicit and does not combine incomparable raw scores;
- detects and quantifies the migration duplicate issue at an appropriate business
  grain;
- defines a time cohort and applies the simulation cutoff consistently;
- protects against row multiplication in any history join;
- reports response coverage or an equivalent denominator limitation;
- produces reproducible SQL or notebook logic with at least one row-count
  reconciliation;
- gives leadership a usable statement whose certainty matches the evidence; and
- avoids unnecessary access to restricted text.

## Curriculum fit

| Curriculum capability | How the work demonstrates it |
|---|---|
| Table grain and keys | Source ticket, interaction, survey response, and status event are distinguished. |
| Basic SQL | Profiling, grouping, conditional aggregation, joins, and count-distinct reconciliation. |
| Metric definition | Population, cohort date, scale, numerator, and denominator become explicit. |
| Data quality reasoning | Duplicate records and mixed scales are investigated rather than silently cleaned. |
| Responsible communication | The learner separates respondent evidence from a claim about all customers. |
| Governance | Restricted message content is recognized as unnecessary for the decision. |

## Source anchors

- [`world_bible.md`](../world_bible.md): grain, time, relationship, sensitivity,
  and responsible-refusal rules.
- [`schema_inventory.md`](../schema_inventory.md): support asset grains and
  reliability labels.
- [`data_catalog.json`](../../catalog/data_catalog.json): detailed support table
  descriptions, columns, and quality notes.
- [`relationships.json`](../../catalog/relationships.json): many-to-one links from
  CSAT, conversations, and status events to tickets.
- [`anomaly_ledger.json`](../../catalog/anomaly_ledger.json): private anomaly
  `A05`, support dual-write duplicates.
