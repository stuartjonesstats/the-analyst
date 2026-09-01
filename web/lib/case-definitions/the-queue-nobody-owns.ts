import type { CaseDefinition } from '@/lib/case-definition';

const root = '/data/cases/the-queue-nobody-owns';

export const theQueueNobodyOwns: CaseDefinition = {
  id: 'NL-241203',
  slug: 'the-queue-nobody-owns',
  title: 'The Queue Nobody Owns',
  revision: '2026.09.01.casepack.1',
  catalogSnapshot: '2026-01-15',
  businessUnit: 'Customer Care Operations',
  role: 'Applied ML Analyst',
  queueSubtitle: 'Care Platform / Routing backlog',
  priority: 'P1',
  requester: 'Talia Rivera / VP Customer Care',
  received: '03 Dec / 08:20',
  responseDue: '06 Dec / 16:00',
  dueLabel: 'FRIDAY 16:00',
  channel: 'Care operations incident room',
  requestKicker: 'REQUEST / HUMAN-IN-THE-LOOP NLP',
  requestTitle: 'Decide what, if anything, may enter shadow routing.',
  requestBody: 'Use the subject and customer opening text to recommend one of five receiving teams. Quantify what can be covered safely, make high-harm cases abstain, and specify what must be learned in shadow before any live routing. The 818-item scoring queue has outcomes withheld.',
  decisionStandard: 'The unit, feature clock, target provenance, split groups, and review policy must be valid before model scores matter. A principled no-live-model decision is a successful result.',
  sessionLabel: '241203-NL',
  responseWindow: '31:40:00',
  persistenceKey: 'the-analyst:the-queue-nobody-owns',
  dataFiles: [
    { table: 'support.conversation', url: `${root}/conversation.parquet`, pythonPath: `${root}/conversation.parquet`, rows: 50_387, trust: 'LIMITED', note: 'Historical conversation grain; one ticket can contain several conversations.' },
    { table: 'support.ticket', url: `${root}/ticket.parquet`, pythonPath: `${root}/ticket.parquet`, rows: 30_311, trust: 'REVIEW', note: 'Current/final team and outcome fields are target candidates or later facts, not intake features.' },
    { table: 'support.message', url: `${root}/message.parquet`, pythonPath: `${root}/message.parquet`, rows: 161_911, trust: 'LIMITED', note: 'Restricted text includes customer, agent, bot, internal, later, flagged, and clock-inconsistent messages.' },
    { table: 'support.ticket_status_event', url: `${root}/ticket_status_event.parquet`, pythonPath: `${root}/ticket_status_event.parquet`, rows: 130_347, trust: 'REVIEW', note: 'Later operational outcomes; direct joins multiply conversations.' },
    { table: 'case_input.scoring_queue', url: `${root}/scoring_queue.parquet`, pythonPath: `${root}/scoring_queue.parquet`, rows: 818, trust: 'LIMITED', note: 'Learner-safe unlabeled queue with opening customer text and review flags only.' },
    { table: 'case_reference.routing_team', url: `${root}/routing_team.parquet`, pythonPath: `${root}/routing_team.parquet`, rows: 5, trust: 'VERIFIED', note: 'Receiving-team scope and human review capacity.' },
    { table: 'case_reference.misroute_cost', url: `${root}/misroute_cost.parquet`, pythonPath: `${root}/misroute_cost.parquet`, rows: 25, trust: 'VERIFIED', note: 'Asymmetric relative harm for actual/predicted route pairs.' },
  ],
  defaultSql: `WITH first_legal_customer AS (
  SELECT
    conversation.conversation_id,
    MIN(message.sent_at) AS first_customer_at
  FROM support.conversation conversation
  JOIN support.message message USING (conversation_id)
  WHERE message.sender_type_code = 'CUSTOMER'
    AND message.sent_at >= conversation.started_at
  GROUP BY conversation.conversation_id
), eligible_text AS (
  SELECT
    first.conversation_id,
    first.first_customer_at,
    first.first_customer_at + INTERVAL '30 minutes' AS decision_at,
    STRING_AGG(message.body_text, '\n' ORDER BY message.sent_at) AS intake_text,
    COUNT(*) AS eligible_message_count,
    BOOL_OR(message.redaction_state_code = 'REVIEW_REQUIRED') AS redaction_review_flag,
    BOOL_OR(message.contains_synthetic_pii_flag) AS pii_flag
  FROM first_legal_customer first
  JOIN support.message message
    ON message.conversation_id = first.conversation_id
   AND message.sender_type_code = 'CUSTOMER'
   AND message.sent_at BETWEEN first.first_customer_at AND first.first_customer_at + INTERVAL '30 minutes'
  GROUP BY first.conversation_id, first.first_customer_at
), routing_mart AS (
  SELECT
    conversation.conversation_id,
    ticket.ticket_id,
    ticket.interaction_fingerprint,
    conversation.started_at,
    eligible.decision_at,
    conversation.language_code,
    conversation.channel_code,
    ticket.subject,
    eligible.intake_text,
    ticket.assigned_team_code AS retrospective_target,
    ticket.solved_at AS label_available_at,
    'FROZEN_CURRENT_TEAM' AS target_provenance,
    eligible.redaction_review_flag,
    eligible.pii_flag
  FROM support.conversation conversation
  JOIN support.ticket ticket USING (ticket_id)
  LEFT JOIN eligible_text eligible USING (conversation_id)
)
SELECT
  language_code,
  retrospective_target,
  COUNT(*) AS conversations,
  COUNT(intake_text) AS conversations_with_eligible_text,
  COUNT(DISTINCT ticket_id) AS source_tickets,
  COUNT(DISTINCT interaction_fingerprint) AS business_interactions
FROM routing_mart
GROUP BY 1, 2
ORDER BY conversations DESC;`,
  defaultPython: `import pandas as pd
from analyst import table
from sklearn.dummy import DummyClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score
from sklearn.pipeline import Pipeline

conversations = table("support.conversation")
tickets = table("support.ticket")
messages = table("support.message")

candidate = messages.merge(
    conversations[["conversation_id", "ticket_id", "started_at", "language_code"]],
    on="conversation_id",
    validate="many_to_one",
)
candidate = candidate[
    (candidate["sender_type_code"] == "CUSTOMER") &
    (candidate["sent_at"] >= candidate["started_at"])
].sort_values(["conversation_id", "sent_at"])
opening = candidate.groupby("conversation_id", as_index=False).first()
corpus = opening.merge(
    tickets[["ticket_id", "interaction_fingerprint", "assigned_team_code"]],
    on="ticket_id",
    validate="many_to_one",
)

# This forward split is a starter diagnostic. Audit interaction-group overlap
# and target provenance before treating it as a validation contract.
train = corpus[corpus["started_at"] < "2024-10-01"]
valid = corpus[corpus["started_at"] >= "2024-10-01"]

baseline = DummyClassifier(strategy="most_frequent").fit(
    train[["conversation_id"]], train["assigned_team_code"]
)
model = Pipeline([
    ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2)),
    ("classifier", LogisticRegression(max_iter=300)),
]).fit(train["body_text"], train["assigned_team_code"])

group_overlap = len(set(train["interaction_fingerprint"]) & set(valid["interaction_fingerprint"]))
pd.DataFrame([
    {"model": "most-frequent", "macro_f1": f1_score(valid["assigned_team_code"], baseline.predict(valid[["conversation_id"]]), average="macro")},
    {"model": "word TF-IDF", "macro_f1": f1_score(valid["assigned_team_code"], model.predict(valid["body_text"]), average="macro")},
]).assign(validation_rows=len(valid), interaction_groups_on_both_sides=group_overlap)`,
  defaultNotes: `# Corpus contract

- Modeling unit:
- Feature/decision time:
- Eligible sender and text window:
- Target and target provenance:
- Business-interaction split group:
- Rows with no eligible text:

# Evaluation

- Baseline / word model / challenger:
- Macro and per-class evidence:
- Confidence reliability and coverage-risk:
- Highest-harm error slices:

# Routing policy

- Automatic action permitted now?
- Abstention and mandatory-review rules:
- Human capacity assumption:
- Restricted-data boundary:
- Shadow events, promotion gate, pause, and rollback:
`,
  initialEvidence: [
    {
      id: 'E-001',
      statement: 'The prototype reports strong random-split accuracy after flattening the frozen ticket row and full message history.',
      source: 'PROTOTYPE NOTEBOOK',
      state: 'review',
      recordedAt: '2024-12-03T13:24:00.000Z',
    },
    {
      id: 'E-002',
      statement: 'Message text is restricted and may not be copied to an external service.',
      source: 'DATA HANDLING NOTICE',
      state: 'verified',
      recordedAt: '2024-12-03T13:26:00.000Z',
    },
  ],
  requiredArtifacts: [
    'conversation_routing_mart.sql',
    'Reproducible baseline and two-model Python package',
    'Grouped temporal evaluation and error register',
    'Routing and abstention contract',
    'Model and data card',
    'Shadow event and monitoring specification',
    'Restricted leadership readout',
    'Scored queue with review states',
  ],
  pythonPackages: ['scikit-learn'],
};
