import type { CaseDefinition } from '@/lib/case-definition';

export type PriorityBriefDifficulty = 'Focused' | 'Intermediate' | 'Advanced';

export type PriorityBriefDataFile = {
  table: string;
  path: string;
  rows: number;
  grain: string;
  caution: string;
};

export type PriorityBrief = {
  sequence: number;
  id: string;
  slug: string;
  title: string;
  desk: string;
  role: string;
  releaseDate: string;
  timeEstimate: string;
  difficulty: PriorityBriefDifficulty;
  difficultyLevel: number;
  sourceCaseSlug: string;
  sourceAssignment: string;
  sourceManifest: string;
  workbenchPath: string;
  analysisCutoff: string;
  shortDescription: string;
  situation: string[];
  decision: string;
  constraint: string;
  sourceTables: PriorityBriefDataFile[];
  startingQuestions: string[];
  deliverables: Array<{ title: string; description: string }>;
  stretch: string;
  skills: string[];
  debrief: {
    framing: string;
    defensibleApproaches: string[];
    commonTraps: string[];
    reviewQuestions: string[];
  };
  shareCaption: string;
  socialImage: string;
};

export type BriefReleaseState = 'current' | 'released' | 'scheduled';

export type PriorityBriefRotation = {
  brief: PriorityBrief;
  slot: number;
  startsAt: Date;
  endsAt: Date;
};

