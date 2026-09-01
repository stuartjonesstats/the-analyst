'use client';

import { useState } from 'react';
import { FileArchive, ShieldCheck, Upload } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import {
  parseAnalystCase,
  type AnalystCaseFile,
  verifyWorkspaceHashes,
} from '@/lib/analyst-case';

type HashResult = { path: string; matches: boolean };

export default function SubmissionViewer() {
  const [caseFile, setCaseFile] = useState<AnalystCaseFile | null>(null);
  const [activePath, setActivePath] = useState('');
  const [hashes, setHashes] = useState<HashResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function openSubmission(file: File) {
    setError(null);
    setCaseFile(null);
    setHashes([]);
    if (!file.name.endsWith('.analystcase')) {
      setError('Choose a .analystcase submission exported from the learner workbench.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('This viewer accepts submissions up to 50 MB.');
      return;
    }
    try {
      const parsed = parseAnalystCase(await file.text());
      setCaseFile(parsed);
      setActivePath(parsed.learnerWorkspace.files[0]?.path ?? '');
      setHashes(await verifyWorkspaceHashes(parsed));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The submission could not be opened.');
    }
  }

  const activeFile = caseFile?.learnerWorkspace.files.find((file) => file.path === activePath);
  const allHashesMatch = hashes.length > 0 && hashes.every((record) => record.matches);

  return (
    <main className="teaching-page replay-page">
      <header className="teaching-header">
        <div className="teaching-brand"><span>MA</span><strong>MERIDIAN / SUBMISSION VIEWER</strong></div>
        <Link href="/teach" prefetch={false}>RETURN TO PLANNING DESK</Link>
      </header>

      <section className="replay-intro">
        <p className="document-kicker">LOCAL REVIEW UTILITY</p>
        <h1>Open a learner’s case file.</h1>
        <p>
          The submission is read in this browser. The viewer checks file integrity and presents the recorded
          workspace, evidence, and outputs; it does not grade the learner’s judgment or silently execute code.
        </p>
        <label className="submission-drop">
          <Upload />
          <span><strong>CHOOSE .ANALYSTCASE FILE</strong><small>Nothing is uploaded to an account or server.</small></span>
          <input
            type="file"
            accept=".analystcase,application/vnd.theanalyst.case+json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void openSubmission(file);
            }}
          />
        </label>
        {error && <p className="replay-error" role="alert">{error}</p>}
      </section>

      {caseFile && (
        <section className="submission-review">
          <header className="submission-manifest">
            <div><span>CASE</span><strong>{caseFile.scenario.id} / {caseFile.scenario.title}</strong></div>
            <div><span>EXPORTED</span><strong>{new Date(caseFile.exportedAt).toLocaleString()}</strong></div>
            <div><span>FORMAT</span><strong>{caseFile.version}</strong></div>
            <div className={allHashesMatch ? 'integrity-good' : 'integrity-bad'}>
              <span>INTEGRITY</span><strong><ShieldCheck /> {allHashesMatch ? 'ALL FILE HASHES MATCH' : 'REVIEW REQUIRED'}</strong>
            </div>
          </header>

          <div className="submission-grid">
            <aside className="submission-files">
              <p>WORKSPACE FILES</p>
              {caseFile.learnerWorkspace.files.map((file) => (
                <button key={file.path} className={file.path === activePath ? 'active' : ''} onClick={() => setActivePath(file.path)}>
                  <FileArchive />
                  <span>{file.path}<small>{file.language} / {hashes.find((record) => record.path === file.path)?.matches ? 'HASH VERIFIED' : 'HASH MISMATCH'}</small></span>
                </button>
              ))}
            </aside>
            <div className="submission-file-view">
              <div><span>{activeFile?.path}</span><b>READ-ONLY CAPTURE</b></div>
              <pre>{activeFile?.content}</pre>
            </div>
          </div>

          <div className="submission-records">
            <article>
              <h2>EVIDENCE REGISTER <span>{caseFile.learnerWorkspace.evidence.length}</span></h2>
              <ol>
                {caseFile.learnerWorkspace.evidence.map((record) => (
                  <li key={record.id}><b>{record.id}</b><span>{record.statement}<small>{record.source} / {record.state}</small></span></li>
                ))}
              </ol>
            </article>
            <article>
              <h2>EXECUTION RECORD</h2>
              <dl>
                <div><dt>SQL</dt><dd>{caseFile.capturedRuns.sql ? `${caseFile.capturedRuns.sql.runCount} successful run(s), ${caseFile.capturedRuns.sql.displayedRows.length} displayed row(s)` : 'Not recorded'}</dd></div>
                <div><dt>PYTHON</dt><dd>{caseFile.capturedRuns.python ? `${caseFile.capturedRuns.python.runCount} successful run(s), ${caseFile.capturedRuns.python.figures.length} figure(s)` : 'Not recorded'}</dd></div>
                <div><dt>DATA</dt><dd>{caseFile.scenario.catalogSnapshot}</dd></div>
                <div><dt>RUNTIME</dt><dd>{caseFile.runtime.sql} / {caseFile.runtime.python}</dd></div>
              </dl>
              <p>{caseFile.verification.boundary}</p>
            </article>
          </div>

          <section className="captured-output-register">
            <div className="teaching-section-title"><span>CAPTURED OUTPUTS</span><b>RECORD, NOT CORRECTNESS CERTIFICATE</b></div>
            <div>
              <details>
                <summary>SQL RESULT / {caseFile.capturedRuns.sql?.displayedRows.length ?? 0} DISPLAYED ROWS</summary>
                <pre>{caseFile.capturedRuns.sql ? JSON.stringify(caseFile.capturedRuns.sql.displayedRows, null, 2) : 'No successful SQL output was captured.'}</pre>
              </details>
              <details>
                <summary>PYTHON RESULT / {caseFile.capturedRuns.python?.figures.length ?? 0} FIGURES</summary>
                {caseFile.capturedRuns.python ? (
                  <div className="captured-python-output">
                    {caseFile.capturedRuns.python.stdout.map((line, index) => <pre key={`out-${index}`}>{line}</pre>)}
                    {caseFile.capturedRuns.python.stderr.map((line, index) => <pre className="stderr" key={`err-${index}`}>{line}</pre>)}
                    {caseFile.capturedRuns.python.display && <pre>{caseFile.capturedRuns.python.display}</pre>}
                    {caseFile.capturedRuns.python.figures.map((figure, index) => (
                      <Image key={`figure-${index}`} src={figure} alt={`Captured Python figure ${index + 1}`} width={1000} height={600} unoptimized />
                    ))}
                  </div>
                ) : <pre>No successful Python output was captured.</pre>}
              </details>
            </div>
          </section>
        </section>
      )}
    </main>
  );
}
