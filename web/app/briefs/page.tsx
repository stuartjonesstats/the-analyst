import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';

import { PublicShell } from '@/components/public-shell';
import { SiteLink } from '@/components/site-link';
import { getBriefReleaseState, getPriorityBriefRotation, priorityBriefs } from '@/lib/priority-briefs';

import styles from '@/components/priority-briefs.module.css';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Priority Briefs — The Analyst',
  description: 'Eight compact workplace decisions using The Analyst’s full Meridian data estate in a permanent 16-week rotation.',
  alternates: { canonical: '/briefs/' },
};

export default function PriorityBriefArchivePage() {
  const rotation = getPriorityBriefRotation();
  const current = rotation.brief;

  return (
    <PublicShell currentPath="/briefs">
      <main className={`public-main ${styles.archiveMain}`} id="main-content" tabIndex={-1}>
        <header className={styles.archiveHero}>
          <p className={styles.heroKicker}>PRIORITY DESK / EIGHT-BRIEF SERIES</p>
          <h1>One decision. Ninety minutes. No clean answer.</h1>
          <p>Priority Briefs are compact assignments drawn from Meridian’s existing enterprise estate. Each isolates a consequential analytical judgment, gives you a real data neighborhood and asks for a professional handoff—not a quiz response.</p>
        </header>

        <aside className={styles.seriesNote} role="note">
          <strong>WORKBENCH REQUIREMENT</strong>
          <span>Read briefs on any device. SQL, Python, evidence capture and portfolio export require a current laptop or desktop browser. One brief is featured for two weeks; after PB-008, the 16-week rotation returns to PB-001. Every page remains permanently available.</span>
        </aside>

        <section className={styles.currentBrief} aria-labelledby="current-priority-title">
          <div className={styles.currentCopy}>
            <span className={styles.currentLabel}>CURRENT PRIORITY / {current.id}</span>
            <h2 id="current-priority-title">{current.title}</h2>
            <p>{current.shortDescription}</p>
            <dl className={styles.currentFacts}>
              <div><dt>ROLE</dt><dd>{current.role}</dd></div>
              <div><dt>TIMEBOX</dt><dd>{current.timeEstimate}</dd></div>
              <div><dt>COMPLEXITY</dt><dd>{current.difficulty} / {current.difficultyLevel} of 5</dd></div>
              <div><dt>ROTATION</dt><dd>Brief {rotation.slot} of {priorityBriefs.length}</dd></div>
            </dl>
            <SiteLink path={`/briefs/${current.slug}/`} className={styles.currentAction}>ACCEPT CURRENT BRIEF <ArrowRight aria-hidden="true" /></SiteLink>
          </div>
          <aside className={styles.currentRail}>
            <div>
              <span>OPERATING STANDARD</span>
              <strong>Two evidence moves. One rival explanation. One polished decision artifact.</strong>
              <p>There is no algorithmic score and no preferred conclusion hidden behind the page. Your method, boundary and handoff must survive human review.</p>
            </div>
            <footer>LOCAL WORKSPACE / NO ACCOUNT<br />EXISTING MERIDIAN PARQUET / NO TOY TABLES</footer>
          </aside>
        </section>

        <section className={styles.archiveSection} aria-labelledby="priority-archive-title">
          <header className={styles.archiveSectionHead}>
            <div>
              <p className={styles.sectionKicker}>PERMANENT REGISTER / 16-WEEK LOOP</p>
              <h2 id="priority-archive-title">The full briefing rotation</h2>
            </div>
            <p>Work in rotation order for breadth or select by skill. The rotation began in September 2026; every two weeks the featured position advances, and PB-008 rolls back to PB-001. URLs, shared challenges, and portfolio links do not expire.</p>
          </header>
          <div className={styles.briefGrid}>
            {priorityBriefs.map((brief) => {
              const state = getBriefReleaseState(brief);
              return (
                <SiteLink key={brief.id} path={`/briefs/${brief.slug}/`} className={styles.briefCard}>
                  <header>
                    <span>{brief.id} / SLOT {String(brief.sequence).padStart(2, '0')} OF {String(priorityBriefs.length).padStart(2, '0')}</span>
                    <b className={styles.cardStatus}>{state}</b>
                  </header>
                  <div className={styles.briefCardBody}>
                    <p>{brief.desk} / {brief.role}</p>
                    <h3>{brief.title}</h3>
                    <p>{brief.shortDescription}</p>
                  </div>
                  <div className={styles.cardSkills}>{brief.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
                  <footer>
                    <span>{brief.timeEstimate} · {brief.difficulty}</span>
                    {state === 'scheduled' ? 'PREVIEW BRIEF' : 'OPEN BRIEF'} <ArrowRight aria-hidden="true" />
                  </footer>
                </SiteLink>
              );
            })}
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
