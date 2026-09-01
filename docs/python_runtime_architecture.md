# Browser Python runtime architecture

This document proposes the production architecture for making Python a core
part of every The Analyst simulation while preserving the existing in-browser
DuckDB and Monaco foundation. It is an implementation brief, not an amendment
to the simulation contract. The contract extension near the end is illustrative
and must be reviewed and versioned before it is added to the canonical schema.

## Decision

Retain DuckDB-Wasm as the estate query engine and add Pyodide as a separate,
isolated browser worker. Move tabular data between them as named Apache Arrow
IPC artifacts.

```text
Corporate workbench UI / Monaco
              |
      typed runtime coordinator
       /                    \
DuckDB-Wasm worker      Pyodide worker
remote Parquet views    pandas / NumPy /
and local workspace     PyArrow / matplotlib /
                       scenario package profile
       \                    /
        named Arrow IPC artifacts
```

This boundary keeps both engines responsive, avoids duplicating the full data
estate in Python memory, and gives learners ordinary Python rather than a
workbench-specific asynchronous SQL API.

JupyterLite and PyScript are not recommended for the main runtime. JupyterLite
would introduce a second application shell and state model, while PyScript is a
higher-level integration layer the workbench does not need. Direct Pyodide gives
the harness control over files, evidence, execution, persistence, and recovery.

## Current prototype gaps

The current website is a useful SQL-only vertical slice, but it is not yet the
multi-case runtime described here:

- `hooks/use-duckdb.ts` registers three Parquet files for one case.
- DuckDB runtime assets are selected from jsDelivr rather than a pinned,
  first-party asset origin.
- `app/page.tsx` contains one SQL worksheet and hard-coded Monday Scorecard
  state instead of a manifest-driven scenario route.
- Persistence is limited to a query and evidence count in `localStorage`.
- Query results are materialized with `toArray()` before the 1,000-row display
  slice, so a large result can exhaust browser memory before the limit applies.
- The SQL read-only guard is a token-prefix regular expression. It cannot prove
  that a statement is read-only; for example, a data-changing statement can
  follow a `WITH` clause.
- The public website pack is small, while the complete Parquet estate is about
  565 MiB and includes an individual file over 100 MiB.
- The hosting configuration has no R2 data binding.

## Runtime components

### Coordinator

A typed client-side coordinator owns the active scenario session. It should:

- create and dispose the DuckDB and Python workers;
- load the learner manifest and its exact runtime and data manifests;
- validate every worker request and response at the message boundary;
- assign run, extract, artifact, and evidence IDs;
- enforce output, transfer, and wall-time limits;
- write durable case state to IndexedDB;
- reconstruct a failed or reset worker from saved source and manifests; and
- ensure that only one scenario runtime is active at a time.

The coordinator must receive only a learner-safe manifest. Its types should not
include `instructor_only`, instructor notes, expected conclusions, or known
anomaly explanations.

### DuckDB-Wasm worker

DuckDB-Wasm remains responsible for querying the full remote estate. Each case
creates immutable source views from manifest-declared Parquet objects and a
disposable `workspace` schema for learner-created relations.

Use streaming Arrow batches for result previews. Do not call `toArray()` over
the complete result before applying a display limit. Named extracts may have a
larger, scenario-declared row and byte allowance than previews, but the runtime
must reject an extract before transferring it when the allowance is exceeded.

The existing SQL token-prefix gate should be removed. It is not a reliable
security or correctness boundary. A safer and more honest execution model is:

- source Parquet objects are immutable;
- learner writes affect only an ephemeral, local workspace;
- no credentials or secrets exist in the browser runtime;
- browser network destinations are restricted by Content Security Policy;
- outputs, logs, transfer sizes, and wall time are bounded; and
- a wedged engine is terminated and reconstructed.

If an execution API supports genuine cancellation of a streamed query, use it.
Worker termination remains the hard recovery boundary.

### Pyodide worker

Pyodide must run in a module Web Worker so Python cannot freeze or manipulate
the workbench DOM. It should expose:

- Monaco-backed `.py` files or cell-like script sections;
- captured stdout and stderr;
- readable tracebacks;
- bounded DataFrame previews;
- Matplotlib output rendered as PNG rather than injected learner-authored HTML;
- explicit run, stop, reset, and cold-replay operations; and
- the small, versioned `analyst` helper package described below.

The worker must not accept arbitrary runtime `pip install` requests. Each
scenario declares a tested package profile, and the deployment hosts the exact
Pyodide release, approved wheels, lock manifest, and `analyst` wheel under
immutable versioned paths. Suggested profiles are:

