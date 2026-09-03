'use client';

import { useMemo, useState } from 'react';
import {
  Download,
  FileArchive,
  ShieldCheck,
  Upload,
  Users,
} from 'lucide-react';
import Image from 'next/image';

import { SiteLink } from '@/components/site-link';
import {
  parseAnalystCase,
  type AnalystCaseFile,
  verifyWorkspaceHashes,
} from '@/lib/analyst-case';
import { rubricDimensions } from '@/lib/instructor-planning';

type HashResult = { path: string; matches: boolean };
type LoadedSubmission = {
  filename: string;
  caseFile: AnalystCaseFile;
  hashes: HashResult[];
};
type ReviewWorksheet = {
  levels: Array<number | null>;
  comments: string[];
  strongest: string;
  weakness: string;
  nextStep: string;
  proportionality: string;
};

const emptyReview = (): ReviewWorksheet => ({
  levels: rubricDimensions.map(() => null),
  comments: rubricDimensions.map(() => ''),
  strongest: '',
  weakness: '',
  nextStep: '',
  proportionality: '',
});

function defaultFile(caseFile: AnalystCaseFile) {
  return (
    caseFile.learnerWorkspace.files.find(
      (file) => file.path === 'workspace/final_brief.md',
    )?.path ??
    caseFile.learnerWorkspace.files.find(
      (file) => file.language === 'markdown' && file.path.includes('final'),
    )?.path ??
    caseFile.learnerWorkspace.files[0]?.path ??
    ''
  );
}

