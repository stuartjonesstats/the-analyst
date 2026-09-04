import { strToU8, zipSync } from 'fflate';

import type { AnalystCaseFile, WorkspaceFile } from '@/lib/analyst-case';
import type { CaseDefinition } from '@/lib/case-definition';

export const PORTFOLIO_FORMAT = 'theanalyst.public-portfolio';
export const PORTFOLIO_VERSION = '1.0.0';

export type PortfolioFigureSelection = {
  index: number;
  alt: string;
  caption: string;
};

export type PortfolioPublication = {
  author: string;
  title: string;
  takeaway: string;
  methods: string[];
  recommendation: string;
  limitations: string;
  includeSql: boolean;
  includePython: boolean;
  includeFinalBrief: boolean;
  evidenceIds: string[];
  artifactPaths: string[];
  figures: PortfolioFigureSelection[];
};

export type PortfolioArchive = {
  bytes: Uint8Array;
  filename: string;
  files: string[];
};

export type PortfolioMedia = {
  repositoryPreviewPng?: Uint8Array;
};

export type FieldRecordPublication = {
  title: string;
  role: string;
  assignmentTitle: string;
  author?: string;
  completedOn?: string;
  insight?: string;
  methods: string[];
};

const utf8 = new TextEncoder();

function safeSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 64) || 'analyst-portfolio';
}

