import type { Metadata } from 'next';
import { ArrowUpRight, Send, ShieldCheck } from 'lucide-react';

import { PublicShell } from '@/components/public-shell';
import { SiteLink } from '@/components/site-link';
import { fieldWorkEntries } from '@/lib/field-work';
import { publicFeatures } from '@/lib/public-features';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Field Work — The Analyst',
  description: 'Voluntarily shared repositories, notebooks, articles, and portfolio work created by analysts using The Analyst.',
  robots: publicFeatures.fieldWork ? { index: true, follow: true } : { index: false, follow: false },
  alternates: { canonical: '/field-work/' },
  openGraph: {
    title: 'Field Work — The Analyst',
    description: 'Published analyses from people working inside the Meridian data estate.',
    url: '/field-work/',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Field Work from The Analyst community' }],
  },
};

const submissionUrl = 'https://github.com/stuartjonesstats/the-analyst/issues/new?template=field-work-submission.yml';

export default function FieldWorkPage() {
  if (!publicFeatures.fieldWork) {
    return (
      <PublicShell>
        <main className="public-main field-work-page" id="main-content" tabIndex={-1}>
          <header className="public-page-head field-work-head">
            <p className="public-kicker">FIELD WORK / HELD FOR A LATER RELEASE</p>
            <h1>The gallery is not open yet.</h1>
            <p>
              The editorial and consent system is ready, but Field Work will open only after enough analysts are publishing substantial work to support a useful, varied gallery.
            </p>
          </header>
          <section className="section-lead split">
            <div>
              <span className="public-kicker">DELIBERATE LAUNCH</span>
              <h2>Community should follow the work—not pretend to precede it.</h2>
              <p>For now, build a portfolio from an assignment or work a compact Priority Brief. No submissions are being accepted while the gallery is held.</p>
            </div>
            <SiteLink path="/projects">VIEW ASSIGNMENTS <ArrowUpRight /></SiteLink>
          </section>
        </main>
      </PublicShell>
    );
  }

  return (
    <PublicShell currentPath="/field-work">
      <main className="public-main field-work-page" id="main-content" tabIndex={-1}>
        <header className="public-page-head field-work-head">
          <p className="public-kicker">FIELD WORK / VOLUNTARILY SHARED</p>
          <h1>Analysis that left the workbench.</h1>
          <p>
            Repositories, notebooks, articles, and portfolio pages published by people using The Analyst. These are independent approaches—not official answers, rankings, or certifications.
          </p>
        </header>

        <section className="field-work-standard" aria-labelledby="field-work-standard-title">
          <div>
            <span className="section-index">01 / PUBLICATION STANDARD</span>
            <h2 id="field-work-standard-title">The work belongs to its analyst.</h2>
            <p>
              Every entry remains on its author’s public site. The Analyst publishes only an approved synopsis and link after a human review for relevance, consent, privacy, and basic reproducibility.
            </p>
          </div>
          <dl>
            <div><dt>HOSTING</dt><dd>External and author-controlled</dd></div>
            <div><dt>SELECTION</dt><dd>Editorial, never ranked</dd></div>
            <div><dt>CONCLUSIONS</dt><dd>Independent and potentially different</dd></div>
            <div><dt>REMOVAL</dt><dd>Available through the public tracker</dd></div>
          </dl>
        </section>

        <section className="field-work-register" aria-labelledby="field-work-register-title">
          <div className="section-lead split">
            <div>
              <span className="public-kicker">SELECTED PUBLIC WORK</span>
              <h2 id="field-work-register-title">Different analysts. Defensible paths.</h2>
              <p>Complete approaches may contain assignment spoilers. Open them when you are ready to compare reasoning rather than copy a route.</p>
            </div>
          </div>

          {fieldWorkEntries.length > 0 ? (
            <div className="field-work-grid">
              {fieldWorkEntries.map((entry) => (
                <article key={entry.id} className="field-work-card">
                  <header><span>{entry.artifactType}</span><time dateTime={entry.sharedAt}>{entry.sharedAt}</time></header>
                  <p className="field-work-assignment">{entry.assignment}</p>
                  <h3>{entry.title}</h3>
                  <p>{entry.synopsis}</p>
                  <blockquote>{entry.reflection}</blockquote>
                  <ul aria-label="Methods and skills">{entry.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul>
                  <footer><span>BY {entry.author}</span><a href={entry.url} target="_blank" rel="noreferrer">OPEN PUBLIC WORK <ArrowUpRight /></a></footer>
                </article>
              ))}
            </div>
          ) : (
            <div className="field-work-intake">
              <div className="field-work-intake-code" aria-hidden="true">FW / 000</div>
              <div>
                <span>FIRST REVIEW WINDOW / OPEN</span>
                <h3>The gallery begins with work shared on purpose.</h3>
                <p>
                  No work has been approved for publication yet. That is intentional: we will not invent examples or publish learner files automatically. If you have completed an assignment or Priority Brief, you can submit a public artifact for the first review.
                </p>
              </div>
              <a className="field-work-submit" href={submissionUrl} target="_blank" rel="noreferrer">
                SUBMIT PUBLIC WORK <Send />
              </a>
            </div>
          )}
        </section>

        <section className="field-work-submit-panel" aria-labelledby="field-work-submit-title">
          <div>
            <ShieldCheck />
            <span>PUBLIC SUBMISSION / HUMAN REVIEW</span>
            <h2 id="field-work-submit-title">Share the artifact—not your private record.</h2>
          </div>
          <ol>
            <li><b>01</b><span>Publish a repository, notebook, article, or portfolio page that you control.</span></li>
            <li><b>02</b><span>Remove credentials, personal data, learner IDs, and employer or client material.</span></li>
            <li><b>03</b><span>Submit the public URL, synopsis, reflection, and explicit permission through GitHub.</span></li>
            <li><b>04</b><span>A human reviews it before anything appears in the gallery.</span></li>
          </ol>
          <p className="field-work-public-note">
            The submission tracker is public. Do not include an email address or anything you do not want published.
          </p>
          <div className="field-work-actions">
            <a href={submissionUrl} target="_blank" rel="noreferrer">OPEN SUBMISSION FORM <ArrowUpRight /></a>
            <a href="https://github.com/stuartjonesstats/the-analyst/issues/new" target="_blank" rel="noreferrer">REQUEST A CORRECTION OR REMOVAL <ArrowUpRight /></a>
            <SiteLink path="/projects">CHOOSE AN ASSIGNMENT <ArrowUpRight /></SiteLink>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
