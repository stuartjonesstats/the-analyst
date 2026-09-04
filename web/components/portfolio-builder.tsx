'use client';

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import Image from 'next/image';
import {
  Archive,
  Check,
  Download,
  ExternalLink,
  FileCode2,
  FileImage,
  Files,
  FolderGit2,
  LockKeyhole,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AnalystCaseFile, WorkspaceFile } from '@/lib/analyst-case';
import { trackPublicEvent } from '@/lib/analytics';
import type { CaseDefinition } from '@/lib/case-definition';
import {
  buildFieldRecordPng,
  buildPortfolioArchive,
  buildRepositoryPreviewPng,
  downloadFieldRecord,
  downloadPortfolioArchive,
  portfolioSourceUrl,
  type PortfolioFigureSelection,
} from '@/lib/portfolio-export';

type PortfolioBuilderProps = {
  caseFile: AnalystCaseFile;
  definition: CaseDefinition;
  onClose: () => void;
};

type FigureDraft = PortfolioFigureSelection & { selected: boolean };

const fieldClass = 'mt-1.5 w-full rounded-[3px] border border-[#aebbc8] bg-white px-3 py-2.5 text-[13px] text-[#20364c] outline-none placeholder:text-[#8391a0] focus:border-[#3979bb] focus:ring-2 focus:ring-[#3979bb]/20';
const labelClass = 'block font-mono text-[9px] font-bold tracking-[0.08em] text-[#526a81]';
const panelClass = 'border border-[#bcc7d2] bg-white';

function checkboxClass(selected: boolean) {
  return `grid size-[18px] shrink-0 place-items-center rounded-[2px] border ${selected ? 'border-[#286da8] bg-[#286da8] text-white' : 'border-[#9dabb9] bg-white text-transparent'}`;
}

function isDataLike(file: WorkspaceFile) {
  return /\.(csv|tsv|jsonl?|parquet|xlsx?|db|sqlite)$/i.test(file.path)
    || ['text/csv', 'application/json', 'application/vnd.apache.parquet'].includes(file.mimeType);
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function repoSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 64) || 'analyst-portfolio';
}

function canShareFile(blob: Blob | null, filename: string) {
  if (!blob || typeof navigator === 'undefined' || typeof navigator.share !== 'function'
    || typeof navigator.canShare !== 'function' || typeof File === 'undefined') return false;
  try {
    return navigator.canShare({ files: [new File([blob], filename, { type: 'image/png' })] });
  } catch {
    return false;
  }
}

