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
