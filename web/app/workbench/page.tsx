import type { Metadata } from 'next';

import { WorkbenchRouter } from '@/components/workbench-router';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Assignment Workbench — The Analyst',
  description: 'Investigate a Meridian assignment with local SQL and Python tools, working notes, evidence, and a portable analytical handoff.',
};

export default function WorkbenchPage() {
  return <WorkbenchRouter />;
}