export function PortfolioBuilder({ caseFile, definition, onClose }: PortfolioBuilderProps) {
  const sqlFile = caseFile.learnerWorkspace.files.find((file) => file.path === 'workspace/query_01.sql');
  const pythonFile = caseFile.learnerWorkspace.files.find((file) => file.path === 'workspace/analysis_01.py');
  const finalBriefFile = caseFile.learnerWorkspace.files.find((file) => file.path === 'workspace/final_brief.md');
  const artifactCandidates = useMemo(() => caseFile.learnerWorkspace.files.filter((file) =>
    Boolean(file.requiredArtifactLabel && file.content.length > 0),
  ), [caseFile]);
  const figuresAvailable = Boolean(caseFile.capturedRuns.python?.codeMatchesExportedWorkspace);
  const latestFigures = figuresAvailable ? caseFile.capturedRuns.python?.figures ?? [] : [];

  const [author, setAuthor] = useState('');
  const [title, setTitle] = useState(`${caseFile.scenario.title}: independent analysis`);
  const [takeaway, setTakeaway] = useState('');
  const [methodsText, setMethodsText] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [limitations, setLimitations] = useState('');
  const [includeSql, setIncludeSql] = useState(Boolean(sqlFile?.content.trim()));
  const [includePython, setIncludePython] = useState(Boolean(pythonFile?.content.trim()));
  const [includeFinalBrief, setIncludeFinalBrief] = useState(false);
  const [selectedArtifacts, setSelectedArtifacts] = useState<Set<string>>(new Set());
  const [selectedEvidence, setSelectedEvidence] = useState<Set<string>>(new Set());
  const [figureDrafts, setFigureDrafts] = useState<FigureDraft[]>(() => latestFigures.map((_, index) => ({
    index,
    selected: false,
    alt: '',
    caption: '',
  })));
  const [approvedForPublication, setApprovedForPublication] = useState(false);
  const [downloadedSignature, setDownloadedSignature] = useState('');
  const [repositoryPreviewIncluded, setRepositoryPreviewIncluded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldRecordEnabled, setFieldRecordEnabled] = useState(false);
  const [fieldRecordName, setFieldRecordName] = useState(false);
  const [fieldRecordDate, setFieldRecordDate] = useState(false);
  const [fieldRecordInsight, setFieldRecordInsight] = useState(false);
  const [completedOn, setCompletedOn] = useState(new Date().toISOString().slice(0, 10));
  const [fieldRecordAsset, setFieldRecordAsset] = useState<{ blob: Blob; signature: string } | null>(null);
  const [shareStatus, setShareStatus] = useState('');

  const methods = methodsText.split('\n').map((line) => line.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
  const canExport = Boolean(
    approvedForPublication
    && title.trim()
    && takeaway.trim()
    && recommendation.trim()
    && limitations.trim()
    && methods.length,
  );
  const portfolioSignature = JSON.stringify([
    author, title, takeaway, methodsText, recommendation, limitations,
    includeSql, includePython, includeFinalBrief,
    [...selectedEvidence].sort(), [...selectedArtifacts].sort(), figureDrafts,
  ]);
  const downloaded = downloadedSignature === portfolioSignature;
  const assignmentUrl = portfolioSourceUrl(definition);
  const fieldRecordFilename = `${repoSlug(title)}-field-record.png`;
  const fieldRecordSignature = JSON.stringify([
    author, completedOn, fieldRecordDate, fieldRecordInsight, fieldRecordName,
    includePython, includeSql, takeaway, title,
  ]);
  const fieldRecordBlob = fieldRecordAsset?.signature === fieldRecordSignature ? fieldRecordAsset.blob : null;
  const fieldRecordDownloaded = Boolean(fieldRecordBlob);
  const completionCaption = [
    `I completed “${caseFile.scenario.title}” as the ${definition.role}.`,
    fieldRecordInsight ? takeaway.trim() : '',
    `I worked through the evidence in ${[includeSql ? 'SQL' : '', includePython ? 'Python' : ''].filter(Boolean).join(' and ') || 'an analytical workbench'}.`,
    `Try the workplace brief: ${assignmentUrl}`,
  ].filter(Boolean).join('\n\n');
  const nativeFileShareAvailable = canShareFile(fieldRecordBlob, fieldRecordFilename);

  function toggleSet(setter: Dispatch<SetStateAction<Set<string>>>, value: string) {
    setter((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function updateFigure(index: number, update: Partial<FigureDraft>) {
    setFigureDrafts((current) => current.map((figure) => figure.index === index ? { ...figure, ...update } : figure));
  }

  async function exportPortfolio() {
    setExporting(true);
    setError(null);
    try {
      let repositoryPreviewPng: Uint8Array | undefined;
      try {
        const preview = await buildRepositoryPreviewPng(caseFile, definition, { author, title, takeaway, methods });
        repositoryPreviewPng = new Uint8Array(await preview.arrayBuffer());
      } catch {
        // The archive retains a deterministic SVG preview if this browser cannot encode PNG.
      }
      const archive = buildPortfolioArchive(caseFile, definition, {
        author,
        title,
        takeaway,
        methods,
        recommendation,
        limitations,
        includeSql,
        includePython,
        includeFinalBrief,
        evidenceIds: [...selectedEvidence],
        artifactPaths: [...selectedArtifacts],
        figures: figureDrafts.filter((figure) => figure.selected).map(({ index, alt, caption }) => ({ index, alt, caption })),
      }, { repositoryPreviewPng });
      downloadPortfolioArchive(archive);
      trackPublicEvent('portfolio_kit_downloaded', { content_id: caseFile.scenario.id });
      setRepositoryPreviewIncluded(Boolean(repositoryPreviewPng));
      setDownloadedSignature(portfolioSignature);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The public portfolio package could not be built.');
    } finally {
      setExporting(false);
    }
  }

  async function exportFieldRecord() {
    if (!fieldRecordEnabled || !approvedForPublication) return;
    setExporting(true);
    setError(null);
    try {
      const cardMethods = [includeSql ? 'SQL' : '', includePython ? 'PYTHON' : ''].filter(Boolean);
      const blob = await buildFieldRecordPng({
        title,
        role: definition.role,
        assignmentTitle: caseFile.scenario.title,
        author: fieldRecordName ? author : '',
        completedOn: fieldRecordDate ? completedOn : '',
        insight: fieldRecordInsight ? takeaway : '',
        methods: cardMethods.length ? cardMethods : ['ANALYSIS'],
      });
      downloadFieldRecord(blob, title);
      trackPublicEvent('field_record_downloaded', { content_id: caseFile.scenario.id });
      setFieldRecordAsset({ blob, signature: fieldRecordSignature });
      setShareStatus('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The analytical field record could not be created.');
    } finally {
      setExporting(false);
    }
  }

  async function copyCompletionCaption() {
    try {
      await navigator.clipboard.writeText(completionCaption);
      trackPublicEvent('share_caption_copied', { content_kind: 'completion', content_id: caseFile.scenario.id });
      setShareStatus('Completion caption copied.');
    } catch {
      setShareStatus('Copy was blocked by the browser. Select and copy the caption from the preview instead.');
    }
  }

  async function shareFieldRecord() {
    if (!fieldRecordBlob || !nativeFileShareAvailable) return;
    try {
      const file = new File([fieldRecordBlob], fieldRecordFilename, { type: 'image/png' });
      trackPublicEvent('share_intent_opened', { content_kind: 'completion', content_id: caseFile.scenario.id, method: 'native' });
      await navigator.share({ files: [file], title, text: completionCaption });
      setShareStatus('Field record passed to your device share menu.');
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setShareStatus('The device share menu could not accept the image. The downloaded PNG is still ready to attach manually.');
    }
  }

  const githubNewUrl = `https://github.com/new?name=${encodeURIComponent(repoSlug(title))}&description=${encodeURIComponent(takeaway.trim())}`;

  return <Dialog open onOpenChange={(open) => { if (!open && !exporting) onClose(); }}>
    <DialogContent
      showCloseButton={!exporting}
      className="h-[calc(100vh-28px)] max-h-[calc(100vh-28px)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-[5px] border border-[#718499] bg-[#edf1f5] p-0 text-[#26394f] shadow-2xl sm:max-w-[980px]"
    >
      <DialogHeader className="gap-1 border-b border-[#536d88] bg-[#15314f] px-6 py-4 text-white">
        <span className="font-mono text-[9px] font-bold tracking-[0.12em] text-[#94b9dc]">PUBLICATION DESK / GITHUB PORTFOLIO</span>
        <DialogTitle className="text-[21px] font-semibold tracking-[-0.02em]">Build a portfolio repository you would be comfortable publishing.</DialogTitle>
        <DialogDescription className="max-w-[780px] text-[11px] leading-5 text-[#d3e0eb]">
          Choose the public story and every supporting file. Your private submission remains separate and is never placed in this package.
        </DialogDescription>
      </DialogHeader>

      <div className="min-h-0 overflow-y-auto p-5">
        <aside className="mb-4 grid grid-cols-[36px_1fr] gap-3 border border-[#b8c5d0] bg-[#f8fafb] p-3 text-[10px] leading-5 text-[#53677a]" role="note">
          <LockKeyhole className="mt-0.5 size-5 text-[#3979bb]" aria-hidden="true" />
          <p><strong className="text-[#2a435b]">PRIVATE BY DEFAULT.</strong> Learner ID, course and section, team, attempt number, scratch notes, raw assignment data, run history, errors, stale output, and every unselected file stay out. Review source code for credentials or personal details before publishing.</p>
        </aside>

        <section className={panelClass} aria-labelledby="portfolio-story-title">
          <div className="flex items-center justify-between border-b border-[#c6d0da] bg-[#e4eaf0] px-3 py-2 font-mono text-[9px] font-bold tracking-[0.08em] text-[#36516d]">
            <span id="portfolio-story-title">01 / PUBLIC STORY</span><span>REQUIRED FIELDS</span>
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <label className={labelClass}>PUBLIC AUTHOR / OPTIONAL
              <input className={fieldClass} value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Name, pseudonym, or leave blank" autoComplete="name" />
            </label>
            <label className={labelClass}>PORTFOLIO TITLE
              <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={110} />
            </label>
            <label className={`${labelClass} md:col-span-2`}>ONE-SENTENCE EXECUTIVE TAKEAWAY
              <textarea className={`${fieldClass} min-h-20 resize-y`} value={takeaway} onChange={(event) => setTakeaway(event.target.value)} maxLength={360} placeholder="State the decision-relevant finding in your own words." />
            </label>
            <label className={labelClass}>METHODS / ONE PER LINE
              <textarea className={`${fieldClass} min-h-32 resize-y`} value={methodsText} onChange={(event) => setMethodsText(event.target.value)} placeholder={'SQL reconciliation\nCoverage analysis\nPython visualization'} />
            </label>
            <div className="grid gap-4">
              <label className={labelClass}>RECOMMENDATION
                <textarea className={`${fieldClass} min-h-14 resize-y`} value={recommendation} onChange={(event) => setRecommendation(event.target.value)} placeholder="What should the decision-maker do?" />
              </label>
              <label className={labelClass}>LIMITATIONS AND UNCERTAINTY
                <textarea className={`${fieldClass} min-h-14 resize-y`} value={limitations} onChange={(event) => setLimitations(event.target.value)} placeholder="What can this analysis not establish?" />
              </label>
            </div>
          </div>
        </section>

        <section className={`${panelClass} mt-4`} aria-labelledby="portfolio-source-title">
          <div className="flex items-center justify-between border-b border-[#c6d0da] bg-[#e4eaf0] px-3 py-2 font-mono text-[9px] font-bold tracking-[0.08em] text-[#36516d]">
            <span id="portfolio-source-title">02 / SOURCE AND REPORT</span><span>REVIEW EACH ITEM</span>
          </div>
          <div className="grid divide-y divide-[#d5dde4] md:grid-cols-2 md:divide-x md:divide-y-0">
            <div className="p-4">
              <p className="mb-3 text-[11px] leading-5 text-[#596c7e]">Source worksheets are included by default because they are the core portfolio evidence. Turn either off if it is not ready for public review.</p>
              <button type="button" className="flex w-full items-center gap-3 border-t border-[#d8dfe6] py-3 text-left" onClick={() => setIncludeSql((value) => !value)} disabled={!sqlFile?.content.trim()}>
                <span className={checkboxClass(includeSql)}><Check className="size-3" /></span><FileCode2 className="size-4 text-[#3979bb]" /><span className="text-[11px] font-semibold">SQL worksheet<small className="block font-normal text-[#708194]">src/analysis.sql</small></span>
              </button>
              <button type="button" className="flex w-full items-center gap-3 border-t border-[#d8dfe6] py-3 text-left" onClick={() => setIncludePython((value) => !value)} disabled={!pythonFile?.content.trim()}>
                <span className={checkboxClass(includePython)}><Check className="size-3" /></span><FileCode2 className="size-4 text-[#3979bb]" /><span className="text-[11px] font-semibold">Python worksheet<small className="block font-normal text-[#708194]">src/analysis.py</small></span>
              </button>
              <button type="button" className="flex w-full items-center gap-3 border-y border-[#d8dfe6] py-3 text-left" onClick={() => setIncludeFinalBrief((value) => !value)} disabled={!finalBriefFile?.content.trim()}>
                <span className={checkboxClass(includeFinalBrief)}><Check className="size-3" /></span><Files className="size-4 text-[#3979bb]" /><span className="text-[11px] font-semibold">Original final handoff brief<small className="block font-normal text-[#708194]">Off by default / may duplicate public summary</small></span>
              </button>
            </div>
            <div className="p-4">
              <p className="mb-2 font-mono text-[9px] font-bold tracking-[0.08em] text-[#526a81]">PUBLIC EVIDENCE RECORDS / {selectedEvidence.size} SELECTED</p>
              <p className="mb-3 text-[10px] leading-4 text-[#66798c]">Only the claim, source label, state, and timestamp are exported. Internal run IDs and hashes stay private.</p>
              <div className="max-h-52 overflow-y-auto border-y border-[#d8dfe6]">
                {caseFile.learnerWorkspace.evidence.length ? caseFile.learnerWorkspace.evidence.map((record) => <button key={record.id} type="button" className="flex w-full items-start gap-3 border-b border-[#e0e6eb] px-1 py-3 text-left last:border-0" onClick={() => toggleSet(setSelectedEvidence, record.id)}>
                  <span className={checkboxClass(selectedEvidence.has(record.id))}><Check className="size-3" /></span>
                  <span className="text-[10px] leading-4 text-[#344b61]">{record.statement}<small className="mt-0.5 block font-mono text-[8px] text-[#75869a]">{record.source} / {record.state.toUpperCase()}</small></span>
                </button>) : <p className="py-5 text-center text-[10px] text-[#708194]">No evidence records available.</p>}
              </div>
            </div>
          </div>
        </section>

        <section className={`${panelClass} mt-4`} aria-labelledby="portfolio-figure-title">
          <div className="flex items-center justify-between border-b border-[#c6d0da] bg-[#e4eaf0] px-3 py-2 font-mono text-[9px] font-bold tracking-[0.08em] text-[#36516d]">
            <span id="portfolio-figure-title">03 / FIGURES</span><span>{figureDrafts.filter((figure) => figure.selected).length} SELECTED</span>
          </div>
          {!figuresAvailable && caseFile.capturedRuns.python?.figures.length ? <p className="border-l-4 border-[#b4752d] bg-[#fff8ec] p-4 text-[10px] leading-5 text-[#755126]">The captured Python figures precede later worksheet edits. They are stale and cannot be selected. Run the current Python worksheet again to publish current figures.</p> : null}
          {!latestFigures.length && !(caseFile.capturedRuns.python?.figures.length) ? <p className="p-4 text-[10px] text-[#66798c]">No current Python figures are available. The portfolio remains complete without them.</p> : null}
          <div className="grid gap-4 p-4 md:grid-cols-2">
            {latestFigures.map((src, index) => { const draft = figureDrafts[index]; return <article key={index} className="border border-[#c8d1da] bg-[#f7f9fa]">
              <button type="button" className="flex w-full items-center gap-3 border-b border-[#c8d1da] bg-white p-3 text-left" onClick={() => updateFigure(index, { selected: !draft.selected })}>
                <span className={checkboxClass(draft.selected)}><Check className="size-3" /></span><FileImage className="size-4 text-[#3979bb]" /><span className="font-mono text-[9px] font-bold">FIGURE {String(index + 1).padStart(2, '0')}</span>
              </button>
              <Image src={src} alt="Private preview of a generated analysis figure" width={560} height={300} unoptimized className="h-40 w-full bg-white object-contain" />
              {draft.selected && <div className="grid gap-3 border-t border-[#c8d1da] p-3">
                <label className={labelClass}>ACCESSIBLE ALT TEXT<input className={fieldClass} value={draft.alt} onChange={(event) => updateFigure(index, { alt: event.target.value })} placeholder="Describe what the chart shows without interpreting beyond the evidence." /></label>
                <label className={labelClass}>PUBLIC CAPTION<input className={fieldClass} value={draft.caption} onChange={(event) => updateFigure(index, { caption: event.target.value })} placeholder="A concise, decision-relevant caption." /></label>
              </div>}
            </article>; })}
          </div>
        </section>

        <section className={`${panelClass} mt-4`} aria-labelledby="portfolio-artifact-title">
          <div className="flex items-center justify-between border-b border-[#c6d0da] bg-[#e4eaf0] px-3 py-2 font-mono text-[9px] font-bold tracking-[0.08em] text-[#36516d]">
            <span id="portfolio-artifact-title">04 / SUPPORTING ARTIFACTS</span><span>{selectedArtifacts.size} SELECTED</span>
          </div>
          <p className="border-b border-[#d6dee5] px-4 py-3 text-[10px] leading-5 text-[#66798c]">Every attached artifact is excluded until you select it. Inspect data-like and uploaded files especially carefully; the exporter cannot identify confidential content.</p>
          <div className="grid md:grid-cols-2">
            {artifactCandidates.map((file) => <button key={file.path} type="button" className="flex min-h-16 items-start gap-3 border-b border-r border-[#d6dee5] p-3 text-left" onClick={() => toggleSet(setSelectedArtifacts, file.path)}>
              <span className={checkboxClass(selectedArtifacts.has(file.path))}><Check className="size-3" /></span>
              <Archive className="size-4 text-[#3979bb]" />
              <span className="min-w-0 text-[10px] font-semibold text-[#344b61]"><span className="block truncate">{file.requiredArtifactLabel}</span><small className="block truncate font-mono font-normal text-[#75869a]">{file.path} / {fileSize(file.sizeBytes)}</small>{isDataLike(file) && <b className="mt-1 inline-block bg-[#f6e4c9] px-1.5 py-0.5 font-mono text-[7px] text-[#7b5221]">DATA-LIKE FILE / REVIEW CONTENT</b>}</span>
            </button>)}
            {!artifactCandidates.length && <p className="p-4 text-[10px] text-[#66798c]">No bound handoff artifacts are available.</p>}
          </div>
        </section>

        <section className={`${panelClass} mt-4`} aria-labelledby="field-record-title">
          <div className="flex items-center justify-between border-b border-[#c6d0da] bg-[#e4eaf0] px-3 py-2 font-mono text-[9px] font-bold tracking-[0.08em] text-[#36516d]">
            <span id="field-record-title">05 / ANALYTICAL FIELD RECORD</span><span>OPTIONAL PNG</span>
          </div>
          <div className="p-4">
            <button type="button" className="flex w-full items-start gap-3 text-left" onClick={() => setFieldRecordEnabled((value) => !value)}>
              <span className={checkboxClass(fieldRecordEnabled)}><Check className="size-3" /></span>
              <span className="text-[11px] font-semibold text-[#344b61]">Prepare a learner-declared completion image<small className="mt-1 block max-w-[720px] font-normal leading-5 text-[#66798c]">This is a downloadable image for a social post, not a hosted link preview, score, certificate, or verification. Nothing is included until you opt in below.</small></span>
            </button>
            {fieldRecordEnabled && <div className="mt-4 grid gap-3 border-t border-[#d6dee5] pt-4 md:grid-cols-3">
              <button type="button" className="flex items-start gap-2 text-left text-[10px]" onClick={() => setFieldRecordName((value) => !value)}><span className={checkboxClass(fieldRecordName)}><Check className="size-3" /></span><span>Show public author<small className="block text-[#75869a]">Uses the optional name above</small></span></button>
              <button type="button" className="flex items-start gap-2 text-left text-[10px]" onClick={() => setFieldRecordInsight((value) => !value)}><span className={checkboxClass(fieldRecordInsight)}><Check className="size-3" /></span><span>Show takeaway<small className="block text-[#75869a]">Publishes the sentence above</small></span></button>
              <div><button type="button" className="flex items-start gap-2 text-left text-[10px]" onClick={() => setFieldRecordDate((value) => !value)}><span className={checkboxClass(fieldRecordDate)}><Check className="size-3" /></span><span>Show completion date</span></button>{fieldRecordDate && <input type="date" className={`${fieldClass} mt-2`} value={completedOn} onChange={(event) => setCompletedOn(event.target.value)} />}</div>
            </div>}
            {fieldRecordEnabled && fieldRecordDownloaded && <div className="mt-4 border-t border-[#d6dee5] pt-4">
              <p className="text-[10px] leading-5 text-[#53677a]">Your PNG was downloaded. LinkedIn opens a composer for the assignment link; attach the downloaded image there yourself. The site does not upload the card.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => void copyCompletionCaption()} className="border border-[#8193a5] bg-white px-3 py-2 font-mono text-[8px] font-bold text-[#315673] hover:bg-[#edf3f8]">COPY COMPLETION CAPTION</button>
                <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(assignmentUrl)}`} target="_blank" rel="noopener noreferrer" onClick={() => trackPublicEvent('share_intent_opened', { content_kind: 'completion', content_id: caseFile.scenario.id, method: 'linkedin' })} className="inline-flex items-center gap-1 bg-[#286da8] px-3 py-2 font-mono text-[8px] font-bold text-white hover:bg-[#205c90]">OPEN LINKEDIN COMPOSER <ExternalLink className="size-3" /></a>
                {nativeFileShareAvailable && <button type="button" onClick={() => void shareFieldRecord()} className="border border-[#8193a5] bg-white px-3 py-2 font-mono text-[8px] font-bold text-[#315673] hover:bg-[#edf3f8]">SHARE IMAGE WITH DEVICE</button>}
              </div>
              {shareStatus && <output className="mt-2 block font-mono text-[8px] font-bold text-[#397053]">{shareStatus}</output>}
            </div>}
          </div>
        </section>

        <section className="mt-4 border border-[#8498aa] bg-[#e8edf2] p-4" aria-labelledby="portfolio-approval-title">
          <button type="button" className="flex w-full items-start gap-3 text-left" onClick={() => setApprovedForPublication((value) => !value)}>
            <span className={checkboxClass(approvedForPublication)}><Check className="size-3" /></span>
            <span><strong id="portfolio-approval-title" className="block text-[11px] text-[#273e54]">I reviewed these selections and intend to create a public-facing package.</strong><small className="mt-1 block text-[9px] leading-4 text-[#607386]">The Analyst does not upload anything, certify the work, choose a license, or determine whether publication is appropriate. The ZIP and optional field record are created on this device.</small></span>
          </button>
        </section>

        {error && <p className="mt-4 border-l-4 border-[#a7462e] bg-[#fae9e4] p-3 text-[10px] text-[#7e321f]" role="alert">{error}</p>}

        {downloaded && <section className="mt-4 border border-[#98af9c] bg-[#edf5ed] p-4" aria-labelledby="github-next-title">
          <div className="flex items-start gap-3"><FolderGit2 className="size-5 text-[#315d3a]" /><div><h3 id="github-next-title" className="text-[12px] font-semibold text-[#284c31]">Portfolio package downloaded</h3><ol className="mt-2 list-decimal space-y-1 pl-4 text-[10px] leading-5 text-[#4e6754]"><li>Unzip the package and read <code>PUBLICATION_CHECKLIST.md</code>.</li><li>Create an empty GitHub repository—do not initialize it with a README.</li><li>Choose <strong>uploading an existing file</strong>, then drag in the unzipped contents.</li><li>Preview the README before committing publicly.</li>{repositoryPreviewIncluded && <li>Optional: use <code>repository-preview.png</code> for the repository’s social preview.</li>}<li>Optional: in repository <strong>Settings → Pages</strong>, choose <strong>Deploy from a branch</strong>, then <strong>main /docs</strong>. GitHub Pages is not enabled automatically.</li></ol><a href={githubNewUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackPublicEvent('github_setup_opened', { content_id: caseFile.scenario.id })} className="mt-3 inline-flex items-center gap-2 bg-[#315d3a] px-3 py-2 font-mono text-[9px] font-bold text-white hover:bg-[#25492d]">OPEN GITHUB REPOSITORY SETUP <ExternalLink className="size-3" /></a></div></div>
        </section>}
      </div>

      <div className="grid border-t border-[#aebdca] bg-[#f7f9fb] md:grid-cols-[1fr_auto_auto]">
        <p className="px-5 py-3 text-[9px] leading-4 text-[#596b7d]">Required: title, takeaway, at least one method, recommendation, limitations, and publication approval.</p>
        {fieldRecordEnabled && <Button variant="outline" className="m-2 rounded-[3px] border-[#8193a5] text-[9px] font-bold" disabled={!canExport || exporting} onClick={() => void exportFieldRecord()}><FileImage /> {fieldRecordDownloaded ? 'DOWNLOAD FIELD RECORD AGAIN' : 'DOWNLOAD FIELD RECORD'} <small>.PNG</small></Button>}
        <Button className="min-h-14 rounded-none bg-[#1b4f82] px-6 text-[9px] font-bold hover:bg-[#28669f]" disabled={!canExport || exporting} onClick={() => void exportPortfolio()}><Download /> {exporting ? 'BUILDING' : downloaded ? 'DOWNLOAD PORTFOLIO AGAIN' : 'BUILD GITHUB PORTFOLIO'} <small className="text-[#bcd2e7]">.ZIP</small></Button>
      </div>
    </DialogContent>
  </Dialog>;
}
