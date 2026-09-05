import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Download, ExternalLink } from 'lucide-react';

import { PriorityBriefShare } from '@/components/priority-brief-share';
import { PublicShell } from '@/components/public-shell';
import { SiteLink } from '@/components/site-link';
import {
  getBriefReleaseState,
  priorityBriefBySlug,
  priorityBriefs,
} from '@/lib/priority-briefs';
import { sitePath } from '@/lib/site-path';

import styles from '@/components/priority-briefs.module.css';

export const dynamic = 'force-static';
export const dynamicParams = false;

type PriorityBriefPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return priorityBriefs.map((brief) => ({ slug: brief.slug }));
}

export async function generateMetadata({ params }: PriorityBriefPageProps): Promise<Metadata> {
  const { slug } = await params;
  const brief = priorityBriefBySlug.get(slug);
  if (!brief) return {};
  const canonical = `/briefs/${brief.slug}/`;
  const description = `${brief.shortDescription} Role: ${brief.role}. Timebox: ${brief.timeEstimate}.`;
  return {
    title: `${brief.title} — Priority Brief — The Analyst`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${brief.title} — The Analyst`,
      description,
      url: canonical,
      siteName: 'The Analyst',
      type: 'article',
      publishedTime: `${brief.releaseDate}T12:00:00Z`,
      images: [{ url: brief.socialImage, width: 1200, height: 630, alt: `${brief.title}, ${brief.id} Priority Brief from The Analyst` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${brief.title} — The Analyst`,
      description,
      images: [brief.socialImage],
    },
  };
}

