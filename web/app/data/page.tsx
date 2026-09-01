import { DataRegister } from '@/components/data-register';
import { PublicShell } from '@/components/public-shell';

export const dynamic = 'force-static';

export default function DataPage() {
  return (
    <PublicShell>
      <main className="public-main data-page">
        <header className="public-page-head">
          <p className="public-kicker">ENTERPRISE DATA REGISTER / FROZEN SNAPSHOT</p>
          <h1>Know the table before you trust the number.</h1>
          <p>Search all 16 schemas and 96 tables in the full Meridian estate. Every record declares its grain, keys, relationships, reliability, intended use, known exceptions, and column types.</p>
        </header>
        <DataRegister />
      </main>
    </PublicShell>
  );
}