function escapeMarkdownInline(value: string) {
  return value.replace(/[\\`*_{}[\]<>]/g, '\\$&').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function htmlParagraphs(value: string) {
  return value.trim().split(/\n\s*\n/).filter(Boolean).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('\n');
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function fileBytes(file: Pick<WorkspaceFile, 'content' | 'encoding'>) {
  if (file.encoding !== 'data-url') return utf8.encode(file.content);
  const comma = file.content.indexOf(',');
  if (comma < 0) return utf8.encode(file.content);
  const metadata = file.content.slice(0, comma);
  const payload = file.content.slice(comma + 1);
  if (!metadata.includes(';base64')) return utf8.encode(decodeURIComponent(payload));
  const decoded = atob(payload);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function safeFilename(path: string, fallback: string) {
  const leaf = path.replace(/\\/g, '/').split('/').pop() ?? fallback;
  return leaf.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^\.+/, '') || fallback;
}

function uniquePath(entries: Record<string, Uint8Array>, directory: string, name: string) {
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : '';
  let candidate = `${directory}/${name}`;
  let suffix = 2;
  while (entries[candidate]) {
    candidate = `${directory}/${stem}-${suffix}${extension}`;
    suffix += 1;
  }
  return candidate;
}

function figureExtension(dataUrl: string) {
  const mime = /^data:([^;,]+)/.exec(dataUrl)?.[1];
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/svg+xml') return 'svg';
  if (mime === 'image/webp') return 'webp';
  return 'png';
}

export function portfolioSourceUrl(definition: CaseDefinition) {
  const configured = definition.publicUrl?.trim();
  if (configured?.startsWith('https://') || configured?.startsWith('http://')) return configured;
  if (configured?.startsWith('/')) return `https://theanalyst.dev${configured}`;
  return `https://theanalyst.dev/assignments/${definition.slug}/`;
}

function buildReadme(
  caseFile: AnalystCaseFile,
  definition: CaseDefinition,
  publication: PortfolioPublication,
  figurePaths: Array<{ path: string; alt: string; caption: string }>,
  artifactPaths: string[],
  previewPath: string,
) {
  const source = portfolioSourceUrl(definition);
  const methods = publication.methods.length
    ? publication.methods.map((method) => `- ${escapeMarkdownInline(method)}`).join('\n')
    : '- Methods intentionally not listed.';
  const author = publication.author.trim() ? `**Analyst:** ${escapeMarkdownInline(publication.author)}  \n` : '';
  const figures = figurePaths.length
    ? [
        '## Selected figures',
        '',
        ...figurePaths.flatMap((figure) => [
          `![${figure.alt.replace(/\]/g, '\\]')}](${figure.path})`,
          '',
          figure.caption ? `*${figure.caption.replace(/\*/g, '\\*')}*` : '',
          '',
        ]),
      ].filter(Boolean).join('\n')
    : '';
  const artifacts = artifactPaths.length
    ? ['## Supporting artifacts', '', ...artifactPaths.map((path) => `- [${path.split('/').pop()}](${path})`)].join('\n')
    : '';

  return [
    `# ${publication.title.trim()}`,
    '',
    `![Repository preview](${previewPath})`,
    '',
    `${author}**Role:** ${escapeMarkdownInline(definition.role)}  `,
    `**Workplace brief:** [${escapeMarkdownInline(caseFile.scenario.title)}](${source})`,
    '',
    '> Independent learner analysis. This repository is not an official solution or certification from The Analyst.',
    '',
    '## Executive takeaway',
    '',
    publication.takeaway.trim(),
    '',
    '## Situation',
    '',
    definition.requestBody,
    '',
    '## Analytical approach',
    '',
    methods,
    '',
    '## Recommendation',
    '',
    publication.recommendation.trim() || '_No public recommendation supplied._',
    '',
    '## Limitations and uncertainty',
    '',
    publication.limitations.trim() || '_No public limitations supplied._',
    '',
    figures,
    artifacts,
    '## Repository guide',
    '',
    '- `src/` — selected analysis worksheets',
    '- `report/` — the public executive brief and selected evidence records',
    '- `figures/` — figures deliberately approved for publication',
    '- `artifacts/` — supporting files deliberately approved for publication',
    '- `docs/` — a self-contained, responsive portfolio page for optional GitHub Pages hosting',
    '- `reproducibility/` — honest execution notes for the browser-based source environment',
    '',
    '## Data and reproducibility',
    '',
    'Raw assignment data is intentionally not included. The original worksheets were written for The Analyst’s in-browser DuckDB and Python runtimes, so they may require adaptation in a standalone environment. See [`reproducibility/README.md`](reproducibility/README.md).',
    '',
    '---',
    '',
    `Scenario source: [The Analyst — ${escapeMarkdownInline(caseFile.scenario.title)}](${source}).`,
  ].filter((line, index, lines) => line !== '' || lines[index - 1] !== '').join('\n').trimEnd() + '\n';
}

function buildPortfolioPage(
  caseFile: AnalystCaseFile,
  definition: CaseDefinition,
  publication: PortfolioPublication,
  figurePaths: Array<{ path: string; alt: string; caption: string }>,
  artifactPaths: string[],
) {
  const figures = figurePaths.length ? `<section class="section" aria-labelledby="figures-title">
      <div class="section-number">04</div>
      <div class="section-body"><p class="eyebrow">SELECTED FIGURES</p><h2 id="figures-title">Evidence at a glance</h2>
        <div class="figure-grid">${figurePaths.map((figure) => `<figure><img src="assets/${figure.path.split('/').pop()}" alt="${escapeHtml(figure.alt)}"><figcaption>${escapeHtml(figure.caption || figure.alt)}</figcaption></figure>`).join('')}</div>
      </div>
    </section>` : '';
  const artifacts = artifactPaths.length ? `<section class="section" aria-labelledby="artifacts-title">
      <div class="section-number">05</div>
      <div class="section-body"><p class="eyebrow">SUPPORTING ARTIFACTS</p><h2 id="artifacts-title">Files selected for public review</h2>
        <ul class="artifact-list">${artifactPaths.map((path) => `<li><a href="artifacts/${encodeURIComponent(path.split('/').pop() ?? '')}">${escapeHtml(path.split('/').pop() ?? path)}</a></li>`).join('')}</ul>
      </div>
    </section>` : '';
  const author = publication.author.trim()
    ? `<span>ANALYST&nbsp;&nbsp;${escapeHtml(publication.author.trim())}</span>`
    : '<span>INDEPENDENT ANALYSIS</span>';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(publication.takeaway.trim())}">
  <title>${escapeHtml(publication.title.trim())}</title>
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>
  <a class="skip-link" href="#main">Skip to analysis</a>
  <header class="system-bar">
    <a href="${portfolioSourceUrl(definition)}">THE ANALYST</a>
    <span>PUBLIC PORTFOLIO / ANALYSIS</span>
  </header>
  <main id="main">
    <section class="hero">
      <div class="hero-meta"><span>${escapeHtml(definition.role).toUpperCase()}</span>${author}</div>
      <h1>${escapeHtml(publication.title.trim())}</h1>
      <p class="takeaway">${escapeHtml(publication.takeaway.trim())}</p>
      <div class="source-line">WORKPLACE BRIEF&nbsp;&nbsp;/&nbsp;&nbsp;<a href="${portfolioSourceUrl(definition)}">${escapeHtml(caseFile.scenario.title)}</a></div>
    </section>
    <aside class="boundary">Independent learner analysis. This is not an official solution, score, certification, or endorsement.</aside>
    <section class="section" aria-labelledby="situation-title">
      <div class="section-number">01</div>
      <div class="section-body"><p class="eyebrow">SITUATION</p><h2 id="situation-title">The decision on the desk</h2>${htmlParagraphs(definition.requestBody)}</div>
    </section>
    <section class="section two-column" aria-label="Recommendation and limitations">
      <div class="section-number">02</div>
      <div class="section-body"><p class="eyebrow">RECOMMENDATION</p><h2>The proposed course of action</h2>${htmlParagraphs(publication.recommendation)}</div>
      <div class="section-body limitation"><p class="eyebrow">LIMITATIONS</p><h2>What the evidence cannot settle</h2>${htmlParagraphs(publication.limitations)}</div>
    </section>
    <section class="section" aria-labelledby="methods-title">
      <div class="section-number">03</div>
      <div class="section-body"><p class="eyebrow">METHODS</p><h2 id="methods-title">How the analysis was approached</h2><ul class="method-list">${publication.methods.map((method) => `<li>${escapeHtml(method)}</li>`).join('')}</ul></div>
    </section>
    ${figures}
    ${artifacts}
  </main>
  <footer><p>Analysis published by the learner. Workplace simulation and source environment by <a href="${portfolioSourceUrl(definition)}">The Analyst</a>.</p><p>Raw assignment data is not included in this portfolio.</p></footer>
</body>
</html>`;
}

function buildPortfolioCss() {
  return `:root{--navy:#102c47;--blue:#3979bb;--ink:#20364c;--muted:#62768a;--line:#c8d2db;--paper:#f2f5f7;--white:#fff;--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;--sans:Inter,Arial,sans-serif;color-scheme:light}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);line-height:1.65}.skip-link{position:fixed;left:12px;top:-60px;z-index:5;background:#fff;padding:10px 14px;color:var(--navy)}.skip-link:focus{top:12px}.system-bar{display:flex;min-height:64px;align-items:center;justify-content:space-between;border-bottom:5px solid var(--blue);background:var(--navy);padding:0 max(28px,calc((100vw - 1080px)/2));color:#b8cde0;font:700 11px var(--mono);letter-spacing:.12em}.system-bar a{color:#fff;text-decoration:none}main,footer{width:min(1080px,calc(100% - 56px));margin-inline:auto}.hero{padding:92px 0 64px}.hero-meta{display:flex;flex-wrap:wrap;gap:12px 36px;color:var(--blue);font:700 11px var(--mono);letter-spacing:.1em}.hero h1{max-width:900px;margin:20px 0 24px;color:var(--navy);font-size:clamp(42px,7vw,78px);line-height:1.02;letter-spacing:-.045em}.takeaway{max-width:890px;margin:0;color:#40566b;font-size:clamp(20px,3vw,29px);line-height:1.4}.source-line{margin-top:36px;color:var(--muted);font:700 10px var(--mono);letter-spacing:.08em}.source-line a{color:var(--blue)}.boundary{border:1px solid #9cabb9;border-left:5px solid var(--blue);background:var(--white);padding:16px 20px;color:#53677a;font:600 11px/1.65 var(--mono)}.section{display:grid;grid-template-columns:76px minmax(0,1fr);border-top:1px solid var(--line);padding:64px 0}.section-number{color:#8b9aaa;font:700 12px var(--mono);letter-spacing:.1em}.section-body{max-width:820px}.eyebrow{margin:0 0 8px!important;color:var(--blue)!important;font:700 10px var(--mono)!important;letter-spacing:.13em}.section h2{margin:0 0 22px;color:var(--navy);font-size:clamp(26px,4vw,40px);line-height:1.15;letter-spacing:-.025em}.section-body>p{margin:0 0 1em;color:#40566b;font-size:17px}.two-column{grid-template-columns:76px 1fr 1fr;gap:0 54px}.limitation{border-left:1px solid var(--line);padding-left:54px}.method-list{display:flex;flex-wrap:wrap;gap:10px;margin:26px 0 0;padding:0;list-style:none}.method-list li{border:1px solid #9fb0bf;background:#fff;padding:9px 13px;color:#304a62;font:700 11px var(--mono);letter-spacing:.035em}.artifact-list{display:grid;gap:9px;margin:24px 0 0;padding:0;list-style:none}.artifact-list a{display:block;border:1px solid #aebbc7;background:#fff;padding:12px 14px;color:var(--blue);font:700 12px var(--mono)}.artifact-list a:hover{background:#e9f0f6}.figure-grid{display:grid;gap:26px}.figure-grid figure{margin:0;border:1px solid var(--line);background:#fff}.figure-grid img{display:block;width:100%;height:auto}.figure-grid figcaption{border-top:1px solid var(--line);padding:14px 18px;color:#52677b;font-size:13px}footer{display:flex;justify-content:space-between;gap:24px;border-top:5px solid var(--navy);padding:28px 0 54px;color:var(--muted);font:600 10px/1.6 var(--mono)}footer p{max-width:520px;margin:0}footer a{color:var(--blue)}@media(max-width:760px){.system-bar{padding-inline:20px}.system-bar span{display:none}main,footer{width:min(100% - 36px,1080px)}.hero{padding:58px 0 44px}.section,.two-column{grid-template-columns:1fr;padding:42px 0}.section-number{margin-bottom:18px}.two-column{gap:42px}.limitation{border-left:0;border-top:1px solid var(--line);padding:42px 0 0}footer{display:block}footer p+ p{margin-top:12px}}@media print{.system-bar{background:#fff;color:var(--ink);border-top:4px solid var(--navy)}.system-bar a{color:var(--navy)}.hero{padding-top:52px}.section{break-inside:avoid}body{background:#fff}}\n`;
}

function wrapPreviewText(value: string, maxCharacters: number, maxLines: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && candidate.length > maxCharacters) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else line = candidate;
  }
  if (line && lines.length < maxLines) {
    const usedWords = lines.join(' ').split(/\s+/).filter(Boolean).length;
    const remainder = words.slice(usedWords).join(' ');
    lines.push(remainder.length > maxCharacters ? `${remainder.slice(0, maxCharacters - 1).trimEnd()}…` : remainder);
  }
  return lines;
}