| Profile | Packages |
|---|---|
| `core-analysis` | pandas, NumPy, PyArrow, Matplotlib |
| `statistics` | `core-analysis` plus SciPy and statsmodels |
| `modeling` | `core-analysis` plus scikit-learn |

Packages should be added only when a simulation genuinely needs them. The
runtime version, Python version, package versions, and asset hashes belong in a
runtime manifest captured with every run.

### SQL to Python

A learner explicitly stages a successful SQL result as a named extract, such
as `ticket_cohort`:

1. DuckDB produces an Arrow table.
2. The coordinator serializes it as Arrow IPC.
3. The underlying buffer is transferred to the Pyodide worker rather than
   converted to JSON.
4. PyArrow reads the stream and makes it available through a normal Python API.

```python
from analyst import load

tickets = load("ticket_cohort")
```

The extract record preserves its SQL run ID, source asset IDs, scenario and data
revisions, Arrow schema, row count, byte count, and content hash. Staging is a
visible analytical act rather than a hidden convenience: it establishes the
population that feeds subsequent Python work.

### Python to SQL

Python can publish a DataFrame back to the case workspace:

```python
from analyst import publish

publish(predictions, "cancellation_predictions")
```

At the end of the run, `analyst` serializes the published value as Arrow IPC and
returns it with the run response. The coordinator transfers the buffer to
DuckDB and registers it as, for example,
`workspace.cancellation_predictions`. It receives an artifact ID and lineage
back to the Python source, runtime, and input extracts.

This staged bidirectional design avoids a custom `await sql(...)` idiom inside
Python and does not require the two WebAssembly runtimes to share a filesystem
or process memory.

## Data and runtime asset delivery

GitHub Pages is appropriate for the static workbench and small, scenario-specific
starter packs; the full estate and large pinned Python wheels should not be
committed to or served from the application repository. Those assets belong in
versioned public object storage, preferably behind a stable production data
domain such as `data.theanalyst.dev`.

Deployment should:

- split large Parquet files into deterministic 8–20 MiB parts;
- retain one catalog table identity while a deployment manifest lists its
  physical parts;
- avoid copying shared tables into every scenario package;
- use immutable, versioned or content-addressed object paths;
- publish object SHA-256, byte size, row count, schema, and generator revision;
- allow `GET`, `HEAD`, and range requests from the production and preview
  origins;
- expose `ETag`, `Content-Length`, `Content-Range`, and `Accept-Ranges`; and
- test projection and predicate pushdown on Chrome, Firefox, and Safari.

Smaller physical parts bound the damage when a browser or intermediary fails to
honor efficient remote Parquet range reads. A scenario manifest references only
its allowed logical tables, while normal catalog discovery controls which of
those tables are initially visible.

Self-host the DuckDB-Wasm and Pyodide distributions from the same controlled
asset origin rather than relying on floating or third-party CDN behavior.
Package and runtime upgrades should produce a new runtime manifest and pass the
full scenario replay suite before publication.

## Persistence and account-free submission

IndexedDB, not `localStorage` or Pyodide's in-memory filesystem, should be the
canonical case store. Namespace all records by:

```text
scenario_id / scenario_revision / workspace_id
```

Persist:

- source files and drafts;
- named extract metadata;
- run records and bounded output records;
- evidence selections;
- artifact versions;
- timeline, reveal, branch, and scaffold state; and
- runtime, catalog, and data manifest hashes.

Keep large source datasets in the HTTP/browser cache instead of duplicating
them in IndexedDB. Rehydrate the Python filesystem from saved source whenever a
worker starts. Pyodide IDBFS may be used as a disposable implementation cache,
but it should not be the sole source of truth because explicit application
records are easier to inspect, migrate, validate, and export.

Without accounts, state is device-local and cannot silently synchronize across
computers. The workbench should make this limitation visible and support an
exportable `.analystcase` package containing code, artifacts, selected evidence,
lineage, manifests, and a human-readable handoff summary. A learner can submit
that file through an institution's existing LMS. Import must validate its
schema, hashes, sizes, and scenario revision before writing to IndexedDB.

Do not promise complete offline operation initially. A later, opt-in “make this
case available offline” action can cache one scenario's runtime and data pack,
but browser quota and eviction behavior make automatic whole-site caching
fragile.

## Isolation, security, and resource controls

Only the active case should have live workers. On case switch or reset:

- terminate both workers;
- release DuckDB connections and registered files;
- discard in-memory Python state;
- preserve only namespaced durable case records; and
- reconstruct from the pinned learner, data, and runtime manifests.

