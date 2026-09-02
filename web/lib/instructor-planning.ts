export type RubricDimension = {
  name: string;
  weight: number;
  question: string;
  levels: readonly string[];
};

export const rubricDimensions: RubricDimension[] = [
  {
    name: 'Business grain and relationship control',
    weight: 15,
    question:
      'Did the learner define what one row represents and control multiplicity?',
    levels: [
      'Treats physical rows as business entities or events in a way that materially invalidates the result; ignores obvious join multiplication.',
      'Names a grain or duplicate concern but does not test it or quantify its effect.',
      'Uses a plausible grain and some key checks, but leaves a material relationship, many-to-many path, or reconciliation unresolved.',
      'Defines the business grain, profiles key uniqueness, respects relationship cardinality, and reconciles row/entity counts before and after joins.',
      'Meets level 3 and stress-tests alternate grains, temporal relationships, partial coverage, or legitimate repeats; explains whether residual grain risk changes the decision.',
    ],
  },
  {
    name: 'Point-in-time validity',
    weight: 15,
    question:
      'Could the evidence legitimately have been known at the decision cutoff?',
    levels: [
      'Uses future outcomes, revised current state, or post-cutoff information as if it were available at decision time.',
      'Applies date filters but leaves the analysis cutoff, event-time meaning, or comparison window materially ambiguous.',
      'Defines the cutoff and main periods but misses one relevant lag, backfill, revision, snapshot, or temporal-join issue.',
      'Makes the cutoff explicit; uses coherent event and availability time; reconstructs historical state where needed; and aligns comparison windows to the decision.',
      'Meets level 3 and evaluates sensitivity to availability lag, boundary choices, backfill, temporal coverage, or changing definitions; explains the decision effect.',
    ],
  },
  {
    name: 'Evidence quality and validation',
    weight: 10,
    question:
      'Is the evidence relevant, diagnostic, and strong enough for the proposed decision?',
    levels: [
      'Provides no auditable support, relies on an unrelated metric, or materially misreads the data.',
      'Provides a headline result with little validation or treats a catalog reliability label or recorded run as universal certification.',
      'Provides relevant evidence and basic diagnostics but leaves a material alternative explanation or data-quality issue untested.',
      'Triangulates the main claim, tests decision-relevant data quality, and separates observed facts from assumptions and interpretation.',
      'Meets level 3 and actively tests credible rival explanations, negative controls, sensitivity, or robustness; identifies evidence that would change the conclusion.',
    ],
  },
  {
    name: 'Reproducibility and lineage',
    weight: 15,
    question:
      'Can another analyst recover the population, transformations, result, and diagnostics?',
    levels: [
      'Relies on unrecorded manual work, non-executable code, or a result that cannot be connected to source assets.',
      'Provides fragments or screenshots but cannot reproduce the reported result end to end.',
      'Core code runs, but parameters, exclusions, metric definitions, or validation steps require reconstruction.',
      'Executable work reproduces the result and key checks; source assets, cutoff, population, and transformations are explicit.',
      'Meets level 3 and adds readable structure, parameters, assertions, deterministic outputs, and concise lineage sufficient for maintenance or peer review.',
    ],
  },
  {
    name: 'Uncertainty calibration',
    weight: 15,
    question:
      'Does the learner’s confidence match the design, data, and stakes?',
    levels: [
      'Makes a categorical or causal claim that the evidence cannot support, or conceals decision-material uncertainty.',
      'Appends generic caveats without connecting them to the estimate, claim, or action.',
      'Identifies material limitations but does not explain their likely direction, magnitude, or consequence.',
      'Calibrates language to evidence; distinguishes descriptive, predictive, and causal claims; and explains which uncertainty matters for the decision.',
      'Meets level 3 and quantifies, bounds, or stress-tests key uncertainty; states what new evidence would materially change confidence or action.',
    ],
  },
  {
    name: 'Professional judgment, including responsible refusal',
    weight: 20,
    question:
      'Did the learner take a proportionate professional position under constraints?',
    levels: [
      'Recommends a materially unsafe, unethical, or unsupported action; fabricates confidence; or complies with an improper request without challenge.',
      'Reports analysis but avoids the decision, or refuses without proportionate investigation and a useful alternative.',
      'Gives a plausible recommendation or refusal, but the link between evidence, stakes, alternatives, and action is incomplete.',
      'Makes a clear, proportional, evidence-aligned recommendation, qualified conclusion, or responsible refusal; handles stakeholder pressure without overstating certainty.',
      'Meets level 3 and anticipates consequences, affected parties, reversible options, escalation paths, and the evidence or threshold that should trigger a different decision.',
    ],
  },
  {
    name: 'Decision communication and governance',
    weight: 10,
    question:
      'Is the work usable by its audience and consistent with data-handling obligations?',
    levels: [
      'Is materially misleading, exposes prohibited confidential/restricted detail, or obscures the actual decision.',
      'Is difficult to act on, omits the population or metric definition, or uses technical output without audience translation.',
      'Is understandable and mostly compliant but buries the recommendation, evidence, or limitations.',
      'Leads with the decision; defines the metric and population; communicates key evidence and uncertainty concisely; follows catalog sensitivity and export rules.',
      'Meets level 3 and anticipates likely misinterpretation, cleanly separates fact from judgment, and tailors detail and escalation to the audience and stakes.',
    ],
  },
];

