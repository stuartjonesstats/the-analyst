export type InstructorNote = {
  sequence: number;
  id: string;
  title: string;
  readiness: string;
  truth: string;
  watchFor: string;
  revealTriggers: string[];
  misconceptions: string[];
  acceptableOutcomes: string;
  completionEvidence: string[];
  facilitation: string;
};

/**
 * Instructor-only projection. Keep this module out of learner routes and case
 * definitions: it contains generator truths, reveal timing, and assessment
 * guidance that would collapse the investigations if exposed in the workbench.
 */
export const instructorNotes: InstructorNote[] = [
  {
    sequence: 1,
    id: 'CC-241202',
    title: 'The Monday Scorecard',
    readiness: 'validated',
    truth:
      'Both opening scorecards can be arithmetically correct. The divergence combines incompatible 1–5 and 1–10 survey scales, migration-era duplicate source tickets, and non-random survey response. There is no secret preferred aggregation.',
    watchFor:
      'Raw-score averaging, deleting every repeated-looking ticket, or generalizing respondent satisfaction to every customer.',
    revealTriggers: [
      'Scale profile, quality-note inspection, or minute 20: disclose the survey-vendor scale change.',
      'Interaction fingerprint/source comparison, or minute 35: disclose the dual-write migration without prescribing a deduplication rule.',
      'First leadership draft, or minute 55: ask whether the claim concerns customers or survey respondents.',
    ],
    misconceptions: [
      'A different ticket ID always represents a different customer interaction.',
      'A higher respondent mean proves the full customer population became happier.',
    ],
    acceptableOutcomes:
      'One carefully defined headline, paired measures with different estimands, or a refusal to collapse them into one number can all be excellent.',
    completionEvidence: [
      'Explicit grain, cohort, scale, and cutoff definitions',
      'Duplicate and response-coverage quantification',
      'A pre/post-join row-count reconciliation',
      'Leadership language calibrated to the responding population',
    ],
    facilitation:
      'Best as an individual first assignment. Let pairs compare definitions only after each learner has written an independent metric statement.',
  },
  {
    sequence: 2,
    id: 'CM-240708',
    title: 'The Quarter That Moved',
    readiness: 'validated',
    truth:
      'Acquired-system order numbers are tenant-local and some timestamps are shifted by about five hours. Canonical order IDs, captured transaction amounts, named clocks, and a frozen cutoff can reconcile the quarter; price history is not a sales ledger.',
    watchFor:
      'Deduplicating on an unnamespaced source ID, overwriting captured price, or joining several one-to-many tables before aggregation.',
    revealTriggers: [
      'Source-key collision profile, or hour 1: explain the retired tenant namespace and canonical warehouse ID.',
      'Clock-difference investigation, or hour 2: disclose the local-naive timestamp parsing issue.',
      'Price-history reconstruction, or hour 3: clarify that captured order-line values own transaction revenue.',
      'First reconciliation, or hour 4: require a frozen close cutoff and late-arrival policy.',
    ],
    misconceptions: [
      'Repeated source order numbers are duplicate orders.',
      'The latest catalog price is a more authoritative revenue value than the captured transaction.',
    ],
    acceptableOutcomes:
      'A bounded certification with an exception population is stronger than either a false clean bill of health or an unqualified refusal to certify anything.',
    completionEvidence: [
      'Canonical-order and source-collision profiles',
      'Stable pre-join facts and amount bridges',
      'Named occurrence, source-record, and availability clocks',
      'Rerunnable certification logic and exception flags',
    ],
    facilitation:
      'Run individually or in pairs. In pairs, require separate SQL and Python ownership followed by a joint reconciliation review.',
  },
  {
    sequence: 3,
    id: 'GX-250505',
    title: 'The Navigation Vote',
    readiness: 'validated',
    truth:
      'Treatment genuinely increases session event depth, but the estate does not label whether the extra depth is useful or frustrating and does not encode a matching conversion effect. Session is the registered assignment unit.',
    watchFor:
      'Weighting deep sessions more heavily through event joins, redefining eligibility from the experiment name, or interpreting no significant conversion difference as equivalence.',
    revealTriggers: [
      'Device profile, or hour 1: clarify that “mobile” is a project name rather than an eligibility rule.',
      'Direct event join, or hour 2: challenge the changed electorate and return to session grain.',
      'First readout, or hour 6: ask what conversion harm the interval can and cannot exclude.',
      'Recommendation draft, or hour 8: request a winning segment and test post-hoc discipline.',
    ],
    misconceptions: [
      'More pages per session necessarily means easier navigation.',
      'A nonsignificant guardrail difference proves equivalence or harmlessness.',
    ],
    acceptableOutcomes:
      'Rollout, guarded rollout, or retest can all be defensible when the intent-to-treat estimate, uncertainty, UX interpretation, and monitoring match the action.',
    completionEvidence: [
      'Assignment-grain intent-to-treat cohort and reconciliation',
      'Effect estimates with interpretable uncertainty',
      'Explicit confirmatory versus exploratory separation',
      'Rollout or retest decision with monitoring conditions',
    ],
    facilitation:
      'Use pairs for statistical checking, but have each learner write an independent recommendation before comparing decisions.',
  },
  {
    sequence: 4,
    id: 'OP-250320',
    title: 'Rollback Before Dawn',
    readiness: 'validated',
    truth:
      'A severe winter event, missing-not-at-random telemetry, a firmware measurement shift, and a scoped Great Lakes issue overlap. The release does not identify a clean firmware-only physical effect or justify a single hidden rollback answer.',
    watchFor:
      'Treating missing telemetry as healthy equipment, using delayed outcomes at the decision time, or mistaking a measurement shift for physical failure.',
    revealTriggers: [
      'Weather/region exploration, or minute 30: disclose the severe-winter footprint.',
      'Expected-versus-observed sensor profile, or minute 55: disclose survivor-biased telemetry loss.',
      'Regional event inspection, or minute 75: disclose the scoped Great Lakes incident.',
      'First recommendation, or minute 100: force an actionable scope and reversal thresholds.',
    ],
    misconceptions: [
      'No received alert or reading means the asset was healthy.',
      'A pre/post shift in a changed measurement pipeline identifies a physical failure effect.',
    ],
    acceptableOutcomes:
      'Global rollback, scoped containment, or monitored continuation can each score highly when the learner names assumptions, counterevidence, thresholds, and exposure.',
    completionEvidence: [
      'Storm, firmware, and availability timeline',
      'Asset/channel missingness denominators',
      'A credible comparison plus counterevidence',
      'Actionable scope and conditions that reverse the decision',
    ],
    facilitation:
      'Strong small-team incident simulation: assign evidence lanes, then require one shared command decision and one dissent note.',
  },
  {
    sequence: 5,
    id: 'FO-250320',
    title: 'The 7:30 Capacity Call',
    readiness: 'validated',
    truth:
      'Convenient final-state tables leak the future. The point-in-time target is appointment-window breach; storm exposure and window length contain real signal, while the decision population shifts during the storm. Risk is not treatment effect.',
    watchFor:
      'Using realized arrival/completion facts, optimizing AUC without a capacity policy, or turning technician identity into an employee score.',
    revealTriggers: [
      'Opening: show the strong but retrospective spreadsheet shortcut.',
      'Target discussion, or minute 35: clarify first arrival by window end.',
      'Historical-feature build, or minute 75: ask whether each row is reconstructed at its own 07:30 cutoff.',
      'Threshold selection: distinguish appointment risk from the effect of calls or reroutes.',
    ],
    misconceptions: [
      'A date-filtered current-state table is automatically point-in-time valid.',
      'Feature importance can support employee performance ranking or causal intervention claims.',
    ],
    acceptableOutcomes:
      'A simple rule, calibrated model, shadow-only queue, or refusal to automate is valid if it respects capacity, abstention, data sensitivity, and evidentiary limits.',
    completionEvidence: [
      'One-row-per-appointment point-in-time mart',
      'Naive baseline and forward validation',
      'Calibration/slice analysis and capacity-aware threshold',
      'Action queue with human authority and shadow monitoring',
    ],
    facilitation:
      'Use pairs or teams of three for the build; require named ownership for mart, model audit, and operations policy. Rotate the reviewer role.',
  },
  {
    sequence: 6,
    id: 'SP-251201',
    title: 'Forty-Eight Hours of Stock',
    readiness: 'validated generator',
    truth:
      'The movement table has a technical-event grain: linked scanner replays are not new physical movements. Accepted receipts, not gross dock quantity, post to the ledger; lines may split or remain partial. Position snapshots are sparse, demand lives in ISSUE events, absent intermittent-event days are zeroes, seasonal families genuinely peak, and realized vendor lead times vary from 1–83 days.',
    watchFor:
      'Counting scanner replays, using gross receipts, treating sparse positions as a daily spine, dropping zero-demand days, validating randomly through time, or substituting promised lead time for realized uncertainty.',
    revealTriggers: [
      'Ledger mismatch, or minute 45: disclose scanner replay links.',
      'Daily-series inspection, or minute 80: clarify that position snapshots are sparse samples.',
      'First PO reconciliation: distinguish gross, rejected, and accepted split receipts.',
      'First action file: apply donor reserve, lane, handling, MOQ, and approval constraints.',
      'Final handoff: request winter-demand and vendor-delay stress views.',
    ],
    misconceptions: [
      'No sparse snapshot means zero inventory and no ISSUE row means a missing day.',
      'The lowest aggregate forecast error automatically yields the best constrained inventory action.',
    ],
    acceptableOutcomes:
      'Different forecast families and action mixes are valid. Grade honest backtests, coherent uncertainty, feasible actions, and decision stability rather than a single winning model.',
    completionEvidence: [
      'Reconciled physical movement and all-days demand facts',
      'Rolling-origin backtests and untouched final origin',
      'Lead-time/demand uncertainty simulation',
      'Referentially valid action file satisfying all constraints',
    ],
    facilitation:
      'Designed for teams of three or four with explicit data, forecasting, optimization, and review roles. Require a common reproducibility contract.',
  },
  {
    sequence: 7,
    id: 'PR-260119',
    title: 'The Orion Renewal',
    readiness: 'validated',
    truth:
      'ORION-2 creates a real operating-regime change but no clean 12% causal productivity answer. Adoption has no untreated geographic control, route stops are not work-order grain, and joins across histories and parts multiply rows.',
    watchFor:
      'Claiming causal ROI from before/after averages, counting rescheduled work twice, or ranking technicians without addressing assignment policy.',
    revealTriggers: [
      'Optimizer-version profile, or minute 35: disclose simultaneous go-live and assignment-pattern change.',
      'Work-order uniqueness failure, or minute 60: disclose rescheduling fanout without supplying a universal deduplication rule.',
      'Technician table, or minute 90: request individual ranking and test the ethical boundary.',
      'First causal conclusion: separate descriptive change, attribution, and procurement action.',
    ],
    misconceptions: [
      'A uniform go-live with a large pre/post difference is a difference-in-differences design.',
      'A work order appearing on multiple routes is necessarily a duplicate row to delete.',
    ],
    acceptableOutcomes:
      'Renew, renegotiate with measurement conditions, defer, or decline can all be credible. Lack of clean causal identification does not remove the obligation to make a bounded procurement recommendation.',
    completionEvidence: [
      'Stable route/stop/work-order/visit/workforce grains',
      'Fanout and reschedule reconciliation',
      'Trend, heterogeneity, placebo, or sensitivity evidence',
      'Procurement action plus prospective measurement design',
    ],
    facilitation:
      'Best for pairs or a board-style team. Assign one learner to defend attribution and another to audit it before a joint recommendation.',
  },
  {
    sequence: 8,
    id: 'NL-241203',
    title: 'The Queue Nobody Owns',
    readiness: 'validated with a deliberate refusal path',
    truth:
      'The current text templates, subjects, categories, and teams are generated independently, while the available team label is final rather than adjudicated initial ownership. Honest clean-holdout routing signal may be insufficient; refusing launch and designing shadow labels is a successful outcome.',
    watchFor:
      'Using later agent messages, accepting final assignment as ground truth, overlooking duplicate interactions, or forcing a classifier to win.',
    revealTriggers: [
      'Message join, or minute 40: ask what one training example represents.',
      'Split audit, or minute 75: disclose linked interactions across the dual-write migration.',
      'Target review, or minute 110: clarify that the label is final handling team, not adjudicated intake ownership.',
      'Final phase: offer a shadow event contract instead of demanding unsupported live automation.',
    ],
    misconceptions: [
      'More sophisticated NLP can repair a target that does not represent the intended decision.',
      'A high top-class probability is sufficient evidence for automated routing.',
    ],
    acceptableOutcomes:
      'Limited suggestions, human-review routing, shadow-only collection, taxonomy repair, or principled refusal are likely stronger than live automation in this estate.',
    completionEvidence: [
      'Leak-resistant conversation corpus and grouped forward split',
      'Transparent baselines plus structured error analysis',
      'Abstention and protected-population rules',
      'Shadow label/event contract with promotion and rollback gates',
    ],
    facilitation:
      'Use teams of three for corpus, model, and governance roles. Grade the quality of the boundary and shadow design as seriously as model performance.',
  },
  {
    sequence: 9,
    id: 'MR-260120',
    title: 'Too Good to Ship',
    readiness: 'validated',
    truth:
      'The near-perfect model is invalid: future outcomes leak into predictors, accounts cross random row splits, time is mixed, and governance/deployment evidence is absent. A post-audit AUC is not a grading target.',
    watchFor:
      'Prefix-only leakage removal, random row splitting, or treating offline discrimination as deployment approval.',
    revealTriggers: [
      'Schema inventory, or minute 25: surface both prefixed and non-prefixed future outcomes.',
      'Snapshot-grain check, or minute 50: expose account overlap across the random split.',
      'Availability review, or minute 75: distinguish feature reference time from upstream watermarks.',
      'Audit decision: request a raw campaign file and test access, purpose, and action boundaries.',
    ],
    misconceptions: [
      'Dropping columns beginning with future_ removes leakage.',
      'Reproducing a high metric validates the analysis or authorizes customer action.',
    ],
    acceptableOutcomes:
      'Rejecting the submitted model, allowing a tightly governed shadow rebuild, or authorizing a simpler allow-listed baseline can all be strong dispositions. Immediate campaign action is not supported.',
    completionEvidence: [
      'Full predictor inventory and leakage demonstration',
      'Entity-aware temporal validation contract',
      'Allow-listed baseline with calibration and segment audit',
      'Clear disposition, access boundary, and evidence for the next gate',
    ],
    facilitation:
      'Excellent individual final audit or paired red-team exercise. Have learners review one another’s allow-lists and deployment dispositions.',
  },
];

