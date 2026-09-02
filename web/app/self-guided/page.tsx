import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';

import { PublicShell } from '@/components/public-shell';
import { SiteLink } from '@/components/site-link';
import { selfGuidedRubrics } from '@/lib/instructor-notes';
import { scenarios } from '@/lib/scenarios';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Self-Guided Manual — The Analyst',
  description:
    'A practical independent-study plan for using The Analyst: readiness, pacing, scaffold modes, assignment workflow, self-review, and recovery when stuck.',
};

const pathways = [
  {
    label: '16-WEEK CORE',
    sequence: '01 → 02 → 03 → 04 → one advanced elective',
    workload: '30–51 prepared-learner hours / 55–90 newcomer hours',
    guidance:
      'Use assignments 01–04 to build the common judgment core. Choose 05, 06, 07, 08, or 09 only after checking its prerequisites on the Assignments page. Reserve the final week for revision, not another first attempt.',
  },
  {
    label: '24-WEEK EXTENDED',
    sequence: '01–05 → one build practicum → one audit practicum',
    workload: '52–91 prepared-learner hours / 99–168 newcomer hours',
    guidance:
      'Complete the core through point-in-time modeling. Then choose Stock or Queue for a larger build and Orion or Model Risk for an audit. Put a recovery week after every two or three assignments.',
  },
  {
    label: 'ALL-NINE STUDIO',
    sequence: '01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09',
    workload: '74–115 prepared-learner hours / 127–192 newcomer hours',
    guidance:
      'This is an intensive studio, not ordinary weekly homework. The ranges exclude foundation study, debugging, delayed self-review, and revision. Use it only when you can protect substantial time and tolerate unfinished work.',
  },
] as const;

const assignmentCycle = [
  ['Inbox', 'Before querying, write the decision, audience, cutoff, intended grain, and the evidence that could change your position.'],
  ['Data register', 'Inspect keys, coverage, clocks, relationships, reliability notes, and dangerous joins before deciding what the tables mean.'],
  ['Investigate', 'Reconcile the evidence layer in SQL. Use Python when visualization, inference, simulation, backtesting, modeling, calibration, or error analysis improves the decision.'],
  ['Evidence', 'Record only claims you can trace to actual work. Include the relevant population and limitation rather than pasting a naked number.'],
  ['Handoff', 'Draft a clear recommendation, qualification, or responsible refusal; bind the requested artifacts; and export the first complete attempt.'],
  ['Review', 'Return after a break. Audit the work as another analyst, consult the post-attempt prompts, revise materially, and write down what changed and why.'],
] as const;

const reviewQuestions = [
  ['GRAIN', 'What does one row represent at every important step, and where could a join multiply it?'],
  ['TIME', 'Could every feature, status, label, and comparison legitimately have been known at the assignment cutoff?'],
  ['EVIDENCE', 'Did you test a credible rival explanation, not just confirm the first story that fit?'],
  ['REPRODUCIBILITY', 'Can another analyst recover the population, exclusions, transformations, and result from the exported work?'],
  ['UNCERTAINTY', 'Does the language distinguish descriptive, predictive, and causal claims—and match the strength of the design?'],
  ['DECISION', 'Is the recommendation proportionate to the stakes, constraints, and evidence? What would reverse it?'],
  ['HANDOFF', 'Can the intended audience find the decision, population, material limitation, owner, and next action quickly?'],
] as const;

