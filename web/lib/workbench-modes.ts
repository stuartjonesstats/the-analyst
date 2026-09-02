import type { CaseDefinition } from '@/lib/case-definition';
import type { ScaffoldMode } from '@/lib/analyst-case';

export type WorkdayEventTrigger = 'sql-run' | 'evidence-added' | 'brief-drafted';

export type WorkdayEvent = {
  id: string;
  trigger: WorkdayEventTrigger;
  from: string;
  subject: string;
  body: string;
};

const workdayEvents: Record<string, WorkdayEvent[]> = {
  'the-monday-scorecard': [
    {
      id: 'vendor-method-note',
      trigger: 'sql-run',
      from: 'Avery Bell / Survey Operations',
      subject: 'Method note: both collection systems are still live',
      body: 'Care Survey records use a five-point response scale. The acquired Legacy Survey retained its ten-point scale through the migration. Please do not compare the raw means without declaring a common interpretation.',
    },
    {
      id: 'migration-key-warning',
      trigger: 'evidence-added',
      from: 'Noor Shah / Data Transition',
      subject: 'Source-ticket references are tenant-local',
      body: 'One more thing: the old and new care platforms can emit the same source ticket reference. The canonical warehouse ticket ID remains unique; a source reference needs its source system beside it.',
    },
    {
      id: 'executive-challenge',
      trigger: 'brief-drafted',
      from: 'Talia Rivera / VP Customer Care',
      subject: 'Before I use the headline',
      body: 'Can I say customers are happier, or only that responding customers rated recent interactions differently? Put the population and the remaining coverage limitation directly in the sentence I should repeat.',
    },
  ],
  'the-quarter-that-moved': [
    {
      id: 'controller-cutoff',
      trigger: 'sql-run',
      from: 'Mina Patel / Corporate Controller',
      subject: 'Certification cutoff is fixed',
      body: 'Use what the warehouse knew by 08 Jul at 08:30 ET. Late-arriving records belong in the exception register, not silently in the certified rerun.',
    },
    {
      id: 'tenant-key-clarification',
      trigger: 'evidence-added',
      from: 'Eli Grant / Acquisition Integration',
      subject: 'Acquired order numbers need a namespace',
      body: 'The acquired platform restarted order numbering per tenant. A source order number is not a canonical company order ID unless the source system and tenant are retained.',
    },
    {
      id: 'certification-challenge',
      trigger: 'brief-drafted',
      from: 'Mina Patel / Corporate Controller',
      subject: 'What exactly are you certifying?',
      body: 'Separate captured transaction value, catalog price history, and fulfillment timing. I need the population, cutoff, unresolved exceptions, and the sentence Finance may safely publish.',
    },
  ],
  'the-navigation-vote': [
    {
      id: 'experiment-eligibility-note',
      trigger: 'sql-run',
      from: 'Jon Bell / Experimentation Platform',
      subject: 'The experiment name is not an eligibility filter',
      body: '“mobile_navigation” is the project label. Eligibility is recorded on the assignment row; device family is an analysis dimension, not a rule for rebuilding the electorate.',
    },
    {
      id: 'session-grain-challenge',
      trigger: 'evidence-added',
      from: 'Priya Shah / Product Director',
      subject: 'Which unit received the treatment?',
      body: 'Event depth is useful context, but each session received one assignment. Show me that an event join did not give long sessions extra votes, and separate the registered readout from exploratory segments.',
    },
    {
      id: 'guardrail-interpretation',
      trigger: 'brief-drafted',
      from: 'Leah Morgan / Product Analytics',
      subject: 'Please bound the guardrail claim',
      body: 'A nonsignificant conversion difference is not proof of equivalence. State the harm the interval can still accommodate and the monitoring condition attached to your rollout or retest decision.',
    },
  ],
  'rollback-before-dawn': [
    {
      id: 'storm-footprint-note',
      trigger: 'sql-run',
      from: 'Mara Chen / Incident Command',
      subject: 'Winter operations overlap the release window',
      body: 'The severe-weather footprint is not uniform. Keep region, exposure, firmware cohort, and what was knowable by 11:40 ET visible in the same timeline.',
    },
    {
      id: 'telemetry-survivorship-warning',
      trigger: 'evidence-added',
      from: 'Inez Wu / Device Reliability',
      subject: 'Silence is not a healthy reading',
      body: 'Failed or disconnected units may stop reporting. Reconcile expected assets and channels against observed telemetry before treating missing alerts or measurements as reassuring evidence.',
    },
    {
      id: 'incident-action-request',
      trigger: 'brief-drafted',
      from: 'Mara Chen / Incident Command',
      subject: 'Name the action boundary',
      body: 'I need an executable scope, not only a diagnosis: affected population, containment or rollback action, evidence against it, monitoring owner, and thresholds that reverse the decision.',
    },
  ],
  'the-730-capacity-call': [
    {
      id: 'promise-definition',
      trigger: 'sql-run',
      from: 'Avery Brooks / Regional Dispatch',
      subject: 'The promise is first arrival by window end',
      body: 'Completion and final status are retrospective conveniences. At 07:30, the operating question is whether the first technician arrival will occur by the scheduled window end.',
    },
    {
      id: 'capacity-policy-request',
      trigger: 'evidence-added',
      from: 'Sam Ortiz / Dispatch Operations',
      subject: 'A ranking is not yet a call queue',
      body: 'We have limited reviewers and several possible actions. Tie the threshold to capacity, abstention, and human authority; risk is not the causal effect of a call or reroute.',
    },
    {
      id: 'employee-use-boundary',
      trigger: 'brief-drafted',
      from: 'Nora Ellis / People Operations',
      subject: 'Do not turn appointment risk into an employee score',
      body: 'Technician identity reflects assignment policy and operating context. State the prohibited uses, monitoring plan, and who can override the queue before this enters shadow operations.',
    },
  ],
  'forty-eight-hours-of-stock': [
    {
      id: 'movement-replay-note',
      trigger: 'sql-run',
      from: 'Nikhil Rao / Supply Chain',
      subject: 'Scanner replays are technical events',
      body: 'Linked scanner replays do not represent new physical movement. Accepted receipt quantities post to the ledger; gross dock quantities can include rejected or split lines.',
    },
    {
      id: 'daily-spine-warning',
      trigger: 'evidence-added',
      from: 'Rhea Kim / Inventory Control',
      subject: 'Sparse positions are not a daily stock ledger',
      body: 'Position snapshots are intermittent observations. Demand comes from ISSUE movements, and a day without an issue event is a zero only after you construct the all-days spine.',
    },
    {
      id: 'action-feasibility-request',
      trigger: 'brief-drafted',
      from: 'Nikhil Rao / Supply Chain',
      subject: 'Stress the action book before release',
      body: 'Show winter-demand and vendor-delay stress, then enforce donor reserve, lane, handling, minimum-order, and approval constraints. Do not solve one warehouse by creating an unmodeled shortage elsewhere.',
    },
  ],
  'the-orion-renewal': [
    {
      id: 'operating-regime-note',
      trigger: 'sql-run',
      from: 'Mara Okafor / COO Chief of Staff',
      subject: 'ORION-2 changed more than routing software',
      body: 'Go-live coincided with assignment-pattern and operating changes across the estate. Keep observed productivity movement separate from causal attribution.',
    },
    {
      id: 'route-fanout-warning',
      trigger: 'evidence-added',
      from: 'Devon Price / Field Systems',
      subject: 'A work order can legitimately appear on several routes',
      body: 'Rescheduling and multi-stop work create fanout. Reconcile route, stop, work-order, visit, parts, and effective-dated workforce grains before deleting repeated-looking rows.',
    },
    {
      id: 'procurement-boundary',
      trigger: 'brief-drafted',
      from: 'Mara Okafor / COO Chief of Staff',
      subject: 'Procurement still needs a bounded decision',
      body: 'Renew, renegotiate, defer, or decline—but label descriptive change, causal evidence, procurement action, and employee evaluation as four different claims. Include the prospective measurement condition.',
    },
  ],
  'the-queue-nobody-owns': [
    {
      id: 'corpus-grain-question',
      trigger: 'sql-run',
      from: 'Talia Rivera / Customer Care',
      subject: 'What does one training row represent?',
      body: 'A conversation may include customer, bot, agent, internal, and later messages. Define the intake-time corpus and preserve linked interactions across the migration before fitting anything.',
    },
    {
      id: 'target-provenance-warning',
      trigger: 'evidence-added',
      from: 'Elena Park / ML Governance',
      subject: 'Final handling team is not adjudicated intake ownership',
      body: 'The available team label records where work ended, not necessarily where it should have been routed at intake. A strong classifier cannot repair a target that does not represent the intended decision.',
    },
    {
      id: 'shadow-contract-offer',
      trigger: 'brief-drafted',
      from: 'Talia Rivera / Customer Care',
      subject: 'A responsible refusal can still move the work forward',
      body: 'If live automation is unsupported, specify the shadow label and event contract, abstention and protected-population rules, human review authority, and evidence required for promotion.',
    },
  ],
  'too-good-to-ship': [
    {
      id: 'leakage-inventory-request',
      trigger: 'sql-run',
      from: 'Elena Park / ML Governance',
      subject: 'Leakage is not limited to a naming prefix',
      body: 'Inventory every predictor against the proposed decision time. Future outcomes can appear under ordinary business names as well as obvious future_ fields.',
    },
    {
      id: 'split-contamination-warning',
      trigger: 'evidence-added',
      from: 'Micah Lee / Model Risk',
      subject: 'Accounts cross the submitted random split',
      body: 'Repeated account snapshots mix entities and time. Demonstrate overlap, rebuild an entity-aware temporal validation contract, and distinguish feature reference time from upstream availability.',
    },
    {
      id: 'deployment-authority-boundary',
      trigger: 'brief-drafted',
      from: 'Elena Park / ML Governance',
      subject: 'Reproduction does not authorize customer action',
      body: 'State the disposition, allow-listed rebuild boundary, access and purpose limits, shadow monitoring, and evidence for the next gate. A post-audit AUC is not itself deployment approval.',
    },
  ],
};

