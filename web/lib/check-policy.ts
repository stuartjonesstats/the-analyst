export type CheckState = 'recorded' | 'verified' | 'instructor_review';

export type MechanicalCheckDefinition = {
  id: string;
  label: string;
  state: CheckState;
  verifies: string;
  doesNotVerify: string;
};

/**
 * These are deliberately narrow. They record observable mechanics and never
 * score the learner's analytical conclusion.
 */
export const mondayScorecardChecks: MechanicalCheckDefinition[] = [
  {
    id: 'query.executed',
    label: 'A SQL query executed',
    state: 'recorded',
    verifies: 'The browser engine accepted and ran at least one query.',
    doesNotVerify: 'That the query used the right cohort, grain, denominator, or interpretation.',
  },
  {
    id: 'analysis.saved',
    label: 'Reproducible analysis saved',
    state: 'recorded',
    verifies: 'A non-empty SQL or notebook artifact exists in the assignment handoff.',
    doesNotVerify: 'That the analysis is logically or statistically sound.',
  },
  {
    id: 'metric_note.present',
    label: 'Metric definition note attached',
    state: 'recorded',
    verifies: 'A non-empty metric-note artifact exists.',
    doesNotVerify: 'That the chosen metric is decision-relevant or well defended.',
  },
  {
    id: 'handoff.review',
    label: 'Analytical judgment reviewed',
    state: 'instructor_review',
    verifies: 'Nothing automatically; this is explicitly routed to a human reviewer.',
    doesNotVerify: 'No machine-generated score is used as a proxy for professional judgment.',
  },
];
