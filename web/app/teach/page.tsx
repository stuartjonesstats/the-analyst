import type { Metadata } from 'next';

import { SiteLink } from '@/components/site-link';
import { complexityDimensions, scenarios } from '@/lib/scenarios';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Instructor Planning Desk — The Analyst',
  description: 'Sequence, prerequisites, workload, scaffolding, and technical requirements for The Analyst case curriculum.',
  robots: { index: false, follow: false },
  openGraph: { images: [] },
  twitter: { images: [] },
};

const bandDescriptions = [
  ['Brief', 'One focused decision with a supplied neighborhood; approximately 3–5 prepared-learner hours.'],
  ['Investigation', 'Several assets and competing explanations; approximately 6–12 hours.'],
  ['Decision case', 'Multi-stage evidence and several professional artifacts; approximately 10–18 hours.'],
  ['Practicum', 'End-to-end build, audit, forecasting, or deployment work; approximately 16–30+ newcomer hours.'],
];

export default function TeachPage() {
  return (
    <main className="teaching-page">
      <header className="teaching-header">
        <div className="teaching-brand"><span>MA</span><strong>MERIDIAN / INSTRUCTOR PLANNING DESK</strong></div>
        <SiteLink path="/workbench">RETURN TO LEARNER WORKBENCH</SiteLink>
      </header>

      <section className="teaching-intro">
        <p className="document-kicker">THE ANALYST / NINE-CASE CURRICULUM</p>
        <h1>Plan a progression, not a pile of projects.</h1>
        <p>
          This area exposes workload, prerequisites, tool emphasis, scaffolding, and teaching sequence.
          It contains no case solutions. Prepared-hour estimates assume a learner can work independently;
          newcomer ranges assume active instructor support.
        </p>
      </section>

      <section className="band-register" aria-labelledby="band-heading">
        <div className="teaching-section-title"><span id="band-heading">WORKLOAD BANDS</span><b>NOT GRADES</b></div>
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

      <section className="curriculum-register" aria-labelledby="sequence-heading">
        <div className="teaching-section-title">
          <span id="sequence-heading">RECOMMENDED SEQUENCE</span>
          <b>24-WEEK PROGRAM / 16-WEEK SEMESTER</b>
        </div>

        <div className="curriculum-table-wrap">
          <table className="curriculum-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Case</th>
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
                  <td><strong>{scenario.title}</strong><small>{scenario.role}</small></td>
                  <td>{scenario.band}</td>
                  <td>{scenario.preparedHours}h</td>
                  <td>{scenario.newcomerHours}h</td>
                  <td><span className="mini-meter"><i style={{ width: `${scenario.complexity.sql * 20}%` }} /></span>{scenario.complexity.sql}/5</td>
                  <td><span className="mini-meter python"><i style={{ width: `${scenario.complexity.python * 20}%` }} /></span>{scenario.complexity.python}/5</td>
                  <td className={`state-${scenario.status}`}>{scenario.status.replaceAll('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="case-planning-grid" aria-label="Case planning details">
        {scenarios.map((scenario) => (
          <article className="planning-card" key={scenario.id}>
            <header>
              <span>{String(scenario.sequence).padStart(2, '0')} / {scenario.id}</span>
              <b>{scenario.band}</b>
            </header>
            <h2>{scenario.title}</h2>
            <p className="planning-request">{scenario.request}</p>
            <dl>
              <div><dt>SQL CORE</dt><dd>{scenario.sqlCore}</dd></div>
              <div><dt>PYTHON CORE</dt><dd>{scenario.pythonCore}</dd></div>
              <div><dt>PREREQUISITES</dt><dd>{scenario.prerequisites.join(' · ')}</dd></div>
              <div><dt>HANDOFF</dt><dd>{scenario.artifactCount} professional artifacts · {scenario.packageProfile} runtime</dd></div>
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

      <section className="teaching-policy">
        <div>
          <p className="document-kicker">ASSESSMENT BOUNDARY</p>
          <h2>Machines verify mechanics. Instructors evaluate judgment.</h2>
          <p>
            Execution, artifact presence, declared schemas, hashes, and exact scenario-authored invariants may be
            verified. Metric quality, causal language, modeling choices, uncertainty, and recommendations remain
            human-reviewed.
          </p>
        </div>
        <nav aria-label="Instructor utilities">
          <SiteLink path="/teach/replay" rel="nofollow">OPEN A LEARNER SUBMISSION →</SiteLink>
          <SiteLink path="/teach/spoilers" rel="nofollow">OPEN SPOILER-SEPARATED CASE NOTES →</SiteLink>
        </nav>
      </section>
    </main>
  );
}
