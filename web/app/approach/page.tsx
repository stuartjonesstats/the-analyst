import type { Metadata } from 'next';

import { PublicShell } from '@/components/public-shell';
import { SiteLink } from '@/components/site-link';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Learning Approach — The Analyst',
  description:
    'How The Analyst develops data judgment through bounded workplace decisions, useful mess, responsible refusal, and inspectable handoffs.',
};

const principles = [
  [
    '01',
    'Bound the assignment, not the answer',
    'Every assignment supplies a role, cutoff, decision, source neighborhood, and handoff. Learners still own definitions, methods, uncertainty, and recommendations.',
  ],
  [
    '02',
    'Make Python earn its place',
    'SQL establishes governed evidence. Python handles work that benefits from programmatic analysis: visualization, inference, temporal validation, simulation, modeling, and error analysis.',
  ],
  [
    '03',
    'Preserve useful mess',
    'The estate contains declared source behavior—multiple clocks, sparse observations, fanout risk, delayed labels, technical replays, selection effects, and shifting populations. These are mechanisms, not random corruption.',
  ],
  [
    '04',
    'Permit responsible refusal',
    'A defensible result may be hold, monitor, shadow, collect better labels, or decline deployment. The simulation never requires false certainty to feel complete.',
  ],
  [
    '05',
    'Separate mechanics from judgment',
    'The current workbench captures successful runs with executed-code hashes, flags outputs that predate later worksheet edits, hashes exported files, and records explicitly bound non-empty handoff files. Instructors evaluate artifact quality, grain, time validity, analytical meaning, causal language, risk posture, and decisions.',
  ],
  [
    '06',
    'Leave work another analyst can inspect',
    'The submission contains code, queries, notes, evidence, outputs, run records, data revision, runtime versions, and content hashes. Reproducibility is part of the work product.',
  ],
] as const;

export default function ApproachPage() {
  return (
    <PublicShell currentPath="/approach">
      <main className="public-main" id="main-content" tabIndex={-1}>
        <header className="public-page-head approach-head">
          <p className="public-kicker">PEDAGOGICAL OPERATING STANDARD</p>
          <h1>Practice judgment before the stakes rise.</h1>
          <p>
            The Analyst is the simulation; Meridian Living Systems is the
            fictional employer that makes the work cohere. Each assignment
            changes the role and decision while the organization, source
            systems, definitions, and operating history remain consistent. The
            world is controlled enough to teach from, but the analytical choices
            remain real. It can support college and university courses,
            workforce programs, professional training, or structured self-study.
          </p>
        </header>
        <section className="approach-register">
          {principles.map(([index, title, body]) => (
            <article key={index}>
              <span>{index}</span>
              <h2>{title}</h2>
              <p>{body}</p>
            </article>
          ))}
        </section>
        <section className="assessment-boundary">
          <div>
            <span>MECHANICALLY RECORDED</span>
            <p>
              Successful browser runs with executed-code hashes, captured
              displayed outputs, stale-output status, runtime and data
              revisions, explicitly bound non-empty handoff files, and whether
              exported contents still match their saved hashes. These are not
              correctness certificates.
            </p>
          </div>
          <div>
            <span>HUMAN-REVIEWED</span>
            <p>
              Question framing, statistical reasoning, model choice,
              uncertainty, business consequences, causal restraint,
              communication, and whether the recommendation deserves action.
            </p>
          </div>
        </section>
        <section className="scaffold-matrix">
          <div className="section-index">DELIVERY OPTIONS</div>
          <article>
            <b>SUPPORTED</b>
            <p>
              Templates, small fixtures, query contracts, fold utilities, and
              explicit reconciliation prompts.
            </p>
          </article>
          <article>
            <b>GUIDED</b>
            <p>
              Data neighborhood, cutoff, deliverable contracts, and hints for
              mechanically detectable failure modes.
            </p>
          </article>
          <article>
            <b>INDEPENDENT</b>
            <p>
              Executive request, source estate, workbench, and handoff
              requirements. The analytical route remains learner-owned.
            </p>
          </article>
        </section>
        <p className="scaffold-disclosure">
          These are instructor delivery patterns, not automatic workbench
          settings. The current public workbench supplies starter code and
          assignment context; instructors remove, retain, or supplement
          scaffolds for their cohort.
        </p>
        <section
          className="section-lead split"
          aria-labelledby="approach-instructor-note"
        >
          <div>
            <span className="public-kicker" id="approach-instructor-note">
              TEACHING AND ASSESSMENT
            </span>
            <p>
              The low-profile instructor desk holds sequencing guidance, the
              human-review boundary, a local submission viewer, and
              spoiler-separated assignment notes. None of those materials are
              required for self-directed use.
            </p>
          </div>
          <SiteLink path="/teach" rel="nofollow">
            OPEN INSTRUCTOR DESK →
          </SiteLink>
        </section>
      </main>
    </PublicShell>
  );
}
