import type { LearnerScenario } from '@/lib/scenarios';
import { scenarios } from '@/lib/scenarios';

export type AssignmentPublication = {
  scenario: LearnerScenario;
  tension: string;
  mandate: string;
  shareCaption: string;
  accent: string;
};

const publicationDetails: Record<
  string,
  Omit<AssignmentPublication, 'scenario'>
> = {
  'the-monday-scorecard': {
    tension:
      'Two defensible-looking numbers are headed into the same executive meeting. Their disagreement is small enough to ignore—and large enough to change the story.',
    mandate:
      'Establish what each figure measures, reconcile the evidence, and leave leadership with a scorecard whose definitions and limitations can survive review.',
    shareCaption:
      'Two satisfaction figures. One executive meeting. Which number would you defend? Take The Monday Scorecard in The Analyst.',
    accent: '#e2764d',
  },
  'the-quarter-that-moved': {
    tension:
      'An acquisition cutover has put order identity, event timing, and revenue certification on different systems—and the quarter cannot close on intuition.',
    mandate:
      'Construct a stable commercial fact, isolate the exceptions that matter, and make a documented certification call on Q2 performance.',
    shareCaption:
      'The quarter closed, but the systems do not agree. Can you certify the numbers? Take The Quarter That Moved in The Analyst.',
    accent: '#d69b45',
  },
  'the-navigation-vote': {
    tension:
      'A mobile experiment appears promising, but exposure, assignment, behavior, and commercial outcomes do not arrive at the same grain.',
    mandate:
      'Build the experiment cohort, quantify effect and uncertainty, test the result’s credibility, and recommend rollout, iteration, or restraint.',
    shareCaption:
      'The experiment moved the metric. Is that enough to ship? Take The Navigation Vote in The Analyst.',
    accent: '#4f9a91',
  },
  'rollback-before-dawn': {
    tension:
      'Device alerts are rising during severe weather while telemetry coverage is degrading. Operations needs a global decision before the next shift.',
    mandate:
      'Separate failure from observability, quantify regional counterevidence, and recommend rollback, scoped containment, or monitored continuation.',
    shareCaption:
      'Alerts are rising and visibility is falling. Would you roll back before dawn? Take the reliability assignment in The Analyst.',
    accent: '#d45d58',
  },
  'the-730-capacity-call': {
    tension:
      'The morning service plan is already in motion. A useful risk model must be honest about time, calibrated for intervention, and ready before dispatch.',
    mandate:
      'Create a point-in-time risk view, compare it with a credible baseline, and turn model output into an operational action threshold.',
    shareCaption:
      'The crews are dispatching at 7:30. Which appointments need intervention? Take the capacity assignment in The Analyst.',
    accent: '#598ab5',
  },
  'forty-eight-hours-of-stock': {
    tension:
      'Inventory risk is moving faster than the replenishment cycle. Transfers, expedites, and substitutions all consume limited operational capacity.',
    mandate:
      'Build an honest demand-and-supply view, backtest the forecast, simulate lead-time risk, and issue a constrained action file.',
    shareCaption:
      'You have 48 hours to turn a demand forecast into stock decisions. Take the supply-planning practicum in The Analyst.',
    accent: '#8da35e',
  },
  'the-orion-renewal': {
    tension:
      'A vendor attributes a double-digit improvement to its optimizer. The board must decide whether the observed gain is causal enough to justify renewal.',
    mandate:
      'Reconstruct the operational outcome, challenge the comparison, test alternative explanations, and make a procurement recommendation.',
    shareCaption:
      'The vendor claims a 12% gain. Would you renew the contract? Audit The Orion Renewal in The Analyst.',
    accent: '#7975ad',
  },
  'the-queue-nobody-owns': {
    tension:
      'Uncategorized support work is accumulating. Automation could reduce delay—or silently send high-cost conversations to the wrong team.',
    mandate:
      'Construct leak-resistant labels, compare text classifiers, design an abstention policy, and specify a safe shadow-routing launch.',
    shareCaption:
      'Can you automate a support queue without hiding the dangerous errors? Take The Queue Nobody Owns in The Analyst.',
    accent: '#9b6bab',
  },
  'too-good-to-ship': {
    tension:
      'A cancellation model has exceptional validation results and a production deadline. Its performance is also good enough to deserve suspicion.',
    mandate:
      'Trace lineage and point-in-time availability, reproduce the apparent performance, and define the smallest safe path forward.',
    shareCaption:
      'The model looks too good to fail. Is it safe to ship? Take the model-risk practicum in The Analyst.',
    accent: '#ad6878',
  },
};

export const assignmentPublications: AssignmentPublication[] = scenarios.map(
  (scenario) => {
    const details = publicationDetails[scenario.slug];
    if (!details) {
      throw new Error(`Missing public assignment details for ${scenario.slug}`);
    }
    return { scenario, ...details };
  },
);

export const assignmentPublicationsBySlug: Record<
  string,
  AssignmentPublication
> = Object.fromEntries(
  assignmentPublications.map((publication) => [
    publication.scenario.slug,
    publication,
  ]),
);

export function assignmentUrl(slug: string) {
  return `https://theanalyst.dev/assignments/${slug}/`;
}

export function assignmentSocialImageUrl(slug: string) {
  return `https://theanalyst.dev/social/assignments/${slug}.png`;
}
