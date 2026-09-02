import type { Metadata } from 'next';

import { DataRegister } from '@/components/data-register';
import { PublicShell } from '@/components/public-shell';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Meridian Data Register — The Analyst',
  description:
    'Search Meridian Living Systems schemas, tables, grains, keys, relationships, reliability notes, and column definitions.',
};

export default function DataPage() {
  return (
    <PublicShell currentPath="/data">
      <main className="public-main data-page" id="main-content" tabIndex={-1}>
        <header className="public-page-head">
          <p className="public-kicker">
            ENTERPRISE DATA REGISTER / FROZEN SNAPSHOT
          </p>
          <h1>Know the table before you trust the number.</h1>
          <p>
            Inspect the registered Meridian estate and the smaller extracts
            mounted for each assignment. Catalog records include declared grain,
            keys, relationships, ownership, reliability, and physical column
            profiles; intended-use guidance and known conditions appear where
            they have been documented.
          </p>
        </header>
        <DataRegister />
      </main>
    </PublicShell>
  );
}