Long-running Python can be stopped reliably by terminating its worker. A
SharedArrayBuffer interrupt path may be added after the production domain
reliably returns cross-origin isolation headers, but it is not required for the
first robust stop/reset implementation.

Use a restrictive Content Security Policy with only the application and asset
origins in `connect-src`, self-hosted scripts and workers, and the minimum
WebAssembly allowances required by the tested runtimes. Do not place API keys,
private data, or instructor truth in either worker. Validate worker messages,
truncate logs, bound generated files and Arrow transfers, and render all
learner-authored text as text rather than HTML.

The learner is executing their own code against public synthetic data. The
security objective is therefore to protect the application, browser session,
and instructional separation—not to claim that public source rows can be made
confidential inside the learner's browser.

## Making Python core rather than decorative

Every published simulation should declare Python support and require at least:

- one submitted `.py` artifact or equivalent saved Python workspace file;
- one captured Python run linked to evidence or a deliverable;
- one professional work product whose creation genuinely benefits from Python;
  and
- lineage from source data or a named SQL extract through Python to that work
  product.

This is an authoring requirement, not proof of quality. Appropriate Python work
includes statistical diagnostics, resampling, simulation, visualization,
feature construction, model fitting, model auditing, robustness analysis, and
reproducible artifact generation. Repeating a SQL aggregation in pandas merely
to satisfy a language checkbox is not sufficient scenario design.

## Public faculty route and spoiler separation

Instructor material may be public without authentication, but it must be
presented honestly as a spoiler-separated faculty route rather than protected
content. Use three build projections:

1. The canonical authoring manifest in the private source repository.
2. A learner manifest with all instructor-only content removed.
3. A faculty manifest for `/faculty/cases/[slug]`, which may contain teaching
   notes, expected evidence, known truths, and plausible resolutions.

The learner route and runtime must never import, fetch, prefetch, store, or
receive the faculty projection. Technical enforcement should include:

- a `LearnerManifest` type that cannot represent instructor-only fields;
- a compiler that writes learner and faculty projections to different output
  roots;
- a learner-projection leak scan for instructor keys, notes, known anomaly
  explanations, and maintained truth fingerprints;
- a bundle-graph test proving learner chunks do not depend on faculty modules;
- a network test that loads every learner route and fails if it requests a
  faculty or instructor resource;
- a plain footer anchor or framework link with prefetch disabled;
- an explicit spoiler-warning screen before loading faculty data;
- no faculty assets in a learner service-worker precache; and
- no faculty page writes to learner IndexedDB or starts the learner analysis
  runtime.

This separation prevents accidental spoilers and runtime leakage. It is not
access control: anyone who deliberately opens the public faculty URL can read
it.

## Deterministic checks worth shipping

Machine checks should describe a narrow observable fact. They should normally
produce a verified observation, completion gate, or review flag—not analytical
quality points.

Safe mechanical facts include:

- submitted SQL or Python executed successfully in a fresh, pinned runtime;
- the saved source hash equals the source hash associated with a captured run;
- a required artifact exists, opens, and has the declared media type;
- an evidence record references a real captured run and allowed source assets;
- a named extract or published table has its captured schema, row count, byte
  count, and hash;
- an output satisfies a formally declared structural schema;
- required entity IDs are unique and cover an explicitly fixed evaluation
  cohort;
- a reported number agrees with a value recomputed from the submitted
  machine-readable artifact when the cohort and arithmetic definition are
  formally fixed;
- a clean replay produces the declared outputs, subject to an explicitly
  justified numerical tolerance; and
- runtime, package, data, catalog, lineage, branch, and scaffold facts were
  recorded.

Checks that should not ship include:

- SQL or Python token, keyword, regex, or AST heuristics that claim to establish
  correct grain, joins, cutoffs, leakage control, or causal validity;
- matching a hidden target number or preferred conclusion;
- quality scores derived from query count, code length, elapsed time, or hint
  use;
- claims that an existing chart is persuasive or correctly designed;
- automatic judgment of uncertainty, ethics, proportionality, or professional
  refusal; and
- LLM-generated grades presented as authoritative.

Successful execution proves execution only. A reproducible pipeline can still
reproduce a conceptually wrong answer. The judgment-focused human rubric remains
the evaluation boundary.

## Illustrative contract extension

The following example is intentionally concise. It shows the authoring shape
needed by the runtime; it does not modify the current schema and should be
introduced only through a reviewed, backward-compatible contract revision.

