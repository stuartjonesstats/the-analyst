import { PublicShell } from '@/components/public-shell';
import { SiteLink } from '@/components/site-link';

export const dynamic = 'force-static';

const steps = [
  ['01', 'Open the brief', 'Read the requester, cutoff, response window, decision standard, and required handoff before touching the data.'],
  ['02', 'Inspect the source register', 'Use the public data dictionary to understand grain, keys, reliability, clocks, known exceptions, and relationships.'],
  ['03', 'Establish evidence in SQL', 'Run the starter query, inspect counts and grains, then replace it with your own reconciled evidence layer. Query results are limited to 1,000 displayed rows; the engine evaluates the full case pack.'],
  ['04', 'Use Python for analytical work', 'The browser runtime mounts the same case files. Use Pandas, Matplotlib, SciPy, scikit-learn, or the case package profile without uploading data.'],
  ['05', 'Keep a decision record', 'Write assumptions and open questions in scratch notes. Add concise evidence records that identify what supports each claim.'],
  ['06', 'Export the handoff', 'Download one .analystcase file containing SQL, Python, notes, evidence, captured outputs, versions, and hashes. Submit that file to the instructor.'],
] as const;

export default function GuidePage() {
  return (
    <PublicShell>
      <main className="public-main">
        <header className="public-page-head">
          <p className="public-kicker">FIELD GUIDE / LEARNER WORKFLOW</p>
          <h1>Arrive, investigate, hand off.</h1>
          <p>No account or local setup is required. A current desktop browser is recommended; all case data and code execution remain on the learner’s device.</p>
        </header>
        <section className="guide-sequence">
          {steps.map(([index, title, body]) => (
            <article key={index}><span>{index}</span><div><h2>{title}</h2><p>{body}</p></div></article>
          ))}
        </section>
        <section className="guide-technical">
          <div><span>SUPPORTED</span><strong>Current Chrome, Edge, Firefox, or Safari on a laptop/desktop</strong></div>
          <div><span>STORAGE</span><strong>Drafts autosave to this browser only</strong></div>
          <div><span>PRIVACY</span><strong>Execution is local; no learner dataset or code upload</strong></div>
          <div><span>RECOVERY</span><strong>Download submissions regularly when working across devices</strong></div>
        </section>
        <section className="public-cta compact">
          <div><span>READY FOR CASEWORK</span><h2>Start with the Monday scorecard.</h2></div>
          <SiteLink path="/workbench">OPEN WORKBENCH →</SiteLink>
        </section>
      </main>
    </PublicShell>
  );
}

