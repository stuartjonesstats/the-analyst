import type { ReactNode } from 'react';

import { SiteLink } from '@/components/site-link';

type PublicShellProps = {
  children: ReactNode;
};

export function PublicShell({ children }: PublicShellProps) {
  return (
    <div className="public-shell">
      <header className="public-header">
        <SiteLink path="/" className="public-brand" aria-label="The Analyst home">
          <div>
            <strong>THE ANALYST</strong>
            <small>ANALYTICAL WORK SIMULATIONS</small>
          </div>
        </SiteLink>
        <nav aria-label="Primary navigation">
          <SiteLink path="/projects">ASSIGNMENTS</SiteLink>
          <SiteLink path="/approach">APPROACH</SiteLink>
          <SiteLink path="/guide">FIELD GUIDE</SiteLink>
          <SiteLink path="/data">DATA REGISTER</SiteLink>
        </nav>
        <SiteLink path="/workbench" className="public-launch">OPEN WORKBENCH <span>↗</span></SiteLink>
      </header>
      {children}
      <footer className="public-footer">
        <div>
          <strong>THE ANALYST</strong>
          <span>Judgment under operational conditions.</span>
        </div>
        <nav aria-label="Footer navigation">
          <SiteLink path="/projects">Assignments</SiteLink>
          <SiteLink path="/data">Data dictionary</SiteLink>
          <SiteLink path="/guide">How to use</SiteLink>
          <SiteLink path="/teach" rel="nofollow">Instructor desk</SiteLink>
        </nav>
        <small>No account. No upload. Synthetic company data.</small>
      </footer>
    </div>
  );
}
