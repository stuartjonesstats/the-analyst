import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight, Clock3, Database, Monitor } from 'lucide-react';

import { PassTheBrief } from '@/components/pass-the-brief';
import { PublicShell } from '@/components/public-shell';
import { SiteLink } from '@/components/site-link';
import {
  assignmentPublications,
  assignmentPublicationsBySlug,
  assignmentSocialImageUrl,
  assignmentUrl,
} from '@/lib/assignment-publication';
import { complexityDimensions } from '@/lib/scenarios';

import styles from './assignment-brief.module.css';

export const dynamic = 'force-static';
export const dynamicParams = false;

type AssignmentPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return assignmentPublications.map(({ scenario }) => ({
    slug: scenario.slug,
  }));
}

export async function generateMetadata({
  params,
}: AssignmentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const publication = assignmentPublicationsBySlug[slug];
  if (!publication) return {};

  const { scenario } = publication;
  const title = `${scenario.title} — Analyst Assignment`;
  const description = `${scenario.request} Work as Meridian’s ${scenario.role} in a browser-based SQL and Python simulation.`;
  const canonical = assignmentUrl(slug);
  const image = assignmentSocialImageUrl(slug);
  const imageAlt = `${scenario.title}: ${scenario.role} assignment from The Analyst`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'The Analyst',
      type: 'website',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: imageAlt,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: image, alt: imageAlt }],
    },
  };
}

