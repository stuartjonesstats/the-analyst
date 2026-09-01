export type ScenarioStatus = 'active' | 'queued';

export type LearnerScenario = {
  id: string;
  slug: string;
  title: string;
  businessUnit: string;
  role: string;
  moment: string;
  request: string;
  timebox: string;
  level: string;
  status: ScenarioStatus;
  sourceTables: string[];
};

/**
 * Learner-safe scenario registry. Instructor truths, trap explanations, reveal
 * predicates, and grading notes are intentionally excluded from this module.
 */
export const scenarios: LearnerScenario[] = [
  {
    id: 'CC-241202',
    slug: 'the-monday-scorecard',
    title: 'The Monday Scorecard',
    businessUnit: 'Customer Care',
    role: 'Customer Insights Analyst',
    moment: 'Monday, 02 Dec / 08:05',
    request: 'Reconcile two conflicting satisfaction figures before the executive review.',
    timebox: '3–4 hour complete handoff',
    level: 'Foundation',
    status: 'active',
    sourceTables: [
      'support.csat_response',
      'support.ticket',
      'support.ticket_status_event',
      'crm.account',
    ],
  },
  {
    id: 'OP-250319',
    slug: 'rollback-before-dawn',
    title: 'Rollback Before Dawn',
    businessUnit: 'Connected Reliability',
    role: 'Connected Reliability Analyst',
    moment: 'Thursday, 20 Mar / 11:40',
    request: 'Recommend whether to roll back firmware, contain a scoped cohort, or continue under monitoring.',
    timebox: '6–9 hour complete handoff',
    level: 'Intermediate',
    status: 'queued',
    sourceTables: [
      'iot.sensor_reading',
      'iot.sensor',
      'iot.asset',
      'iot.asset_installation_history',
      'iot.device_alert',
      'iot.asset_health_daily',
      'external.weather_hourly',
      'field_ops.work_order',
    ],
  },
  {
    id: 'PR-250501',
    slug: 'the-orion-renewal',
    title: 'The Orion Renewal',
    businessUnit: 'Field Operations Strategy',
    role: 'Senior Operations Analyst',
    moment: 'Monday, 19 Jan / 08:30',
    request: 'Audit the claimed productivity gain and advise Procurement and Field leadership.',
    timebox: '10–16 hour complete handoff',
    level: 'Intermediate / advanced',
    status: 'queued',
    sourceTables: [
      'fleet.route',
      'fleet.route_stop',
      'field_ops.work_order',
      'field_ops.work_order_status_event',
      'field_ops.visit',
      'workforce.shift',
      'external.traffic_area_hourly',
      'external.weather_hourly',
    ],
  },
  {
    id: 'MR-250714',
    slug: 'too-good-to-ship',
    title: 'Too Good to Ship',
    businessUnit: 'ML Governance',
    role: 'Model Risk Analyst',
    moment: 'Tuesday, 20 Jan / 09:15',
    request: 'Audit an implausibly strong cancellation model and decide its smallest safe path forward.',
    timebox: '8–14 hour complete handoff',
    level: 'Advanced',
    status: 'queued',
    sourceTables: [
      'platform.account_feature_snapshot',
      'platform.model_registry',
      'platform.model_version',
      'platform.model_prediction',
      'crm.account_status_event',
      'billing.subscription_event',
      'billing.payment_attempt',
    ],
  },
];
