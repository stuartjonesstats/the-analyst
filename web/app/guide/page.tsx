import type { Metadata } from 'next';

import { PublicShell } from '@/components/public-shell';
import { SiteLink } from '@/components/site-link';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Workbench Guide — The Analyst',
  description: 'A practical workflow for investigating Meridian data in SQL and Python, preserving evidence, and exporting an analytical handoff.',
};

const steps = [
  ['01', 'Open the brief', 'Read the requester, cutoff, response window, decision standard, and required handoff before touching the data.'],
  ['02', 'Inspect the source register', 'Use the public data dictionary to understand grain, keys, reliability, clocks, known exceptions, and relationships.'],
  ['03', 'Establish evidence in SQL', 'Run the starter query, inspect counts and grains, then replace it with your own reconciled evidence layer. Query results are limited to 1,000 displayed rows; the engine evaluates the full assignment data pack.'],
  ['04', 'Use Python for analytical work', 'Load the same named tables with `from analyst import table`, then use Pandas, Matplotlib, SciPy, or scikit-learn. Matplotlib figures appear directly below the worksheet; no file paths or data uploads are required.'],
  ['05', 'Keep reasoning separate from conclusions', 'Use scratch notes for assumptions and open questions, append concise evidence records, then write the decision-ready conclusion in Final Brief.'],
  ['06', 'Export the handoff', 'Download one .analystcase file containing SQL, Python, scratch notes, the final brief, evidence, captured outputs, versions, and hashes. Keep it for your own record or share it for grading, coaching, or peer review.'],
] as const;

export default function GuidePage() {
  return (
    <PublicShell currentPath="/guide">
      <main className="public-main" id="main-content" tabIndex={-1}>
        <header className="public-page-head">
          <p className="public-kicker">WORKBENCH GUIDE / LEARNER WORKFLOW</p>
          <h1>Arrive, investigate, hand off.</h1>
          <p>No account or local setup is required. A current laptop or desktop browser is required to complete an assignment; phones are suitable only for previewing the brief. All assignment data and code execution remain on the learner’s device.</p>
        </header>
        <section className="guide-sequence">
          {steps.map(([index, title, body]) => (
            <article key={index}>
              <span>{index}</span>
              <div>
                <h2>{title}</h2>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </section>
        <section className="guide-technical">
          <div>
            <span>SUPPORTED</span>
            <strong>Current Chrome, Edge, Firefox, or Safari on a laptop/desktop</strong>
          </div>
          <div>
            <span>STORAGE</span>
            <strong>Drafts autosave to this browser only</strong>
          </div>
          <div>
            <span>PRIVACY</span>
            <strong>Execution is local; no learner dataset or code upload</strong>
          </div>
          <div>
            <span>RECOVERY</span>
            <strong>Download submissions regularly when working across devices</strong>
          </div>
        </section>
        <section className="public-cta compact">
          <div>
            <span>READY FOR THE FIRST ASSIGNMENT</span>
            <h2>Start with the Monday scorecard.</h2>
          </div>
          <SiteLink path="/workbench">OPEN WORKBENCH →</SiteLink>
        </section>
        <section className="section-lead split" aria-labelledby="guide-instructor-note">
          <div>
            <span className="public-kicker" id="guide-instructor-note">
              FACILITATING THE WORK?
            </span>
            <p>Setup expectations, time ranges, scaffolding guidance, grading boundaries, and the local submission viewer are collected in the instructor desk, separate from the working interface.</p>
          </div>
          <SiteLink path="/teach" rel="nofollow">
            OPEN INSTRUCTOR DESK →
          </SiteLink>
        </section>
      </main>
    </PublicShell>
  );
}