export const priorityBriefs: PriorityBrief[] = [
  {
    sequence: 1,
    id: 'PB-001',
    slug: 'the-denominator-dispute',
    title: 'The Denominator Dispute',
    desk: 'Service Performance',
    role: 'Performance Reporting Analyst',
    releaseDate: '2026-09-01',
    timeEstimate: '60–75 minutes',
    difficulty: 'Focused',
    difficultyLevel: 2,
    sourceCaseSlug: 'the-monday-scorecard',
    sourceAssignment: 'The Monday Scorecard',
    sourceManifest: '/data/cases/the-monday-scorecard/manifest.json',
    workbenchPath: '/workbench/?case=the-monday-scorecard&brief=the-denominator-dispute',
    analysisCutoff: '02 Dec 2024 / 08:05 ET',
    shortDescription: 'Two satisfaction figures—7.6 and 3.8—are headed for the same executive review. Reconcile their scales, populations and coverage before choosing the headline.',
    situation: [
      'It is 08:20 on reporting day. The board packet says customer satisfaction improved to 7.6, while the weekly dashboard says it fell to 3.8. Both figures came from the released response table.',
      'The response estate contains two survey sources with different scales. Survey submissions also arrive after the reporting cutoff, and the people who respond may differ systematically from the ticket and account populations.',
      'At 14:00, the executive review needs one headline measure. You have time to rebuild the eligible response population, compare the two scales and test whether coverage changes the story—not to claim that the survey represents every customer.',
    ],
    decision: 'Recommend the satisfaction headline, population and scale for the review—or explain why no single directional claim is yet supportable.',
    constraint: 'Use only responses knowable by 02 Dec 2024 at 08:05 ET. The headline must state its population and cannot imply that survey respondents represent all customers.',
    sourceTables: [
      {
        table: 'support.csat_response',
        path: '/data/support/csat_response.parquet',
        rows: 48_000,
        grain: 'One submitted satisfaction response.',
        caution: 'Two incompatible response scales coexist. Submissions after the analysis cutoff remain in the mounted snapshot.',
      },
      {
        table: 'support.ticket',
        path: '/data/support/ticket.parquet',
        rows: 100_000,
        grain: 'One current ticket record.',
        caution: 'Current-state fields do not reconstruct historical state; source references can collide across migration systems.',
      },
      {
        table: 'crm.account',
        path: '/data/crm/account.parquet',
        rows: 65_000,
        grain: 'One customer account.',
        caution: 'Account attributes can diagnose response coverage but cannot make survey response representative.',
      },
    ],
    startingQuestions: [
      'Which raw scores become comparable after a declared normalization rule?',
      'How do response timing, survey source and duplicate business interactions affect the eligible grain?',
      'Where does response coverage differ from the underlying ticket or account population?',
    ],
    deliverables: [
      { title: 'Governed metric table', description: 'Reproduce both opening figures, apply the cutoff and show raw and normalized results by source without mixing scales.' },
      { title: 'Coverage check', description: 'Compare respondent coverage across at least two material ticket or account slices and identify one plausible rival explanation.' },
      { title: 'Executive scorecard note', description: 'Deliver a polished headline, compact supporting table or chart, and a material limitation in no more than 150 words.' },
    ],
    stretch: 'Design a stable weekly metric contract covering scale, grain, cutoff, late arrivals and the comparison population.',
    skills: ['Metric design', 'Scale normalization', 'Coverage bias', 'Executive writing'],
    debrief: {
      framing: 'This is a measurement-governance problem. A defensible response separates scale reconciliation from response representativeness and keeps the reporting cutoff visible.',
      defensibleApproaches: [
        'Reproduce each raw result inside its own survey source, then use the supplied scale fields to construct a declared common-scale comparison.',
        'Apply response and warehouse-availability clocks to the frozen cutoff before interpreting any direction of change.',
        'Join through stable identifiers only after profiling collisions, then compare respondent composition with ticket or account controls without claiming that weighting automatically solves nonresponse.',
      ],
      commonTraps: [
        'Averaging raw scores from different scale maxima.',
        'Filtering on the response date but not on when the record became available to the warehouse.',
        'Treating a normalized respondent mean as an unbiased estimate for every customer.',
      ],
      reviewQuestions: [
        'Can another analyst reproduce the eligible grain and both opening figures?',
        'Does the final sentence name the source, population, period and scale?',
        'Which plausible coverage mechanism could still reverse your interpretation?',
      ],
    },
    shareCaption: 'Two satisfaction figures. Two scales. One executive headline. I worked The Denominator Dispute, a Priority Brief from The Analyst.',
    socialImage: '/social/briefs/the-denominator-dispute.png',
  },
  {
    sequence: 2,
    id: 'PB-002',
    slug: 'three-lines-nine-claims',
    title: 'Three Lines, Nine Claims',
    desk: 'Commercial Operations',
    role: 'Commercial Operations Analyst',
    releaseDate: '2026-09-08',
    timeEstimate: '75–105 minutes',
    difficulty: 'Intermediate',
    difficultyLevel: 3,
    sourceCaseSlug: 'the-quarter-that-moved',
    sourceAssignment: 'The Quarter That Moved',
    sourceManifest: '/data/cases/the-quarter-that-moved/manifest.json',
    workbenchPath: '/workbench/?case=the-quarter-that-moved&brief=three-lines-nine-claims',
    analysisCutoff: '08 Jul 2024 / 08:30 ET',
    shortDescription: 'Two Q2 totals and a fulfillment workbook disagree across tables with different grains and clocks. Decide what Finance can certify today.',
    situation: [
      'The Q2 close is paused. HarborHome source order numbers repeat after the acquisition cutover, two analysts produced different booked-value totals, and a fulfillment workbook contains durations that appear to run backward.',
      'The source pack contains canonical order headers, purchase lines and one-to-many order and shipment events. Each table has its own record and warehouse clocks. A join that looks reasonable can multiply money or use evidence that arrived after the close cutoff.',
      'Finance does not need a complete transition program this morning. It needs a controlled Q2 order count, captured booked value and a ruling on whether the supplied fulfillment headline is supportable.',
    ],
    decision: 'Certify, qualify, or withhold the Q2 volume, booked-value and fulfillment headline, with a grain-safe control table.',
    constraint: 'Freeze all evidence at 08 Jul 2024 08:30 ET. Preserve source-number collisions and impossible clock sequences as exceptions; do not repair or deduplicate them silently.',
    sourceTables: [
      {
        table: 'commerce.order',
        path: '/data/cases/the-quarter-that-moved/commerce_order.parquet',
        rows: 18_167,
        grain: 'One canonical Q2 order header.',
        caution: 'Source order numbers can repeat across systems; canonical order_id and warehouse availability control the population.',
      },
      {
        table: 'commerce.order_line',
        path: '/data/cases/the-quarter-that-moved/commerce_order_line.parquet',
        rows: 32_466,
        grain: 'One captured purchase line.',
        caution: 'Reduce lines to order grain before combining with another one-to-many event table.',
      },
      {
        table: 'commerce.order_event',
        path: '/data/cases/the-quarter-that-moved/commerce_order_event.parquet',
        rows: 54_501,
        grain: 'One order lifecycle event.',
        caution: 'Occurrence, source-recorded and warehouse-available clocks differ; multiple events belong to one order.',
      },
      {
        table: 'commerce.shipment_event',
        path: '/data/cases/the-quarter-that-moved/commerce_shipment_event.parquet',
        rows: 51_036,
        grain: 'One shipment tracking event.',
        caution: 'Rows are events—not shipments or orders—and a direct join can multiply commercial facts.',
      },
      {
        table: 'casefiles.q2_fulfillment_review',
        path: '/data/cases/the-quarter-that-moved/q2_fulfillment_review.parquet',
        rows: 18_167,
        grain: 'One opening-workbook projection per selected Q2 order.',
        caution: 'Reported durations use source-recorded milestones and remain claims to reconcile against event clocks.',
      },
    ],
    startingQuestions: [
      'What should one row represent at each stage of the calculation?',
      'Which identifier is canonical across the cutover, and where can a direct join fan out?',
      'Which event clock answers operational elapsed time, and which records were actually knowable at the cutoff?',
    ],
    deliverables: [
      { title: 'Grain map', description: 'State the grain and key of each file and show where a direct three-way join can fan out.' },
      { title: 'Close control', description: 'Produce Q2 order count and captured booked value by source system with pre/post-join row and value reconciliations.' },
      { title: 'Clock exception view', description: 'Quantify unavailable-at-cutoff and impossible-sequence records before calculating any fulfillment duration.' },
      { title: 'Controller handoff', description: 'Deliver a polished certification note naming what is certified, qualified or withheld and why.' },
    ],
    stretch: 'Write two reusable assertions that fail when a later event or a repeated source identifier changes the controlled order fact.',
    skills: ['Join grain', 'As-of filtering', 'Reconciliation', 'Finance handoff'],
    debrief: {
      framing: 'The challenge is constructing compatible facts before joining and proving that money, orders and elapsed times survive both grain and cutoff controls.',
      defensibleApproaches: [
        'Use canonical order_id for the business fact while retaining source_system plus source_order_id as a collision diagnostic.',
        'Reduce lifecycle and shipment events to one declared milestone per order before joining them to headers or lines.',
        'Reconcile header and line values separately, then show row counts, distinct orders and value totals before and after each join.',
      ],
      commonTraps: [
        'Joining all three files and trusting GROUP BY to repair multiplication.',
        'Deduplicating repeated source_order_id without including the source system.',
        'Using the latest or cleanest event rather than the event that was knowable at the frozen cutoff.',
      ],
      reviewQuestions: [
        'Can every reported order and dollar trace to exactly one controlled fact?',
        'Would a late-arriving event alter a supposedly frozen result?',
        'Did you distinguish a valid close measure from a useful but not-yet-certifiable operational metric?',
      ],
    },
    shareCaption: 'A routine multi-table close could multiply money and move clocks. I audited the grain in Three Lines, Nine Claims from The Analyst.',
    socialImage: '/social/briefs/three-lines-nine-claims.png',
  },
  {
    sequence: 3,
    id: 'PB-003',
    slug: 'the-silent-sensors',
    title: 'The Silent Sensors',
    desk: 'Connected Reliability',
    role: 'Reliability Duty Analyst',
    releaseDate: '2026-09-15',
    timeEstimate: '75–105 minutes',
    difficulty: 'Intermediate',
    difficultyLevel: 3,
    sourceCaseSlug: 'rollback-before-dawn',
    sourceAssignment: 'Rollback Before Dawn',
    sourceManifest: '/data/cases/rollback-before-dawn/manifest.json',
    workbenchPath: '/workbench/?case=rollback-before-dawn&brief=the-silent-sensors',
    analysisCutoff: '20 Mar 2025 / 11:40 ET',
    shortDescription: 'Device readings look calmer as telemetry coverage falls during a storm and firmware change. Decide whether the apparent recovery can narrow containment.',
    situation: [
      'Firmware v5 and a regional winter storm overlap in calendar time. Device alerts rose, but the reliability dashboard’s average reading appears to settle in several regions before the incident meeting.',
      'The dashboard is built only from readings that arrived. Some assets have expected sensor channels but no received telemetry, warehouse arrival can lag observation, and firmware v5 changes measurement behavior.',
      'Incident command is considering narrowing containment to the regions with the highest observed alert rate. Your brief is to decide whether the observed estate is complete enough for that move.',
    ],
    decision: 'Recommend global containment, a named regional scope, or monitored continuation based on telemetry coverage, alert evidence and storm exposure.',
    constraint: 'Use only rows knowable by 11:40 ET. Do not use delayed failure labels, treat missing readings as healthy, or present alerts as confirmed physical failures.',
    sourceTables: [
      {
        table: 'scenario.asset_cohort',
        path: '/data/cases/rollback-before-dawn/scenario/asset_cohort.parquet',
        rows: 18_000,
        grain: 'One incident-cohort asset.',
        caution: 'This is the stable regional denominator, including devices with no received reading.',
      },
      {
        table: 'iot.sensor',
        path: '/data/cases/rollback-before-dawn/iot/sensor.parquet',
        rows: 27_549,
        grain: 'One sensor channel attached to an asset.',
        caution: 'Expected frequency supplies the telemetry denominator; sensor rows are not readings.',
      },
      {
        table: 'iot.sensor_reading',
        path: '/data/cases/rollback-before-dawn/iot/sensor_reading.parquet',
        rows: 41_224,
        grain: 'One received sensor reading.',
        caution: 'Observed, source-recorded and warehouse-available clocks differ; firmware v5 changes measurement behavior.',
      },
      {
        table: 'iot.device_alert',
        path: '/data/cases/rollback-before-dawn/iot/device_alert.parquet',
        rows: 6_297,
        grain: 'One generated device alert.',
        caution: 'Alerts can repeat by asset and are not confirmed physical failures.',
      },
      {
        table: 'external.weather_hourly',
        path: '/data/cases/rollback-before-dawn/external/weather_hourly.parquet',
        rows: 17_280,
        grain: 'One weather-station hour.',
        caution: 'Several stations may describe a region; regional exposure is not device-level causal proof.',
      },
      {
        table: 'external.weather_station',
        path: '/data/cases/rollback-before-dawn/external/weather_station.parquet',
        rows: 12,
        grain: 'One weather station mapped to a Meridian region.',
        caution: 'The station bridge is required before regional aggregation; several stations can describe one region.',
      },
    ],
    startingQuestions: [
      'Is missingness concentrated by region, firmware version, expected channel or storm period?',
      'Which claims describe the observed units and which implicitly describe the missing units?',
      'Do alert and weather patterns support the same scope, and what rival explanation remains?',
    ],
    deliverables: [
      { title: 'Complete-denominator profile', description: 'Use the asset cohort and sensor frequency to compare expected versus received telemetry by region, period and firmware.' },
      { title: 'Rival-evidence view', description: 'Place coverage, alert rate and storm exposure on one comparable regional view without collapsing them into one score.' },
      { title: 'Incident decision card', description: 'Deliver a polished action, scope, main counterevidence and measurable change-of-course trigger.' },
    ],
    stretch: 'Bound the alert rate under more than one explicit assumption about assets with no received telemetry.',
    skills: ['Missing-data mechanisms', 'Complete denominators', 'Time-aware evidence', 'Incident communication'],
    debrief: {
      framing: 'Coverage is part of the evidence, not a housekeeping statistic. A strong response resists inventing temperatures while still making a time-sensitive operational decision.',
      defensibleApproaches: [
        'Build the expected asset-channel-time spine from the cohort and sensor frequency before joining received readings.',
        'Compare coverage and alerts across firmware, region and pre-storm/storm periods using the warehouse cutoff, then examine weather as a rival exposure.',
        'Use bounds or sensitivity cases for the unobserved estate without presenting imputed device health as fact.',
      ],
      commonTraps: [
        'Dropping missing rows and concluding that the remaining average describes the whole night.',
        'Using iot.asset_health_daily failure labels that were not available at the incident cutoff.',
        'Ranking regions only on observed alerts while ignoring different telemetry opportunity.',
      ],
      reviewQuestions: [
        'Could your scope survive a different but plausible assumption about missing assets?',
        'Did you overstate what a storm association proves about the mechanism?',
        'Can incident command tell which evidence is measured, contextual and precautionary?',
      ],
    },
    shareCaption: 'The reassuring trend began as telemetry coverage fell. I took the containment call in The Silent Sensors, a Priority Brief from The Analyst.',
    socialImage: '/social/briefs/the-silent-sensors.png',
  },
  {
    sequence: 4,
    id: 'PB-004',
    slug: 'the-lift-in-the-fine-print',
    title: 'The Lift in the Fine Print',
    desk: 'Product Experimentation',
    role: 'Experiment Review Analyst',
    releaseDate: '2026-09-22',
    timeEstimate: '90–120 minutes',
    difficulty: 'Advanced',
    difficultyLevel: 4,
    sourceCaseSlug: 'the-navigation-vote',
    sourceAssignment: 'The Navigation Vote',
    sourceManifest: '/data/cases/the-navigation-vote/manifest.json',
    workbenchPath: '/workbench/?case=the-navigation-vote&brief=the-lift-in-the-fine-print',
    analysisCutoff: '05 May 2025 / 09:00 ET',
    shortDescription: 'A navigation experiment reports more pages per session. Decide whether that engagement signal and its commercial guardrails support rollout.',
    situation: [
      'The mobile_navigation experiment ended on 30 April. Product reports higher pages per session and calls that evidence of better navigation.',
      'Randomization occurred at the session-assignment grain. The estate separately records first exposure, web events, a converted-order pointer and order timestamps. More events can indicate useful discovery, confusion, or simply longer paths.',
      'The release branch closes at 15:30. Product needs a ship, hold, scoped-release or retest vote with magnitude, uncertainty and a commercial guardrail.',
    ],
    decision: 'Make a rollout recommendation that preserves intent-to-treat assignment and distinguishes engagement from customer and commercial benefit.',
    constraint: 'Freeze the readout at 05 May 2025 09:00 ET. Do not condition the primary result on post-assignment behavior or count event rows as independent experimental units.',
    sourceTables: [
      {
        table: 'growth.experiment',
        path: '/data/cases/the-navigation-vote/growth_experiment.parquet',
        rows: 1,
        grain: 'One registered experiment.',
        caution: 'This row defines the dates, primary metric and assignment unit; it is design metadata rather than outcome evidence.',
      },
      {
        table: 'growth.experiment_assignment',
        path: '/data/cases/the-navigation-vote/growth_experiment_assignment.parquet',
        rows: 42_000,
        grain: 'One randomized session assignment.',
        caution: 'Preserve the full assignment population; first exposure is post-assignment and warehouse timing controls inclusion.',
      },
      {
        table: 'growth.session',
        path: '/data/cases/the-navigation-vote/growth_session.parquet',
        rows: 42_000,
        grain: 'One web session.',
        caution: 'The assigned session is the experiment unit; converted_order_id is only a pointer and does not certify attribution.',
      },
      {
        table: 'growth.web_event',
        path: '/data/cases/the-navigation-vote/growth_web_event.parquet',
        rows: 140_670,
        grain: 'One ordered event within a session.',
        caution: 'Raw event counts do not preserve assignment grain and can turn more navigation into a misleading success metric.',
      },
      {
        table: 'commerce.order',
        path: '/data/cases/the-navigation-vote/commerce_order.parquet',
        rows: 15_518,
        grain: 'One order linked from the experiment-session population.',
        caution: 'Apply the experiment attribution window and analysis cutoff before treating an order as a guardrail outcome.',
      },
    ],
    startingQuestions: [
      'Does the assignment population reconcile one-to-one with sessions, and how much first-exposure loss exists by variant?',
      'What does pages per assigned session measure, and what rival user behavior could create the same lift?',
      'Do conversion and order-value guardrails change the rollout decision once timing and assignment grain are preserved?',
    ],
    deliverables: [
      { title: 'Assignment audit', description: 'Reconcile assignment, session and exposure coverage and document any exclusion before estimating effects.' },
      { title: 'Effect and guardrail view', description: 'Estimate the primary pages-per-session effect with uncertainty and pair it with an order-based commercial check.' },
      { title: 'Release-council slide', description: 'Deliver a polished rollout vote, evidence, counterevidence and one follow-up condition on a single screen.' },
    ],
    stretch: 'Compare intent-to-treat with an explicitly diagnostic exposed-session view and explain why the latter loses the randomized guarantee.',
    skills: ['Experiment reading', 'Intent-to-treat', 'Uncertainty', 'Commercial guardrails'],
    debrief: {
      framing: 'The brief tests whether the analyst can keep assignment, exposure, estimand, and exploration separate while still making a release decision.',
      defensibleApproaches: [
        'Lead with the assignment-based comparison because randomization occurs at assignment, then use exposure views diagnostically.',
        'Reduce web events to session-level outcomes before comparing variants and report effect magnitude with an uncertainty interval.',
        'Build a cutoff-safe order guardrail from converted_order_id and order timing, while keeping engagement and commercial claims separate.',
      ],
      commonTraps: [
        'Conditioning only on exposed users and continuing to describe the estimate as randomized.',
        'Counting event rows as independent observations or using them to define the experiment population.',
        'Calling more navigation a customer benefit without testing a plausible rival interpretation.',
      ],
      reviewQuestions: [
        'Did you name the effect your calculation actually estimates?',
        'Would your recommendation change if engagement rose but order conversion did not?',
        'What release option preserves learning while containing downside?',
      ],
    },
    shareCaption: 'A “winning” navigation experiment changed meaning when engagement met its guardrails. I reviewed The Lift in the Fine Print from The Analyst.',
    socialImage: '/social/briefs/the-lift-in-the-fine-print.png',
  },
  {
    sequence: 5,
    id: 'PB-005',
    slug: 'the-expedite-window',
    title: 'The Expedite Window',
    desk: 'Supply Planning',
    role: 'Inventory Planning Analyst',
    releaseDate: '2026-09-29',
    timeEstimate: '90–120 minutes',
    difficulty: 'Intermediate',
    difficultyLevel: 3,
    sourceCaseSlug: 'forty-eight-hours-of-stock',
    sourceAssignment: 'Forty-Eight Hours of Stock',
    sourceManifest: '/data/cases/forty-eight-hours-of-stock/manifest.json',
    workbenchPath: '/workbench/?case=forty-eight-hours-of-stock&brief=the-expedite-window',
    analysisCutoff: '01 Dec 2025 / 06:45 ET',
    shortDescription: 'A workbook claims several warehouse-product pairs have less than 48 hours of cover. Audit the demand signal and choose the constrained actions worth taking now.',
    situation: [
      'A supply workbook flags 30 warehouse-product pairs and reports claimed hours of cover. Planning wants immediate transfers and expedites before the morning freight window closes.',
      'The physical movement ledger contains scanner replays. The daily position history is sampled rather than complete, and the workbook calculates demand only on days with issue events. Those choices can move a pair across the 48-hour threshold.',
      'The source pack also contains approved budget, donor-reserve, transfer-lane and manual-review constraints. You have time to audit the watchlist and produce a small prioritized action portfolio—not build the full 21-day supply model.',
    ],
    decision: 'Select the watchlist pairs for immediate transfer, expedite, substitution review or hold, subject to the published action constraints.',
    constraint: 'Use only evidence knowable by 01 Dec 2025 at 06:45 ET. Respect every hard constraint and keep uncertain pairs in manual review rather than forcing an action.',
    sourceTables: [
      {
        table: 'scenario.supply_watchlist',
        path: '/data/cases/forty-eight-hours-of-stock/scenario/supply_watchlist.parquet',
        rows: 30,
        grain: 'One selected warehouse-product pair at the decision snapshot.',
        caution: 'Workbook cover calculations are claims to audit, not supplied answers.',
      },
      {
        table: 'scenario.action_constraints',
        path: '/data/cases/forty-eight-hours-of-stock/scenario/action_constraints.parquet',
        rows: 10,
        grain: 'One approved operational constraint.',
        caution: 'Budget, donor reserve, transfer-lane and review limits are hard action constraints.',
      },
      {
        table: 'scenario.opening_balance',
        path: '/data/cases/forty-eight-hours-of-stock/scenario/opening_balance.parquet',
        rows: 81,
        grain: 'One controller-approved warehouse-product opening quantity.',
        caution: 'Use these balances as the decision-time physical control rather than projecting a later position backward.',
      },
      {
        table: 'supply.inventory_movement',
        path: '/data/cases/forty-eight-hours-of-stock/supply/inventory_movement.parquet',
        rows: 520_000,
        grain: 'One technical inventory movement event.',
        caution: 'Scanner replay rows are linked to original events and can double count demand if not reconciled.',
      },
      {
        table: 'supply.inventory_position_daily',
        path: '/data/cases/forty-eight-hours-of-stock/supply/inventory_position_daily.parquet',
        rows: 330_000,
        grain: 'One sampled warehouse-product-day position row.',
        caution: 'The history is sparse; a missing row is not zero inventory and trailing fields require clock discipline.',
      },
      {
        table: 'core.business_calendar',
        path: '/data/cases/forty-eight-hours-of-stock/core/business_calendar.parquet',
        rows: 1_096,
        grain: 'One calendar date.',
        caution: 'Use the date spine to preserve zero-issue days in demand estimates.',
      },
      {
        table: 'supply.product_vendor',
        path: '/data/cases/forty-eight-hours-of-stock/supply/product_vendor.parquet',
        rows: 1_440,
        grain: 'One effective vendor-product relationship.',
        caution: 'Lead time, cost and minimum order quantities are effective-dated and must be valid at the cutoff.',
      },
      {
        table: 'catalog.product_substitution',
        path: '/data/cases/forty-eight-hours-of-stock/catalog/product_substitution.parquet',
        rows: 1_440,
        grain: 'One ranked requested-product to substitute-product relationship.',
        caution: 'Approval dates and customer-approval requirements constrain substitution recommendations.',
      },
    ],
    startingQuestions: [
      'How do replay reconciliation and inclusion of zero-issue days change the watchlist’s cover claims?',
      'Which all-days baseline is supportable for intermittent demand, and how unstable is it across rolling windows?',
      'Which actions remain feasible after donor reserve, lane, budget and review constraints are applied?',
    ],
    deliverables: [
      { title: 'Demand correction', description: 'Build a replay-safe, all-calendar-day demand profile and quantify which workbook cover claims materially change.' },
      { title: 'Uncertainty view', description: 'Compare at least two rolling demand baselines or windows and identify pairs whose action is unstable.' },
      { title: 'Action portfolio', description: 'Deliver a polished, constraint-checked list of actions, holds and manual reviews with a short planner note.' },
    ],
    stretch: 'Add a simple lead-time demand simulation for the top three actions and test whether it changes the portfolio.',
    skills: ['Demand reconstruction', 'Forecast judgment', 'Constraint checking', 'Operational prioritization'],
    debrief: {
      framing: 'The threshold is only as credible as the movement reconciliation, time spine and demand definition beneath it. A useful action list must also survive operational constraints.',
      defensibleApproaches: [
        'Remove linked scanner replays under an explicit event rule, isolate issue movements and aggregate to warehouse-product-day.',
        'Cross the selected pairs with a complete calendar spine so zero-issue days remain in the demand denominator, then compare rolling-window estimates.',
        'Translate the revised risk view into a constrained action portfolio and preserve unstable or infeasible cases for manual review.',
      ],
      commonTraps: [
        'Treating every issue ledger row—including scanner replays—as new demand.',
        'Averaging only issue days and calling the result mean daily demand.',
        'Ranking risk without checking donor reserve, lane or budget feasibility.',
      ],
      reviewQuestions: [
        'Can a planner reproduce why each pair moved relative to the workbook claim?',
        'Which modeling choice—not which decimal place—drives each action?',
        'Does every recommended action pass the supplied constraints?',
      ],
    },
    shareCaption: 'A 48-hour stock warning changed when zero-demand days and scanner replays entered the calculation. I worked The Expedite Window from The Analyst.',
    socialImage: '/social/briefs/the-expedite-window.png',
  },
  {
    sequence: 6,
    id: 'PB-006',
    slug: 'tomorrows-churn-model',
    title: 'Tomorrow’s Churn Model',
    desk: 'Model Risk',
    role: 'Model Validation Analyst',
    releaseDate: '2026-10-06',
    timeEstimate: '75–105 minutes',
    difficulty: 'Intermediate',
    difficultyLevel: 3,
    sourceCaseSlug: 'too-good-to-ship',
    sourceAssignment: 'Too Good to Ship',
    sourceManifest: '/data/cases/too-good-to-ship/manifest.json',
    workbenchPath: '/workbench/?case=too-good-to-ship&brief=tomorrows-churn-model',
    analysisCutoff: '20 Jan 2026 / 09:15 ET deployment gate',
    shortDescription: 'A retention model posts extraordinary validation results. Determine which features knew the future before a pilot reaches customers.',
    situation: [
      'A contractor cancellation model reports near-perfect offline discrimination from a numeric wildcard and a random 80/20 snapshot-row split. Product wants an account-level campaign file.',
      'The feature table contains 213 columns and repeated account snapshots. Its final fields contain realized future outcomes. The submitted split operates on rows, while the proposed use scores an account at feature_as_of_at for cancellation within the following 90 days.',
      'You have enough time to reproduce the submitted result, inspect the predictor set and test account overlap—not to complete a production replacement model.',
    ],
    decision: 'Approve, quarantine or reject the submitted model and decide whether any account-level score may leave the governance review.',
    constraint: 'Treat feature_as_of_at as the scoring instant and future_90d_cancelled_flag as the submitted target. Reproduction alone cannot authorize customer action.',
    sourceTables: [
      {
        table: 'platform.account_feature_snapshot',
        path: '/data/cases/too-good-to-ship/account_feature_snapshot.parquet',
        rows: 33_156,
        grain: 'One account feature snapshot; multiple rows per account are expected.',
        caution: 'All 213 columns are retained, including realized future outcomes in the final fields.',
      },
      {
        table: 'case_input.beacon_submitted_split',
        path: '/data/cases/too-good-to-ship/beacon_submitted_split.parquet',
        rows: 33_156,
        grain: 'One submitted partition label per feature snapshot.',
        caution: 'The contractor supplied a random row-level 80/20 split; repeated accounts may cross the boundary.',
      },
      {
        table: 'crm.account_status_event',
        path: '/data/cases/too-good-to-ship/account_status_event.parquet',
        rows: 14_175,
        grain: 'One account status event.',
        caution: 'An independent target candidate must respect occurrence and availability clocks.',
      },
      {
        table: 'platform.pipeline_run',
        path: '/data/cases/too-good-to-ship/pipeline_run.parquet',
        rows: 61_301,
        grain: 'One pipeline execution.',
        caution: 'Run and cutoff clocks can test lineage; successful orchestration does not establish feature validity.',
      },
    ],
    startingQuestions: [
      'Which fields are consequences or near-consequences of the target event?',
      'Can repeated account snapshots cross the training and validation boundary?',
      'Which source-watermark, pipeline and status-event clocks could establish point-in-time availability?',
    ],
    deliverables: [
      { title: 'Submitted-result reproduction', description: 'Reproduce the wildcard/split logic and report selected columns, validation performance and account overlap.' },
      { title: 'Predictor quarantine', description: 'Classify material predictors as allow, exclude or investigate using names, future-field position and available clocks.' },
      { title: 'Governance disposition', description: 'Deliver a polished release gate covering model use, account-level export and the minimum grouped-forward rerun.' },
    ],
    stretch: 'Write a point-in-time feature contract that engineering could turn into an automated pipeline assertion.',
    skills: ['Data leakage', 'Temporal validation', 'Feature lineage', 'Model governance'],
    debrief: {
      framing: 'Leakage is a mismatch between what the model is allowed to know and what the validation lets it know. Feature names alone cannot settle that question.',
      defensibleApproaches: [
        'Anchor every feature to the scoring event and ask when the value became available in the production path, including backfills and later updates.',
        'Measure account overlap in the supplied split and outline a grouped forward design that separates entity leakage from temporal validity.',
        'Define a minimal safe feature allowlist and a validation gate whose cohort, cutoff and 90-day horizon correspond to the proposed use.',
      ],
      commonTraps: [
        'Accepting an “available” flag without reconciling materialization timing.',
        'Removing only the most obviously named leakage field while leaving post-cutoff workflow features.',
        'Dropping only columns beginning with future_ while ignoring repeated-entity and source-watermark problems.',
      ],
      reviewQuestions: [
        'Could each allowed value have been observed at the scoring instant without a later backfill?',
        'Are snapshots from one account isolated appropriately across evaluation boundaries?',
        'Does the release gate define evidence, not merely request “more testing”?',
      ],
    },
    shareCaption: 'A 0.93 AUC looked different after asking what the model knew at scoring time. I audited Tomorrow’s Churn Model from The Analyst.',
    socialImage: '/social/briefs/tomorrows-churn-model.png',
  },
  {
    sequence: 7,
    id: 'PB-007',
    slug: 'the-redacted-queue',
    title: 'The Redacted Queue',
    desk: 'Data Responsibility',
    role: 'Data Responsibility Analyst',
    releaseDate: '2026-10-13',
    timeEstimate: '90–120 minutes',
    difficulty: 'Advanced',
    difficultyLevel: 4,
    sourceCaseSlug: 'the-queue-nobody-owns',
    sourceAssignment: 'The Queue Nobody Owns',
    sourceManifest: '/data/cases/the-queue-nobody-owns/manifest.json',
    workbenchPath: '/workbench/?case=the-queue-nobody-owns&brief=the-redacted-queue',
    analysisCutoff: '03 Dec 2024 / 08:20 ET routing snapshot',
    shortDescription: 'Customer text may improve routing, but the corpus contains later messages, internal notes and synthetic PII. Define the useful data boundary without exporting the risk.',
    situation: [
      'Customer Care wants to prototype text-assisted routing for an 818-item backlog. A vendor asks for a “representative sample” of message text, while the internal data notice says restricted text may not be copied to an external service.',
      'The message history includes customers, agents, bots and internal notes; some messages arrive after the routing decision. Rows carry synthetic-PII and redaction-review flags. Restricting the corpus may also change usable coverage across language and channel groups.',
      'You are not being asked to train the final router. You must define what may enter an internal prototype, what may leave the governed environment, and how mandatory review fits the available receiving-team capacity.',
    ],
    decision: 'Approve, modify or refuse the proposed data handoff and specify a privacy-minimized internal corpus and review policy for shadow analysis.',
    constraint: 'Raw message text and PII- or redaction-flagged content may not leave the governed environment. The policy must quantify who becomes unscorable rather than treating excluded records as if they never existed.',
    sourceTables: [
      {
        table: 'support.conversation',
        path: '/data/cases/the-queue-nobody-owns/conversation.parquet',
        rows: 50_387,
        grain: 'One support conversation; a ticket may contain several conversations.',
        caution: 'Only customer intake available by the routing decision belongs in a brief-safe corpus.',
      },
      {
        table: 'support.message',
        path: '/data/cases/the-queue-nobody-owns/message.parquet',
        rows: 161_911,
        grain: 'One message within a conversation.',
        caution: 'Text includes customer, agent, bot, internal, later, PII-flagged, redaction-review and clock-inconsistent messages.',
      },
      {
        table: 'support.ticket',
        path: '/data/cases/the-queue-nobody-owns/ticket.parquet',
        rows: 30_311,
        grain: 'One frozen ticket record.',
        caution: 'Current or final team and outcome fields are targets or later facts—not intake features.',
      },
      {
        table: 'case_input.scoring_queue',
        path: '/data/cases/the-queue-nobody-owns/scoring_queue.parquet',
        rows: 818,
        grain: 'One unlabeled conversation awaiting a routing decision.',
        caution: 'Later text and outcomes are withheld; opening text and review flags remain restricted.',
      },
      {
        table: 'case_reference.routing_team',
        path: '/data/cases/the-queue-nobody-owns/routing_team.parquet',
        rows: 5,
        grain: 'One approved receiving team.',
        caution: 'The table defines team scope and human review capacity, not model quality.',
      },
    ],
    startingQuestions: [
      'Which sender, time window and message sequence were available at the routing decision?',
      'How do PII flags, redaction review and missing eligible text vary by language and channel?',
      'Which aggregate, derived or non-text artifacts could support vendor work without transferring restricted content?',
    ],
    deliverables: [
      { title: 'Corpus contract', description: 'Define conversation grain, legal sender, intake window, disallowed fields and the exact exclusion/review rules.' },
      { title: 'Coverage and equity audit', description: 'Quantify usable, flagged and no-text coverage overall and by language/channel, with at least one rival explanation.' },
      { title: 'Handoff disposition', description: 'Deliver a polished approval, modification or refusal covering what may leave, what remains internal and why.' },
      { title: 'Review-capacity plan', description: 'Apply the receiving-team capacity to the 818-item queue and define mandatory-review or abstention states.' },
    ],
    stretch: 'Design a privacy-preserving evaluation artifact the vendor could use—such as synthetic examples or aggregate error requirements—without receiving live customer text.',
    skills: ['Privacy judgment', 'Coverage fairness', 'Text-corpus governance', 'Policy communication'],
    debrief: {
      framing: 'Privacy minimization and analytical validity are connected: removing unsafe text changes who can be represented. A defensible plan measures that loss and contains it operationally.',
      defensibleApproaches: [
        'Construct only the first legally eligible customer intake window, excluding agent, bot, internal and later text before any modeling or sampling.',
        'Keep raw restricted text internal; propose only purpose-limited aggregates, requirements or synthetic artifacts for external work.',
        'Report exclusion and mandatory-review rates by operational language/channel groups, then check whether human capacity can absorb the resulting abstentions.',
      ],
      commonTraps: [
        'Removing rows with PII flags and reporting performance only on the easier remaining population.',
        'Using the full frozen conversation, including agent replies and later resolution language, as intake text.',
        'Calling hashed identifiers or tokenized text anonymous without evaluating whether the content itself remains identifying.',
      ],
      reviewQuestions: [
        'Can another analyst implement the corpus contract without making new privacy choices?',
        'Does the plan account for groups disproportionately routed to abstention or review?',
        'Is every external artifact necessary for a stated purpose and stripped of live restricted text?',
      ],
    },
    shareCaption: 'Removing unsafe text also changed who the analysis could represent. I worked The Redacted Queue, a Priority Brief from The Analyst.',
    socialImage: '/social/briefs/the-redacted-queue.png',
  },
  {
    sequence: 8,
    id: 'PB-008',
    slug: 'the-chart-before-the-board',
    title: 'The Chart Before the Board',
    desk: 'Executive Analytics',
    role: 'Strategy Analytics Partner',
    releaseDate: '2026-10-20',
    timeEstimate: '60–90 minutes',
    difficulty: 'Focused',
    difficultyLevel: 2,
    sourceCaseSlug: 'the-orion-renewal',
    sourceAssignment: 'The Orion Renewal',
    sourceManifest: '/data/cases/the-orion-renewal/manifest.json',
    workbenchPath: '/workbench/?case=the-orion-renewal&brief=the-chart-before-the-board',
    analysisCutoff: 'Routes dated 01 Jan 2024–31 Dec 2025',
    shortDescription: 'A vendor chart claims technician productivity rose 12% after ORION-2. Reconstruct the metric and replace the board message with what the evidence can support.',
    situation: [
      'The vendor renewal deck says technician productivity improved 12% after ORION-2 went live. Its headline chart uses completed stops per planned route hour and labels the pre/post change an optimizer impact.',
      'Routes, route stops, work orders and visits have different grains. Stops can be rescheduled, planned hours are not paid hours, and the deployment date overlaps changing route mix and operating conditions.',
      'The board packet closes in one hour. You may replace the vendor claim with one chart, one title and two supporting bullets. The full procurement analysis can follow later.',
    ],
    decision: 'Decide what the board can be told about the ORION-2 productivity change and whether the 12% causal wording should remain.',
    constraint: 'The revised slide must remain legible at presentation distance. It may contain one primary chart, one title, and at most two supporting bullets.',
    sourceTables: [
      {
        table: 'fleet.route',
        path: '/data/cases/the-orion-renewal/route.parquet',
        rows: 73_350,
        grain: 'One technician-vehicle route per date.',
        caution: 'A route is not a job, visit or paid shift. Planned and actual measures answer different questions.',
      },
      {
        table: 'fleet.route_stop',
        path: '/data/cases/the-orion-renewal/route_stop.parquet',
        rows: 213_566,
        grain: 'One planned or realized stop on a route.',
        caution: 'Reschedules and repeated work_order_id values require a declared reconciliation policy.',
      },
      {
        table: 'field_ops.work_order',
        path: '/data/cases/the-orion-renewal/work_order.parquet',
        rows: 99_832,
        grain: 'One service work order.',
        caution: 'Final status and resolution fields are post-assignment outcomes and do not share route grain.',
      },
      {
        table: 'field_ops.visit',
        path: '/data/cases/the-orion-renewal/visit.parquet',
        rows: 99_832,
        grain: 'One physical visit associated with a work order.',
        caution: 'Visits are restricted facts and are not interchangeable with planned stops.',
      },
      {
        table: 'core.business_calendar',
        path: '/data/cases/the-orion-renewal/business_calendar.parquet',
        rows: 731,
        grain: 'One calendar day in the 24-month window.',
        caution: 'Use the complete spine to make gaps and period comparisons visible.',
      },
      {
        table: 'core.branch',
        path: '/data/cases/the-orion-renewal/branch.parquet',
        rows: 36,
        grain: 'One Meridian operating branch.',
        caution: 'Branch-to-region structure supports heterogeneity; geography alone does not provide an untreated control.',
      },
    ],
    startingQuestions: [
      'What does one completed stop represent, and how do reschedules change the numerator?',
      'Which route-hour denominator matches the business claim, and what alternative denominator changes the result?',
      'Do monthly and regional trajectories support a clean before/after story or expose a rival explanation?',
    ],
    deliverables: [
      { title: 'Metric reconstruction', description: 'Reproduce the claimed productivity measure with a grain contract and compare it with one defensible alternative.' },
      { title: 'Chart audit and replacement', description: 'Identify the material claim problems, then produce one chart with honest scale, timing and annotations.' },
      { title: 'Board message', description: 'Write the replacement title and no more than two bullets separating observed change from attribution.' },
    ],
    stretch: 'Create a second version for an operating review and explain why its level of detail should differ from the board slide.',
    skills: ['Chart critique', 'Metric contracts', 'Stakeholder communication', 'Evidence hierarchy'],
    debrief: {
      framing: 'A board chart is an analytical claim. Its grain, denominator, comparison window and causal wording matter as much as its visual treatment.',
      defensibleApproaches: [
        'Pre-aggregate stops to route or work-order grain under a declared reschedule policy before joining to routes.',
        'Plot the metric through time around go-live and inspect regional heterogeneity or alternative denominators as falsification evidence.',
        'Use descriptive wording for observed change unless the design supports attribution, and keep the board visual focused on the material decision boundary.',
      ],
      commonTraps: [
        'Repairing the chart style while retaining a fanout-prone numerator.',
        'Using planned route hours as technician labor without acknowledging what that denominator measures.',
        'Labeling a pre/post association as ORION-2 impact or overloading the replacement with every diagnostic.',
      ],
      reviewQuestions: [
        'Would a reasonable viewer infer more certainty or improvement than the data supports?',
        'Is every reconciliation choice visible where it affects the claim?',
        'Does the message tell the board what changed, why it matters, and what management is doing next?',
      ],
    },
    shareCaption: 'A polished productivity chart was making a stronger causal claim than its data. I rebuilt The Chart Before the Board from The Analyst.',
    socialImage: '/social/briefs/the-chart-before-the-board.png',
  },
  {
    sequence: 9,
    id: 'PB-009',
    slug: 'the-seventh-appointment',
    title: 'The Seventh Appointment',
    desk: 'Dispatch Control',
    role: 'Dispatch Control Analyst',
    releaseDate: '2026-10-27',
    timeEstimate: '75–105 minutes',
    difficulty: 'Intermediate',
    difficultyLevel: 3,
    sourceCaseSlug: 'the-730-capacity-call',
    sourceAssignment: 'The 7:30 Capacity Call',
    sourceManifest: '/data/cases/the-730-capacity-call/manifest.json',
    workbenchPath: '/workbench/?case=the-730-capacity-call&brief=the-seventh-appointment',
    analysisCutoff: '20 Mar 2025 / 07:30 ET',
    shortDescription: 'The morning roster, external signals and staffing records do not share one clean decision clock. Reconstruct what dispatch could know before authorizing scarce interventions.',
    situation: [
      'The 07:30 dispatch packet lists the remaining BR0020 appointments and a controller-approved bulletin defines the morning action capacity. The packet is already being used to prepare customer contacts and emergency reroutes.',
      'Business, warehouse and observation clocks do not align cleanly across the roster and external feeds. Traffic freshness varies by service area, provider revisions coexist, and workforce records contain final shift outcomes that were not approved for morning decisioning.',
      'Dispatch needs an auditable action slate now. You must determine which records and signals belonged in the 07:30 packet, preserve any exceptions and keep every recommendation inside the published capacities.',
    ],
    decision: 'Authorize the morning review, proactive-contact and emergency-reroute slate—or recall the packet—using only evidence that was supportable at 07:30.',
    constraint: 'Use only facts knowable by 20 Mar 2025 at 07:30 ET. The bulletin is the approved capacity authority: no more than four dispatcher reviews, three proactive contacts and two emergency reroutes. Do not use employee-level final shift outcomes.',
    sourceTables: [
      {
        table: 'scenario.current_appointment_roster',
        path: '/data/cases/the-730-capacity-call/scenario/current_appointment_roster.parquet',
        rows: 7,
        grain: 'One appointment presented as remaining at the morning decision point.',
        caution: 'Presented membership must still be reconciled against business and warehouse clocks.',
      },
      {
        table: 'scenario.capacity_bulletin',
        path: '/data/cases/the-730-capacity-call/scenario/capacity_bulletin.parquet',
        rows: 1,
        grain: 'One controller-approved morning capacity bulletin.',
        caution: 'This is the authorized aggregate capacity source; it does not approve employee-level absence or final shift status for decisioning.',
      },
      {
        table: 'scenario.appointment_geography',
        path: '/data/cases/the-730-capacity-call/scenario/appointment_geography.parquet',
        rows: 3_517,
        grain: 'One privacy-minimized appointment-to-service-area record.',
        caution: 'Use the effective operational geography without attempting to recover addresses or coordinates.',
      },
      {
        table: 'workforce.shift',
        path: '/data/cases/the-730-capacity-call/workforce/shift.parquet',
        rows: 9_687,
        grain: 'One scheduled employee shift.',
        caution: 'Final shift_status is an eventual outcome and is not approved as a 07:30 employee-level feature.',
      },
      {
        table: 'external.weather_station',
        path: '/data/cases/the-730-capacity-call/external/weather_station.parquet',
        rows: 2,
        grain: 'One selected weather station mapped to the operating region.',
        caution: 'Several stations can describe a region; station evidence is not appointment-level exposure.',
      },
      {
        table: 'external.weather_hourly',
        path: '/data/cases/the-730-capacity-call/external/weather_hourly.parquet',
        rows: 38_848,
        grain: 'One weather-station hour available to the assignment.',
        caution: 'Observed, estimated and suspect quality states coexist and must remain visible.',
      },
      {
        table: 'external.traffic_area_hourly',
        path: '/data/cases/the-730-capacity-call/external/traffic_area_hourly.parquet',
        rows: 7_103,
        grain: 'One provider version for a service-area hour.',
        caution: 'Coverage, freshness and revision count vary; the latest stored version is not automatically the version known at 07:30.',
      },
      {
        table: 'core.service_area',
        path: '/data/cases/the-730-capacity-call/core/service_area.parquet',
        rows: 3,
        grain: 'One effective service-area reference in the selected branch neighborhood.',
        caution: 'Effective dates and dispatch zones must be respected when attaching area context.',
      },
    ],
    startingQuestions: [
      'Which roster records existed in both business time and warehouse time at 07:30?',
      'How fresh and comparable are weather and traffic observations across the service areas?',
      'Which apparently useful workforce fields are eventual outcomes rather than approved morning evidence?',
      'What action slate remains defensible after the evidence and all three capacity constraints are reconciled?',
    ],
    deliverables: [
      { title: 'As-of packet audit', description: 'Classify roster and supporting fields as eligible, future-dated, stale, revised, quality-limited or prohibited at 07:30.' },
      { title: 'Corrected dispatch view', description: 'Produce the supportable morning slate with evidence freshness and material limitations by appointment or service area.' },
      { title: 'Capacity-checked action ledger', description: 'Name every review, contact, reroute and hold while proving that the published action limits are respected.' },
      { title: 'Dispatch incident note', description: 'Deliver the operational decision and the minimum data-contract change required before the next morning packet.' },
    ],
    stretch: 'Write assertions that fail when roster membership postdates the decision or when an external signal exceeds a declared freshness boundary.',
    skills: ['As-of auditing', 'Evidence freshness', 'Constrained decisions', 'Operational data quality'],
    debrief: {
      framing: 'A current-looking packet can contain future and revised facts. The work is to reconstruct the actual decision surface, not to use every field that later became available.',
      defensibleApproaches: [
        'Compare booked, created and warehouse-available clocks with the decision timestamp and retain excluded records as visible exceptions.',
        'Profile weather quality and traffic freshness by area, then distinguish recorded context from unsupported appointment-level inference.',
        'Use the controller bulletin for aggregate capacity and issue a conservative, explicitly capacity-checked action slate.',
      ],
      commonTraps: [
        'Trusting roster membership because the table is named current_appointment_roster.',
        'Using eventual worked or cancelled shift status to reconstruct morning availability.',
        'Treating the highest traffic revision as necessarily knowable at 07:30 or applying every action capacity independently to the same records.',
      ],
      reviewQuestions: [
        'Can every acted-upon appointment be shown to exist at 07:30?',
        'Which recommendation changes if a stale or revision-ambiguous external signal is withheld?',
        'Did the final slate remain inside every authorized capacity without using employee-level outcomes?',
      ],
    },
    shareCaption: 'The morning packet looked current until its clocks were reconciled. I audited the live decision surface in The Seventh Appointment from The Analyst.',
    socialImage: '/social/briefs/the-seventh-appointment.png',
  },
  {
    sequence: 10,
    id: 'PB-010',
    slug: 'the-price-book-has-two-tabs',
    title: 'The Price Book Has Two Tabs',
    desk: 'Pricing Operations',
    role: 'Pricing Operations Analyst',
    releaseDate: '2026-11-03',
    timeEstimate: '90–120 minutes',
    difficulty: 'Advanced',
    difficultyLevel: 4,
    sourceCaseSlug: 'the-quarter-that-moved',
    sourceAssignment: 'The Quarter That Moved',
    sourceManifest: '/data/cases/the-quarter-that-moved/manifest.json',
    workbenchPath: '/workbench/?case=the-quarter-that-moved&brief=the-price-book-has-two-tabs',
    analysisCutoff: '08 Jul 2024 / 08:30 ET',
    shortDescription: 'A discounting explanation depends on an effective-dated price book that covers fewer channels than the transaction ledger. Separate observed pricing from mapping assumptions and mix.',
    situation: [
      'Pricing leadership believes discounting in the acquired HarborHome business explains the quarter’s commercial movement and is considering a temporary pricing-control intervention.',
      'The transaction ledger contains four sales channels, while the effective-dated price book contains only web and branch prices. A working spreadsheet maps other channels to the branch book and describes variance from list price as realized discount.',
      'You must determine which comparisons are directly supported, which depend on an unapproved crosswalk and whether price—not product, channel or customer mix—supports the proposed action.',
    ],
    decision: 'Certify, qualify or reject the discounting explanation and recommend whether HarborHome needs a temporary pricing-control intervention.',
    constraint: 'Use only Q2 orders knowable by 08 Jul 2024 at 08:30 ET. Captured line economics remain the transaction fact. Do not invent a crosswalk for unsupported sales channels, and separate price, volume, product mix and customer mix.',
    sourceTables: [
      {
        table: 'commerce.order',
        path: '/data/cases/the-quarter-that-moved/commerce_order.parquet',
        rows: 18_167,
        grain: 'One canonical Q2 order header.',
        caution: 'Source identifiers can collide and warehouse availability controls the eligible order population.',
      },
      {
        table: 'commerce.order_line',
        path: '/data/cases/the-quarter-that-moved/commerce_order_line.parquet',
        rows: 32_466,
        grain: 'One captured purchase line.',
        caution: 'Quantity, unit price, discount, tax and total must be reconciled before constructing a realization metric.',
      },
      {
        table: 'catalog.product_price_history',
        path: '/data/cases/the-quarter-that-moved/catalog_product_price_history.parquet',
        rows: 4_320,
        grain: 'One product, price-book channel and effective period.',
        caution: 'Only web and branch books are present; list price is context rather than captured transaction value.',
      },
      {
        table: 'crm.account',
        path: '/data/cases/the-quarter-that-moved/crm_account.parquet',
        rows: 15_601,
        grain: 'One linked customer account.',
        caution: 'Account attributes explain composition but are not order-grain financial facts.',
      },
      {
        table: 'casefiles.harborhome_transition_mapping',
        path: '/data/cases/the-quarter-that-moved/harborhome_transition_mapping.parquet',
        rows: 6,
        grain: 'One recovered legacy-to-corporate field mapping claim.',
        caution: 'The mapping is incomplete; omissions must remain visible rather than being inferred from convenience.',
      },
    ],
    startingQuestions: [
      'Which line-level fields reproduce captured value and what does each candidate price-realization metric mean?',
      'What share of line volume has a directly supportable effective-dated price-book match?',
      'How do source-system differences change after controlling separately for channel, product and account mix?',
      'Which apparent price effect comes from an unsupported mapping choice rather than observed transactions?',
    ],
    deliverables: [
      { title: 'Governed pricing fact', description: 'Build a line-level fact with arithmetic, eligibility and effective-date controls.' },
      { title: 'Price-book coverage matrix', description: 'Show directly matched, unmatched and assumption-dependent volume by source and sales channel.' },
      { title: 'Price-volume-mix bridge', description: 'Compare Meridian and HarborHome while keeping price, volume and observable mix effects separate.' },
      { title: 'Pricing disposition', description: 'Deliver a concise certify, qualify or reject recommendation for the proposed control intervention.' },
    ],
    stretch: 'Standardize one source to the other’s observable product and channel mix, then state precisely what the reweighting still cannot identify.',
    skills: ['Effective-dated joins', 'Pricing arithmetic', 'Mix decomposition', 'Mapping governance'],
    debrief: {
      framing: 'A price book is a reference, not a receipt. The central judgment is how much of the commercial comparison survives effective-date and channel coverage controls.',
      defensibleApproaches: [
        'Begin with captured line economics, validate arithmetic and keep the canonical order cutoff visible.',
        'Match price history only on product, directly supported channel and transaction date while retaining unsupported rows in an explicit category.',
        'Compare source systems within common product, channel and customer slices before attributing a residual difference to pricing behavior.',
      ],
      commonTraps: [
        'Treating list price as booked revenue or every variance from list as a discount.',
        'Mapping all non-web transactions to the branch book without evidence or dropping unmatched lines through an inner join.',
        'Averaging percentages without a declared weight and attributing compositional differences to policy.',
      ],
      reviewQuestions: [
        'What proportion of the conclusion is directly observed rather than supplied by a channel assumption?',
        'Does the source comparison survive a common product and channel mix?',
        'Can the bridge reconcile to captured line value without silently excluding unsupported transactions?',
      ],
    },
    shareCaption: 'Four transaction channels, two price-book tabs and one silent mapping assumption. I audited the commercial claim in The Price Book Has Two Tabs from The Analyst.',
    socialImage: '/social/briefs/the-price-book-has-two-tabs.png',
  },
  {
    sequence: 11,
    id: 'PB-011',
    slug: 'the-warranty-window',
    title: 'The Warranty Window',
    desk: 'Reliability Programs',
    role: 'Reliability Program Analyst',
    releaseDate: '2026-11-10',
    timeEstimate: '90–120 minutes',
    difficulty: 'Advanced',
    difficultyLevel: 4,
    sourceCaseSlug: 'rollback-before-dawn',
    sourceAssignment: 'Rollback Before Dawn',
    sourceManifest: '/data/cases/rollback-before-dawn/manifest.json',
    workbenchPath: '/workbench/?case=rollback-before-dawn&brief=the-warranty-window',
    analysisCutoff: '04 Jun 2025 / 05:00 ET evaluation cutoff',
    shortDescription: 'A proactive inspection policy mixes point-in-time health signals with delayed outcomes and current-state fields. Rebuild the decision clock before allocating 500 inspection slots.',
    situation: [
      'After the firmware incident, Reliability proposes enrolling 500 assets in a proactive inspection program. A draft rule combines current asset state, a sampled health table and a 30-day failure label.',
      'The failure outcome is now available for retrospective evaluation, but it was not available when each intervention would have been chosen. Current master data, installation corrections and work-order outcomes also contain information learned later.',
      'The program team needs an eligibility rule that could actually run prospectively, an honest estimate of its operational burden and a recommendation to launch, shadow or redesign the policy.',
    ],
    decision: 'Approve, modify or refuse a 500-asset proactive inspection policy and define the exact eligibility rule that may be run prospectively.',
    constraint: 'Predictors must have been knowable at each health snapshot’s generated_at. Use failure labels only after failure_label_available_at as evaluation outcomes; do not use current asset state, later installation corrections or eventual work-order results as simulated predictors.',
    sourceTables: [
      {
        table: 'iot.asset',
        path: '/data/cases/rollback-before-dawn/iot/asset.parquet',
        rows: 21_823,
        grain: 'One current asset-master record.',
        caution: 'Current site, state and extract fields are not necessarily historical facts at a health-snapshot decision time.',
      },
      {
        table: 'iot.asset_installation_history',
        path: '/data/cases/rollback-before-dawn/iot/asset_installation_history.parquet',
        rows: 16_640,
        grain: 'One effective installation period for an asset.',
        caution: 'Some removals are recorded late, so both effective and recorded clocks matter.',
      },
      {
        table: 'iot.asset_health_daily',
        path: '/data/cases/rollback-before-dawn/iot/asset_health_daily.parquet',
        rows: 24_810,
        grain: 'One sampled asset-health snapshot for a date.',
        caution: 'Repeated assets and delayed 30-day outcomes require entity-aware, point-in-time evaluation.',
      },
      {
        table: 'field_ops.work_order',
        path: '/data/cases/rollback-before-dawn/field_ops/work_order.parquet',
        rows: 2_886,
        grain: 'One service work order in the incident neighborhood.',
        caution: 'Completion, first-time-fix and final-resolution fields are eventual operational outcomes.',
      },
      {
        table: 'field_ops.work_order_status_event',
        path: '/data/cases/rollback-before-dawn/field_ops/work_order_status_event.parquet',
        rows: 17_316,
        grain: 'One work-order status event.',
        caution: 'Status histories are one-to-many and occurrence differs from source-recorded time.',
      },
      {
        table: 'core.branch',
        path: '/data/cases/rollback-before-dawn/core/branch.parquet',
        rows: 36,
        grain: 'One Meridian branch reference.',
        caution: 'Branch and region support heterogeneity checks but do not create a valid control group by themselves.',
      },
    ],
    startingQuestions: [
      'Which snapshot rows have fully matured 30-day labels at the evaluation cutoff?',
      'Which candidate fields were genuinely available at each simulated inspection decision?',
      'Does a simple rule perform consistently by firmware, region, installation history and telemetry completeness?',
      'Would the 500-slot policy identify future risk, missing telemetry or cases already visible to operations?',
    ],
    deliverables: [
      { title: 'Point-in-time cohort contract', description: 'Separate eligible predictors, matured outcomes, repeated entities and prohibited later facts.' },
      { title: 'Retrospective policy evaluation', description: 'Report reach, event capture, false-positive burden and material subgroup slices at the operating capacity.' },
      { title: 'Inspection eligibility rule', description: 'Produce a reproducible 500-slot rule and at least one transparent sensitivity or challenger.' },
      { title: 'Reliability program decision', description: 'Recommend launch, shadow or redesign with an explicit evidence and monitoring boundary.' },
    ],
    stretch: 'Run several historical snapshot dates as rolling policy simulations rather than validating a rule on one convenient date.',
    skills: ['Label maturity', 'Point-in-time reconstruction', 'Cohort policy design', 'Capacity-aware evaluation'],
    debrief: {
      framing: 'A delayed outcome becomes valid evaluation evidence only after it matures; that never makes it a valid predictor at the earlier decision time.',
      defensibleApproaches: [
        'Use generated_at as the simulated feature boundary and failure_label_available_at as the evaluation boundary.',
        'Resolve installation context as of each snapshot and keep current-state and eventual work-order fields out of the predictor set.',
        'Compare a simple, operationally legible rule with a challenger at exactly 500 selections and control repeated assets during evaluation.',
      ],
      commonTraps: [
        'Using the future failure label, current asset state or completed-work-order outcome in the selection logic.',
        'Treating repeated daily rows from one asset as independent validation entities.',
        'Reporting unconstrained discrimination while ignoring the 500-slot decision and telemetry-coverage selection mechanism.',
      ],
      reviewQuestions: [
        'Could the proposed rule have run on the stated snapshot date?',
        'Are repeated assets and label maturity handled in the evaluation design?',
        'Does the rule find preventable risk rather than work already underway or merely missing telemetry?',
      ],
    },
    shareCaption: 'A mature failure label is valid evidence—but only on the correct side of the decision clock. I designed The Warranty Window from The Analyst.',
    socialImage: '/social/briefs/the-warranty-window.png',
  },
  {
    sequence: 12,
    id: 'PB-012',
    slug: 'every-click-is-not-a-page',
    title: 'Every Click Is Not a Page',
    desk: 'Product Data',
    role: 'Product Analytics Engineer',
    releaseDate: '2026-11-17',
    timeEstimate: '75–105 minutes',
    difficulty: 'Intermediate',
    difficultyLevel: 3,
    sourceCaseSlug: 'the-navigation-vote',
    sourceAssignment: 'The Navigation Vote',
    sourceManifest: '/data/cases/the-navigation-vote/manifest.json',
    workbenchPath: '/workbench/?case=the-navigation-vote&brief=every-click-is-not-a-page',
    analysisCutoff: '05 May 2025 / 09:00 ET',
    shortDescription: 'A product KPI reconciles physically but may not mean what its label claims. Audit the event taxonomy before the metric becomes a permanent dashboard contract.',
    situation: [
      'The navigation experiment readout describes a session summary field as pages per session. Product wants to retain the KPI in the permanent weekly dashboard after the experiment closes.',
      'The session count can be reconciled to the event log, but the event taxonomy mixes page views, product and plan views, searches, support views, cart actions and purchases. Physical completeness and semantic validity are separate questions.',
      'You own the data contract. Decide whether the KPI should be certified, renamed, redefined or retired and specify how historical reporting should transition.',
    ],
    decision: 'Certify, rename, redefine or retire the published engagement KPI and define the production dashboard migration.',
    constraint: 'Preserve experiment assignment as the denominator and event sequence as recorded. Row-count reconciliation does not prove semantic validity, and no event type may be reclassified without a declared rule.',
    sourceTables: [
      {
        table: 'growth.experiment',
        path: '/data/cases/the-navigation-vote/growth_experiment.parquet',
        rows: 1,
        grain: 'One experiment contract.',
        caution: 'The contract sets scope and timing but does not validate a downstream metric label.',
      },
      {
        table: 'growth.experiment_assignment',
        path: '/data/cases/the-navigation-vote/growth_experiment_assignment.parquet',
        rows: 42_000,
        grain: 'One randomized session assignment.',
        caution: 'Assignment—not observed event presence—defines the analysis population.',
      },
      {
        table: 'growth.session',
        path: '/data/cases/the-navigation-vote/growth_session.parquet',
        rows: 42_000,
        grain: 'One summarized web session.',
        caution: 'event_count is a stored summary whose label and construction require separate validation.',
      },
      {
        table: 'growth.web_event',
        path: '/data/cases/the-navigation-vote/growth_web_event.parquet',
        rows: 140_670,
        grain: 'One sequenced event inside a session.',
        caution: 'Event types represent different behaviors and cannot all be assumed to mean page exposure.',
      },
      {
        table: 'casefiles.navigation_readout',
        path: '/data/cases/the-navigation-vote/navigation_readout.parquet',
        rows: 2,
        grain: 'One opening KPI claim per experiment variant.',
        caution: 'The readout is a claim to reproduce and interpret, not a governed definition.',
      },
    ],
    startingQuestions: [
      'Does the session summary reconcile to event rows, and what does that establish or fail to establish?',
      'Which event types and sequences create the difference described by the opening readout?',
      'What definitions could defensibly represent page exposure, navigation effort or meaningful engagement?',
      'Does the interpretation remain coherent across device types and key journey outcomes?',
    ],
    deliverables: [
      { title: 'Session-event reconciliation', description: 'Test completeness and one-session assignment without confusing those controls with meaning.' },
      { title: 'Event taxonomy contract', description: 'Classify pages, actions, outcomes and ambiguous events under explicit rules.' },
      { title: 'KPI comparison', description: 'Compare the published measure with at least two defensible alternatives by variant and a material slice.' },
      { title: 'Dashboard migration note', description: 'Specify the chosen definition, name, backfill boundary and stakeholder communication.' },
    ],
    stretch: 'Construct compact journey signatures from event sequence and test whether additional activity resembles deeper exploration or additional friction.',
    skills: ['Analytics engineering', 'Metric semantics', 'Event sequences', 'Data-contract migration'],
    debrief: {
      framing: 'A metric can reconcile exactly and still be mislabeled. Physical controls, semantic contracts and decision usefulness each require separate evidence.',
      defensibleApproaches: [
        'Prove session-to-event reconciliation first, then separately define what each event type represents.',
        'Decompose the result by event type, sequence and variant while preserving the assigned-session denominator.',
        'Choose the production metric from its intended meaning and stability rather than selecting the most favorable experimental result.',
      ],
      commonTraps: [
        'Declaring the KPI valid because the stored count matches event rows.',
        'Calling every event a page or silently narrowing to one event type after inspecting the result.',
        'Designing a new label that breaks historical comparability without a migration boundary.',
      ],
      reviewQuestions: [
        'What real behavior does one unit of the recommended metric represent?',
        'Can historical and future values be compared under the proposed contract?',
        'Would a product leader mistake additional recorded actions for customer benefit?',
      ],
    },
    shareCaption: 'The count reconciled perfectly—and the metric still needed a semantic audit. I rebuilt the contract in Every Click Is Not a Page from The Analyst.',
    socialImage: '/social/briefs/every-click-is-not-a-page.png',
  },
  {
    sequence: 13,
    id: 'PB-013',
    slug: 'the-vendor-who-is-never-late',
    title: 'The Vendor Who Is Never Late',
    desk: 'Strategic Sourcing',
    role: 'Supplier Performance Analyst',
    releaseDate: '2026-11-24',
    timeEstimate: '90–120 minutes',
    difficulty: 'Advanced',
    difficultyLevel: 4,
    sourceCaseSlug: 'forty-eight-hours-of-stock',
    sourceAssignment: 'Forty-Eight Hours of Stock',
    sourceManifest: '/data/cases/forty-eight-hours-of-stock/manifest.json',
    workbenchPath: '/workbench/?case=forty-eight-hours-of-stock&brief=the-vendor-who-is-never-late',
    analysisCutoff: '01 Dec 2025 / 06:45 ET; orders placed through 30 Sep 2025',
    shortDescription: 'A supplier scorecard begins from receipts and rewards first arrivals. Rebuild it from obligations before selecting five vendors for remediation.',
    situation: [
      'The sourcing council will select no more than five vendors for remediation or dual-source review. Its draft scorecard reports timeliness and fill performance from the purchasing estate.',
      'The calculation begins with received lines, measures delivery from the first receipt and treats gross received units as filled. Unreceived obligations, split receipts, rejected units and cancellations can therefore change both the denominator and the vendor ranking.',
      'You must produce a scorecard that represents the purchasing promise and distinguish supplier performance from product, order-size and contract mix.',
    ],
    decision: 'Select no more than five vendors for remediation or dual-source review and defend the scorecard used to choose them.',
    constraint: 'Aggregate receipts to purchase-order-line grain. Accepted quantity is received less rejected; cancelled quantity changes the remaining obligation; lines with no receipt must remain visible. Separate vendor performance from observable product and contract mix.',
    sourceTables: [
      {
        table: 'supply.purchase_order',
        path: '/data/cases/forty-eight-hours-of-stock/supply/purchase_order.parquet',
        rows: 24_000,
        grain: 'One purchase-order header.',
        caution: 'Vendor and order context live at header grain while quantity and promise live on lines.',
      },
      {
        table: 'supply.purchase_order_line',
        path: '/data/cases/forty-eight-hours-of-stock/supply/purchase_order_line.parquet',
        rows: 96_000,
        grain: 'One purchase-order line obligation.',
        caution: 'Ordered and cancelled quantities must be resolved before measuring fill.',
      },
      {
        table: 'supply.goods_receipt',
        path: '/data/cases/forty-eight-hours-of-stock/supply/goods_receipt.parquet',
        rows: 82_000,
        grain: 'One receipt event for a purchase-order line.',
        caution: 'Lines can receive in parts; gross and rejected quantities are not interchangeable with accepted fill.',
      },
      {
        table: 'supply.product_vendor',
        path: '/data/cases/forty-eight-hours-of-stock/supply/product_vendor.parquet',
        rows: 1_440,
        grain: 'One effective product-vendor sourcing relationship.',
        caution: 'Contract lead time, cost, MOQ and primary status require an effective-date match.',
      },
      {
        table: 'supply.vendor',
        path: '/data/cases/forty-eight-hours-of-stock/supply/vendor.parquet',
        rows: 85,
        grain: 'One effective vendor reference.',
        caution: 'Risk tier is context for review, not proof of observed delivery performance.',
      },
      {
        table: 'catalog.product',
        path: '/data/cases/forty-eight-hours-of-stock/catalog/product.parquet',
        rows: 720,
        grain: 'One product reference.',
        caution: 'Category and lifecycle support mix controls but do not erase sparse vendor evidence.',
      },
    ],
    startingQuestions: [
      'What constitutes an on-time, complete and accepted line after split receipts and cancellations?',
      'Which obligations disappear when the scorecard begins from receipts rather than ordered lines?',
      'Are vendor differences robust within comparable product categories, order sizes and contract lead times?',
      'Which vendors have enough evidence to support action rather than a small-sample review?',
    ],
    deliverables: [
      { title: 'Receipt-obligation fact', description: 'Preserve unreceived, partial, rejected, cancelled and completed line obligations at one-row-per-line grain.' },
      { title: 'Supplier scorecard', description: 'Report coverage, on-time completion, accepted fill, rejection and sample-size measures by vendor.' },
      { title: 'Mix sensitivity', description: 'Test whether the action list survives material product, order-size or contract slices.' },
      { title: 'Remediation slate', description: 'Recommend at most five vendors with an action, evidence boundary and follow-up condition for each.' },
    ],
    stretch: 'Add uncertainty or partial pooling so vendors with very few comparable obligations cannot dominate the ranking extremes.',
    skills: ['Supplier scorecards', 'Censoring', 'One-to-many aggregation', 'Mix-adjusted comparison'],
    debrief: {
      framing: 'Supplier performance begins with the obligation population. A receipt-first analysis can make unresolved work disappear and reward partial delivery.',
      defensibleApproaches: [
        'Start from eligible line obligations and left join a receipt rollup that derives accepted quantity and obligation-completing timing.',
        'Show unresolved and partial exposure separately rather than forcing every line into a completed performance rate.',
        'Compare vendors within product, size and contract slices and keep small-sample uncertainty visible in the action decision.',
      ],
      commonTraps: [
        'Inner joining to receipts or using the first receipt as the full-delivery date.',
        'Treating gross receipts as accepted units or ignoring cancelled obligation.',
        'Using vendor risk tier as observed performance and ranking small vendors on raw percentages alone.',
      ],
      reviewQuestions: [
        'Can a vendor improve its score merely by leaving obligations unreceived?',
        'Are partial, rejected and cancelled units treated consistently?',
        'Would product or contract mix plausibly reverse the five-vendor action slate?',
      ],
    },
    shareCaption: 'A supplier looked punctual because unfinished obligations vanished from the scorecard. I rebuilt it in The Vendor Who Is Never Late from The Analyst.',
    socialImage: '/social/briefs/the-vendor-who-is-never-late.png',
  },
  {
    sequence: 14,
    id: 'PB-014',
    slug: 'green-run-red-data',
    title: 'Green Run, Red Data',
    desk: 'Data Reliability',
    role: 'Analytics Reliability Engineer',
    releaseDate: '2026-12-01',
    timeEstimate: '75–105 minutes',
    difficulty: 'Intermediate',
    difficultyLevel: 3,
    sourceCaseSlug: 'too-good-to-ship',
    sourceAssignment: 'Too Good to Ship',
    sourceManifest: '/data/cases/too-good-to-ship/manifest.json',
    workbenchPath: '/workbench/?case=too-good-to-ship&brief=green-run-red-data',
    analysisCutoff: '20 Jan 2026 / 09:15 ET; runs completed through 31 Dec 2025',
    shortDescription: 'Orchestration status, SLA performance and data-quality evidence disagree at different grains. Build the release gate before closing the incident.',
    situation: [
      'The platform scorecard is largely green on orchestration status, and Operations wants to close the data incident. Downstream analysts report that some successful runs still produced questionable assets.',
      'Pipeline executions, retries and data-quality checks have different grains. Successful runs can miss their SLA, checks can fail or error, and some runs may lack quality evidence altogether.',
      'You must determine which pipelines need quarantine, replay or monitoring and replace the single green status with a defensible composite release gate.',
    ],
    decision: 'Choose the pipelines to quarantine, replay or monitor and define the minimum evidence a future run must satisfy before publishing downstream data.',
    constraint: 'A successful orchestration state is not data certification and absence of a quality result is not a pass. Reduce checks to declared run-level controls before joining, and do not weight pipelines merely because they execute more checks.',
    sourceTables: [
      {
        table: 'platform.pipeline',
        path: '/data/cases/too-good-to-ship/pipeline.parquet',
        rows: 72,
        grain: 'One registered data pipeline.',
        caution: 'Ownership, schedule, SLA and criticality are contracts rather than evidence that an execution was safe.',
      },
      {
        table: 'platform.pipeline_run',
        path: '/data/cases/too-good-to-ship/pipeline_run.parquet',
        rows: 61_301,
        grain: 'One pipeline execution attempt.',
        caution: 'Retries and orchestrator status must not be collapsed before deciding what constitutes a logical run.',
      },
      {
        table: 'platform.data_quality_result',
        path: '/data/cases/too-good-to-ship/data_quality_result.parquet',
        rows: 173_210,
        grain: 'One data-quality check result for a pipeline run.',
        caution: 'Several checks can belong to one run and missing checks are analytically different from passing checks.',
      },
    ],
    startingQuestions: [
      'How often do successful runs also contain failed or errored checks, exceed SLA or lack quality evidence?',
      'Which pipelines and quality dimensions show recurring rather than isolated problems?',
      'How do conclusions change when calculated per check, per execution and per pipeline?',
      'What evidence should be mandatory before a run can publish?',
    ],
    deliverables: [
      { title: 'Run-level control matrix', description: 'Combine orchestration, retry, SLA, row-count and quality states at a declared logical-run grain.' },
      { title: 'Pipeline incident Pareto', description: 'Distinguish recurring, acute, missing-control and high-criticality problems without check-row weighting.' },
      { title: 'Composite release gate', description: 'Define executable PASS, HOLD, REPLAY and REVIEW states with explicit missing-evidence behavior.' },
      { title: 'Reliability handoff', description: 'Name the quarantine, replay and monitoring set and the evidence required to clear each action.' },
    ],
    stretch: 'Build a baseline view that flags meaningful shifts in runtime, row-count ratio or quality-failure rate without hard-coding today’s extremes.',
    skills: ['Reliability analytics', 'Multi-grain controls', 'Observability design', 'Operational triage'],
    debrief: {
      framing: 'Orchestration, timeliness and data validity are separate dimensions. A useful release gate retains all three and treats missing control evidence explicitly.',
      defensibleApproaches: [
        'Resolve retries into a declared logical-run policy and reduce quality rows to run-level states before joining.',
        'Preserve executions with no quality evidence, evaluate runtime against each pipeline SLA and compare per-run with per-pipeline views.',
        'Combine criticality, persistence and control state in the action slate rather than ranking on raw check counts.',
      ],
      commonTraps: [
        'Treating SUCCEEDED as trusted or inner joining away runs with no quality results.',
        'Calculating a failure rate across check rows and overweighting pipelines that execute more checks.',
        'Counting retries or repeated incident references as independent business incidents without a declared rule.',
      ],
      reviewQuestions: [
        'Could an orchestration-success run still publish unsafe data under the proposed gate?',
        'Which missing evidence produces a hold rather than an assumed pass?',
        'Does the triage order reflect business criticality as well as event frequency?',
      ],
    },
    shareCaption: 'The pipeline was green. Its release evidence was not. I built the control gate in Green Run, Red Data from The Analyst.',
    socialImage: '/social/briefs/green-run-red-data.png',
  },
  {
    sequence: 15,
    id: 'PB-015',
    slug: 'solved-twice-counted-once',
    title: 'Solved Twice, Counted Once',
    desk: 'Service Operations',
    role: 'Service Process Analyst',
    releaseDate: '2026-12-08',
    timeEstimate: '90–120 minutes',
    difficulty: 'Advanced',
    difficultyLevel: 4,
    sourceCaseSlug: 'the-queue-nobody-owns',
    sourceAssignment: 'The Queue Nobody Owns',
    sourceManifest: '/data/cases/the-queue-nobody-owns/manifest.json',
    workbenchPath: '/workbench/?case=the-queue-nobody-owns&brief=solved-twice-counted-once',
    analysisCutoff: '01 Nov 2024 / 00:00 ET',
    shortDescription: 'A clean resolution clock hides reopen cycles, unresolved tickets and missing ownership history. Decide what the operating review may publish.',
    situation: [
      'Customer Care intends to publish team resolution rankings using the duration from ticket opening to the frozen solved timestamp. The result will be used in the next operating review.',
      'Tickets can move through repeated solve and reopen cycles, unresolved cases remain in the estate and one ticket can contain several conversations. A current assigned team exists, but effective-dated team ownership is not present for each status transition.',
      'You must choose the resolution definition that represents the service promise and decide whether the available evidence supports team attribution at all.',
    ],
    decision: 'Select the resolution-time definition that may enter the operating review and publish, qualify or withhold the proposed team rankings.',
    constraint: 'Use only ticket and status evidence that occurred by 01 Nov 2024. Keep unresolved tickets in the eligible population, use ticket rather than conversation grain for the service promise, and do not invent historical ownership from a current team field.',
    sourceTables: [
      {
        table: 'support.ticket',
        path: '/data/cases/the-queue-nobody-owns/ticket.parquet',
        rows: 30_311,
        grain: 'One frozen current ticket record.',
        caution: 'solved_at, current status and assigned team can contain later or final facts relative to the reporting cutoff.',
      },
      {
        table: 'support.conversation',
        path: '/data/cases/the-queue-nobody-owns/conversation.parquet',
        rows: 50_387,
        grain: 'One conversation associated with a ticket.',
        caution: 'Several conversations can belong to one ticket and must not multiply the service-promise denominator.',
      },
      {
        table: 'support.ticket_status_event',
        path: '/data/cases/the-queue-nobody-owns/ticket_status_event.parquet',
        rows: 130_347,
        grain: 'One ticket status transition.',
        caution: 'Repeated solves, reopens and administrative transitions require an ordered state-reconstruction policy.',
      },
      {
        table: 'case_reference.routing_team',
        path: '/data/cases/the-queue-nobody-owns/routing_team.parquet',
        rows: 5,
        grain: 'One current routing-team reference.',
        caution: 'Scope and review capacity do not provide effective-dated historical ticket ownership.',
      },
    ],
    startingQuestions: [
      'How do first-solve, latest-solve and sustained-resolution definitions differ?',
      'What happens to the headline when unresolved tickets remain rather than being dropped?',
      'How much distortion can conversation-grain joins or repeated solution events introduce?',
      'Can the available data support descriptive team rankings at the reporting cutoff?',
    ],
    deliverables: [
      { title: 'Ticket-state reconstruction', description: 'Derive first solve, reopen cycles, final observed state and censoring from ordered eligible events.' },
      { title: 'Resolution-definition comparison', description: 'Compare at least three defensible clocks with control totals and unresolved-case treatment.' },
      { title: 'Attribution ruling', description: 'Publish, qualify or withhold the team ranking and identify the exact missing ownership evidence.' },
      { title: 'Operations review artifact', description: 'Recommend one governed service metric and one process intervention with a clear limitation.' },
    ],
    stretch: 'Produce a simple survival-style resolution curve or bounded estimate without relying on a specialized survival library.',
    skills: ['Process mining', 'Censoring', 'Time-to-event reasoning', 'Ownership attribution'],
    debrief: {
      framing: 'A service clock is a state definition, not a subtraction between two convenient fields. Reopens, unresolved work and ownership history determine what the result can support.',
      defensibleApproaches: [
        'Reconstruct eligible milestones from ordered status history and retain every ticket in the reporting population.',
        'Compare first, latest and sustained solution definitions while showing unresolved cases rather than discarding them.',
        'Use conversation data only for declared segmentation and explicitly withhold historical team rankings if current assignment is the only ownership evidence.',
      ],
      commonTraps: [
        'Using frozen solved_at as an as-of fact or excluding unresolved tickets from the denominator.',
        'Counting conversations or SOLVED events as independent resolved tickets.',
        'Attributing an entire ticket history to the current assigned team without effective-dated ownership.',
      ],
      reviewQuestions: [
        'What customer promise does the selected resolution definition represent?',
        'Where are unresolved and reopened tickets visible in the result?',
        'Can the proposed team label actually be reconstructed at the relevant time?',
      ],
    },
    shareCaption: 'A ticket can be solved, reopened and solved again—but the scorecard showed one clean clock. I reconstructed it in Solved Twice, Counted Once from The Analyst.',
    socialImage: '/social/briefs/solved-twice-counted-once.png',
  },
  {
    sequence: 16,
    id: 'PB-016',
    slug: 'the-kit-before-the-call',
    title: 'The Kit Before the Call',
    desk: 'Field Service Enablement',
    role: 'Service Parts Analyst',
    releaseDate: '2026-12-15',
    timeEstimate: '90–120 minutes',
    difficulty: 'Advanced',
    difficultyLevel: 4,
    sourceCaseSlug: 'the-orion-renewal',
    sourceAssignment: 'The Orion Renewal',
    sourceManifest: '/data/cases/the-orion-renewal/manifest.json',
    workbenchPath: '/workbench/?case=the-orion-renewal&brief=the-kit-before-the-call',
    analysisCutoff: '19 Jan 2026 / 08:30 ET; design on 2024–2025 service history',
    shortDescription: 'Field Operations wants standard pre-call parts kits. Turn historical parts usage into a bounded pilot without confusing recorded use, availability, geography or causal impact.',
    situation: [
      'Field Operations believes a small standard parts kit prepared before selected calls could reduce avoidable return visits. The enablement team wants a six-week pilot recommendation by the morning planning review.',
      'Part lines, work-order histories and visits have different grains and clocks. Parts are usually recorded around or after service, final repair outcomes are later facts, and the service-area reference maps areas to default branches without locating each service site to one unique area.',
      'You must identify a compact, testable kit policy from historical usage while making clear what the estate can establish about coverage, cost and geography—and what requires a prospective pilot.',
    ],
    decision: 'Approve, modify or withhold a six-week pre-call parts-kitting pilot and define the eligible work, kit contents, operating scope and evaluation plan.',
    constraint: 'Aggregate part use before joining status histories. Design on service history through 30 Sep 2025 and evaluate on Oct–Dec 2025 without using final outcomes as predictors. Do not claim current inventory availability, infer an exact service area from default branch alone or present historical association as causal pilot impact.',
    sourceTables: [
      {
        table: 'field_ops.work_order',
        path: '/data/cases/the-orion-renewal/work_order.parquet',
        rows: 99_832,
        grain: 'One service work order.',
        caution: 'Current status, completion, first-time-fix and final resolution are later outcomes relative to a pre-call kit decision.',
      },
      {
        table: 'field_ops.work_order_status_event',
        path: '/data/cases/the-orion-renewal/work_order_status_event.parquet',
        rows: 598_992,
        grain: 'One work-order status event.',
        caution: 'The one-to-many history must be reduced before it is joined to work orders, visits or part lines.',
      },
      {
        table: 'field_ops.visit',
        path: '/data/cases/the-orion-renewal/visit.parquet',
        rows: 99_832,
        grain: 'One physical service visit.',
        caution: 'Arrival, departure and visit outcome are realized after the kit decision and cannot be selection features.',
      },
      {
        table: 'field_ops.work_order_part',
        path: '/data/cases/the-orion-renewal/work_order_part.parquet',
        rows: 216_316,
        grain: 'One product quantity recorded against a work order and visit.',
        caution: 'recorded_at is not necessarily pick, load or use time; several part lines belong to one job.',
      },
      {
        table: 'field_ops.appointment',
        path: '/data/cases/the-orion-renewal/appointment.parquet',
        rows: 99_832,
        grain: 'One booked service appointment.',
        caution: 'Scheduled fields can support prospective scope, while storm disruption is a realized outcome.',
      },
      {
        table: 'core.service_area',
        path: '/data/cases/the-orion-renewal/service_area.parquet',
        rows: 120,
        grain: 'One effective service-area reference.',
        caution: 'default_branch_id is a many-area branch relationship, not a service-site-to-area bridge.',
      },
    ],
    startingQuestions: [
      'What should one historical kit-opportunity row represent, and where can the source joins multiply part demand?',
      'Which pre-call attributes may define an eligible kit without using eventual repair or visit outcomes?',
      'How much held-out job and unit coverage can a compact kit achieve, and at what historical carrying-cost proxy?',
      'Which proposed geographic scopes are supported by the available bridge and which require new operational data?',
    ],
    deliverables: [
      { title: 'Grain-safe service-parts fact', description: 'Aggregate historical part quantity and cost by work order and product before attaching eligible pre-call context.' },
      { title: 'Candidate kit matrix', description: 'Recommend compact kit contents for declared service segments with historical job, unit and cost coverage.' },
      { title: 'Held-out policy evaluation', description: 'Evaluate the rule on Oct–Dec 2025 and show coverage, unused-kit burden and instability across material slices.' },
      { title: 'Pilot operating plan', description: 'Define scope, exclusions, logistics assumptions, success measures and the evidence needed for a causal rollout decision.' },
    ],
    stretch: 'Trace a coverage-versus-carrying-cost frontier for several kit sizes and identify where an additional part stops adding material held-out coverage.',
    skills: ['Cohort design', 'Basket coverage', 'Cost-service tradeoffs', 'Prospective pilot design'],
    debrief: {
      framing: 'Historical part use can support a candidate kit policy, but it cannot prove stock availability or the causal effect of pre-positioning. The professional handoff preserves that boundary.',
      defensibleApproaches: [
        'Reduce part lines to work-order/product facts and status histories to only the milestones needed before any multi-table join.',
        'Define candidate kits from a time-bounded design period using only pre-call service and appointment attributes, then evaluate unchanged rules on a later holdout.',
        'Report job coverage, quantity coverage, historical cost and unused-kit burden while treating branch-level geography as coarser than service-area assignment.',
      ],
      commonTraps: [
        'Joining raw part and status rows and ranking products from multiplied quantities.',
        'Using first-time-fix, visit outcome or final resolution to decide which future jobs receive a kit.',
        'Equating recorded part use with inventory availability or mapping a branch appointment to every service area that names that default branch.',
      ],
      reviewQuestions: [
        'Could the policy be executed using only information available before the appointment?',
        'Does held-out coverage survive a reasonable change in kit size or service mix?',
        'Does the pilot distinguish descriptive historical fit from the causal effect it is designed to learn?',
      ],
    },
    shareCaption: 'A useful parts kit is a bounded operating policy, not a list of historically popular SKUs. I designed The Kit Before the Call from The Analyst.',
    socialImage: '/social/briefs/the-kit-before-the-call.png',
  },
];

