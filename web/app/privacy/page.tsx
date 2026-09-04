import type { Metadata } from 'next';

import { PublicShell } from '@/components/public-shell';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Privacy & Analytics — The Analyst',
  description: 'How The Analyst keeps learner work local and uses limited site-usage analytics.',
};

const commitments = [
  [
    '01',
    'Learner work stays on the device',
    'SQL, Python, notes, results, figures, local drafts, imported submissions, and generated submission files are processed in the learner’s browser. The Analyst does not upload that work to its own server or to Google Analytics.',
  ],
  [
    '02',
    'Site usage is measured',
    'The site uses Google Analytics 4 to understand visits and page usage. Google Analytics may receive page URLs, referral information, browser and device details, approximate location, and enabled interaction events. It may use cookies or similar browser storage.',
  ],
  [
    '03',
    'The simulation uses fictional data',
    'Meridian Living Systems and its data estate are synthetic. Do not paste real employer, client, customer, patient, student, or other protected information into the workbench or an AI help packet.',
  ],
] as const;

export default function PrivacyPage() {
  return (
    <PublicShell currentPath="/privacy">
      <main className="public-main" id="main-content" tabIndex={-1}>
        <header className="public-page-head">
          <p className="public-kicker">PRIVACY / ANALYTICS DISCLOSURE</p>
          <h1>Measure the site. Keep the work local.</h1>
          <p>The Analyst uses limited usage analytics to understand whether the public resource is being found and used. Analytical work remains a local browser activity and is not inspected or scored through analytics.</p>
        </header>

        <section className="approach-register">
          {commitments.map(([index, title, body]) => (
            <article key={index}>
              <span>{index}</span>
              <h2>{title}</h2>
              <p>{body}</p>
            </article>
          ))}
        </section>

        <section className="section-lead split" aria-labelledby="privacy-controls-title">
          <div>
            <span className="public-kicker" id="privacy-controls-title">CHOICE AND CONTROL</span>
            <p>You can use browser privacy controls or extensions to limit analytics. Courses and institutions should apply any additional consent or disclosure requirements that govern their learners.</p>
          </div>
          <a href="https://policies.google.com/privacy">GOOGLE PRIVACY POLICY ↗</a>
        </section>

        <section className="public-cta compact">
          <div>
            <span>LAST UPDATED</span>
            <h2>September 3, 2026</h2>
          </div>
          <a href="https://github.com/stuartjonesstats/the-analyst">VIEW PROJECT SOURCE ↗</a>
        </section>
      </main>
    </PublicShell>
  );
}
