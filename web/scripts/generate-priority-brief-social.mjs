import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { initWasm, Resvg } from '@resvg/resvg-wasm';
import satori from 'satori';

const briefs = [
  ['PB-001', 'the-denominator-dispute', 'The Denominator Dispute', 'Service Performance', 'Performance Reporting Analyst', '60–75 min'],
  ['PB-002', 'three-lines-nine-claims', 'Three Lines, Nine Claims', 'Commercial Operations', 'Commercial Operations Analyst', '75–105 min'],
  ['PB-003', 'the-silent-sensors', 'The Silent Sensors', 'Connected Reliability', 'Reliability Duty Analyst', '75–105 min'],
  ['PB-004', 'the-lift-in-the-fine-print', 'The Lift in the Fine Print', 'Product Experimentation', 'Experiment Review Analyst', '90–120 min'],
  ['PB-005', 'the-expedite-window', 'The Expedite Window', 'Supply Planning', 'Inventory Planning Analyst', '90–120 min'],
  ['PB-006', 'tomorrows-churn-model', 'Tomorrow’s Churn Model', 'Model Risk', 'Model Validation Analyst', '75–105 min'],
  ['PB-007', 'the-redacted-queue', 'The Redacted Queue', 'Data Responsibility', 'Data Responsibility Analyst', '90–120 min'],
  ['PB-008', 'the-chart-before-the-board', 'The Chart Before the Board', 'Executive Analytics', 'Strategy Analytics Partner', '60–90 min'],
];

const fontData = await readFile(path.resolve('node_modules/@vercel/og/dist/noto-sans-v27-latin-regular.ttf'));

function element(type, style, children) {
  return { type, props: { style, children } };
}

function card([id, slug, title, desk, role, time]) {
  return satori(
    element('div', {
      position: 'relative', display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
      padding: '72px 108px 38px 112px', background: '#10263f', color: '#ffffff', overflow: 'hidden',
    }, [
      element('div', { position: 'absolute', left: 0, top: 0, width: 22, height: 630, background: '#3979c4' }, ''),
      element('div', { position: 'absolute', left: 22, top: 0, width: 1178, height: 10, background: '#dc7047' }, ''),
      element('div', { position: 'absolute', right: -180, bottom: -300, width: 690, height: 690, background: '#153453', transform: 'rotate(45deg)' }, ''),
      element('div', { display: 'flex', color: '#8fc0f2', fontSize: 20, fontWeight: 700, letterSpacing: 3 }, 'THE ANALYST / PRIORITY BRIEF'),
      element('div', { display: 'flex', marginTop: 44, color: '#b8c8d6', fontSize: 24, letterSpacing: 2 }, `${id}  ·  ${desk.toUpperCase()}`),
      element('div', { display: 'flex', maxWidth: 940, marginTop: 60, color: '#ffffff', fontSize: 70, fontWeight: 700, letterSpacing: -2, lineHeight: 1.08 }, title),
      element('div', { display: 'flex', marginTop: 'auto', paddingBottom: 35, color: '#d6e0e8', fontSize: 23 }, `${role}  ·  ${time}`),
      element('div', { display: 'flex', width: '100%', paddingTop: 28, borderTop: '1px solid #49627b', color: '#95aabd', fontSize: 18 }, `A compact workplace decision at theanalyst.dev/briefs/${slug}`),
    ]),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Noto Sans', data: fontData, weight: 400, style: 'normal' }],
    },
  );
}

const wasm = await readFile(path.resolve('node_modules/@resvg/resvg-wasm/index_bg.wasm'));
await initWasm(wasm);

const output = path.resolve('public/social/briefs');
await mkdir(output, { recursive: true });

for (const brief of briefs) {
  const renderer = new Resvg(await card(brief), { background: '#10263f' });
  const image = renderer.render();
  await writeFile(path.join(output, `${brief[1]}.png`), image.asPng());
  image.free();
  renderer.free();
}

console.log(`Generated ${briefs.length} Priority Brief social cards.`);
