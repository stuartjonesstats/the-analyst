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
    releaseDate: '2026-09-15',
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
    releaseDate: '2026-09-29',
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
    releaseDate: '2026-10-13',
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
    releaseDate: '2026-10-27',
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
    releaseDate: '2026-11-10',
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
    releaseDate: '2026-11-24',
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
    releaseDate: '2026-12-08',
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

const PRIORITY_BRIEF_SLOT_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Returns the permanent 16-week rotation position. The original release dates
 * anchor cycle one; after PB-008, the next two-week slot returns to PB-001.
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
