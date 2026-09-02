'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { sitePath } from '@/lib/site-path';

type CatalogColumn = {
  name: string;
  type: string;
  nullable: boolean;
  null_count: number;
};
type CatalogAsset = {
  fully_qualified_name: string;
  schema: string;
  table: string;
  description: string;
  grain: string;
  primary_key: string[];
  foreign_keys: Array<{ columns: string[]; references: string }>;
  owner: string;
  reliability: string;
  sensitivity: string;
  use_when: string;
  do_not_use_when: string;
  quality_notes: string[];
  row_count: number;
  column_count: number;
  columns: CatalogColumn[];
};

type ExtractFile = {
  table: string;
  source_table: string | null;
  mounted_rows: number;
  enterprise_rows: number | null;
  selection: string;
  transformation: string | null;
  note: string | null;
};

type AssignmentExtract = {
  sequence: number;
  id: string;
  slug: string;
  title: string;
  analysis_cutoff: string;
  closure_policy: string;
  manifest_path: string;
  selection_policy: string;
  mounted_file_count: number;
  mounted_row_count: number;
  files: ExtractFile[];
};

type ExtractLineage = {
  catalog_snapshot: string;
  row_count_definition: string;
  assignments: AssignmentExtract[];
};

export function DataRegister() {
  const [assets, setAssets] = useState<CatalogAsset[]>([]);
  const [query, setQuery] = useState('');
  const [schema, setSchema] = useState('ALL');
  const [selectedName, setSelectedName] = useState('');
  const [error, setError] = useState('');
  const [extractLineage, setExtractLineage] = useState<ExtractLineage | null>(
    null,
  );
  const [selectedExtractSlug, setSelectedExtractSlug] = useState(
    'the-monday-scorecard',
  );
  const [lineageError, setLineageError] = useState('');

  useEffect(() => {
    fetch(sitePath('/data/catalog/data_catalog.json'))
      .then((response) => {
        if (!response.ok)
          throw new Error(`Catalog request failed: ${response.status}`);
        return response.json() as Promise<CatalogAsset[]>;
      })
      .then((catalog) => {
        setAssets(catalog);
        setSelectedName(catalog[0]?.fully_qualified_name ?? '');
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : 'Catalog unavailable',
        ),
      );
  }, []);

  useEffect(() => {
    fetch(sitePath('/data/catalog/assignment_extracts.json'))
      .then((response) => {
        if (!response.ok)
          throw new Error(`Extract-lineage request failed: ${response.status}`);
        return response.json() as Promise<ExtractLineage>;
      })
      .then(setExtractLineage)
      .catch((cause) =>
        setLineageError(
          cause instanceof Error
            ? cause.message
            : 'Extract lineage unavailable',
        ),
      );
  }, []);

  const schemas = useMemo(
    () => [...new Set(assets.map((asset) => asset.schema))].sort(),
    [assets],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return assets.filter(
      (asset) =>
        (schema === 'ALL' || asset.schema === schema) &&
        (!needle ||
          [
            asset.fully_qualified_name,
            asset.description,
            asset.grain,
            asset.owner,
            ...asset.columns.map((column) => column.name),
          ]
            .join(' ')
            .toLowerCase()
            .includes(needle)),
    );
  }, [assets, query, schema]);
  const selected =
    filtered.find((asset) => asset.fully_qualified_name === selectedName) ??
    filtered[0];
  const selectedExtract =
    extractLineage?.assignments.find(
      (assignment) => assignment.slug === selectedExtractSlug,
    ) ?? extractLineage?.assignments[0];

  return (
    <div className="data-register-app">
      <section
        className="extract-lineage"
        aria-labelledby="extract-lineage-title"
      >
        <header>
          <div>
            <span>ASSIGNMENT DATA / SOURCE PROVENANCE</span>
            <h2 id="extract-lineage-title">Extract lineage</h2>
          </div>
          <label>
            <span className="sr-only">Select assignment extract</span>
            <select
              value={selectedExtractSlug}
              onChange={(event) => setSelectedExtractSlug(event.target.value)}
            >
              {extractLineage?.assignments.map((assignment) => (
                <option key={assignment.slug} value={assignment.slug}>
                  {String(assignment.sequence).padStart(2, '0')} /{' '}
                  {assignment.title}
                </option>
              ))}
            </select>
          </label>
        </header>
        {lineageError && (
          <p role="alert" className="data-register-error">
            {lineageError}
          </p>
        )}
        {selectedExtract ? (
          <>
            <div className="extract-lineage-summary">
              <dl>
                <div>
                  <dt>ASSIGNMENT</dt>
                  <dd>{selectedExtract.id}</dd>
                </div>
                <div>
                  <dt>MOUNTED FILES</dt>
                  <dd>{selectedExtract.mounted_file_count.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>MOUNTED ROWS</dt>
                  <dd>{selectedExtract.mounted_row_count.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>ANALYSIS CUTOFF</dt>
                  <dd>{selectedExtract.analysis_cutoff}</dd>
                </div>
              </dl>
              <div>
                <span>SELECTION POLICY</span>
                <p>{selectedExtract.selection_policy}</p>
                <span>CLOSURE POLICY</span>
                <p>{selectedExtract.closure_policy}</p>
                <a
                  href={sitePath(selectedExtract.manifest_path)}
                  target="_blank"
                  rel="noreferrer"
                >
                  OPEN SOURCE MANIFEST
                </a>
              </div>
            </div>
            <div className="extract-lineage-table">
              <table>
                <caption className="sr-only">
                  Mounted and enterprise row counts for {selectedExtract.title}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">TABLE MOUNTED IN ASSIGNMENT</th>
                    <th scope="col">SOURCE TABLE</th>
                    <th scope="col">MOUNTED ROWS</th>
                    <th scope="col">ENTERPRISE ROWS</th>
                    <th scope="col">SELECTION RULE</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedExtract.files.map((file) => (
                    <tr key={file.table}>
                      <td>
                        <code>{file.table}</code>
                        {file.note && <small>{file.note}</small>}
                      </td>
                      <td>
                        {file.source_table ? (
                          <code>{file.source_table}</code>
                        ) : (
                          <span>SCENARIO-SUPPLIED</span>
                        )}
                      </td>
                      <td>{file.mounted_rows.toLocaleString()}</td>
                      <td>
                        {file.enterprise_rows === null
                          ? '—'
                          : file.enterprise_rows.toLocaleString()}
                      </td>
                      <td>
                        {file.selection}
                        {file.transformation && (
                          <small>{file.transformation}</small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="extract-lineage-definition">
              {extractLineage?.row_count_definition} Counts describe the frozen
              catalog snapshot dated {extractLineage?.catalog_snapshot}.
            </p>
          </>
        ) : !lineageError ? (
          <div className="dictionary-empty">
            Loading assignment extract lineage…
          </div>
        ) : null}
      </section>
      <div className="data-register-section-head">
        <span>ENTERPRISE ESTATE / TABLE DICTIONARY</span>
        <p>
          Null counts describe values observed in this frozen release; they are
          not an upstream database constraint.
        </p>
      </div>
      <div className="data-register-toolbar">
        <label>
          <Search aria-hidden="true" />
          <span className="sr-only">Search tables and columns</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tables, grains, owners, columns…"
          />
        </label>
        <select
          value={schema}
          onChange={(event) => setSchema(event.target.value)}
          aria-label="Filter by schema"
        >
          <option value="ALL">ALL SCHEMAS</option>
          {schemas.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <span aria-live="polite">
          {filtered.length} / {assets.length} TABLES
        </span>
      </div>
      {error && (
        <p role="alert" className="data-register-error">
          {error}
        </p>
      )}
      <div className="data-register-grid">
        <aside aria-label="Table inventory">
          {filtered.map((asset) => (
            <button
              type="button"
              key={asset.fully_qualified_name}
              className={
                selected?.fully_qualified_name === asset.fully_qualified_name
                  ? 'active'
                  : ''
              }
              aria-pressed={
                selected?.fully_qualified_name === asset.fully_qualified_name
              }
              aria-controls="selected-table-record"
              onClick={() => setSelectedName(asset.fully_qualified_name)}
            >
              <span>{asset.schema}</span>
              <strong>{asset.table}</strong>
              <small>
                {asset.row_count.toLocaleString()} rows / {asset.column_count}{' '}
                cols
              </small>
            </button>
          ))}
        </aside>
        {selected ? (
          <article
            className="dictionary-record"
            id="selected-table-record"
            aria-live="polite"
          >
            <header>
              <span>TABLE RECORD</span>
              <b>{selected.fully_qualified_name}</b>
              <small>{selected.reliability.toUpperCase()}</small>
            </header>
            <div className="dictionary-summary">
              <div>
                <p>{selected.description}</p>
                <dl>
                  <div>
                    <dt>GRAIN</dt>
                    <dd>{selected.grain}</dd>
                  </div>
                  <div>
                    <dt>OWNER</dt>
                    <dd>{selected.owner}</dd>
                  </div>
                  <div>
                    <dt>PRIMARY KEY</dt>
                    <dd>{selected.primary_key.join(', ') || 'Not declared'}</dd>
                  </div>
                  <div>
                    <dt>SENSITIVITY</dt>
                    <dd>{selected.sensitivity}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <span>USE WHEN</span>
                <p>
                  {selected.use_when ||
                    'No representative use has been documented. Establish fitness for the decision before relying on this table.'}
                </p>
                <span>DO NOT USE WHEN</span>
                <p>
                  {selected.do_not_use_when ||
                    'No explicit anti-use guidance has been documented. Absence of a warning is not approval for unrestricted use.'}
                </p>
              </div>
            </div>
            {selected.quality_notes.length > 0 && (
              <div className="quality-strip">
                <span>KNOWN CONDITIONS</span>
                <ul>
                  {selected.quality_notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
            <section className="column-register">
              <h2>
                COLUMN DICTIONARY <span>{selected.column_count}</span>
              </h2>
              <table>
                <caption className="sr-only">
                  Columns in {selected.fully_qualified_name}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">COLUMN</th>
                    <th scope="col">TYPE</th>
                    <th scope="col">NULLS IN SNAPSHOT</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.columns.map((column, index) => (
                    <tr key={column.name}>
                      <td>{String(index + 1).padStart(2, '0')}</td>
                      <td>{column.name}</td>
                      <td>{column.type}</td>
                      <td>{column.null_count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="relationship-register">
              <h2>DECLARED RELATIONSHIPS</h2>
              {selected.foreign_keys.length > 0 ? (
                selected.foreign_keys.map((key) => (
                  <p key={`${key.columns.join('-')}-${key.references}`}>
                    <code>{key.columns.join(', ')}</code>
                    <span aria-hidden="true">→</span>
                    <strong>{key.references}</strong>
                  </p>
                ))
              ) : (
                <p>No outbound foreign key declared.</p>
              )}
            </section>
          </article>
        ) : (
          <output className="dictionary-empty">
            {assets.length > 0
              ? 'No catalog records match this filter.'
              : 'Loading enterprise catalog…'}
          </output>
        )}
      </div>
    </div>
  );
}
