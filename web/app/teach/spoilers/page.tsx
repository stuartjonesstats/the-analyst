import type { Metadata } from 'next';

import { SiteLink } from '@/components/site-link';
import { instructorNotes, selfGuidedRubrics } from '@/lib/instructor-notes';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Instructor Notes — The Analyst',
  description:
    'Spoiler-separated instructor truths and review cautions for The Analyst assignment curriculum.',
  robots: { index: false, follow: false },
  openGraph: { images: [] },
  twitter: { images: [] },
};

export default function SpoilerPack() {
  return (
    <main className="teaching-page spoiler-page">
      <header className="teaching-header">
        <div className="teaching-brand">
          <strong>THE ANALYST / INSTRUCTOR NOTES</strong>
        </div>
        <SiteLink path="/teach">RETURN TO PLANNING DESK</SiteLink>
      </header>

      <section className="spoiler-warning">
        <p className="document-kicker">SPOILER-SEPARATED / PUBLIC RESOURCE</p>
        <h1>This page discloses the assignments’ planted mechanisms.</h1>
        <p>
          Keep learners in the workbench. These notes establish what the data
          generator actually encodes, when to release stakeholder context, where
          refusal is valid, and what not to grade toward. They are facilitation
          and assessment overlays—not answer keys. The order below now matches
          the public assignment sequence.
        </p>
      </section>

      <section className="spoiler-register">
        {instructorNotes.map((note) => (
          <details key={note.id}>
            <summary>
              <span>{String(note.sequence).padStart(2, '0')}</span>
              <strong>
                {note.title}
                <small>{note.id}</small>
              </strong>
              <b
                className={`readiness-${note.readiness.includes('progress') ? 'hold' : 'ready'}`}
              >
                {note.readiness}
              </b>
            </summary>
            <div className="instructor-overlay">
              <div className="overlay-summary">
                <p>
                  <span>ENCODED TRUTH</span>
                  {note.truth}
                </p>
                <p>
                  <span>WATCH FOR</span>
                  {note.watchFor}
                </p>
                <p>
                  <span>ACCEPTABLE OUTCOME SPACE</span>
                  {note.acceptableOutcomes}
                </p>
                <p>
                  <span>DELIVERY FORMAT</span>
                  {note.facilitation}
                </p>
              </div>
              <section>
                <h2>Reveal and stakeholder triggers</h2>
                <ol>
                  {note.revealTriggers.map((trigger) => (
                    <li key={trigger}>{trigger}</li>
                  ))}
                </ol>
              </section>
              <section>
                <h2>Likely misconceptions</h2>
                <ul>
                  {note.misconceptions.map((misconception) => (
                    <li key={misconception}>{misconception}</li>
                  ))}
                </ul>
              </section>
              <section className="completion-evidence">
                <h2>Completion evidence to inspect</h2>
                <ul>
                  {note.completionEvidence.map((evidence) => (
                    <li key={evidence}>{evidence}</li>
                  ))}
                </ul>
              </section>
              <details className="self-guided-rubric">
                <summary>
                  <span>SELF-PACED REVIEW</span>
                    <strong>{note.title} / Self-Guided Rubric</strong>
                  <b>NOT THE GRADING RUBRIC</b>
                </summary>
                <div>
                  <p>
                    Use these questions after a serious first pass. They
                    identify defensible areas of inquiry and evidence quality
                    without prescribing a method, magic number, model, or
                    conclusion.
                  </p>
                  <section>
                    <h3>Lines of inquiry</h3>
                    <ol>
                      {selfGuidedRubrics[note.id].inquiry.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                  </section>
                  <section>
                    <h3>Evidence and diagnostics to look for</h3>
                    <ul>
                      {selfGuidedRubrics[note.id].diagnostics.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                  <section>
                    <h3>Decision and handoff qualities</h3>
                    <ul>
                      {selfGuidedRubrics[note.id].decisionQualities.map(
                        (item) => (
                          <li key={item}>{item}</li>
                        ),
                      )}
                    </ul>
                  </section>
                </div>
              </details>
            </div>
          </details>
        ))}
      </section>
    </main>
  );
}