function buildRepositoryPreview(caseFile: AnalystCaseFile, definition: CaseDefinition, publication: PortfolioPublication) {
  const titleLines = wrapPreviewText(publication.title, 34, 2);
  const takeawayLines = wrapPreviewText(publication.takeaway, 72, 2);
  const methods = publication.methods.slice(0, 4).map((method) => escapeHtml(method.toUpperCase())).join('  /  ');
  const author = publication.author.trim() ? escapeHtml(publication.author.trim().toUpperCase()) : 'INDEPENDENT ANALYSIS';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="640" viewBox="0 0 1280 640" role="img" aria-labelledby="title desc"><title id="title">${escapeHtml(publication.title)}</title><desc id="desc">${escapeHtml(publication.takeaway)}</desc><rect width="1280" height="640" fill="#f2f5f7"/><rect width="1280" height="106" fill="#102c47"/><rect y="106" width="1280" height="7" fill="#3979bb"/><g fill="#fff" font-family="Arial,sans-serif" font-weight="700"><text x="70" y="64" font-size="22" letter-spacing="4">THE ANALYST</text></g><text x="1210" y="63" text-anchor="end" fill="#9fc3e5" font-family="monospace" font-size="15" font-weight="700" letter-spacing="2">PUBLIC PORTFOLIO</text><text x="70" y="165" fill="#3979bb" font-family="monospace" font-size="14" font-weight="700" letter-spacing="2">${escapeHtml(definition.role.toUpperCase())}  /  ${author}</text><g fill="#20364c" font-family="Arial,sans-serif" font-size="60" font-weight="700">${titleLines.map((line, index) => `<text x="70" y="${242 + index * 67}">${escapeHtml(line)}</text>`).join('')}</g><g fill="#4d6276" font-family="Arial,sans-serif" font-size="25">${takeawayLines.map((line, index) => `<text x="70" y="${398 + index * 34}">${escapeHtml(line)}</text>`).join('')}</g><line x1="70" y1="522" x2="1210" y2="522" stroke="#bac6d0"/><text x="70" y="566" fill="#20364c" font-family="monospace" font-size="15" font-weight="700" letter-spacing="1">${methods}</text><text x="70" y="602" fill="#6b7d8e" font-family="monospace" font-size="13" font-weight="700">WORKPLACE BRIEF / ${escapeHtml(caseFile.scenario.title.toUpperCase())}</text><text x="1210" y="590" text-anchor="end" fill="#3979bb" font-family="Arial,sans-serif" font-size="20" font-weight="700">theanalyst.dev</text></svg>`;
}

function buildExecutiveBrief(publication: PortfolioPublication) {
  return [
    `# ${publication.title.trim()} — Executive brief`,
    '',
    '## Executive takeaway',
    '',
    publication.takeaway.trim(),
    '',
    '## Recommendation',
    '',
    publication.recommendation.trim() || '_No public recommendation supplied._',
    '',
    '## Limitations and uncertainty',
    '',
    publication.limitations.trim() || '_No public limitations supplied._',
  ].join('\n').trimEnd() + '\n';
}

