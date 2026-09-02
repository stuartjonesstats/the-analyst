'use client';

import { useSyncExternalStore, type AnchorHTMLAttributes, type ReactNode } from 'react';

import { sitePath } from '@/lib/site-path';

type SiteLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  path: string;
  children: ReactNode;
};

export function SiteLink({ path, children, ...props }: SiteLinkProps) {
  const staticHref = sitePath(path);
  const locationSearch = useSyncExternalStore(
    (notify) => {
      window.addEventListener('popstate', notify);
      return () => window.removeEventListener('popstate', notify);
    },
    () => window.location.search,
    () => '',
  );
  const activeAssignment = new URLSearchParams(locationSearch).get('case');
  const destination = new URL(staticHref, 'https://theanalyst.dev');
  if (activeAssignment && !destination.searchParams.has('case')) {
    destination.searchParams.set('case', activeAssignment);
  }
  const href = `${destination.pathname}${destination.search}${destination.hash}`;

  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