export const priorityBriefBySlug = new Map(priorityBriefs.map((brief) => [brief.slug, brief]));

function sqlTableReference(table: string) {
  const [schema, name] = table.split('.');
  if (!name) return `"${schema.replaceAll('"', '""')}"`;
  return `${schema}."${name.replaceAll('"', '""')}"`;
}

/**
 * Projects a compact Priority Brief onto an existing assignment pack. This
 * deliberately reuses published Parquet files while giving the brief its own
 * slug and persistence key, so brief work never overwrites a full assignment.
 */
export function priorityBriefCaseDefinition(brief: PriorityBrief, baseDefinition: CaseDefinition): CaseDefinition {
  if (baseDefinition.slug !== brief.sourceCaseSlug) {
    throw new Error(`Priority Brief ${brief.id} requires source case ${brief.sourceCaseSlug}.`);
  }

  const baseFiles = new Map(baseDefinition.dataFiles.map((file) => [file.table, file]));
  const dataFiles = brief.sourceTables.map((source) => {
    const file = baseFiles.get(source.table);
    if (!file) throw new Error(`Priority Brief ${brief.id} references missing table ${source.table}.`);
    return file;
  });
  const tableInventory = brief.sourceTables.map((source) => `-- ${source.table}: ${source.grain}`).join('\n');
  const pythonInventory = brief.sourceTables.map((source) => `    "${source.table}",`).join('\n');
  const firstTable = brief.sourceTables[0].table;

  return {
    ...baseDefinition,
    id: brief.id,
    slug: brief.slug,
    title: brief.title,
    businessUnit: brief.desk,
    role: brief.role,
    queueSubtitle: `${brief.desk} / Priority Brief`,
    priority: 'P2',
    requester: 'Meridian Priority Desk',
    received: formatBriefReleaseDate(brief),
    responseDue: `Timebox / ${brief.timeEstimate}`,
    dueLabel: brief.timeEstimate.toUpperCase(),
    channel: 'Priority Desk / compact decision review',
    requestKicker: `PRIORITY BRIEF / ${brief.id}`,
    requestTitle: brief.decision,
    requestBody: `${brief.situation.join(' ')} Constraint: ${brief.constraint}`,
    decisionStandard: `Make the decision from at least two distinct evidence moves, address a credible rival explanation, and leave a polished handoff. ${brief.constraint}`,
    sessionLabel: brief.id,
    responseWindow: brief.timeEstimate,
    persistenceKey: `the-analyst:priority-brief:${brief.slug}`,
    publicUrl: `/briefs/${brief.slug}/`,
    dataFiles,
    defaultSql: `-- ${brief.id} / ${brief.title}\n-- Establish grain, cutoff, and control totals before interpreting a result.\n${tableInventory}\n\nSELECT *\nFROM ${sqlTableReference(firstTable)}\nLIMIT 25;`,
    defaultPython: `import pandas as pd\nimport matplotlib.pyplot as plt\nfrom analyst import table\n\n# Registered source neighborhood for this brief. Load only what the next\n# evidence move requires, and verify grain before joining.\nsource_tables = [\n${pythonInventory}\n]\n\nfocus = table("${firstTable}")\nprint(focus.shape)\nfocus.head()`,
    defaultNotes: `# ${brief.id} / working record\n\n## Decision\n${brief.decision}\n\n## Constraint and cutoff\n- ${brief.constraint}\n- Analysis cutoff: ${brief.analysisCutoff}\n\n## Evidence move 1\n- Grain and population:\n- Result:\n- Limitation:\n\n## Evidence move 2\n- Rival explanation tested:\n- Result:\n- Limitation:\n\n## Handoff\n- Decision:\n- Counterevidence:\n- Change-of-course trigger:\n`,
    initialEvidence: [],
    requiredArtifacts: brief.deliverables.map((deliverable) => deliverable.title),
    pythonPackages: baseDefinition.pythonPackages,
  };
}