function buildReproducibility(definition: CaseDefinition, publication: PortfolioPublication) {
  const source = portfolioSourceUrl(definition);
  const worksheets = [publication.includeSql ? '`src/analysis.sql`' : '', publication.includePython ? '`src/analysis.py`' : ''].filter(Boolean);
  const tableLines = definition.dataFiles.map((file) => `- \`${file.table}\` — ${file.note}`);
  const packages = ['pandas', 'matplotlib', ...definition.pythonPackages];
  return [
    '# Reproducibility notes',
    '',
    '## Source environment',
    '',
    `This analysis originated in [The Analyst assignment workbench](${source}). The workbench executes SQL with DuckDB-Wasm and Python with Pyodide in the learner’s browser. Assignment tables are mounted by the workbench and raw data does not leave the learner’s device.`,
    '',
    '## What this repository can and cannot reproduce',
    '',
    worksheets.length ? `The selected source worksheets (${worksheets.join(' and ')}) are included for review.` : 'No source worksheet was selected for this public portfolio.',
    'They are not claimed to run unchanged outside the workbench: SQL expects the assignment schemas to be mounted, and Python may use The Analyst’s `table()` helper. Raw Parquet files are deliberately excluded from this public package.',
    '',
    'To rerun against the intended data snapshot:',
    '',
    `1. Open the [original assignment](${source}).`,
    '2. Review the assignment data register and its table cautions.',
    '3. Copy the selected worksheet into the corresponding SQL or Python editor.',
    '4. Execute it in the browser and compare the result with the published brief and figures.',
    '',
    'For a standalone environment, obtain data through an authorized source and replace the mounted table references with your own loading layer. Do not treat the package list below as a locked environment.',
    '',
    '## Assignment tables referenced by the environment',
    '',
    ...tableLines,
    '',
    '## Python package families available in the source environment',
    '',
    ...Array.from(new Set(packages)).sort().map((name) => `- ${name}`),
    '',
    `Catalog snapshot recorded by the assignment: ${definition.catalogSnapshot}.`,
  ].join('\n').trimEnd() + '\n';
}

