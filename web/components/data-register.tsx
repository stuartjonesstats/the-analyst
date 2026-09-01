'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { sitePath } from '@/lib/site-path';

type CatalogColumn = { name: string; type: string; nullable: boolean };
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

export function DataRegister() {
  const [assets, setAssets] = useState<CatalogAsset[]>([]);
  const [query, setQuery] = useState('');
  const [schema, setSchema] = useState('ALL');
  const [selectedName, setSelectedName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(sitePath('/data/catalog/data_catalog.json'))
      .then((response) => {
        if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
        return response.json() as Promise<CatalogAsset[]>;
      })
      .then((catalog) => {
        setAssets(catalog);
        setSelectedName(catalog[0]?.fully_qualified_name ?? '');
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Catalog unavailable'));
  }, []);

  const schemas = useMemo(() => [...new Set(assets.map((asset) => asset.schema))].sort(), [assets]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return assets.filter((asset) => (schema === 'ALL' || asset.schema === schema) && (!needle || [
      asset.fully_qualified_name,
      asset.description,
      asset.grain,
      asset.owner,
      ...asset.columns.map((column) => column.name),
    ].join(' ').toLowerCase().includes(needle)));
  }, [assets, query, schema]);
  const selected = filtered.find((asset) => asset.fully_qualified_name === selectedName) ?? filtered[0];

  return (
    <div className="data-register-app">
      <div className="data-register-toolbar">
        <label><Search /><span className="sr-only">Search tables and columns</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tables, grains, owners, columns…" /></label>
        <select value={schema} onChange={(event) => setSchema(event.target.value)} aria-label="Filter by schema">
          <option value="ALL">ALL SCHEMAS</option>
          {schemas.map((value) => <option key={value}>{value}</option>)}
        </select>
        <span>{filtered.length} / {assets.length} TABLES</span>
      </div>
      {error && <p role="alert" className="data-register-error">{error}</p>}
      <div className="data-register-grid">
        <aside aria-label="Table inventory">
          {filtered.map((asset) => (
            <button key={asset.fully_qualified_name} className={selected?.fully_qualified_name === asset.fully_qualified_name ? 'active' : ''} onClick={() => setSelectedName(asset.fully_qualified_name)}>
              <span>{asset.schema}</span><strong>{asset.table}</strong><small>{asset.row_count.toLocaleString()} rows / {asset.column_count} cols</small>
            </button>
          ))}
        </aside>
        {selected ? (
          <article className="dictionary-record">
            <header><span>TABLE RECORD</span><b>{selected.fully_qualified_name}</b><small>{selected.reliability.toUpperCase()}</small></header>
            <div className="dictionary-summary">
              <div><p>{selected.description}</p><dl><div><dt>GRAIN</dt><dd>{selected.grain}</dd></div><div><dt>OWNER</dt><dd>{selected.owner}</dd></div><div><dt>PRIMARY KEY</dt><dd>{selected.primary_key.join(', ') || 'Not declared'}</dd></div><div><dt>SENSITIVITY</dt><dd>{selected.sensitivity}</dd></div></dl></div>
              <div><span>USE WHEN</span><p>{selected.use_when}</p><span>DO NOT USE WHEN</span><p>{selected.do_not_use_when}</p></div>
            </div>
            {selected.quality_notes.length > 0 && <div className="quality-strip"><span>KNOWN CONDITIONS</span><ul>{selected.quality_notes.map((note) => <li key={note}>{note}</li>)}</ul></div>}
            <section className="column-register"><h2>COLUMN DICTIONARY <span>{selected.column_count}</span></h2><table><thead><tr><th>#</th><th>COLUMN</th><th>TYPE</th><th>NULLABLE</th></tr></thead><tbody>{selected.columns.map((column, index) => <tr key={column.name}><td>{String(index + 1).padStart(2, '0')}</td><td>{column.name}</td><td>{column.type}</td><td>{column.nullable ? 'YES' : 'NO'}</td></tr>)}</tbody></table></section>
            <section className="relationship-register"><h2>DECLARED RELATIONSHIPS</h2>{selected.foreign_keys.length > 0 ? selected.foreign_keys.map((key) => <p key={`${key.columns.join('-')}-${key.references}`}><code>{key.columns.join(', ')}</code><span>→</span><strong>{key.references}</strong></p>) : <p>No outbound foreign key declared.</p>}</section>
          </article>
        ) : <div className="dictionary-empty">{assets.length > 0 ? 'No catalog records match this filter.' : 'Loading enterprise catalog…'}</div>}
      </div>
    </div>
  );
}
