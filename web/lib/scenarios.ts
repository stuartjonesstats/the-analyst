export type WorkloadBand = 'Brief' | 'Investigation' | 'Decision case' | 'Practicum';
export type ScenarioStatus = 'connected' | 'authoring' | 'data_repair';

export type ComplexityProfile = {
  sql: number;
  python: number;
  data: number;
  statistics: number;
  ambiguity: number;
  deliverables: number;
};

export type LearnerScenario = {
  sequence: number;
  id: string;
  slug: string;
  title: string;
  businessUnit: string;
  role: string;
  moment: string;
  request: string;
  preparedHours: string;
  newcomerHours: string;
  band: WorkloadBand;
  prerequisites: string[];
  sqlCore: string;
  pythonCore: string;
  sourceTables: string[];
  artifactCount: number;
  packageProfile: 'core-analysis' | 'statistics' | 'modeling' | 'nlp';
  complexity: ComplexityProfile;
  status: ScenarioStatus;
};

/**
 * Learner-safe curriculum registry. Instructor truths, anomaly explanations,
 * reveal predicates, and grading notes live only in the separate teaching
 * projection.
 */
export const scenarios: LearnerScenario[] = [
  {
    sequence: 1,
    id: 'CC-241202',
    slug: 'the-monday-scorecard',
    title: 'The Monday Scorecard',
    businessUnit: 'Customer Care',
    role: 'Customer Insights Analyst',
    moment: 'Monday, 02 Dec / 08:05',
    request: 'Reconcile two conflicting satisfaction figures before the executive review.',
    preparedHours: '3–4',
    newcomerHours: '5–8',
    band: 'Brief',
    prerequisites: ['Tables and data types', 'Basic SELECT/GROUP BY', 'Pandas introduction'],
    sqlCore: 'Profile grains, scales, cohorts, duplicate interactions, and response coverage.',
    pythonCore: 'Reproduce the profile in Pandas, visualize scale/cohort differences, and create the scorecard artifact.',
    sourceTables: ['support.csat_response', 'support.ticket', 'support.ticket_status_event', 'crm.account'],
    artifactCount: 4,
    packageProfile: 'core-analysis',
    complexity: { sql: 2, python: 2, data: 2, statistics: 1, ambiguity: 3, deliverables: 2 },
    status: 'connected',
  },
  {
    sequence: 2,
    id: 'CM-240708',
    slug: 'the-quarter-that-moved',
    title: 'The Quarter That Moved',
    businessUnit: 'Commercial Data Transition',
    role: 'Commercial Data Transition Analyst',
    moment: 'Monday, 08 Jul / 09:10',
    request: 'Certify Q2 orders, revenue, and fulfillment timing after an acquisition cutover.',
    preparedHours: '5–8',
    newcomerHours: '8–12',
    band: 'Investigation',
    prerequisites: ['Python functions', 'Pandas joins', 'SQL joins and aggregation'],
    sqlCore: 'Construct a stable order fact across headers, lines, events, and shipments.',
    pythonCore: 'Profile collisions and clock errors, build reusable exception flags, test reconciliations, and certify an extract.',
    sourceTables: ['commerce.order', 'commerce.order_event', 'commerce.order_line', 'commerce.shipment_event', 'catalog.product_price_history'],
    artifactCount: 5,
    packageProfile: 'core-analysis',
    complexity: { sql: 3, python: 3, data: 3, statistics: 2, ambiguity: 3, deliverables: 3 },
    status: 'authoring',
  },
  {
    sequence: 3,
    id: 'GX-250505',
    slug: 'the-navigation-vote',
    title: 'The Navigation Vote',
    businessUnit: 'Product Experimentation',
    role: 'Product Experimentation Analyst',
    moment: 'Monday, 05 May / 10:00',
    request: 'Determine whether a mobile-navigation experiment warrants rollout.',
    preparedHours: '8–12',
    newcomerHours: '12–18',
    band: 'Investigation',
    prerequisites: ['Probability and sampling', 'Confidence intervals', 'SQL cohort construction'],
    sqlCore: 'Build one row per assignment and reconcile exposure, sessions, events, and orders.',
    pythonCore: 'Run balance checks, estimate effects and uncertainty, inspect distributions, and separate confirmatory from exploratory slices.',
    sourceTables: ['growth.experiment', 'growth.experiment_assignment', 'growth.session', 'growth.web_event', 'commerce.order'],
    artifactCount: 5,
    packageProfile: 'statistics',
    complexity: { sql: 3, python: 4, data: 3, statistics: 4, ambiguity: 4, deliverables: 4 },
    status: 'authoring',
  },
  {
    sequence: 4,
    id: 'OP-250320',
    slug: 'rollback-before-dawn',
    title: 'Rollback Before Dawn',
    businessUnit: 'Connected Reliability',
    role: 'Connected Reliability Analyst',
    moment: 'Thursday, 20 Mar / 11:40',
    request: 'Recommend global rollback, scoped containment, or monitored continuation during a storm.',
    preparedHours: '6–9',
    newcomerHours: '10–16',
    band: 'Decision case',
    prerequisites: ['Missing-data mechanisms', 'Time-aware joins', 'Exploratory visualization'],
    sqlCore: 'Build point-in-time asset, telemetry, alert, weather, and field-operation evidence lanes.',
    pythonCore: 'Diagnose missingness, compare regions and periods, quantify counterevidence, and visualize decision thresholds.',
    sourceTables: ['iot.sensor_reading', 'iot.sensor', 'iot.asset', 'iot.device_alert', 'external.weather_hourly', 'field_ops.work_order'],
    artifactCount: 5,
    packageProfile: 'statistics',
    complexity: { sql: 4, python: 4, data: 5, statistics: 4, ambiguity: 5, deliverables: 4 },
    status: 'authoring',
  },
  {
    sequence: 5,
    id: 'FO-260121',
    slug: 'the-730-capacity-call',
    title: 'The 7:30 Capacity Call',
    businessUnit: 'Field Operations Planning',
    role: 'Operations Data Scientist',
    moment: 'Wednesday, 21 Jan / 07:30',
    request: 'Build a morning risk view for appointments likely to miss their service window.',
    preparedHours: '12–18',
    newcomerHours: '20–30',
    band: 'Decision case',
    prerequisites: ['Supervised learning', 'Feature pipelines', 'Temporal validation', 'Classification metrics'],
    sqlCore: 'Create a point-in-time appointment feature mart at a stable entity and scoring time.',
    pythonCore: 'Build sklearn pipelines, compare a baseline, use forward validation, inspect calibration/errors, and design an intervention threshold.',
    sourceTables: ['field_ops.appointment', 'field_ops.work_order', 'field_ops.visit', 'workforce.shift', 'external.weather_hourly', 'core.business_calendar'],
    artifactCount: 6,
    packageProfile: 'modeling',
    complexity: { sql: 4, python: 5, data: 4, statistics: 4, ambiguity: 4, deliverables: 5 },
    status: 'authoring',
  },
  {
    sequence: 6,
    id: 'SP-251201',
    slug: 'forty-eight-hours-of-stock',
    title: 'Forty-Eight Hours of Stock',
    businessUnit: 'Supply Planning',
    role: 'Supply Planning Data Scientist',
    moment: 'Monday, 01 Dec / 06:45',
    request: 'Forecast 21-day SKU/warehouse risk and recommend transfers, expedites, or substitutions.',
    preparedHours: '12–18',
    newcomerHours: '20–30',
    band: 'Practicum',
    prerequisites: ['Time-series validation', 'Forecast error', 'Simulation', 'Operational constraints'],
    sqlCore: 'Reconcile movement, demand, receipt, transfer, and vendor facts into a complete daily spine.',
    pythonCore: 'Backtest honest baselines, forecast intermittent demand, simulate lead-time risk, and produce a constrained action file.',
    sourceTables: ['supply.inventory_movement', 'supply.inventory_position_daily', 'supply.purchase_order', 'supply.purchase_order_line', 'supply.goods_receipt', 'supply.product_vendor'],
    artifactCount: 6,
    packageProfile: 'statistics',
    complexity: { sql: 4, python: 5, data: 5, statistics: 4, ambiguity: 4, deliverables: 5 },
    status: 'data_repair',
  },
  {
    sequence: 7,
    id: 'PR-260119',
    slug: 'the-orion-renewal',
    title: 'The Orion Renewal',
    businessUnit: 'Field Operations Strategy',
    role: 'Senior Operations Analyst',
    moment: 'Monday, 19 Jan / 08:30',
    request: 'Audit a claimed 12% optimizer gain and make a procurement recommendation.',
    preparedHours: '10–16',
    newcomerHours: '18–28',
    band: 'Decision case',
    prerequisites: ['Metric design', 'Join reconciliation', 'Quasi-experimental reasoning'],
    sqlCore: 'Define stable route, stop, work-order, visit, and workforce outcomes without fanout.',
    pythonCore: 'Plot trends and heterogeneity, run sensitivity/placebo analyses, and build the board-ready evidence package.',
    sourceTables: ['fleet.route', 'fleet.route_stop', 'field_ops.work_order', 'field_ops.visit', 'workforce.shift', 'external.traffic_area_hourly'],
    artifactCount: 5,
    packageProfile: 'statistics',
    complexity: { sql: 5, python: 4, data: 5, statistics: 5, ambiguity: 5, deliverables: 5 },
    status: 'authoring',
  },
  {
    sequence: 8,
    id: 'NL-260122',
    slug: 'the-queue-nobody-owns',
    title: 'The Queue Nobody Owns',
    businessUnit: 'Support Operations',
    role: 'Applied ML Analyst',
    moment: 'Thursday, 22 Jan / 09:00',
    request: 'Design a safe shadow-routing system for uncategorized support work.',
    preparedHours: '12–20',
    newcomerHours: '20–30',
    band: 'Practicum',
    prerequisites: ['Text representation', 'Classification', 'Error analysis', 'Model packaging'],
    sqlCore: 'Construct leak-resistant conversation-level labels and train/validation cohorts.',
    pythonCore: 'Build TF-IDF and comparison pipelines, inspect class errors, add abstention, package inference, and define monitoring.',
    sourceTables: ['support.ticket', 'support.conversation_message', 'support.ticket_status_event', 'crm.account'],
    artifactCount: 6,
    packageProfile: 'nlp',
    complexity: { sql: 4, python: 5, data: 4, statistics: 4, ambiguity: 5, deliverables: 5 },
    status: 'authoring',
  },
  {
    sequence: 9,
    id: 'MR-260120',
    slug: 'too-good-to-ship',
    title: 'Too Good to Ship',
    businessUnit: 'ML Governance',
    role: 'Model Risk Analyst',
    moment: 'Tuesday, 20 Jan / 09:15',
    request: 'Audit an implausibly strong cancellation model and decide its smallest safe path forward.',
    preparedHours: '8–14',
    newcomerHours: '16–24',
    band: 'Practicum',
    prerequisites: ['Model validation', 'Temporal splits', 'Calibration', 'Data governance'],
    sqlCore: 'Trace model lineage, snapshot grain, labels, and point-in-time availability.',
    pythonCore: 'Reproduce leakage, compare grouped temporal validation, build an allow-listed baseline, and audit calibration and segments.',
    sourceTables: ['platform.account_feature_snapshot', 'platform.model_registry', 'platform.model_version', 'crm.account_status_event', 'billing.subscription_event'],
    artifactCount: 5,
    packageProfile: 'modeling',
    complexity: { sql: 3, python: 5, data: 5, statistics: 5, ambiguity: 5, deliverables: 5 },
    status: 'authoring',
  },
];

export const complexityDimensions: Array<{ key: keyof ComplexityProfile; label: string }> = [
  { key: 'sql', label: 'SQL' },
  { key: 'python', label: 'Python' },
  { key: 'data', label: 'Data complexity' },
  { key: 'statistics', label: 'Statistical reasoning' },
  { key: 'ambiguity', label: 'Decision ambiguity' },
  { key: 'deliverables', label: 'Deliverable load' },
];
