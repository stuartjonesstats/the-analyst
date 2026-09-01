import { ArrowRight, Database, FileCode2, ShieldCheck } from 'lucide-react';

import { PublicShell } from '@/components/public-shell';
import { SiteLink } from '@/components/site-link';
import { scenarios } from '@/lib/scenarios';

export const dynamic = 'force-static';

export default function HomePage() {
  return (
    <PublicShell>
      <main className="public-main">
        <section className="public-hero">
          <div className="hero-rail">
            <span>MERIDIAN LIVING SYSTEMS</span>
            <span>FROZEN ENTERPRISE ESTATE / REV 2026.09</span>
          </div>
          <div className="hero-copy">
            <p className="public-kicker">AN APPLIED DATA-SCIENCE CASE SYSTEM</p>
            <h1>Do the work.<br />Defend the decision.</h1>
            <p className="hero-deck">
              Nine browser-based simulations built around the part of analytics that clean tutorials remove:
              unclear requests, competing clocks, unreliable grains, operational limits, and accountable handoffs.
            </p>
            <div className="hero-actions">
              <SiteLink path="/workbench" className="action-primary">ENTER CASEWORK <ArrowRight /></SiteLink>
              <SiteLink path="/guide" className="action-secondary">READ THE FIELD GUIDE</SiteLink>
            </div>
          </div>
          <div className="hero-instrument" aria-label="System inventory">
            <div><span>CASE FILES</span><strong>09</strong><small>brief to practicum</small></div>
            <div><span>ENTERPRISE SCHEMAS</span><strong>16</strong><small>96 documented tables</small></div>
            <div><span>FULL ESTATE</span><strong>16.5M</strong><small>synthetic source rows</small></div>
            <div><span>RUNTIME</span><strong>LOCAL</strong><small>SQL + Python in browser</small></div>
          </div>
        </section>

        <section className="operating-principles" aria-labelledby="what-this-is">
          <div className="section-index">01 / OPERATING MODEL</div>
          <div className="section-lead">
            <h2 id="what-this-is">A workbench, not a walkthrough.</h2>
            <p>Learners receive a role, an imperfect request, a governed data neighborhood, and a deadline. The system supplies tools and evidence—not a hidden preferred conclusion.</p>
          </div>
          <div className="principle-register">
            <article><Database /><span>01</span><h3>Interrogate the estate</h3><p>Use SQL to establish grain, point-in-time availability, and reconciled evidence before reaching for a model.</p></article>
            <article><FileCode2 /><span>02</span><h3>Analyze in Python</h3><p>Profile, visualize, test, backtest, simulate, or model with the package profile appropriate to the case.</p></article>
            <article><ShieldCheck /><span>03</span><h3>Leave an audit trail</h3><p>Export the exact SQL, Python, notes, evidence, captured outputs, versions, and hashes in one portable submission.</p></article>
          </div>
        </section>

        <section className="case-preview" aria-labelledby="case-preview-title">
          <div className="section-index">02 / CASE SEQUENCE</div>
          <div className="section-lead split">
            <div>
              <h2 id="case-preview-title">Built to progress.</h2>
              <p>The sequence moves from metric reconciliation to production-grade model risk. Complexity rises, but judgment begins in case one.</p>
            </div>
            <SiteLink path="/projects">VIEW ALL NINE CASES <ArrowRight /></SiteLink>
          </div>
          <div className="case-preview-list">
            {scenarios.slice(0, 4).map((scenario) => (
              <SiteLink key={scenario.id} path={`/workbench/?case=${scenario.slug}`} className="case-preview-row">
                <span>{String(scenario.sequence).padStart(2, '0')}</span>
                <div><small>{scenario.businessUnit}</small><strong>{scenario.title}</strong></div>
                <p>{scenario.request}</p>
                <b>{scenario.band}</b>
                <ArrowRight />
              </SiteLink>
            ))}
          </div>
        </section>

        <section className="public-cta">
          <div><span>NO SETUP ACCOUNT REQUIRED</span><h2>The first case is already on your desk.</h2></div>
          <SiteLink path="/workbench">OPEN CC-241202 <ArrowRight /></SiteLink>
        </section>
      </main>
    </PublicShell>
  );
}