export function eventsForAssignment(slug: string) {
  return workdayEvents[slug] ?? [];
}

export function starterForMode(definition: CaseDefinition, mode: ScaffoldMode) {
  if (mode === 'supported') {
    return {
      sql: definition.defaultSql,
      python: definition.defaultPython,
      notes: definition.defaultNotes,
      evidence: definition.initialEvidence,
    };
  }

  const firstTable = definition.dataFiles[0]?.table ?? 'schema.table';
  if (mode === 'guided') {
    return {
      sql: `-- Begin by establishing grain, coverage, and point-in-time availability.\n-- Replace this preview with a reconciled evidence query.\nSELECT *\nFROM ${firstTable}\nLIMIT 20;`,
      python: `import pandas as pd\nimport matplotlib.pyplot as plt\nfrom analyst import table\n\n# Load a governed table by its registered name.\ndata = table("${firstTable}")\n\n# Profile, visualize, test, simulate, or model only after the grain is clear.\ndata.head()`,
      notes: `# Working notes\n\n- Decision and audience:\n- Intended analytical grain:\n- Knowledge cutoff and relevant clocks:\n- Assumptions to test:\n- Evidence that would change the recommendation:\n`,
      evidence: definition.initialEvidence.filter((record) => record.state === 'verified'),
    };
  }

  return {
    sql: '-- Independent mode: construct the evidence query you can defend.\n',
    python: '# Independent mode: use Python only where it improves the decision.\n',
    notes: '# Working notes\n',
    evidence: [],
  };
}