function releaseTimestamp(brief: PriorityBrief) {
  return Date.parse(`${brief.releaseDate}T12:00:00Z`);
}

const PRIORITY_BRIEF_SLOT_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Returns the permanent 16-week weekly rotation position. The original release
 * dates anchor cycle one; after PB-016, the next weekly slot returns to PB-001.
 */
export function getPriorityBriefRotation(now: Date = new Date()): PriorityBriefRotation {
  const rotationStart = releaseTimestamp(priorityBriefs[0]);
  const elapsedSlots = now.getTime() < rotationStart
    ? 0
    : Math.floor((now.getTime() - rotationStart) / PRIORITY_BRIEF_SLOT_MS);
  const briefIndex = elapsedSlots % priorityBriefs.length;
  const startsAt = new Date(rotationStart + elapsedSlots * PRIORITY_BRIEF_SLOT_MS);

  return {
    brief: priorityBriefs[briefIndex],
    slot: briefIndex + 1,
    startsAt,
    endsAt: new Date(startsAt.getTime() + PRIORITY_BRIEF_SLOT_MS),
  };
}

export function getCurrentPriorityBrief(now: Date = new Date()) {
  return getPriorityBriefRotation(now).brief;
}

export function getBriefReleaseState(brief: PriorityBrief, now: Date = new Date()): BriefReleaseState {
  if (brief.slug === getCurrentPriorityBrief(now).slug) return 'current';
  return releaseTimestamp(brief) <= now.getTime() ? 'released' : 'scheduled';
}

export function formatBriefReleaseDate(brief: PriorityBrief) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${brief.releaseDate}T12:00:00Z`));
}