export default async function PriorityBriefPage({ params }: PriorityBriefPageProps) {
  const { slug } = await params;
  const brief = priorityBriefBySlug.get(slug);
  if (!brief) notFound();

  const index = priorityBriefs.findIndex((item) => item.slug === brief.slug);
  const previous = priorityBriefs[(index - 1 + priorityBriefs.length) % priorityBriefs.length];
  const next = priorityBriefs[(index + 1) % priorityBriefs.length];
  const releaseState = getBriefReleaseState(brief);

  return (
    <PublicShell currentPath="/briefs">
      <main className={`public-main ${styles.briefMain}`} id="main-content" tabIndex={-1}>
        <header className={styles.briefHero}>
          <div className={styles.briefHeroTop}>
            <SiteLink path="/briefs/">PRIORITY DESK</SiteLink>
            <span>/</span>
            <span>{brief.id}</span>
            <b className={styles.releaseFlag}>{releaseState.toUpperCase()}</b>
          </div>
          <h1>{brief.title}</h1>
          <p>{brief.shortDescription}</p>
          <dl className={styles.briefHeroFacts}>
            <div><dt>ROLE</dt><dd>{brief.role}</dd></div>
            <div><dt>TIMEBOX</dt><dd>{brief.timeEstimate}</dd></div>
            <div><dt>COMPLEXITY</dt><dd>{brief.difficulty} / {brief.difficultyLevel} of 5</dd></div>
            <div><dt>ROTATION</dt><dd>Brief {brief.sequence} of {priorityBriefs.length}</dd></div>
          </dl>
        </header>

        <aside className={styles.briefNotice} role="note">
          <strong>DESKTOP WORKSPACE / LOCAL SAVE</strong>
          <span>This briefing can be read anywhere. Completing it requires a current laptop or desktop browser. The brief workbench uses the existing {brief.sourceAssignment} data pack but saves under a separate local key, so it will not overwrite work on the full assignment.</span>
        </aside>

        <section className={styles.briefSection} aria-labelledby="situation-title">
          <div className={styles.briefSectionIndex}>01 / SITUATION</div>
          <div className={styles.briefSectionBody}>
            <h2 id="situation-title">The decision has already reached your desk.</h2>
            <div className={styles.situationCopy}>{brief.situation.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
            <div className={styles.decisionBox}>
              <div><span>DECISION</span><p>{brief.decision}</p></div>
              <div><span>OPERATING CONSTRAINT</span><p>{brief.constraint}</p></div>
            </div>
          </div>
        </section>

        <section className={styles.briefSection} aria-labelledby="protocol-title">
          <div className={styles.briefSectionIndex}>02 / START</div>
          <div className={styles.briefSectionBody}>
            <h2 id="protocol-title">Run the brief as a controlled assignment.</h2>
            <p>The workbench mounts only the listed source neighborhood and supplies neutral starter worksheets. It does not grade the conclusion or reveal the mechanisms planted in the larger assignment.</p>
            <div className={styles.startGrid}>
              <ol className={styles.protocol}>
                <li>Open the dedicated brief workspace and confirm the brief ID in the queue.</li>
                <li>Establish table grain, cutoff and control totals before joining or modeling.</li>
                <li>Make at least two distinct evidence moves and test a credible rival explanation.</li>
                <li>Leave the requested polished artifact, then export the workspace or portfolio package.</li>
              </ol>
              <div>
                <SiteLink path={`${brief.workbenchPath}&mode=supported`} className={styles.workbenchAction}>OPEN BRIEF WORKBENCH <ArrowRight aria-hidden="true" /></SiteLink>
                <p className={styles.workbenchActionNote}>The source files are shared; the draft workspace is not. Changing to another full assignment drops brief mode deliberately.</p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.briefSection} aria-labelledby="estate-title">
          <div className={styles.briefSectionIndex}>03 / SOURCE ESTATE</div>
          <div className={styles.briefSectionBody}>
            <h2 id="estate-title">Real tables. A deliberately bounded neighborhood.</h2>
            <p>These Parquet files already belong to Meridian’s public 96-table estate. Use the mounted schema.table names in SQL or Python; download links are provided for learners working in a local DuckDB environment.</p>
            <div className={styles.dataRegister}>
              {brief.sourceTables.map((source) => (
                <div className={styles.dataRow} key={source.table}>
                  <strong>{source.table}</strong>
                  <span>{new Intl.NumberFormat('en-US').format(source.rows)} rows</span>
                  <p><b>GRAIN / </b>{source.grain}</p>
                  <p><b>CAUTION / </b>{source.caution}</p>
                  <a href={sitePath(source.path)} download aria-label={`Download ${source.table} Parquet`} title={`Download ${source.table}`}><Download aria-hidden="true" /></a>
                </div>
              ))}
            </div>
            <a className={styles.manifestLink} href={sitePath(brief.sourceManifest)} target="_blank" rel="noreferrer">OPEN SOURCE-PACK MANIFEST <ExternalLink aria-hidden="true" /></a>
            <p><strong>ANALYSIS CUTOFF / </strong>{brief.analysisCutoff}</p>
          </div>
        </section>

        <section className={styles.briefSection} aria-labelledby="questions-title">
          <div className={styles.briefSectionIndex}>04 / INVESTIGATE</div>
          <div className={styles.briefSectionBody}>
            <h2 id="questions-title">Questions to pressure-test—not steps to copy.</h2>
            <p>These prompts define the analytical territory without prescribing an order, technique or conclusion.</p>
            <ol className={styles.questionList}>
              {brief.startingQuestions.map((question, questionIndex) => <li key={question}><span>{String(questionIndex + 1).padStart(2, '0')}</span><p>{question}</p></li>)}
            </ol>
            <div className={styles.skillsRow}>{brief.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
          </div>
        </section>

        <section className={styles.briefSection} aria-labelledby="handoff-title">
          <div className={styles.briefSectionIndex}>05 / HANDOFF</div>
          <div className={styles.briefSectionBody}>
            <h2 id="handoff-title">Leave work another analyst can review.</h2>
            <p>Artifact presence can be recorded; analytical quality remains a human judgment. A complete brief has evidence, reasoning and a decision—not merely executed code.</p>
            <ol className={styles.deliverableList}>
              {brief.deliverables.map((deliverable, deliverableIndex) => (
                <li key={deliverable.title}>
                  <span>{String(deliverableIndex + 1).padStart(2, '0')}</span>
                  <div><strong>{deliverable.title}</strong><p>{deliverable.description}</p></div>
                </li>
              ))}
            </ol>
            <aside className={styles.stretchBox}><strong>OPTIONAL STRETCH</strong><p>{brief.stretch}</p></aside>
          </div>
        </section>

        <section className={styles.briefSection} aria-labelledby="debrief-title">
          <div className={styles.briefSectionIndex}>06 / DEBRIEF</div>
          <div className={styles.briefSectionBody}>
            <h2 id="debrief-title">Review the reasoning after a real attempt.</h2>
            <p>The debrief does not contain an official answer. It identifies defensible analytical moves, common failure modes and questions a reviewer may use to challenge the handoff.</p>
            <details className={styles.debriefGate}>
              <summary>SPOILER-GATED REVIEW / REVEAL AFTER YOUR FIRST HANDOFF</summary>
              <div>
                <p className={styles.debriefWarning}>DEBRIEF REVEALED / THIS MAY CHANGE HOW YOU APPROACH THE BRIEF</p>
                <p>{brief.debrief.framing}</p>
                <h3>Defensible approaches</h3>
                <ul className={styles.debriefList}>{brief.debrief.defensibleApproaches.map((item) => <li key={item}>{item}</li>)}</ul>
                <h3>Common traps</h3>
                <ul className={styles.debriefList}>{brief.debrief.commonTraps.map((item) => <li key={item}>{item}</li>)}</ul>
                <h3>Reviewer questions</h3>
                <ul className={styles.debriefList}>{brief.debrief.reviewQuestions.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            </details>
          </div>
        </section>

        <PriorityBriefShare id={brief.id} slug={brief.slug} title={brief.title} role={brief.role} caption={brief.shareCaption} socialImage={brief.socialImage} />

        <nav className={styles.briefPager} aria-label="Priority Brief sequence">
          <SiteLink path={`/briefs/${previous.slug}/`}><ArrowLeft aria-hidden="true" /> <span>PREVIOUS / {previous.id}</span> {previous.title}</SiteLink>
          <SiteLink path={`/briefs/${next.slug}/`}><span>NEXT / {next.id}</span> {next.title} <ArrowRight aria-hidden="true" /></SiteLink>
        </nav>
      </main>
    </PublicShell>
  );
}
