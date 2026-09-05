import type { Metadata } from 'next';

import { SiteLink } from '@/components/site-link';
import {
  classroomPreflight,
  courseRoutes,
  rubricDimensions,
  scoreBands,
  teachingBoundaries,
} from '@/lib/instructor-planning';
import { priorityBriefs } from '@/lib/priority-briefs';
import { complexityDimensions, scenarios } from '@/lib/scenarios';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Instructor Planning Desk — The Analyst',
  description:
    'Sequence, prerequisites, workload, scaffolding, and technical requirements for The Analyst assignments and Priority Briefs.',
  robots: { index: false, follow: false },
  openGraph: { images: [] },
  twitter: { images: [] },
};

const bandDescriptions = [
  [
    'Brief',
    'One focused decision with a supplied neighborhood; approximately 3–5 prepared-learner hours.',
  ],
  [
    'Investigation',
    'Several assets and competing explanations; approximately 6–12 hours.',
  ],
  [
    'Decision',
    'Multi-stage evidence and several professional artifacts; approximately 10–18 hours.',
  ],
  [
    'Practicum',
    'End-to-end build, audit, forecasting, or deployment work; approximately 16–30+ newcomer hours.',
  ],
];

export default function TeachPage() {
  return (
    <main className="teaching-page">
      <header className="teaching-header">
        <div className="teaching-brand">
          <strong>THE ANALYST / INSTRUCTOR PLANNING DESK</strong>
        </div>
        <SiteLink path="/workbench">RETURN TO LEARNER WORKBENCH</SiteLink>
      </header>

      <section className="teaching-intro">
        <p className="document-kicker">
          THE ANALYST / ASSIGNMENT STUDIO + PRIORITY BRIEF ROTATION
        </p>
        <h1>Plan a progression through the work.</h1>
        <p>
          This desk helps instructors sequence nine workplace assignments and sixteen compact Priority Briefs across
          SQL, Python, data judgment, and professional handoff. It contains no
          sample conclusions. Prepared-hour estimates assume a learner can work
          independently; newcomer ranges assume active instructor support.
        </p>
      </section>

      <section className="band-register" aria-labelledby="band-heading">
        <div className="teaching-section-title">
          <span id="band-heading">WORKLOAD BANDS</span>
          <b>NOT GRADES</b>
        </div>
        <div className="band-grid">
          {bandDescriptions.map(([band, description], index) => (
            <article key={band}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h2>{band}</h2>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="course-route-register"
        aria-labelledby="route-heading"
      >
        <div className="teaching-section-title">
          <span id="route-heading">COURSE ROUTES</span>
          <b>HONEST LOAD, NOT COVERAGE THEATER</b>
        </div>
        <div className="course-route-grid">
          {courseRoutes.map((route, index) => (
            <article key={route.title}>
              <header>
                <span>ROUTE {String(index + 1).padStart(2, '0')}</span>
                <strong>{route.title}</strong>
              </header>
              <p>{route.audience}</p>
              <dl>
                <div>
                  <dt>ASSIGNMENTS</dt>
                  <dd>{route.assignments}</dd>
                </div>
                <div>
                  <dt>WORKLOAD</dt>
                  <dd>{route.load}</dd>
                </div>
              </dl>
              <ol>
                {route.milestones.map((milestone) => (
                  <li key={milestone}>{milestone}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>
        <p className="route-caveat">
          Hours are investigation time, not a promise of mastery. Add explicit
          instruction, debugging, feedback, and revision time. A 16-week course
          should normally choose an advanced elective; a 24-week course can
          sustain two. All nine is an intensive studio.
        </p>
      </section>

      <section
        className="curriculum-register"
        aria-labelledby="sequence-heading"
      >
        <div className="teaching-section-title">
          <span id="sequence-heading">RECOMMENDED SEQUENCE</span>
          <b>REFERENCE ORDER / CHOOSE A ROUTE ABOVE</b>
        </div>

        <div className="curriculum-table-wrap">
          <table className="curriculum-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Assignment</th>
                <th>Band</th>
                <th>Prepared</th>
                <th>Newcomer</th>
                <th>SQL</th>
                <th>Python</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((scenario) => (
                <tr key={scenario.id}>
                  <td>{String(scenario.sequence).padStart(2, '0')}</td>
                  <td>
                    <strong>{scenario.title}</strong>
                    <small>{scenario.role}</small>
                  </td>
                  <td>{scenario.band}</td>
                  <td>{scenario.preparedHours}h</td>
                  <td>{scenario.newcomerHours}h</td>
                  <td>
                    <span className="mini-meter">
                      <i
                        style={{ width: `${scenario.complexity.sql * 20}%` }}
                      />
                    </span>
                    {scenario.complexity.sql}/5
                  </td>
                  <td>
                    <span className="mini-meter python">
                      <i
                        style={{ width: `${scenario.complexity.python * 20}%` }}
                      />
                    </span>
                    {scenario.complexity.python}/5
                  </td>
                  <td className={`state-${scenario.status}`}>
                    {scenario.status.replaceAll('_', ' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="course-route-register" aria-labelledby="priority-brief-planning-heading">
        <div className="teaching-section-title">
          <span id="priority-brief-planning-heading">PRIORITY BRIEF ROTATION / 16</span>
          <b>WEEKLY PRACTICE / EXISTING MERIDIAN TABLES</b>
        </div>
        <p className="route-caveat">
          Priority Briefs are bounded 60–120 minute workplace decisions—not attendance check-ins. Each opens a separate local workbench, reuses an existing governed data neighborhood, requires multiple evidence moves and a polished handoff, and leaves the corresponding full-assignment draft untouched. The sixteen-brief weekly sequence maps directly to a 16-week term and then repeats; permanent URLs let instructors substitute or assign any brief outside the featured window. Debriefs describe defensible approaches and common traps rather than one required answer.
        </p>
        <div className="priority-route-grid">
          {priorityBriefs.map((brief) => (
            <article key={brief.id}>
              <header><span>{brief.id}</span><strong>{brief.title}</strong></header>
              <p>{brief.shortDescription}</p>
              <dl>
                <div><dt>ROLE</dt><dd>{brief.role}</dd></div>
                <div><dt>TIMEBOX</dt><dd>{brief.timeEstimate}</dd></div>
                <div><dt>ROTATION</dt><dd>Slot {brief.sequence} of {priorityBriefs.length}</dd></div>
                <div><dt>DATA</dt><dd>{brief.sourceTables.length} tables from {brief.sourceAssignment}</dd></div>
              </dl>
              <ol>{brief.deliverables.map((deliverable) => <li key={deliverable.title}>{deliverable.title}</li>)}</ol>
              <SiteLink className="course-route-link" path={`/briefs/${brief.slug}/`}>OPEN INSTRUCTOR PREVIEW →</SiteLink>
            </article>
          ))}
        </div>
      </section>

      <section
        className="case-planning-grid"
        aria-label="Assignment planning details"
      >
        {scenarios.map((scenario) => (
          <article className="planning-card" key={scenario.id}>
            <header>
              <span>
                {String(scenario.sequence).padStart(2, '0')} / {scenario.id}
              </span>
              <b>{scenario.band}</b>
            </header>
            <h2>{scenario.title}</h2>
            <p className="planning-request">{scenario.request}</p>
            <dl>
              <div>
                <dt>SQL CORE</dt>
                <dd>{scenario.sqlCore}</dd>
              </div>
              <div>
                <dt>PYTHON CORE</dt>
                <dd>{scenario.pythonCore}</dd>
              </div>
              <div>
                <dt>PREREQUISITES</dt>
                <dd>{scenario.prerequisites.join(' · ')}</dd>
              </div>
              <div>
                <dt>HANDOFF</dt>
                <dd>
                  {scenario.artifactCount} professional artifacts ·{' '}
                  {scenario.packageProfile} runtime
                </dd>
              </div>
            </dl>
            <div className="complexity-profile">
              {complexityDimensions.map(({ key, label }) => (
                <div key={key}>
                  <span>{label}</span>
                  <span className="complexity-track">
                    <i style={{ width: `${scenario.complexity[key] * 20}%` }} />
                  </span>
                  <b>{scenario.complexity[key]}</b>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section
        className="classroom-operations"
        aria-labelledby="preflight-heading"
      >
        <div className="teaching-section-title">
          <span id="preflight-heading">CLASSROOM PREFLIGHT</span>
          <b>RUN BEFORE WEEK ONE</b>
        </div>
        <div className="preflight-grid">
          {classroomPreflight.map(([label, guidance]) => (
            <article key={label}>
              <span>{label}</span>
              <p>{guidance}</p>
            </article>
          ))}
        </div>
        <div className="boundary-card">
          <h2>Operating and assessment boundaries</h2>
          <ul>
            {teachingBoundaries.map((boundary) => (
              <li key={boundary}>{boundary}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rubric-register" aria-labelledby="rubric-heading">
        <div className="teaching-section-title">
          <span id="rubric-heading">100-POINT JUDGMENT RUBRIC</span>
          <b>HUMAN REVIEW</b>
        </div>
        <div className="rubric-intro">
          <div>
            <p className="document-kicker">
              ONE RUBRIC / MULTIPLE DEFENSIBLE OUTCOMES
            </p>
            <h2>
              Score the evidence and decision, not resemblance to an answer key.
            </h2>
            <p>
              For each dimension, select level 0–4. Points equal the dimension
              weight multiplied by the level and divided by four. When evidence
              falls between levels, use the lower level and state what was
              missing. A qualified conclusion or responsible refusal can earn
              full credit.
            </p>
          </div>
          <aside>
            <strong>Every review returns</strong>
            <span>Strongest demonstrated practice</span>
            <span>Most decision-material weakness</span>
            <span>One concrete next improvement</span>
            <span>Whether the position was proportionate</span>
          </aside>
        </div>
        <div className="rubric-dimensions">
          {rubricDimensions.map((dimension, index) => (
            <details key={dimension.name} open={index === 0}>
              <summary>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>
                  {dimension.name}
                  <small>{dimension.question}</small>
                </strong>
                <b>{dimension.weight} PTS</b>
              </summary>
              <div className="rubric-levels">
                {dimension.levels.map((descriptor, level) => (
                  <div key={descriptor}>
                    <span>LEVEL {level}</span>
                    <p>{descriptor}</p>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
        <div className="score-band-grid">
          {scoreBands.map(([score, interpretation]) => (
            <div key={score}>
              <strong>{score}</strong>
              <span>{interpretation}</span>
            </div>
          ))}
        </div>
        <div className="refusal-standard">
          <h3>Responsible-refusal pathway</h3>
          <p>
            Full-credit refusal is not a shortcut. It names the exact
            unsupported boundary, shows why it matters with proportionate
            evidence, delivers what can responsibly be concluded now, and
            proposes the smallest ethical next step that could close the gap or
            reduce risk.
          </p>
        </div>
      </section>

      <section className="teaching-policy">
        <div>
          <p className="document-kicker">ASSESSMENT BOUNDARY</p>
          <h2>The viewer records mechanics. Instructors evaluate judgment.</h2>
          <p>
            The current release captures successful browser runs with
            executed-code hashes, flags outputs that predate later worksheet
            edits, checks exported workspace files against their saved hashes,
            and records whether an explicitly bound handoff file is non-empty.
            It does not verify artifact quality, analytical grain, cutoff
            validity, inference, or recommendation quality.
          </p>
        </div>
        <nav aria-label="Instructor utilities">
          <SiteLink path="/teach/replay" rel="nofollow">
            OPEN A LEARNER SUBMISSION →
          </SiteLink>
          <SiteLink path="/teach/spoilers" rel="nofollow">
            OPEN SPOILER-SEPARATED INSTRUCTOR NOTES →
          </SiteLink>
        </nav>
      </section>
    </main>
  );
}