function buildAttribution(caseFile: AnalystCaseFile, definition: CaseDefinition) {
  return [
    '# Attribution and ownership',
    '',
    'The analysis, prose, figures, and selected artifacts in this repository were published by the learner named in the README, if one is given. The learner remains responsible for reviewing the material and choosing an appropriate license before public release.',
    '',
    `The workplace simulation is “${caseFile.scenario.title},” from [The Analyst](${portfolioSourceUrl(definition)}). The scenario context and source-data environment are credited here for provenance; this repository is an independent learner interpretation, not an official solution or endorsement.`,
    '',
    'No license is granted for the learner’s work merely because this export exists. Add a repository license only after deciding how others may reuse the analysis and narrative.',
  ].join('\n') + '\n';
}

function buildPublicationChecklist() {
  return [
    '# Publication checklist',
    '',
    'Complete this review before making the repository public:',
    '',
    '- [ ] I inspected every exported file, including source code and image captions.',
    '- [ ] The repository contains no learner ID, course record, private notes, credentials, employer/client information, or confidential data.',
    '- [ ] I have permission to publish every selected supporting artifact.',
    '- [ ] My claims match the cited evidence and figures.',
    '- [ ] I stated meaningful uncertainty, limitations, and unresolved questions.',
    '- [ ] I removed starter comments or TODOs I do not want employers to see.',
    '- [ ] I selected a license—or intentionally left the work unlicensed.',
    '',
    'This checklist is guidance, not an automated privacy, quality, or correctness review.',
  ].join('\n') + '\n';
}

function evidenceCsv(caseFile: AnalystCaseFile, ids: Set<string>) {
  const selected = caseFile.learnerWorkspace.evidence.filter((record) => ids.has(record.id));
  const rows = selected.map((record, index) => [
    `E-${String(index + 1).padStart(3, '0')}`,
    record.statement,
    record.source,
    record.state,
    record.recordedAt,
  ].map(csvCell).join(','));
  return ['public_evidence_id,statement,source,state,recorded_at', ...rows].join('\n') + '\n';
}

