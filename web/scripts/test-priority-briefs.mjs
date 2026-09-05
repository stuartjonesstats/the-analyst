import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { fortyEightHoursOfStock } from '../lib/case-definitions/forty-eight-hours-of-stock.ts';
import { mondayScorecard } from '../lib/case-definitions/monday-scorecard.ts';
import { rollbackBeforeDawn } from '../lib/case-definitions/rollback-before-dawn.ts';
import { the730CapacityCall } from '../lib/case-definitions/the-730-capacity-call.ts';
import { navigationVoteCase } from '../lib/case-definitions/the-navigation-vote.ts';
import { theOrionRenewal } from '../lib/case-definitions/the-orion-renewal.ts';
import { quarterThatMovedCase } from '../lib/case-definitions/the-quarter-that-moved.ts';
import { theQueueNobodyOwns } from '../lib/case-definitions/the-queue-nobody-owns.ts';
import { tooGoodToShip } from '../lib/case-definitions/too-good-to-ship.ts';
import { getPriorityBriefRotation, priorityBriefs } from '../lib/priority-briefs.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const webRoot = path.resolve(import.meta.dirname, '..');
const caseDefinitions = [
  mondayScorecard,
  quarterThatMovedCase,
  rollbackBeforeDawn,
  navigationVoteCase,
  the730CapacityCall,
  fortyEightHoursOfStock,
  tooGoodToShip,
  theQueueNobodyOwns,
  theOrionRenewal,
];
const casesBySlug = new Map(caseDefinitions.map((definition) => [definition.slug, definition]));

function assertUnique(values, label) {
  assert.equal(new Set(values).size, values.length, `${label} must be unique`);
}

function assertPngDimensions(publicPath, expectedWidth = 1200, expectedHeight = 630) {
  const filePath = path.join(webRoot, 'public', publicPath.replace(/^\//, ''));
  assert.ok(existsSync(filePath), `missing social image ${publicPath}`);
  const png = readFileSync(filePath);
  assert.equal(png.subarray(1, 4).toString(), 'PNG', `${publicPath} must be a PNG`);
  assert.equal(png.readUInt32BE(16), expectedWidth, `${publicPath} width`);
  assert.equal(png.readUInt32BE(20), expectedHeight, `${publicPath} height`);
}

assert.equal(priorityBriefs.length, 16, 'catalog must contain exactly 16 Priority Briefs');
assert.deepEqual(priorityBriefs.map((brief) => brief.sequence), Array.from({ length: 16 }, (_, index) => index + 1));
assert.deepEqual(priorityBriefs.map((brief) => brief.id), Array.from({ length: 16 }, (_, index) => `PB-${String(index + 1).padStart(3, '0')}`));
assertUnique(priorityBriefs.map((brief) => brief.slug), 'brief slugs');
assertUnique(priorityBriefs.map((brief) => brief.id), 'brief IDs');
assertUnique(priorityBriefs.map((brief) => brief.socialImage), 'social images');

priorityBriefs.forEach((brief, index) => {
  assert.equal('cycle' in brief, false, `${brief.id} must not expose a cycle property`);
  assert.ok(brief.sourceTables.length > 0, `${brief.id} needs source tables`);
  assert.ok(brief.deliverables.length >= 3, `${brief.id} needs a substantial handoff`);
  assert.ok(brief.startingQuestions.length >= 3, `${brief.id} needs investigation prompts`);
  assertUnique(brief.sourceTables.map((source) => source.table), `${brief.id} source tables`);

  const releaseTime = Date.parse(`${brief.releaseDate}T12:00:00Z`);
  assert.ok(Number.isFinite(releaseTime), `${brief.id} has an invalid release date`);
  if (index > 0) {
    const previousTime = Date.parse(`${priorityBriefs[index - 1].releaseDate}T12:00:00Z`);
    assert.equal(releaseTime - previousTime, 7 * DAY_MS, `${brief.id} must release seven days after the previous brief`);
  }

  const base = casesBySlug.get(brief.sourceCaseSlug);
  assert.ok(base, `${brief.id} references an unknown source assignment`);
  const baseFiles = new Map(base.dataFiles.map((file) => [file.table, file]));
  for (const source of brief.sourceTables) {
    const baseFile = baseFiles.get(source.table);
    assert.ok(baseFile, `${brief.id} references unregistered table ${source.table}`);
    assert.equal(source.path, baseFile.url, `${brief.id} path drift for ${source.table}`);
    assert.equal(source.rows, baseFile.rows, `${brief.id} row-count drift for ${source.table}`);
    assert.ok(existsSync(path.join(webRoot, 'public', source.path.replace(/^\//, ''))), `${brief.id} missing Parquet ${source.path}`);
  }

  const workbench = new URL(brief.workbenchPath, 'https://theanalyst.dev');
  assert.equal(workbench.pathname, '/workbench/', `${brief.id} workbench pathname`);
  assert.equal(workbench.searchParams.get('case'), brief.sourceCaseSlug, `${brief.id} workbench case`);
  assert.equal(workbench.searchParams.get('brief'), brief.slug, `${brief.id} workbench slug`);
  assertPngDimensions(brief.socialImage);
});

const rotationCases = [
  ['2026-09-01T12:00:00Z', 'PB-001'],
  ['2026-09-08T12:00:00Z', 'PB-002'],
  ['2026-12-15T12:00:00Z', 'PB-016'],
  ['2026-12-22T12:00:00Z', 'PB-001'],
  ['2027-04-13T12:00:00Z', 'PB-001'],
];
for (const [instant, expectedId] of rotationCases) {
  assert.equal(getPriorityBriefRotation(new Date(instant)).brief.id, expectedId, `rotation at ${instant}`);
}

console.log(`Validated ${priorityBriefs.length} weekly Priority Briefs, their source estate, rotation, and social assets.`);
