import type { Metadata } from 'next';
import { ArrowRight, Database, FileCode2, ShieldCheck } from 'lucide-react';

import { PublicShell } from '@/components/public-shell';
import { SiteLink } from '@/components/site-link';
import { scenarios } from '@/lib/scenarios';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'The Analyst — Applied Data Science Work Simulations',
  description: 'Practice SQL, Python, analytical judgment, and professional handoffs across nine browser-based workplace simulations.',
};

export default function HomePage() {
  return (
    <PublicShell currentPath="/">
      <main className="public-main" id="main-content" tabIndex={-1}>
        <section className="public-hero">
          <div className="hero-rail">
            <span>SIMULATION WORLD / MERIDIAN LIVING SYSTEMS</span>
            <span>FROZEN ENTERPRISE ESTATE / REV 2026.09</span>
          </div>
          <div className="hero-copy">
            <p className="public-kicker">ANALYTICAL WORK, UNDER OPERATING CONDITIONS</p>
            <h1>
              Do the work.
              <br />
              Defend the decision.
            </h1>
            <p className="hero-deck">
              The Analyst places you inside Meridian Living Systems, a fictional products-and-services company. Across nine assignments, you step into different analyst roles and confront what clean tutorials remove: unclear requests, competing clocks, unreliable grains, operational limits, and accountable handoffs.
            </p>
            <div className="hero-actions">
              <SiteLink path="/workbench" className="action-primary">
                OPEN ASSIGNMENT DESK <ArrowRight />
              </SiteLink>
              <SiteLink path="/self-guided" className="action-secondary">
                SELF-GUIDED MANUAL
              </SiteLink>
            </div>
            <p className="hero-device-note">WORKSPACE NOTE / Complete assignments in a current laptop or desktop browser.</p>
          </div>
          <div className="hero-instrument" aria-label="System inventory">
            <div>
              <span>ASSIGNMENTS</span>
              <strong>09</strong>
              <small>brief to practicum</small>
            </div>
            <div>
              <span>ENTERPRISE SCHEMAS</span>
              <strong>16</strong>
              <small>96 documented tables</small>
            </div>
            <div>
              <span>FULL ESTATE</span>
              <strong>16.5M</strong>
              <small>synthetic source rows</small>
            </div>
            <div>
              <span>RUNTIME</span>
              <strong>LOCAL</strong>
              <small>SQL + Python in browser</small>
            </div>
          </div>
        </section>

        <section className="world-brief" aria-labelledby="meridian-world-title">
          <div className="section-index">01 / THE SIMULATION WORLD</div>
          <div className="world-brief-copy">
            <p className="public-kicker">YOUR EMPLOYER, FOR THE DURATION OF THE WORK</p>
            <h2 id="meridian-world-title">Welcome to Meridian. Your inbox is already full.</h2>
            <p>
              <strong>The Analyst</strong> is the training environment. <strong>Meridian Living Systems</strong> is the fictional company inside it: a multi-region operator selling connected-home products and subscriptions, dispatching field service, running warehouses and commerce, and supporting customers after the
              sale.
            </p>
            <p>
              Meridian has grown through acquisitions, platform migrations, new models, and operational change. Its data reflects that history. Across nine assignments, you move between teams and moments in the same company. The systems, customers, devices, branches, definitions, and consequences belong to one
              connected estate—not nine unrelated classroom datasets.
            </p>
          </div>
          <aside className="world-brief-note" aria-label="Your place in the simulation">
            <span>YOUR PLACE IN THE WORLD</span>
            <strong>You are the analyst on duty.</strong>
            <p>A stakeholder has a decision to make. The request is incomplete, the clock is running, and your work must survive another analyst’s review.</p>
            <dl>
              <div>
                <dt>COMPANY</dt>
                <dd>Meridian Living Systems</dd>
              </div>
              <div>
                <dt>ENVIRONMENT</dt>
                <dd>The Analyst</dd>
              </div>
              <div>
                <dt>WORK UNIT</dt>
                <dd>Analyst assignment</dd>
              </div>
              <div>
                <dt>OUTPUT</dt>
                <dd>Defensible handoff</dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="operating-principles" aria-labelledby="what-this-is">
          <div className="section-index">02 / OPERATING MODEL</div>
          <div className="section-lead">
            <h2 id="what-this-is">A workbench, not a walkthrough.</h2>
            <p>Learners receive a role, an imperfect request, a governed data neighborhood, and a deadline. The system supplies tools and evidence—not a hidden preferred conclusion.</p>
          </div>
          <div className="principle-register">
            <article>
              <Database />
              <span>01</span>
              <h3>Interrogate the estate</h3>
              <p>Use SQL to establish grain, point-in-time availability, and reconciled evidence before reaching for a model.</p>
            </article>
            <article>
              <FileCode2 />
              <span>02</span>
              <h3>Analyze in Python</h3>
              <p>Profile, visualize, test, backtest, simulate, or model with the package profile appropriate to the assignment.</p>
            </article>
            <article>
              <ShieldCheck />
              <span>03</span>
              <h3>Leave an audit trail</h3>
              <p>Export the exact SQL, Python, working notes, final brief, evidence, captured outputs, versions, and hashes in one portable submission.</p>
            </article>
          </div>
        </section>

        <section className="case-preview" aria-labelledby="case-preview-title">
          <div className="section-index">03 / ASSIGNMENT SEQUENCE</div>
          <div className="section-lead split">
            <div>
              <h2 id="case-preview-title">Built to progress.</h2>
              <p>The sequence moves from metric reconciliation to production-grade model risk. Complexity rises, but judgment begins in assignment one.</p>
            </div>
            <SiteLink path="/projects">
              VIEW ALL NINE ASSIGNMENTS <ArrowRight />
            </SiteLink>
          </div>
          <div className="case-preview-list">
            {scenarios.slice(0, 4).map((scenario) => (
              <SiteLink key={scenario.id} path={`/workbench/?case=${scenario.slug}`} className="case-preview-row">
                <span>{String(scenario.sequence).padStart(2, '0')}</span>
                <div>
                  <small>{scenario.businessUnit}</small>
                  <strong>{scenario.title}</strong>
                </div>
                <p>{scenario.request}</p>
                <b>{scenario.band}</b>
                <ArrowRight />
              </SiteLink>
            ))}
          </div>
        </section>

        <section className="section-lead split home-self-guided" aria-labelledby="home-self-guided-title">
          <div>
            <span className="public-kicker">FOR INDEPENDENT LEARNERS</span>
            <h2 id="home-self-guided-title">Run a serious course of study—without pretending you have an instructor.</h2>
            <p>The self-guided manual supplies readiness gates, honest workload routes, a repeatable assignment cadence, stuck protocols, and a spoiler-controlled way to review your own work.</p>
          </div>
          <SiteLink path="/self-guided">
            OPEN SELF-GUIDED MANUAL <ArrowRight />
          </SiteLink>
        </section>

        <section className="section-lead split" aria-labelledby="home-instructor-note">
          <div>
            <span className="public-kicker" id="home-instructor-note">
              FOR INSTRUCTORS AND FACILITATORS
            </span>
            <p>Planning guidance, workload bands, assessment boundaries, and local review tools sit in a deliberately separate instructor desk so the learner route stays focused on the work.</p>
          </div>
          <SiteLink path="/teach" rel="nofollow">
            OPEN INSTRUCTOR DESK <ArrowRight />
          </SiteLink>
        </section>

        <section className="public-cta">
          <div>
            <span>MONDAY / 08:05 / CUSTOMER CARE</span>
            <h2>Your first assignment is already on the desk.</h2>
          </div>
          <SiteLink path="/workbench">
            OPEN CC-241202 <ArrowRight />
          </SiteLink>
        </section>
      </main>
    </PublicShell>
  );
}
