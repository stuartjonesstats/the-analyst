import type { Metadata } from 'next';
import Link from 'next/link';

import { instructorNotes } from '@/lib/instructor-notes';

export const metadata: Metadata = {
  title: 'Instructor Case Notes — The Analyst',
  description: 'Spoiler-separated instructor truths and review cautions for The Analyst case curriculum.',
  robots: { index: false, follow: false },
  openGraph: { images: [] },
  twitter: { images: [] },
};

export default function SpoilerPack() {
  return (
    <main className="teaching-page spoiler-page">
      <header className="teaching-header">
        <div className="teaching-brand"><span>MA</span><strong>MERIDIAN / INSTRUCTOR CASE NOTES</strong></div>
        <Link href="/teach" prefetch={false}>RETURN TO PLANNING DESK</Link>
      </header>

      <section className="spoiler-warning">
        <p className="document-kicker">SPOILER-SEPARATED / PUBLIC RESOURCE</p>
        <h1>This page discloses the cases’ planted mechanisms.</h1>
        <p>
          Keep learners in the workbench. These notes establish what the data generator actually encodes,
          where refusal is valid, and what not to grade toward. They are review guidance—not answer keys.
        </p>
      </section>

      <section className="spoiler-register">
        {instructorNotes.map((note, index) => (
          <details key={note.id}>
            <summary>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{note.title}<small>{note.id}</small></strong>
              <b className={`readiness-${note.readiness.includes('progress') ? 'hold' : 'ready'}`}>{note.readiness}</b>
            </summary>
            <div>
              <p><span>ENCODED TRUTH</span>{note.truth}</p>
              <p><span>WATCH FOR</span>{note.watchFor}</p>
            </div>
          </details>
        ))}
      </section>
    </main>
  );
}
