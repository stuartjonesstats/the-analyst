import type { AnchorHTMLAttributes, ReactNode } from 'react';

import { sitePath } from '@/lib/site-path';

type SiteLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  path: string;
  children: ReactNode;
};

export function SiteLink({ path, children, ...props }: SiteLinkProps) {
  return <a href={sitePath(path)} {...props}>{children}</a>;
}