function addWorksheet(entries: Record<string, Uint8Array>, caseFile: AnalystCaseFile, workspacePath: string, publicPath: string) {
  const file = caseFile.learnerWorkspace.files.find((candidate) => candidate.path === workspacePath);
  if (file?.encoding === 'utf-8' && file.content.trim()) entries[publicPath] = utf8.encode(file.content);
}

export function buildPortfolioArchive(
  caseFile: AnalystCaseFile,
  definition: CaseDefinition,
  publication: PortfolioPublication,
  media: PortfolioMedia = {},
): PortfolioArchive {
  if (!publication.title.trim()) throw new Error('Add a public portfolio title.');
  if (!publication.takeaway.trim()) throw new Error('Add a one-sentence executive takeaway.');
  if (!publication.methods.some((method) => method.trim())) throw new Error('List at least one method you used.');

  const entries: Record<string, Uint8Array> = {};
  if (publication.includeSql) addWorksheet(entries, caseFile, 'workspace/query_01.sql', 'src/analysis.sql');
  if (publication.includePython) addWorksheet(entries, caseFile, 'workspace/analysis_01.py', 'src/analysis.py');

  const selectedArtifactPaths = new Set(publication.artifactPaths);
  const exportedArtifacts: string[] = [];
  for (const file of caseFile.learnerWorkspace.files) {
    if (!selectedArtifactPaths.has(file.path) || !file.requiredArtifactLabel || !file.content) continue;
    const filename = safeFilename(file.path, 'supporting-artifact');
    const path = uniquePath(entries, 'artifacts', filename);
    const bytes = fileBytes(file);
    entries[path] = bytes;
    entries[`docs/${path}`] = bytes;
    exportedArtifacts.push(path);
  }

  const latestFigures = caseFile.capturedRuns.python?.codeMatchesExportedWorkspace
    ? caseFile.capturedRuns.python.figures
    : [];
  const exportedFigures: Array<{ path: string; alt: string; caption: string }> = [];
  for (const selected of publication.figures) {
    const figure = latestFigures[selected.index];
    if (!figure?.startsWith('data:image/')) continue;
    const path = `figures/figure-${String(exportedFigures.length + 1).padStart(2, '0')}.${figureExtension(figure)}`;
    const bytes = fileBytes({ content: figure, encoding: 'data-url' });
    entries[path] = bytes;
    entries[`docs/assets/${path.split('/').pop()}`] = bytes;
    exportedFigures.push({
      path,
      alt: selected.alt.trim() || `Analysis figure ${exportedFigures.length + 1}`,
      caption: selected.caption.trim(),
    });
  }

  const selectedEvidence = new Set(publication.evidenceIds);
  entries['report/executive-brief.md'] = strToU8(buildExecutiveBrief(publication));
  entries['report/evidence-register.csv'] = strToU8(evidenceCsv(caseFile, selectedEvidence));
  if (publication.includeFinalBrief) {
    const finalBrief = caseFile.learnerWorkspace.files.find((file) => file.path === 'workspace/final_brief.md');
    if (finalBrief?.encoding === 'utf-8' && finalBrief.content.trim()) {
      entries['report/original-handoff-brief.md'] = strToU8(finalBrief.content.trimEnd() + '\n');
    }
  }

  if (media.repositoryPreviewPng) {
    entries['repository-preview.png'] = media.repositoryPreviewPng;
    entries['docs/assets/repository-preview.png'] = media.repositoryPreviewPng;
  }
  const previewPath = media.repositoryPreviewPng ? 'repository-preview.png' : 'docs/assets/repository-preview.svg';
  entries['README.md'] = strToU8(buildReadme(caseFile, definition, publication, exportedFigures, exportedArtifacts, previewPath));
  entries['docs/index.html'] = strToU8(buildPortfolioPage(caseFile, definition, publication, exportedFigures, exportedArtifacts));
  entries['docs/assets/style.css'] = strToU8(buildPortfolioCss());
  entries['docs/assets/repository-preview.svg'] = strToU8(buildRepositoryPreview(caseFile, definition, publication));
  entries['reproducibility/README.md'] = strToU8(buildReproducibility(definition, publication));
  entries['ATTRIBUTION.md'] = strToU8(buildAttribution(caseFile, definition));
  entries['PUBLICATION_CHECKLIST.md'] = strToU8(buildPublicationChecklist());
  entries['.gitignore'] = strToU8([
    '.DS_Store',
    '*.analystcase',
    '.env',
    '.env.*',
    '.venv/',
    '__pycache__/',
    '*.py[cod]',
    'data/',
    '*.parquet',
  ].join('\n') + '\n');

  const generatedAt = new Date().toISOString();
  const manifest = {
    format: PORTFOLIO_FORMAT,
    version: PORTFOLIO_VERSION,
    generatedAt,
    publicAuthor: publication.author.trim() || null,
    portfolioTitle: publication.title.trim(),
    sourceAssignment: {
      title: caseFile.scenario.title,
      slug: caseFile.scenario.slug,
      revision: caseFile.scenario.revision,
      catalogSnapshot: caseFile.scenario.catalogSnapshot,
      url: portfolioSourceUrl(definition),
    },
    selectedContent: {
      sql: Boolean(entries['src/analysis.sql']),
      python: Boolean(entries['src/analysis.py']),
      originalHandoffBrief: Boolean(entries['report/original-handoff-brief.md']),
      evidenceRecords: caseFile.learnerWorkspace.evidence.filter((record) => selectedEvidence.has(record.id)).length,
      figures: exportedFigures.map(({ path, alt, caption }) => ({ path, alt, caption })),
      artifacts: exportedArtifacts,
      repositoryPreview: media.repositoryPreviewPng ? 'repository-preview.png' : 'docs/assets/repository-preview.svg',
    },
    privacyBoundary: 'No learner record identity, course metadata, scratch notes, raw assignment data, captured run history, run errors, or unselected files were included by the exporter.',
    verificationBoundary: 'The learner selected this material for publication. The export does not certify analytical quality, correctness, originality, privacy, or standalone reproducibility.',
  };
  entries['portfolio-manifest.json'] = strToU8(JSON.stringify(manifest, null, 2) + '\n');

  const names = Object.keys(entries).sort();
  const bytes = new Uint8Array(zipSync(entries, { level: 6 }));
  return { bytes, filename: `${safeSlug(publication.title)}-portfolio.zip`, files: names };
}