```json
{
  "runtime": {
    "languages": ["sql", "python"],
    "runtime_profile": "analyst-2026-09.1",
    "python": {
      "package_profile": "statistics",
      "starter_files": [
        {
          "path": "analysis/metric_audit.py",
          "template_id": "python.metric-audit.v1",
          "learner_editable": true
        }
      ],
      "required_for_completion": true
    },
    "limits": {
      "preview_rows": 1000,
      "extract_max_rows": 250000,
      "extract_max_bytes": 67108864,
      "run_wall_time_seconds": 120,
      "stdout_max_bytes": 262144,
      "artifact_max_bytes": 67108864
    }
  },
  "workspace": {
    "initial_files": [
      {
        "path": "queries/cohort.sql",
        "language": "sql",
        "template_id": "sql.blank-investigation.v1"
      }
    ],
    "required_lineage": [
      {
        "lineage_id": "decision-analysis",
        "input_kinds": ["catalog-asset", "sql-extract"],
        "required_language": "python",
        "output_artifact_id": "decision-brief"
      }
    ]
  }
}
```

Semantic authoring validation should additionally confirm that:

- the runtime profile and package profile resolve to pinned deployment
  manifests;
- starter templates exist and contain no instructor truth;
- paths are relative, normalized, unique, and remain inside the case workspace;
- limits do not exceed platform-wide safety ceilings;
- every required lineage reference resolves to a declared artifact; and
- a Python-required scenario has a Python file, captured-run evidence path, and
  deliverable lineage rather than a language checkbox alone.

## Phased implementation

### Phase 1 — Runtime and deployment foundation

- Add R2-backed versioned data and runtime manifests.
- Self-host pinned DuckDB-Wasm and Pyodide distributions.
- Add typed worker RPC, package profiles, and platform resource ceilings.
- Review and version the runtime/workspace contract extension.
- Add learner/faculty projection compilation before scenario UI work expands.

### Phase 2 — Python workbench

- Add Monaco Python files and execution controls.
- Implement the Pyodide worker, output capture, tracebacks, DataFrame preview,
  PNG figures, package status, stop/reset, and cold replay.
- Replace canonical `localStorage` state with namespaced IndexedDB records.

### Phase 3 — Arrow interoperability and evidence

- Implement named “Stage for Python” extracts and `analyst.load()`.
- Implement `analyst.publish()` and DuckDB workspace registration.
- Capture run, extract, output, manifest, and lineage hashes in the evidence
  ledger.
- Add `.analystcase` export/import with schema and hash validation.

### Phase 4 — Manifest-driven scenario engine

- Replace the hard-coded case screen with scenario routes driven by learner
  manifests.
- Implement briefings, events, reveals, branches, scaffolds, artifact handoff,
  and per-case durable state.
- Connect all four existing scenarios with substantive Python work.

### Phase 5 — Complete the eight-case portfolio

- Author four additional scenarios against the same reusable runtime contract.
- Vary role, duration, ambiguity, package profile, professional artifact, and
  learner independence without introducing case-specific application code.
- Validate that Python performs authentic work in every case.

### Phase 6 — Faculty and assessment surfaces

- Publish the spoiler-warning faculty index and case routes.
- Add replay, evidence, and rubric review views.
- Ship only the deterministic checks listed above, with their limitations stated
  next to their results.
- Add projection, bundle-graph, and learner-route network leak tests.

### Phase 7 — Hardening

- Test Chrome, Firefox, and Safari on cold and warm caches.
- Exercise range/CORS failures, missing assets, worker crashes, timeouts,
  corrupted IndexedDB, low-memory conditions, and interrupted imports.
- Establish performance budgets for shell load, DuckDB readiness, Python
  readiness, result preview, Arrow transfer, and scenario switching.
- Consider opt-in offline assignment packs only after storage behavior is measured on
  representative student hardware.

## Acceptance criteria for the runtime foundation

Before all eight cases are connected, the shared runtime should demonstrate:

- the learner shell renders before Python packages download;
- Python starts only on deliberate use or bounded idle prefetch;
- a successful SQL result can be staged into pandas without JSON conversion;
- a pandas DataFrame can be published and queried from DuckDB;
- terminating a stuck worker returns the UI to a recoverable state;
- refreshing the browser restores saved source and evidence from IndexedDB;
- a clean replay records the same runtime and data revisions;
- the learner route requests no faculty resource; and
- all three major desktop browser engines pass the same representative SQL,
  Python, Arrow, persistence, and reset flow.

The purpose of this architecture is not to recreate a hosted notebook in a
browser. It is to create a casework system in which SQL, Python, evidence,
decision artifacts, and professional judgment remain connected and auditable.
