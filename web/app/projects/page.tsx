import { ArrowRight } from 'lucide-react';

import { PublicShell } from '@/components/public-shell';
import { SiteLink } from '@/components/site-link';
import { complexityDimensions, scenarios } from '@/lib/scenarios';

export const dynamic = 'force-static';

const audienceByBand = {
  Brief: 'New analysts and learners building foundations',
  Investigation: 'Learners comfortable with joins and dataframe work',
  Decision: 'Intermediate analysts ready for statistical judgment',
  Practicum: 'Advanced learners and professional development groups',
} as const;

export default function ProjectsPage() {
  return (
    <PublicShell>
      <main className="public-main">
        <header className="public-page-head">
          <p className="public-kicker">ASSIGNMENT REGISTER / 09 ACTIVE</p>
          <h1>Nine assignments. One company.</h1>
          <p>Each assignment places the learner in a defined role at Meridian, with its own business moment, decision pressure, source neighborhood, analytical purpose, and handoff. Work them in sequence or assign them by capability in a course, lab, training program, or independent study plan.</p>
        </header>
        <aside className="device-requirement" role="note">
          <strong>WORKBENCH REQUIREMENT</strong>
          <span>Completing an assignment requires a current laptop or desktop browser. Phones may preview briefs, but the SQL, Python, evidence, and submission workspace is not supported on mobile.</span>
        </aside>
        <section className="project-register" aria-label="Assignment summaries">
          {scenarios.map((scenario) => (
            <article key={scenario.id} className="project-record">
              <header>
                <span>{String(scenario.sequence).padStart(2, '0')}</span>
                <b>{scenario.id}</b>
                <small>{scenario.band.toUpperCase()}</small>
              </header>
              <div className="project-record-main">
                <div>
                  <p>{scenario.businessUnit} / {scenario.role}</p>
                  <h2>{scenario.title}</h2>
                  <p className="project-request">{scenario.request}</p>
                </div>
                <dl>
                  <div><dt>INTENDED AUDIENCE</dt><dd>{audienceByBand[scenario.band]}</dd></div>
                  <div><dt>PREPARED LEARNER</dt><dd>{scenario.preparedHours} hours</dd></div>
                  <div><dt>NEWER LEARNER</dt><dd>{scenario.newcomerHours} hours</dd></div>
                  <div><dt>PREREQUISITES</dt><dd>{scenario.prerequisites.join(' · ')}</dd></div>
                </dl>
              </div>
              <div className="project-capability-row">
                {complexityDimensions.map(({ key, label }) => (
                  <div key={key}><span>{label}</span><i><b style={{ width: `${scenario.complexity[key] * 20}%` }} /></i><strong>{scenario.complexity[key]}</strong></div>
                ))}
              </div>
              <footer>
                <div><span>SQL</span><p>{scenario.sqlCore}</p></div>
                <div><span>PYTHON</span><p>{scenario.pythonCore}</p></div>
                <SiteLink path={`/workbench/?case=${scenario.slug}`}>OPEN ASSIGNMENT <ArrowRight /></SiteLink>
              </footer>
            </article>
          ))}
        </section>
        <section className="section-lead split" aria-labelledby="projects-instructor-note">
          <div>
            <span className="public-kicker" id="projects-instructor-note">PLANNING A SEQUENCE?</span>
            <p>The instructor desk compares prerequisites, workload ranges, scaffolding options, and review boundaries across all nine assignments without placing solution material in the learner path.</p>
          </div>
          <SiteLink path="/teach" rel="nofollow">OPEN INSTRUCTOR DESK <ArrowRight /></SiteLink>
        </section>
      </main>
    </PublicShell>
  );
}