export function downloadPortfolioArchive(archive: PortfolioArchive) {
  const url = URL.createObjectURL(new Blob([archive.bytes.buffer as ArrayBuffer], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = archive.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function canvasLines(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawTrackedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  let cursor = x;
  for (const character of text) {
    context.fillText(character, cursor, y);
    cursor += context.measureText(character).width + spacing;
  }
}

export async function buildFieldRecordPng(publication: FieldRecordPublication) {
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not create the field record image.');

  const navy = '#102c47';
  const blue = '#3979bb';
  const paper = '#f3f6f8';
  const ink = '#20364c';
  const muted = '#63778b';

  context.fillStyle = paper;
  context.fillRect(0, 0, 1200, 630);
  context.fillStyle = navy;
  context.fillRect(0, 0, 1200, 104);
  context.fillStyle = blue;
  context.fillRect(0, 104, 1200, 7);
  context.strokeStyle = '#cad3dc';
  context.lineWidth = 1;
  for (let x = 64; x < 1160; x += 72) {
    context.beginPath();
    context.moveTo(x, 111);
    context.lineTo(x, 590);
    context.stroke();
  }

  context.fillStyle = '#ffffff';
  context.font = '700 20px ui-monospace, SFMono-Regular, Menlo, monospace';
  drawTrackedText(context, 'THE ANALYST', 64, 62, 2.4);
  context.fillStyle = '#9cc1e5';
  context.font = '700 14px ui-monospace, SFMono-Regular, Menlo, monospace';
  drawTrackedText(context, 'ANALYTICAL FIELD RECORD', 790, 61, 1.4);

  context.fillStyle = muted;
  context.font = '700 14px ui-monospace, SFMono-Regular, Menlo, monospace';
  drawTrackedText(context, 'LEARNER-DECLARED COMPLETION / INDEPENDENT ANALYSIS', 64, 154, 1.1);

  context.fillStyle = ink;
  context.font = '700 49px Arial, sans-serif';
  const titleLines = canvasLines(context, publication.title, 1020).slice(0, 2);
  titleLines.forEach((line, index) => context.fillText(line, 64, 220 + index * 57));
  let y = 220 + titleLines.length * 57 + 21;

  context.fillStyle = blue;
  context.font = '700 20px Arial, sans-serif';
  context.fillText(publication.role, 64, y);
  y += 43;

  context.fillStyle = muted;
  context.font = '600 16px ui-monospace, SFMono-Regular, Menlo, monospace';
  context.fillText(`WORKPLACE BRIEF / ${publication.assignmentTitle.toUpperCase()}`, 64, y);
  y += 42;

  if (publication.insight?.trim()) {
    context.fillStyle = ink;
    context.font = '400 23px Arial, sans-serif';
    const insightLines = canvasLines(context, publication.insight, 1000).slice(0, 2);
    insightLines.forEach((line, index) => context.fillText(line, 64, y + index * 31));
  }

  context.fillStyle = navy;
  context.fillRect(64, 525, 1072, 1);
  context.fillStyle = ink;
  context.font = '700 16px ui-monospace, SFMono-Regular, Menlo, monospace';
  const who = publication.author?.trim() || 'INDEPENDENT ANALYST';
  context.fillText(who.toUpperCase(), 64, 564);
  context.fillStyle = muted;
  context.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace';
  const detail = [publication.methods.join(' + '), publication.completedOn].filter(Boolean).join(' / ');
  context.fillText(detail.toUpperCase(), 64, 590);
  context.textAlign = 'right';
  context.fillStyle = blue;
  context.font = '700 17px Arial, sans-serif';
  context.fillText('theanalyst.dev', 1136, 578);
  context.textAlign = 'left';

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The field record image could not be encoded.')), 'image/png');
  });
}

export async function buildRepositoryPreviewPng(
  caseFile: AnalystCaseFile,
  definition: CaseDefinition,
  publication: Pick<PortfolioPublication, 'author' | 'title' | 'takeaway' | 'methods'>,
) {
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 640;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not create the repository preview image.');

  context.fillStyle = '#f2f5f7';
  context.fillRect(0, 0, 1280, 640);
  context.fillStyle = '#102c47';
  context.fillRect(0, 0, 1280, 106);
  context.fillStyle = '#3979bb';
  context.fillRect(0, 106, 1280, 7);
  context.fillStyle = '#ffffff';
  context.font = '700 22px ui-monospace, SFMono-Regular, Menlo, monospace';
  drawTrackedText(context, 'THE ANALYST', 70, 64, 3.5);
  context.textAlign = 'right';
  context.fillStyle = '#9fc3e5';
  context.font = '700 15px ui-monospace, SFMono-Regular, Menlo, monospace';
  context.fillText('PUBLIC PORTFOLIO', 1210, 63);
  context.textAlign = 'left';

  context.fillStyle = '#3979bb';
  context.font = '700 14px ui-monospace, SFMono-Regular, Menlo, monospace';
  const analyst = publication.author.trim() || 'Independent analysis';
  context.fillText(`${definition.role.toUpperCase()}  /  ${analyst.toUpperCase()}`, 70, 165);
  context.fillStyle = '#20364c';
  context.font = '700 60px Arial, sans-serif';
  const titleLines = canvasLines(context, publication.title, 1120).slice(0, 2);
  titleLines.forEach((line, index) => context.fillText(line, 70, 242 + index * 67));
  context.fillStyle = '#4d6276';
  context.font = '400 25px Arial, sans-serif';
  const takeawayLines = canvasLines(context, publication.takeaway, 1120).slice(0, 2);
  takeawayLines.forEach((line, index) => context.fillText(line, 70, 398 + index * 34));
  context.strokeStyle = '#bac6d0';
  context.beginPath();
  context.moveTo(70, 522);
  context.lineTo(1210, 522);
  context.stroke();
  context.fillStyle = '#20364c';
  context.font = '700 15px ui-monospace, SFMono-Regular, Menlo, monospace';
  context.fillText(publication.methods.slice(0, 4).map((method) => method.toUpperCase()).join('  /  '), 70, 566);
  context.fillStyle = '#6b7d8e';
  context.font = '700 13px ui-monospace, SFMono-Regular, Menlo, monospace';
  context.fillText(`WORKPLACE BRIEF / ${caseFile.scenario.title.toUpperCase()}`, 70, 602);
  context.textAlign = 'right';
  context.fillStyle = '#3979bb';
  context.font = '700 20px Arial, sans-serif';
  context.fillText('theanalyst.dev', 1210, 590);
  context.textAlign = 'left';

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The repository preview image could not be encoded.')), 'image/png');
  });
}

export function downloadFieldRecord(blob: Blob, title: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeSlug(title)}-field-record.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