function downloadLocal(contents: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export default function SubmissionViewer() {
  const [submissions, setSubmissions] = useState<LoadedSubmission[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activePath, setActivePath] = useState('');
  const [reviews, setReviews] = useState<Record<string, ReviewWorksheet>>({});
  const [error, setError] = useState<string | null>(null);

  const loaded = submissions[activeIndex] ?? null;
  const caseFile = loaded?.caseFile ?? null;
  const activeFile = caseFile?.learnerWorkspace.files.find(
    (file) => file.path === activePath,
  );
  const allHashesMatch =
    Boolean(loaded?.hashes.length) &&
    loaded!.hashes.every((record) => record.matches);
  const reviewKey = loaded
    ? `${loaded.filename}:${loaded.caseFile.exportedAt}`
    : '';
  const review = reviews[reviewKey] ?? emptyReview();
  const score = useMemo(
    () =>
      review.levels.reduce<number>(
        (total, level, index) =>
          total +
          (level === null ? 0 : (rubricDimensions[index].weight * level) / 4),
        0,
      ),
    [review.levels],
  );
  const scoredCount = review.levels.filter((level) => level !== null).length;

  async function openSubmissions(files: File[]) {
    setError(null);
    const accepted = files.filter(
      (file) =>
        file.name.endsWith('.analystcase') && file.size <= 50 * 1024 * 1024,
    );
    if (!accepted.length) {
      setError(
        'Choose one or more .analystcase submissions, each no larger than 50 MB.',
      );
      return;
    }

    const opened: LoadedSubmission[] = [];
    const failures: string[] = [];
    for (const file of accepted) {
      try {
        const parsed = parseAnalystCase(await file.text());
        opened.push({
          filename: file.name,
          caseFile: parsed,
          hashes: await verifyWorkspaceHashes(parsed),
        });
      } catch (cause) {
        failures.push(
          `${file.name}: ${cause instanceof Error ? cause.message : 'could not be opened'}`,
        );
      }
    }

    if (opened.length) {
      setSubmissions(opened);
      setActiveIndex(0);
      setActivePath(defaultFile(opened[0].caseFile));
    }
    setError(
      failures.length
        ? `${failures.length} file(s) were skipped. ${failures.join(' ')}`
        : null,
    );
  }

  function selectSubmission(index: number) {
    setActiveIndex(index);
    setActivePath(defaultFile(submissions[index].caseFile));
  }

  function updateReview(update: Partial<ReviewWorksheet>) {
    if (!reviewKey) return;
    setReviews((current) => ({
      ...current,
      [reviewKey]: { ...(current[reviewKey] ?? emptyReview()), ...update },
    }));
  }

  function exportReview(format: 'json' | 'csv') {
    if (!loaded) return;
    const record = {
      submission: {
        filename: loaded.filename,
        scenario: loaded.caseFile.scenario,
        identity: loaded.caseFile.identity,
        exportedAt: loaded.caseFile.exportedAt,
      },
      score: scoredCount === rubricDimensions.length ? score : null,
      scoredDimensions: scoredCount,
      dimensions: rubricDimensions.map((dimension, index) => ({
        dimension: dimension.name,
        weight: dimension.weight,
        level: review.levels[index],
        points:
          review.levels[index] === null
            ? null
            : (dimension.weight * review.levels[index]!) / 4,
        comment: review.comments[index],
      })),
      feedback: {
        strongestPractice: review.strongest,
        decisionMaterialWeakness: review.weakness,
        nextImprovement: review.nextStep,
        positionProportionality: review.proportionality,
      },
      boundary:
        'Instructor-authored human review. Not an automated grade from The Analyst.',
    };
    const stem = `review-${loaded.caseFile.scenario.id.toLowerCase()}-${loaded.filename.replace(/\.analystcase$/i, '')}`;
    if (format === 'json') {
      downloadLocal(
        JSON.stringify(record, null, 2),
        `${stem}.json`,
        'application/json',
      );
      return;
    }
    const rows = [
      ['dimension', 'weight', 'level', 'points', 'comment'],
      ...record.dimensions.map((dimension) => [
        dimension.dimension,
        dimension.weight,
        dimension.level ?? '',
        dimension.points ?? '',
        dimension.comment,
      ]),
      ['Strongest demonstrated practice', '', '', '', review.strongest],
      ['Most decision-material weakness', '', '', '', review.weakness],
      ['One concrete next improvement', '', '', '', review.nextStep],
      ['Position proportionality', '', '', '', review.proportionality],
    ];
    downloadLocal(
      rows.map((row) => row.map(csvCell).join(',')).join('\n'),
      `${stem}.csv`,
      'text/csv',
    );
  }

  return (
    <main className="teaching-page replay-page">
      <header className="teaching-header">
        <div className="teaching-brand">
          <strong>THE ANALYST / SUBMISSION VIEWER</strong>
        </div>
        <SiteLink path="/teach">RETURN TO PLANNING DESK</SiteLink>
      </header>

      <section className="replay-intro">
        <p className="document-kicker">LOCAL COHORT REVIEW UTILITY</p>
        <h1>Open learner submissions.</h1>
        <p>
          Select one file or a local batch. The viewer indexes them in this
          browser, checks file integrity, and presents the recorded workspace,
          handoff, evidence, and outputs. It does not upload, execute, or grade
          the work.
        </p>
        <label className="submission-drop">
          <Upload />
          <span>
            <strong>CHOOSE .ANALYSTCASE FILES</strong>
            <small>
              Multiple files are supported. Nothing is uploaded to an account or
              server.
            </small>
          </span>
          <input
            type="file"
            multiple
            accept=".analystcase,application/vnd.theanalyst.case+json"
            onChange={(event) => {
              if (event.target.files?.length)
                void openSubmissions(Array.from(event.target.files));
            }}
          />
        </label>
        {error && (
          <p className="replay-error" role="alert">
            {error}
          </p>
        )}
      </section>

      {submissions.length > 0 && (
        <section className="cohort-index" aria-labelledby="cohort-index-title">
          <div className="teaching-section-title">
            <span id="cohort-index-title">LOCAL COHORT INDEX</span>
            <b>{submissions.length} SUBMISSION(S)</b>
          </div>
          <div className="cohort-index-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Learner / team</th>
                  <th>Course / section</th>
                  <th>Assignment</th>
                  <th>Attempt</th>
                  <th>Handoff</th>
                  <th>Integrity</th>
                  <th>Exported</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission, index) => {
                  const identity = submission.caseFile.identity;
                  const handoff = submission.caseFile.handoff.requiredArtifacts;
                  const hashesMatch =
                    submission.hashes.length > 0 &&
                    submission.hashes.every((item) => item.matches);
                  return (
                    <tr
                      key={`${submission.filename}:${submission.caseFile.exportedAt}`}
                      className={index === activeIndex ? 'active' : ''}
                    >
                      <td>
                        <button
                          type="button"
                          onClick={() => selectSubmission(index)}
                        >
                          {identity.name ||
                            identity.team ||
                            identity.identifier ||
                            submission.filename}
                        </button>
                      </td>
                      <td>
                        {identity.course || '—'}
                        {identity.section ? ` / ${identity.section}` : ''}
                      </td>
                      <td>
                        {submission.caseFile.scenario.id} /{' '}
                        {submission.caseFile.scenario.title}
                      </td>
                      <td>{identity.attempt || '—'}</td>
                      <td>
                        {handoff.filter((item) => item.present).length}/
                        {handoff.length} files
                      </td>
                      <td>{hashesMatch ? 'MATCH' : 'REVIEW'}</td>
                      <td>
                        {new Date(
                          submission.caseFile.exportedAt,
                        ).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {caseFile && loaded && (
        <section className="submission-review">
          <header className="submission-manifest">
            <div>
              <span>ASSIGNMENT</span>
              <strong>
                {caseFile.scenario.id} / {caseFile.scenario.title}
              </strong>
            </div>
            <div>
              <span>LEARNER / TEAM</span>
              <strong>
                <Users />{' '}
                {caseFile.identity.name ||
                  caseFile.identity.team ||
                  caseFile.identity.identifier ||
                  'Not supplied'}
              </strong>
            </div>
            <div>
              <span>COURSE / SECTION</span>
              <strong>
                {caseFile.identity.course || 'Not supplied'}
                {caseFile.identity.section
                  ? ` / ${caseFile.identity.section}`
                  : ''}
              </strong>
            </div>
            <div
              className={allHashesMatch ? 'integrity-good' : 'integrity-bad'}
            >
              <span>FILE INTEGRITY</span>
              <strong>
                <ShieldCheck />{' '}
                {allHashesMatch ? 'ALL HASHES MATCH' : 'REVIEW REQUIRED'}
              </strong>
            </div>
          </header>
          <div className="submission-meta-strip">
            <span>
              EXPORTED <b>{new Date(caseFile.exportedAt).toLocaleString()}</b>
            </span>
            <span>
              ATTEMPT <b>{caseFile.identity.attempt || '—'}</b>
            </span>
            <span>
              SCAFFOLD <b>{caseFile.scaffold.mode}</b>
            </span>
            <span>
              FORMAT <b>{caseFile.version}</b>
            </span>
          </div>

          <div className="submission-grid">
            <aside className="submission-files">
              <p>WORKSPACE FILES</p>
              {caseFile.learnerWorkspace.files.map((file) => (
                <button
                  key={file.path}
                  className={file.path === activePath ? 'active' : ''}
                  onClick={() => setActivePath(file.path)}
                >
                  <FileArchive />
                  <span>
                    {file.path}
                    <small>
                      {file.language} /{' '}
                      {loaded.hashes.find((record) => record.path === file.path)
                        ?.matches
                        ? 'HASH MATCH'
                        : 'HASH MISMATCH'}
                    </small>
                  </span>
                </button>
              ))}
            </aside>
            <div className="submission-file-view">
              <div>
                <span>{activeFile?.path}</span>
                <b>READ-ONLY CAPTURE</b>
              </div>
              {activeFile?.language === 'image' &&
              activeFile.content.startsWith('data:') ? (
                <Image
                  src={activeFile.content}
                  alt={activeFile.path}
                  width={1200}
                  height={800}
                  unoptimized
                />
              ) : activeFile?.encoding === 'data-url' ? (
                <pre>
                  Binary artifact / {activeFile.mimeType} /{' '}
                  {activeFile.sizeBytes.toLocaleString()} bytes
                </pre>
              ) : (
                <pre>{activeFile?.content}</pre>
              )}
            </div>
          </div>

          <div className="submission-records submission-records-three">
            <article>
              <h2>
                REQUIRED HANDOFF{' '}
                <span>
                  {
                    caseFile.handoff.requiredArtifacts.filter(
                      (item) => item.present,
                    ).length
                  }
                  /{caseFile.handoff.requiredArtifacts.length}
                </span>
              </h2>
              <ul className="handoff-review-list">
                {caseFile.handoff.requiredArtifacts.map((artifact) => (
                  <li
                    key={artifact.label}
                    className={artifact.present ? 'present' : 'missing'}
                  >
                    <b>{artifact.present ? 'FILE' : 'OPEN'}</b>
                    <span>
                      {artifact.label}
                      <small>
                        {artifact.workspacePath ??
                          'No explicitly bound file in this submission'}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
              <p>
                Presence means a non-empty file was explicitly bound to this
                label. It does not establish artifact quality or completeness.
              </p>
            </article>
            <article>
              <h2>
                EVIDENCE REGISTER{' '}
                <span>{caseFile.learnerWorkspace.evidence.length}</span>
              </h2>
              <ol>
                {caseFile.learnerWorkspace.evidence.map((record) => (
                  <li key={record.id}>
                    <b>{record.id}</b>
                    <span>
                      {record.statement}
                      <small>
                        {record.source} / {record.state}
                        {record.runId ? ` / ${record.runId}` : ''}
                      </small>
                    </span>
                  </li>
                ))}
              </ol>
            </article>
            <article>
              <h2>EXECUTION RECORD</h2>
              <dl>
                <div>
                  <dt>SQL</dt>
                  <dd>
                    {caseFile.capturedRuns.sql
                      ? `${caseFile.capturedRuns.sql.runCount} run(s), ${caseFile.capturedRuns.sql.totalRows.toLocaleString()} total row(s), ${caseFile.capturedRuns.sql.codeMatchesExportedWorkspace ? 'current code' : 'stale output'}`
                      : 'Not recorded'}
                  </dd>
                </div>
                <div>
                  <dt>PYTHON</dt>
                  <dd>
                    {caseFile.capturedRuns.python
                      ? `${caseFile.capturedRuns.python.runCount} run(s), ${caseFile.capturedRuns.python.figures.length} figure(s), ${caseFile.capturedRuns.python.codeMatchesExportedWorkspace ? 'current code' : 'stale output'}`
                      : 'Not recorded'}
                  </dd>
                </div>
                <div>
                  <dt>HISTORY</dt>
                  <dd>
                    {caseFile.capturedRuns.history.length} captured run
                    snapshot(s)
                  </dd>
                </div>
                <div>
                  <dt>DATA</dt>
                  <dd>{caseFile.scenario.catalogSnapshot}</dd>
                </div>
                <div>
                  <dt>RUNTIME</dt>
                  <dd>
                    {caseFile.runtime.sql} / {caseFile.runtime.python}
                  </dd>
                </div>
              </dl>
              <p>{caseFile.verification.boundary}</p>
            </article>
          </div>

          <section
            className="grading-worksheet"
            aria-labelledby="grading-title"
          >
            <div className="teaching-section-title">
              <span id="grading-title">INSTRUCTOR FEEDBACK WORKSHEET</span>
              <b>LOCAL / HUMAN-SCORED</b>
            </div>
            <div className="grading-intro">
              <p>
                Select levels only after inspecting the evidence and handoff.
                Unscored dimensions remain blank; the score is not final until
                all seven are reviewed.
              </p>
              <strong>
                {scoredCount}/{rubricDimensions.length} dimensions ·{' '}
                {scoredCount === rubricDimensions.length
                  ? `${score.toFixed(1)} / 100`
                  : 'score incomplete'}
              </strong>
            </div>
            <div className="grading-dimension-list">
              {rubricDimensions.map((dimension, index) => (
                <article key={dimension.name}>
                  <div>
                    <span>{dimension.weight} PTS</span>
                    <strong>{dimension.name}</strong>
                    <small>{dimension.question}</small>
                  </div>
                  <label>
                    LEVEL
                    <select
                      value={review.levels[index] ?? ''}
                      onChange={(event) => {
                        const levels = [...review.levels];
                        levels[index] =
                          event.target.value === ''
                            ? null
                            : Number(event.target.value);
                        updateReview({ levels });
                      }}
                    >
                      <option value="">Not scored</option>
                      {[0, 1, 2, 3, 4].map((level) => (
                        <option key={level} value={level}>
                          {level} — {dimension.levels[level]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    FEEDBACK
                    <textarea
                      value={review.comments[index]}
                      onChange={(event) => {
                        const comments = [...review.comments];
                        comments[index] = event.target.value;
                        updateReview({ comments });
                      }}
                      placeholder="Evidence observed, decision effect, and what is missing…"
                    />
                  </label>
                </article>
              ))}
            </div>
            <div className="grading-summary-fields">
              {(
                [
                  ['strongest', 'STRONGEST DEMONSTRATED PRACTICE'],
                  ['weakness', 'MOST DECISION-MATERIAL WEAKNESS'],
                  ['nextStep', 'ONE CONCRETE NEXT IMPROVEMENT'],
                  [
                    'proportionality',
                    'WAS THE CONCLUSION, QUALIFICATION, OR REFUSAL PROPORTIONATE?',
                  ],
                ] as const
              ).map(([field, label]) => (
                <label key={field}>
                  {label}
                  <textarea
                    value={review[field]}
                    onChange={(event) =>
                      updateReview({ [field]: event.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <div className="grading-export">
              <p>
                This worksheet remains in memory until you export it or
                leave/reload the page. The export is instructor-authored
                feedback, not an automated grade.
              </p>
              <button type="button" onClick={() => exportReview('csv')}>
                <Download /> EXPORT CSV
              </button>
              <button type="button" onClick={() => exportReview('json')}>
                <Download /> EXPORT JSON
              </button>
            </div>
          </section>

          <section className="captured-output-register">
            <div className="teaching-section-title">
              <span>CAPTURED OUTPUTS</span>
              <b>RECORD, NOT CORRECTNESS CERTIFICATE</b>
            </div>
            <div>
              <details>
                <summary>
                  SQL RESULT /{' '}
                  {caseFile.capturedRuns.sql?.displayedRows.length ?? 0}{' '}
                  DISPLAYED OF {caseFile.capturedRuns.sql?.totalRows ?? 0} TOTAL
                  ROWS
                </summary>
                <pre>
                  {caseFile.capturedRuns.sql
                    ? JSON.stringify(
                        caseFile.capturedRuns.sql.displayedRows,
                        null,
                        2,
                      )
                    : 'No successful SQL output was captured.'}
                </pre>
              </details>
              <details>
                <summary>
                  PYTHON RESULT /{' '}
                  {caseFile.capturedRuns.python?.figures.length ?? 0} FIGURES
                </summary>
                {caseFile.capturedRuns.python ? (
                  <div className="captured-python-output">
                    {caseFile.capturedRuns.python.stdout.map((line, index) => (
                      <pre key={`out-${index}`}>{line}</pre>
                    ))}
                    {caseFile.capturedRuns.python.stderr.map((line, index) => (
                      <pre className="stderr" key={`err-${index}`}>
                        {line}
                      </pre>
                    ))}
                    {caseFile.capturedRuns.python.display && (
                      <pre>{caseFile.capturedRuns.python.display}</pre>
                    )}
                    {caseFile.capturedRuns.python.figures.map(
                      (figure, index) => (
                        <Image
                          key={`figure-${index}`}
                          src={figure}
                          alt={`Captured Python figure ${index + 1}`}
                          width={1000}
                          height={600}
                          unoptimized
                        />
                      ),
                    )}
                  </div>
                ) : (
                  <pre>No successful Python output was captured.</pre>
                )}
              </details>
            </div>
          </section>
        </section>
      )}
    </main>
  );
}