export default function SelfGuidedPage() {
  return (
    <PublicShell currentPath="/self-guided">
      <main className="public-main self-guided-page" id="main-content" tabIndex={-1}>
        <header className="public-page-head self-guided-head">
          <p className="public-kicker">SELF-GUIDED MANUAL / INDEPENDENT STUDY</p>
          <h1>Be your own program manager. Not your own answer key.</h1>
          <p>
            The Analyst can support serious independent practice, but it does not replace foundational instruction, feedback, or professional experience. This manual gives you a route, working discipline, and honest review process without turning the assignments into walkthroughs.
          </p>
        </header>

        <aside className="device-requirement" role="note">
          <strong>BEFORE YOU BEGIN</strong>
          <span>Use a current laptop or desktop browser, stay in one browser profile, and download a submission after every substantial session. Drafts live in that browser—not in an account or cloud workspace.</span>
        </aside>

        <section className="manual-entry" aria-labelledby="manual-start-title">
          <nav aria-label="Self-guided manual sections">
            <span>MANUAL INDEX</span>
            <a href="#readiness">01 / Readiness</a>
            <a href="#route">02 / Choose a route</a>
            <a href="#modes">03 / Scaffold modes</a>
            <a href="#cycle">04 / Assignment cycle</a>
            <a href="#review">05 / Self-review</a>
            <a href="#stuck">06 / When stuck</a>
            <a href="#complete">07 / Definition of done</a>
          </nav>
          <div>
            <p className="public-kicker">THE 15-MINUTE START</p>
            <h2 id="manual-start-title">Start small enough to learn honestly.</h2>
            <ol className="manual-quickstart">
              <li><span>01</span><p>Read the <SiteLink path="/guide">Workbench Guide</SiteLink> once so you know how the workbench stores, runs, and exports work.</p></li>
              <li><span>02</span><p>Open Assignment 01 in <strong>Supported</strong> mode. Treat it as a readiness diagnostic, not a speed test.</p></li>
              <li><span>03</span><p>Block one uninterrupted 90-minute session. Finish with saved notes and an exported file even if the analysis is incomplete.</p></li>
            </ol>
            <SiteLink path="/workbench/?case=the-monday-scorecard&mode=supported" className="manual-primary-link">
              OPEN ASSIGNMENT 01 / SUPPORTED <ArrowRight />
            </SiteLink>
          </div>
        </section>

        <section className="manual-section" id="readiness" aria-labelledby="readiness-title">
          <header>
            <span>01 / READINESS</span>
            <div><h2 id="readiness-title">Know what this resource assumes.</h2><p>You do not need every advanced prerequisite on day one. You do need enough fluency to investigate rather than spend the entire session decoding syntax.</p></div>
          </header>
          <div className="manual-readiness-grid">
            <article>
              <strong>READY FOR ASSIGNMENT 01</strong>
              <ul>
                <li>Write and explain a basic SELECT, WHERE, GROUP BY, and ORDER BY query.</li>
                <li>Recognize a key, a missing value, a duplicate, and a data type.</li>
                <li>Filter, group, summarize, and make a simple chart in Pandas.</li>
                <li>Read an error message and reduce a problem to a smaller test.</li>
              </ul>
            </article>
            <article>
              <strong>LEARN JUST IN TIME</strong>
              <ul>
                <li>Joins and reusable Python functions before Assignment 02.</li>
                <li>Sampling and confidence intervals before Assignment 03.</li>
                <li>Missing-data and time-aware joins before Assignment 04.</li>
                <li>The stated modeling, forecasting, causal, NLP, or governance prerequisite before its advanced assignment.</li>
              </ul>
            </article>
            <article className="manual-reality-check">
              <strong>IF YOU ARE TRULY NEW</strong>
              <p>Begin Assignment 01, but stop if syntax prevents you from investigating the business question. Spend focused time on introductory SQL and Pandas, then return. That pause is a readiness decision—not failure. The Analyst is a practice environment, not a from-zero programming course.</p>
            </article>
          </div>
          <div className="manual-preflight">
            <div><strong>TECHNICAL PREFLIGHT / DO THIS ONCE</strong><p>Open Assignment 01 in Supported mode. Wait for DuckDB to report ready and run the SQL starter. Open Python, allow the first runtime load to finish, run the starter, and confirm its figure renders. Download a test .analystcase file and restore it before investing substantial time.</p></div>
            <div><strong>LOCAL STORAGE IS NOT A BACKUP</strong><p>Private browsing, clearing site data, managed-device resets, or changing browser profiles can erase local drafts. The first Python load and package installation also require a network connection. Export after every serious session.</p></div>
            <div><strong>DATA BOUNDARY</strong><p>Use the fictional Meridian estate. Do not paste employer, client, patient, customer, or other protected data into the workbench.</p></div>
          </div>
        </section>

        <section className="manual-section" id="route" aria-labelledby="route-title">
          <header>
            <span>02 / CHOOSE A ROUTE</span>
            <div><h2 id="route-title">Budget for revision, not just completion.</h2><p>Hours describe investigation time, not mastery. Add foundation study where prerequisites are weak and a second pass after every review.</p></div>
          </header>
          <div className="manual-pathways">
            {pathways.map((pathway, index) => (
              <article key={pathway.label}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{pathway.label}</strong>
                  <h3>{pathway.sequence}</h3>
                  <p>{pathway.guidance}</p>
                </div>
                <small>{pathway.workload}</small>
              </article>
            ))}
          </div>
          <p className="manual-inline-note">Use the <SiteLink path="/projects">Assignment Register</SiteLink> to compare prerequisites, newcomer ranges, complexity dimensions, and the actual SQL/Python work before selecting an advanced assignment. Four carefully reviewed assignments will develop more judgment than nine rushed first drafts.</p>
        </section>

        <section className="manual-section" id="modes" aria-labelledby="modes-title">
          <header>
            <span>03 / SCAFFOLD MODES</span>
            <div><h2 id="modes-title">Reduce support deliberately.</h2><p>The selector in the workbench changes the starting material, not the data or standard of judgment.</p></div>
          </header>
          <table className="manual-mode-table">
            <caption className="sr-only">Workbench scaffold modes</caption>
            <thead><tr className="manual-mode-head"><th>MODE</th><th>WHAT YOU RECEIVE</th><th>WHEN TO USE IT</th></tr></thead>
            <tbody>
              <tr><th scope="row">SUPPORTED</th><td>Assignment-specific SQL, Python, working prompts, and opening evidence.</td><td>Your first attempt at 01–02, or any assignment whose domain is new to you.</td></tr>
              <tr><th scope="row">GUIDED</th><td>A general evidence frame and table-loading examples without assignment-specific analytical direction.</td><td>After one credible supported handoff; a sensible default for the middle sequence.</td></tr>
              <tr><th scope="row">INDEPENDENT</th><td>The brief, source estate, required handoff, and nearly blank worksheets.</td><td>A fresh attempt after you can frame grain, cutoff, diagnostics, and deliverables yourself.</td></tr>
            </tbody>
          </table>
          <p className="manual-inline-note"><strong>Self-guided is not Independent mode.</strong> A self-guided learner may—and often should—use Supported mode. Each mode has separate local work, so choose before beginning a serious attempt and export before switching.</p>
        </section>

        <section className="manual-section" id="cycle" aria-labelledby="cycle-title">
          <header>
            <span>04 / ASSIGNMENT CYCLE</span>
            <div><h2 id="cycle-title">Use the same professional loop every time.</h2><p>The loop is intentionally stable while the role, domain, methods, and ambiguity change.</p></div>
          </header>
          <ol className="manual-cycle">
            {assignmentCycle.map(([title, detail], index) => (
              <li key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{detail}</p></div></li>
            ))}
          </ol>
          <div className="manual-operating-facts">
            <p><strong>SQL DISPLAY</strong> The engine evaluates the full query even when the result pane displays only the first 1,000 rows.</p>
            <p><strong>PYTHON TABLES</strong> Load registered names with <code>from analyst import table</code>; learners do not need file paths.</p>
            <p><strong>SESSION TABLES</strong> SQL results shared with Python must be republished after reopening the browser.</p>
            <p><strong>EXECUTION</strong> A successful run proves that code executed—not that the analysis or decision is correct.</p>
          </div>
        </section>

        <section className="manual-section" id="review" aria-labelledby="review-title">
          <header>
            <span>05 / SELF-REVIEW</span>
            <div><h2 id="review-title">Review the argument, not resemblance to a hidden answer.</h2><p>Export version one first. Then interrogate the work across seven professional dimensions.</p></div>
          </header>
          <div className="manual-review-register">
            {reviewQuestions.map(([label, question]) => <article key={label}><strong>{label}</strong><p>{question}</p></article>)}
          </div>
          <div className="manual-review-access">
            <div>
              <strong>SPOILER CONTROL</strong>
              <p>The assignment prompts below are safe to use after exporting a complete first attempt: they name areas of inquiry, not planted truths, preferred methods, magic numbers, or conclusions. Full instructor notes disclose mechanisms and should remain closed until after revision.</p>
            </div>
            <SiteLink path="/teach/spoilers" rel="nofollow">OPTIONAL SPOILER NOTES <ArrowRight /></SiteLink>
          </div>
          <section className="manual-assignment-prompts" aria-labelledby="assignment-prompts-title">
            <div className="manual-prompts-head">
              <span>POST-ATTEMPT REVIEW PROMPTS</span>
              <h3 id="assignment-prompts-title">Open only the assignment you completed.</h3>
              <p>Use these after version one. A self-review is a reflection structure—not a credential or correctness certificate.</p>
            </div>
            {scenarios.map((scenario) => {
              const prompts = selfGuidedRubrics[scenario.id];
              return (
                <details key={scenario.id}>
                  <summary><span>{String(scenario.sequence).padStart(2, '0')}</span><strong>{scenario.title}<small>{scenario.id}</small></strong><b>REVIEW PROMPTS</b></summary>
                  <div>
                    <section><h4>Lines of inquiry</h4><ol>{prompts.inquiry.map((item) => <li key={item}>{item}</li>)}</ol></section>
                    <section><h4>Evidence and diagnostics</h4><ul>{prompts.diagnostics.map((item) => <li key={item}>{item}</li>)}</ul></section>
                    <section><h4>Decision and handoff qualities</h4><ul>{prompts.decisionQualities.map((item) => <li key={item}>{item}</li>)}</ul></section>
                  </div>
                </details>
              );
            })}
          </section>
        </section>

        <section className="manual-section" id="stuck" aria-labelledby="stuck-title">
          <header>
            <span>06 / WHEN STUCK</span>
            <div><h2 id="stuck-title">Diagnose the kind of stuck.</h2><p>Mess is part of the assignment. Unstructured thrashing is not.</p></div>
          </header>
          <div className="manual-stuck-grid">
            <article><strong>TOOL OR SYNTAX</strong><p>Reduce to one table and five rows. Inspect exact column names and types. Add one clause or transformation at a time, and keep the last query that ran.</p></article>
            <article><strong>DATA OR GRAIN</strong><p>Return to the Data Register. Write what one row represents, test key uniqueness, count before and after joins, and identify which clock each timestamp records.</p></article>
            <article><strong>JUDGMENT</strong><p>Write two competing recommendations. Under each, list supporting evidence, counterevidence, consequence of being wrong, and the next fact that would change the decision.</p></article>
            <article><strong>NO PROGRESS AFTER 45 MINUTES</strong><p>Save and export. Write the smallest unresolved question in scratch notes. Review the prerequisite—not the assignment spoiler—and resume in a new session.</p></article>
          </div>
        </section>

        <section className="manual-section" id="complete" aria-labelledby="complete-title">
          <header>
            <span>07 / DEFINITION OF DONE</span>
            <div><h2 id="complete-title">Finish with work another person could use.</h2><p>A completed worksheet is not automatically a completed assignment.</p></div>
          </header>
          <div className="manual-done">
            <ul>
              <li>The analytical population, grain, cutoff, and exclusions are explicit.</li>
              <li>SQL runs end to end and includes decision-material reconciliation checks.</li>
              <li>Python is reproducible and used where it adds analytical value.</li>
              <li>Important claims are recorded as evidence tied to actual runs.</li>
              <li>The final brief leads with a decision, qualification, or responsible refusal.</li>
              <li>Material uncertainty, risks, owners, next actions, and reversal conditions are visible.</li>
              <li>Every requested artifact is bound and the .analystcase file is downloaded.</li>
              <li>A delayed self-review produced at least one documented revision—or a defensible reason for none.</li>
            </ul>
            <aside>
              <span>OPTIONAL PEER REVIEW</span>
              <p>Exchange exported submissions with a trusted peer. They can inspect the file locally in the submission viewer; nothing is uploaded. Ask for one strongest practice, one decision-material weakness, and one concrete improvement.</p>
              <SiteLink path="/teach/replay" rel="nofollow">OPEN LOCAL SUBMISSION VIEWER →</SiteLink>
            </aside>
          </div>
          <p className="manual-inline-note"><strong>Two useful exports:</strong> the .analystcase file is the restorable, reviewable record to save at every milestone. The portfolio .zip is a conventional human-readable copy to export after the work is polished. Course, section, and learner-ID fields may remain blank for independent study.</p>
        </section>

        <section className="public-cta compact">
          <div><span>READY TO BEGIN</span><h2>Open Assignment 01. Preserve the first honest attempt.</h2></div>
          <SiteLink path="/workbench/?case=the-monday-scorecard&mode=supported">START SUPPORTED <ArrowRight /></SiteLink>
        </section>
      </main>
    </PublicShell>
  );
}
