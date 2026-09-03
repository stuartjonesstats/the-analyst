import assert from 'node:assert/strict';

import {
  ADVISORY_SYSTEM_PROMPT,
  buildAdvisoryRequest,
  formatAdvisoryTranscript,
} from '../lib/advisory.ts';

const selectedCanary = 'SELECTED_CONTEXT_CANARY';
const hiddenCanary = 'PRIVATE_INSTRUCTOR_CANARY';
const unselectedCanary = 'UNSELECTED_WORKSHEET_CANARY';

const base = {
  promptRevision: 'assignment-01.v1',
  intent: 'suggest_check',
  question: 'What should I check next?',
  brief: {
    id: 'CC-241202',
    title: 'The Monday Scorecard',
    role: 'Customer Insights Analyst',
    requester: 'Talia Rivera',
    requestTitle: 'Reconcile two figures.',
    requestBody: 'Provide one defensible headline measure.',
    responseDue: '02 Dec / 14:00',
    decisionStandard: 'Prefer the better-supported sentence.',
    analysisCutoff: '2024-12-02 08:05 ET',
  },
  scaffoldMode: 'supported',
  workflowStep: 'investigate',
  sources: [{
    table: 'support.csat_response',
    description: 'Survey responses.',
    grain: 'One returned survey per ticket.',
    primaryKey: ['csat_response_id'],
    columns: [{ name: 'score_normalized', type: 'double' }],
    qualityNotes: ['Two raw scales coexist.'],
  }],
  relationships: [],
  revealedMessages: [],
  selections: [{ kind: 'sql', label: 'Current SQL worksheet', text: selectedCanary, sha256: 'abc123' }],
  instructorNotes: hiddenCanary,
  unselectedSql: unselectedCanary,
};

const request = buildAdvisoryRequest(base);
assert.deepEqual(Object.keys(request), [
  'schemaVersion', 'policyVersion', 'promptRevision', 'intent', 'question', 'assignment', 'context',
]);
assert.deepEqual(Object.keys(request.context), [
  'scaffoldMode', 'workflowStep', 'sources', 'relationships', 'revealedMessages', 'selections',
]);
const serialized = JSON.stringify(request);
assert.match(serialized, new RegExp(selectedCanary));
assert.doesNotMatch(serialized, new RegExp(hiddenCanary));
assert.doesNotMatch(serialized, new RegExp(unselectedCanary));

const lockedMessage = 'LOCKED_MESSAGE_CANARY';
assert.doesNotMatch(serialized, new RegExp(lockedMessage));
const revealed = buildAdvisoryRequest({
  ...base,
  revealedMessages: [{ id: 'revealed', from: 'Avery', subject: 'Context', body: lockedMessage }],
});
assert.match(JSON.stringify(revealed), new RegExp(lockedMessage));

const longSelection = buildAdvisoryRequest({
  ...base,
  selections: [{ kind: 'note', label: 'Long note', text: 'x'.repeat(7000), sha256: 'long' }],
});
assert.equal(longSelection.context.selections[0].text.length, 6020);
assert.match(longSelection.context.selections[0].text, /\[selection clipped\]$/);

assert.match(ADVISORY_SYSTEM_PROMPT, /Do not write a complete submission/);
assert.match(ADVISORY_SYSTEM_PROMPT, /Never claim to have queried/);
assert.match(ADVISORY_SYSTEM_PROMPT, /do not have access to instructor notes/);
assert.match(ADVISORY_SYSTEM_PROMPT, /under 130 words/);

const transcript = formatAdvisoryTranscript([{
  id: 'test',
  askedAt: '2026-09-03T10:00:00.000Z',
  completedAt: '2026-09-03T10:00:01.000Z',
  intent: 'suggest_check',
  origin: 'starter',
  starterId: 'suggest_check',
  starterEdited: false,
  question: 'What should I check?',
  scaffoldMode: 'supported',
  workflowStep: 'investigate',
  context: [],
  revealedEventIds: [],
  response: 'READ\nA bounded response.',
  modelId: 'test-model',
  promptRevision: 'test',
  policyVersion: 'test',
  elapsedMs: 1000,
  interrupted: false,
}]);
assert.match(transcript, /not evidence or a correctness certificate/);
assert.match(transcript, /ADVISORY \/ VERIFY BEFORE USE/);
assert.match(transcript, /What should I check\?/);

console.log('advisory policy: all checks passed');