export type SelfGuidedRubric = {
  inquiry: string[];
  diagnostics: string[];
  decisionQualities: string[];
};

/** Reflective prompts for self-paced learners. These guide inspection without
 * assigning a preferred method, threshold, model, or decision. */
export const selfGuidedRubrics: Record<string, SelfGuidedRubric> = {
  'CC-241202': {
    inquiry: [
      'What population, time cohort, business grain, and scale does each opening number represent?',
      'Which repeated records are technical migration artifacts, and which could be legitimate repeat contacts?',
      'How does survey response coverage limit the population claim?',
    ],
    diagnostics: [
      'Score-scale and normalized-score distributions by source/cohort',
      'Ticket ID, interaction fingerprint, and pre/post-join count reconciliation',
      'Response numerator and eligible-population denominator with missingness profile',
    ],
    decisionQualities: [
      'Defines the metric before naming the number',
      'Separates respondent evidence from all-customer claims',
      'Explains why the chosen one-number, paired-number, or refusal approach is fit for leadership use',
    ],
  },
  'CM-240708': {
    inquiry: [
      'Which identifier is globally canonical, and where is source uniqueness only local?',
      'Which clock answers occurrence, source recording, warehouse availability, and financial close?',
      'Which captured transaction facts own revenue and fulfillment measures?',
    ],
    diagnostics: [
      'Key-collision and uniqueness profiles by source/period',
      'Clock-offset and late-arrival exception distributions',
      'Header/line/event/shipment row and amount bridges before and after joins',
    ],
    decisionQualities: [
      'Issues a bounded certification with quantified exceptions',
      'Preserves raw fields and expresses reusable correction flags',
      'States a stable rerun and next-close policy',
    ],
  },
  'GX-250505': {
    inquiry: [
      'What was randomized, who was eligible, and what estimand was registered?',
      'Does event-level joining change the weight assigned to experimental units?',
      'What can an increase in navigation depth establish about value, friction, or conversion harm?',
    ],
    diagnostics: [
      'Assignment reconciliation, allocation balance, and missingness by variant',
      'Session-grain primary/guardrail effects with uncertainty',
      'Clearly labeled exploratory slices and repeated-account sensitivity',
    ],
    decisionQualities: [
      'Separates confirmatory evidence from post-hoc discovery',
      'Does not translate nonsignificance into equivalence',
      'Connects rollout, guardrails, monitoring, and claim strength',
    ],
  },
  'OP-250320': {
    inquiry: [
      'How do firmware, weather, telemetry availability, alerts, and field work align in time and geography?',
      'What would telemetry absence look like if failures themselves interrupt reporting?',
      'Which comparison can inform scope without pretending to be a randomized control?',
    ],
    diagnostics: [
      'Asset/channel expected-versus-observed reporting grid',
      'Storm/firmware/region trend and counterevidence views',
      'Cutoff audit separating physical failure, measurement change, alert, and work request',
    ],
    decisionQualities: [
      'Names an actionable containment or monitoring scope',
      'Calibrates causal language to overlapping mechanisms',
      'Provides thresholds or evidence that would reverse the decision',
    ],
  },
  'FO-250320': {
    inquiry: [
      'What was knowable at 07:30 for each historical appointment?',
      'What operational promise defines the target, and when does its label become available?',
      'How should review capacity, asymmetric cost, and population shift shape the action policy?',
    ],
    diagnostics: [
      'Point-in-time one-row-per-appointment mart and leakage inventory',
      'Naive baseline, forward validation, calibration, and operational slices',
      'Threshold/coverage table under stated review capacity and cost assumptions',
    ],
    decisionQualities: [
      'Separates risk prediction from intervention effect',
      'Keeps action at appointment/capacity grain and protects employee data',
      'Defines human authority, abstention, and shadow-monitoring gates',
    ],
  },
  'SP-251201': {
    inquiry: [
      'How do technical events map to physical movements, accepted receipts, and complete daily demand?',
      'Which forecast loss reflects inventory decisions across intermittent and seasonal series?',
      'How do demand, lead-time, donor, lane, MOQ, and approval constraints interact?',
    ],
    diagnostics: [
      'Ledger/receipt reconciliation and all-days demand spine with explicit zeroes',
      'Multiple rolling-origin folds, untouched final origin, bias, and series-type performance',
      'Recipient/donor simulation plus referential and constraint checks on the action file',
    ],
    decisionQualities: [
      'Distinguishes forecast accuracy, inventory risk, and action value',
      'Explains pooling, uncertainty, stress, and reproducibility assumptions',
      'Delivers feasible actions with monitoring, override, and expiration rules',
    ],
  },
  'PR-260119': {
    inquiry: [
      'What business unit owns each route, stop, work-order, visit, and workforce outcome?',
      'What does simultaneous adoption prevent the data from identifying cleanly?',
      'Which descriptive changes, attribution claims, and procurement actions remain distinct?',
    ],
    diagnostics: [
      'Stable-grain and fanout reconciliation including rescheduled work',
      'Pre/post trends, meaningful heterogeneity, placebo, or sensitivity views',
      'Outcome/guardrail definitions and evidence against individual ranking',
    ],
    decisionQualities: [
      'Makes a procurement decision despite bounded attribution',
      'Refuses or safely constrains employee ranking',
      'Proposes prospective measurement or contract conditions for the next decision',
    ],
  },
  'NL-241203': {
    inquiry: [
      'What is one eligible intake example, and which text existed before the routing decision?',
      'Does the available label represent adjudicated correct ownership or eventual handling?',
      'Which populations and error types require abstention or mandatory human review?',
    ],
    diagnostics: [
      'Conversation-grain corpus, intake eligibility audit, and grouped forward split',
      'Transparent baselines, per-class/coverage results, calibration, and structured error analysis',
      'Sensitive/unsupported population slices and shadow-label event contract',
    ],
    decisionQualities: [
      'Treats target validity as a product question, not just a modeling detail',
      'Refuses unsupported live automation while preserving a useful remainder',
      'Defines promotion, pause, rollback, access, and monitoring evidence',
    ],
  },
  'MR-260120': {
    inquiry: [
      'Which predictors were available at scoring time, including source-watermark constraints?',
      'Do accounts or future calendar regimes cross the submitted validation boundary?',
      'What evidence would authorize shadow, restricted evaluation, or customer action?',
    ],
    diagnostics: [
      'Complete predictor inventory including non-prefixed future outcomes',
      'Entity overlap audit and grouped temporal validation comparison',
      'Allow-listed baseline, calibration/segment audit, and access/export review',
    ],
    decisionQualities: [
      'Explains why reproducibility does not establish validity',
      'Assigns a clear model disposition without claiming no future model can work',
      'Blocks unsupported action and names the smallest safe next gate',
    ],
  },
};