export const scoreBands = [
  [
    '90–100',
    'Decision-ready work with strong validation, calibration, and professional judgment.',
  ],
  [
    '75–89',
    'Credible work that supports action, with bounded gaps or missed robustness opportunities.',
  ],
  [
    '60–74',
    'Partially defensible work; at least one material issue must be resolved before relying on the decision.',
  ],
  [
    '40–59',
    'Major analytical or communication weaknesses make the proposed action unreliable.',
  ],
  [
    '0–39',
    'Evidence and reasoning do not support professional use, or a critical governance failure dominates the work.',
  ],
] as const;

export const courseRoutes = [
  {
    title: '16-week analytical judgment core',
    audience:
      'One semester; mixed-experience cohort with weekly instruction and supported lab time.',
    assignments:
      '01 Monday Scorecard · 02 Quarter That Moved · 03 Navigation Vote · 04 Rollback Before Dawn · one advanced elective',
    load: 'Approximately 30–51 prepared-learner hours or 55–90 newcomer hours, plus instruction and feedback.',
    milestones: [
      'Weeks 1–2: preflight, SQL/Python diagnostic, and a supported Scorecard.',
      'Weeks 3–5: Quarter investigation; require grain and cutoff review before polishing.',
      'Weeks 6–9: Navigation experiment with a structured statistics checkpoint.',
      'Weeks 10–12: Rollback incident in pairs or evidence-lane teams.',
      'Weeks 13–15: choose FO, PR, NL, MR, or SP to match course outcomes; week 16 is review and revision.',
    ],
  },
  {
    title: '24-week extended workplace sequence',
    audience:
      'Six-month program; repeated SQL/Python practice, staged feedback, and a larger final practicum.',
    assignments:
      '01–05 core · one of 06 Stock / 08 Queue · one of 07 Orion / 09 Model Audit',
    load: 'Approximately 52–91 prepared-learner hours or 99–168 newcomer hours, depending on electives.',
    milestones: [
      'Weeks 1–4: diagnostic, Scorecard, and recovery week for novice learners.',
      'Weeks 5–8: commercial data certification and individual feedback conference.',
      'Weeks 9–12: experimentation and incident decision; switch from supported to guided mode.',
      'Weeks 13–16: point-in-time modeling and an explicit deployment-boundary review.',
      'Weeks 17–22: team practicum plus independent red-team audit; weeks 23–24 are revision and handoff.',
    ],
  },
  {
    title: 'All-nine intensive studio',
    audience:
      'Prepared learners with substantial outside-work time; not the default promise for a semester.',
    assignments:
      'All nine assignments in sequence, with 06/08 delivered as teams and 07/09 as independent audits.',
    load: 'Approximately 74–115 prepared-learner hours or 127–192 newcomer hours before lectures, debugging, and revision.',
    milestones: [
      'Budget one protected recovery/revision week after every two or three assignments.',
      'Do not compress both 06 Stock and 08 Queue into ordinary homework-sized windows.',
      'Use checkpoints to stop foundational grain or time errors from propagating into the final handoff.',
    ],
  },
] as const;

export const classroomPreflight = [
  [
    'DEVICE',
    'Current laptop or desktop browser. Phones are for brief preview only; tablets should be tested before the course.',
  ],
  [
    'BROWSER',
    'Run a live SQL and Python smoke test in the institution’s managed browser image before the first class.',
  ],
  [
    'NETWORK',
    'The first workbench load and Python runtime/package setup require reliable network access; allow time for institutional filtering and caches.',
  ],
  [
    'STORAGE',
    'Work is local to the browser profile. Private browsing, clearing site data, device replacement, and some managed-lab resets can erase it.',
  ],
  [
    'RECOVERY',
    'Have learners export a submission at each milestone and move it to the institution’s LMS or approved storage. The site is not an LMS.',
  ],
  [
    'DATA',
    'Use only the fictional Meridian estate. Do not paste employer, client, patient, customer, or otherwise protected data into the workbench.',
  ],
] as const;

export const teachingBoundaries = [
  'Treat reveals as responses to evidence or timed fallbacks, not hints that dictate one query path.',
  'Grade the submitted evidence trail and handoff, not time-on-task, query count, model complexity, or resemblance to an instructor conclusion.',
  'A responsible refusal must name the unsupported boundary, show proportionate evidence, deliver the useful remainder, and propose the smallest ethical next step.',
  'Machine records are mechanical observations only. At present the site captures successful browser runs with executed-code hashes, flags output that predates later worksheet edits, hashes exported workspace files, and records explicitly bound non-empty artifact files. It does not certify grain, point-in-time validity, inference, artifact quality, or recommendation quality.',
  'Use the LMS or institutional process for identity, deadline enforcement, accommodations, authorship, collaboration rules, and durable submission retention.',
] as const;