export default async function AssignmentPage({ params }: AssignmentPageProps) {
  const { slug } = await params;
  const publication = assignmentPublicationsBySlug[slug];

  if (!publication) {
    return (
      <PublicShell currentPath="/projects">
        <main className="public-main" id="main-content" tabIndex={-1}>
          <section className={styles.notFound}>
            <p>ASSIGNMENT REGISTER / NO MATCH</p>
            <h1>That brief is not on the desk.</h1>
            <SiteLink path="/projects">RETURN TO ASSIGNMENTS</SiteLink>
          </section>
        </main>
      </PublicShell>
    );
  }

  const { scenario, tension, mandate, shareCaption, accent } = publication;
  const schemaCount = new Set(
    scenario.sourceTables.map((table) => table.split('.')[0]),
  ).size;

  return (
    <PublicShell currentPath="/projects">
      <main className="public-main" id="main-content" tabIndex={-1}>
        <article
          style={{ '--assignment-accent': accent } as React.CSSProperties}
        >
          <header className={styles.hero}>
            <div className={styles.heroRail} aria-hidden="true">
              <span>
                MERIDIAN / ASSIGNMENT{' '}
                {String(scenario.sequence).padStart(2, '0')}
              </span>
              <span>{scenario.id}</span>
            </div>
            <div className={styles.heroCopy}>
              <SiteLink path="/projects" className={styles.backLink}>
                <ArrowLeft aria-hidden="true" /> ASSIGNMENT REGISTER
              </SiteLink>
              <p className={styles.eyebrow}>
                {scenario.businessUnit.toUpperCase()} / INCOMING BRIEF
              </p>
              <h1>{scenario.title}</h1>
              <p className={styles.request}>{scenario.request}</p>
              <div className={styles.heroActions}>
                <SiteLink
                  path={`/workbench/?case=${scenario.slug}`}
                  className={styles.primaryAction}
                >
                  ACCEPT THE ASSIGNMENT <ArrowRight aria-hidden="true" />
                </SiteLink>
                <a href="#pass-the-brief" className={styles.secondaryAction}>
                  PASS THE BRIEF <ArrowRight aria-hidden="true" />
                </a>
              </div>
              <p className={styles.deviceNote}>
                <Monitor aria-hidden="true" /> Preview anywhere. Complete the
                work in a current laptop or desktop browser.
              </p>
            </div>
            <dl className={styles.heroFacts}>
              <div>
                <dt>ASSIGNMENT</dt>
                <dd>{scenario.id}</dd>
              </div>
              <div>
                <dt>YOUR ROLE</dt>
                <dd>{scenario.role}</dd>
              </div>
              <div>
                <dt>WORKLOAD</dt>
                <dd>{scenario.preparedHours} hours</dd>
                <small>prepared learner</small>
              </div>
              <div>
                <dt>COMPLEXITY BAND</dt>
                <dd>{scenario.band}</dd>
              </div>
            </dl>
          </header>

          <section
            className={styles.briefGrid}
            aria-labelledby="situation-title"
          >
            <div className={styles.sectionNumber}>01 / SITUATION</div>
            <div className={styles.situation}>
              <p className={styles.eyebrow}>THE OPERATING MOMENT</p>
              <h2 id="situation-title">The decision is already in motion.</h2>
              <p className={styles.tension}>{tension}</p>
              <div className={styles.mandate}>
                <span>YOUR MANDATE</span>
                <p>{mandate}</p>
              </div>
            </div>
            <aside className={styles.dispatch} aria-label="Assignment dispatch">
              <header>DISPATCH RECORD</header>
              <dl>
                <div>
                  <dt>RECEIVED</dt>
                  <dd>{scenario.moment}</dd>
                </div>
                <div>
                  <dt>BUSINESS UNIT</dt>
                  <dd>{scenario.businessUnit}</dd>
                </div>
                <div>
                  <dt>EXPECTED ARTIFACTS</dt>
                  <dd>{scenario.artifactCount}</dd>
                </div>
                <div>
                  <dt>NEWER LEARNER</dt>
                  <dd>{scenario.newcomerHours} hours</dd>
                </div>
              </dl>
            </aside>
          </section>

          <section
            className={styles.operatingGrid}
            aria-labelledby="operating-title"
          >
            <div className={styles.sectionNumber}>
              02 / OPERATING CONDITIONS
            </div>
            <div className={styles.operatingBody}>
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.eyebrow}>WHAT THE WORK DEMANDS</p>
                  <h2 id="operating-title">
                    Interrogate before you recommend.
                  </h2>
                </div>
                <p>
                  You receive access to a bounded part of Meridian’s synthetic
                  enterprise estate. The briefing defines the decision—not the
                  analytical path or a preferred answer.
                </p>
              </div>
              <div className={styles.capabilityCards}>
                <article>
                  <span>SQL / EVIDENCE CONSTRUCTION</span>
                  <h3>Establish the facts.</h3>
                  <p>{scenario.sqlCore}</p>
                </article>
                <article>
                  <span>PYTHON / ANALYTICAL JUDGMENT</span>
                  <h3>Stress-test the decision.</h3>
                  <p>{scenario.pythonCore}</p>
                </article>
              </div>
              <div className={styles.complexity}>
                <header>
                  <span>CAPABILITY PROFILE</span>
                  <small>1 FOUNDATION / 5 ADVANCED</small>
                </header>
                <div>
                  {complexityDimensions.map(({ key, label }) => (
                    <div key={key}>
                      <span>{label}</span>
                      <meter
                        aria-label={`${label} level`}
                        min={1}
                        max={5}
                        value={scenario.complexity[key]}
                      />
                      <strong>{scenario.complexity[key]}/5</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section
            className={styles.readinessGrid}
            aria-labelledby="readiness-title"
          >
            <div className={styles.sectionNumber}>03 / READINESS</div>
            <div className={styles.readinessBody}>
              <div>
                <p className={styles.eyebrow}>BEFORE YOU ACCEPT</p>
                <h2 id="readiness-title">Know the neighborhood.</h2>
                <p>
                  This is an open-ended workplace simulation. You can inspect
                  the available schemas and tables before committing to an
                  approach, but the brief intentionally does not identify every
                  useful field or analytic test.
                </p>
              </div>
              <div className={styles.readinessLists}>
                <div>
                  <span>RECOMMENDED PREREQUISITES</span>
                  <ul>
                    {scenario.prerequisites.map((prerequisite) => (
                      <li key={prerequisite}>{prerequisite}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span>DATA NEIGHBORHOOD</span>
                  <p className={styles.neighborhoodCount}>
                    <Database aria-hidden="true" />{' '}
                    {scenario.sourceTables.length} tables across {schemaCount}{' '}
                    {schemaCount === 1 ? 'schema' : 'schemas'}
                  </p>
                  <ul>
                    {scenario.sourceTables.map((table) => (
                      <li key={table}>
                        <code>{table}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.acceptance}>
            <div>
              <span>{scenario.moment.toUpperCase()}</span>
              <h2>Take the desk as {scenario.role}.</h2>
              <p>
                Your SQL, Python, notes, evidence, figures, and final handoff
                stay in your browser until you choose to export them.
              </p>
            </div>
            <SiteLink
              path={`/workbench/?case=${scenario.slug}`}
              className={styles.acceptanceAction}
            >
              OPEN WORKBENCH <ArrowRight aria-hidden="true" />
            </SiteLink>
          </section>

          <div className={styles.shareWrap} id="pass-the-brief">
            <PassTheBrief
              assignmentId={scenario.id}
              slug={scenario.slug}
              title={scenario.title}
              role={scenario.role}
              caption={shareCaption}
            />
          </div>

          <nav
            className={styles.assignmentNav}
            aria-label="Assignment navigation"
          >
            <SiteLink path="/projects">
              <ArrowLeft aria-hidden="true" /> ALL ASSIGNMENTS
            </SiteLink>
            <span>
              <Clock3 aria-hidden="true" /> EXPECTED WORKLOAD /{' '}
              {scenario.preparedHours} HOURS
            </span>
          </nav>
        </article>
      </main>
    </PublicShell>
  );
}
