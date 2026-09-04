import type { ReactNode } from 'react';

import { SiteLink } from '@/components/site-link';

type PublicShellProps = {
  children: ReactNode;
  currentPath?: '/' | '/projects' | '/self-guided' | '/approach' | '/guide' | '/data' | '/privacy';
};

const primaryNavigation = [
  { path: '/projects', label: 'ASSIGNMENTS' },
  { path: '/self-guided', label: 'SELF-GUIDED' },
  { path: '/approach', label: 'APPROACH' },
  { path: '/data', label: 'DATA REGISTER' },
] as const;

export function PublicShell({ children, currentPath }: PublicShellProps) {
  return (
    <div className="public-shell">
      <a className="skip-link" href="#main-content">
        SKIP TO MAIN CONTENT
      </a>
      <header className="public-header">
        <SiteLink path="/" className="public-brand" aria-label="The Analyst home" aria-current={currentPath === '/' ? 'page' : undefined}>
          <div>
            <strong>THE ANALYST</strong>
            <small>ANALYTICAL WORK SIMULATIONS</small>
          </div>
        </SiteLink>
        <nav aria-label="Primary navigation">
          {primaryNavigation.map((item) => (
            <SiteLink key={item.path} path={item.path} aria-current={currentPath === item.path ? 'page' : undefined}>
              {item.label}
            </SiteLink>
          ))}
          <a href="https://github.com/stuartjonesstats/the-analyst" aria-label="Open source code on GitHub (external site)">
            OPEN SOURCE <span aria-hidden="true">↗</span>
          </a>
        </nav>
        <SiteLink path="/workbench" className="public-launch">
          OPEN WORKBENCH <span>↗</span>
        </SiteLink>
      </header>
      {children}
      <footer className="public-footer">
        <div>
          <strong>THE ANALYST</strong>
          <span>Judgment under operational conditions.</span>
        </div>
        <nav aria-label="Footer navigation">
          <SiteLink path="/projects">Assignments</SiteLink>
          <SiteLink path="/self-guided">Self-guided manual</SiteLink>
          <SiteLink path="/data">Data dictionary</SiteLink>
          <SiteLink path="/guide">Workbench guide</SiteLink>
          <SiteLink path="/privacy">Privacy</SiteLink>
          <a href="https://github.com/stuartjonesstats/the-analyst" aria-label="Open source code on GitHub (external site)">
            Open source <span aria-hidden="true">↗</span>
          </a>
          <SiteLink path="/teach" rel="nofollow">
            Instructor desk
          </SiteLink>
        </nav>
        <small>No account. Learner work stays local. Synthetic company data.</small>
      </footer>
    </div>
  );
}
