import { PublicShell } from '@/components/public-shell';
import { SiteLink } from '@/components/site-link';

export const dynamic = 'force-static';

const principles = [
  ['01', 'Bound the assignment, not the answer', 'Every case supplies a role, cutoff, decision, source neighborhood, and handoff. Learners still own definitions, methods, uncertainty, and recommendations.'],
  ['02', 'Make Python earn its place', 'SQL establishes governed evidence. Python handles work that benefits from programmatic analysis: visualization, inference, temporal validation, simulation, modeling, and error analysis.'],
  ['03', 'Preserve useful mess', 'The estate contains declared source behavior—multiple clocks, sparse observations, fanout risk, delayed labels, technical replays, selection effects, and shifting populations. These are mechanisms, not random corruption.'],
  ['04', 'Permit responsible refusal', 'A defensible result may be hold, monitor, shadow, collect better labels, or decline deployment. The simulation never requires false certainty to feel complete.'],
  ['05', 'Separate mechanics from judgment', 'Machines may verify execution, file integrity, grain, referential constraints, and exact authored invariants. Instructors evaluate analytical meaning, assumptions, causal language, risk posture, and decisions.'],
  ['06', 'Leave work another analyst can inspect', 'The submission contains code, queries, notes, evidence, outputs, run records, data revision, runtime versions, and content hashes. Reproducibility is part of the work product.'],
] as const;

export default function ApproachPage() {
  return (
    <PublicShell>
      <main className="public-main">
        <header className="public-page-head approach-head">
          <p className="public-kicker">PEDAGOGICAL OPERATING STANDARD</p>
          <h1>Practice judgment before the stakes rise.</h1>
          <p>The Analyst occupies the missing middle between a guided lesson and fully open-ended work: the world is controlled enough to teach from, but the analytical choices remain real. It can support college and university courses, workforce programs, professional training, or structured self-study without assuming one calendar or credential.</p>
        </header>
        <section className="approach-register">
          {principles.map(([index, title, body]) => (
            <article key={index}><span>{index}</span><h2>{title}</h2><p>{body}</p></article>
          ))}
        </section>
        <section className="assessment-boundary">
          <div><span>MACHINE-VERIFIABLE</span><p>Runs, schemas, file hashes, declared grain, exact row constraints, referential integrity, temporal cutoff violations, and scenario-authored invariants.</p></div>
          <div><span>HUMAN-REVIEWED</span><p>Question framing, statistical reasoning, model choice, uncertainty, business consequences, causal restraint, communication, and whether the recommendation deserves action.</p></div>
        </section>
        <section className="scaffold-matrix">
          <div className="section-index">SCAFFOLD MODES</div>
          <article><b>SUPPORTED</b><p>Templates, small fixtures, query contracts, fold utilities, and explicit reconciliation prompts.</p></article>
          <article><b>GUIDED</b><p>Data neighborhood, cutoff, deliverable contracts, and hints for mechanically detectable failure modes.</p></article>
          <article><b>INDEPENDENT</b><p>Executive request, source estate, workbench, and handoff requirements. The analytical route remains learner-owned.</p></article>
        </section>
        <section className="section-lead split" aria-labelledby="approach-instructor-note">
          <div>
            <span className="public-kicker" id="approach-instructor-note">TEACHING AND ASSESSMENT</span>
            <p>The low-profile instructor desk holds sequencing guidance, the human-review boundary, a local submission viewer, and spoiler-separated case notes. None of those materials are required for self-directed use.</p>
          </div>
          <SiteLink path="/teach" rel="nofollow">OPEN INSTRUCTOR DESK →</SiteLink>
        </section>
      </main>
    </PublicShell>
  );
}
