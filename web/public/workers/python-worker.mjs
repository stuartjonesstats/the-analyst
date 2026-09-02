const PYODIDE_VERSION = '314.0.6';
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodide = null;
let mountedFiles = [];

function sendStatus(status, detail) {
  self.postMessage({ type: 'status', status, detail });
}

async function loadDataFile(file) {
  const response = await fetch(file.url);
  if (!response.ok) {
    throw new Error(`Could not load ${file.table || file.label || file.path}: HTTP ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const directory = file.path.slice(0, file.path.lastIndexOf('/')) || '/';
  pyodide.FS.mkdirTree(directory);
  pyodide.FS.writeFile(file.path, bytes);
}

async function installCaseDataHelpers(files) {
  const registry = Object.fromEntries(
    files.map((file) => [file.table || file.label || file.path, file.path]),
  );
  pyodide.globals.set('__analyst_case_registry_json', JSON.stringify(registry));

  try {
    await pyodide.runPythonAsync(`
import difflib as __analyst_difflib
import json as __analyst_json
import pathlib as __analyst_pathlib
import sys as __analyst_sys
import types as __analyst_types

__analyst_case_registry = __analyst_json.loads(__analyst_case_registry_json)

def __analyst_resolve_table(name):
    if not isinstance(name, str) or not name.strip():
        raise TypeError("Table name must be a non-empty string.")

    requested = name.strip()
    if requested in __analyst_case_registry:
        return requested, __analyst_case_registry[requested]

    short_matches = [
        table_name
        for table_name in __analyst_case_registry
        if table_name.rsplit(".", 1)[-1] == requested
    ]
    if len(short_matches) == 1:
        match = short_matches[0]
        return match, __analyst_case_registry[match]
    if len(short_matches) > 1:
        choices = ", ".join(short_matches)
        raise KeyError(f'Table name "{requested}" is ambiguous. Use one of: {choices}')

    suggestions = __analyst_difflib.get_close_matches(
        requested,
        list(__analyst_case_registry),
        n=3,
        cutoff=0.35,
    )
    hint = f" Did you mean: {', '.join(suggestions)}?" if suggestions else ""
    available = ", ".join(__analyst_case_registry) or "(none)"
    raise KeyError(f'Unknown assignment table "{requested}".{hint} Available tables: {available}')

def __analyst_table_path(name):
    """Return the mounted browser-filesystem path for an assignment table."""
    return __analyst_resolve_table(name)[1]

def __analyst_load_table(name, **kwargs):
    """Load a named assignment table as a pandas DataFrame."""
    import pandas as pd

    _, file_path = __analyst_resolve_table(name)
    suffix = __analyst_pathlib.PurePosixPath(file_path).suffix.lower()
    if suffix in {".parquet", ".pq"}:
        return pd.read_parquet(file_path, **kwargs)
    if suffix == ".csv":
        return pd.read_csv(file_path, **kwargs)
    if suffix == ".tsv":
        return pd.read_csv(file_path, sep="\\t", **kwargs)
    if suffix in {".json", ".jsonl", ".ndjson"}:
        if suffix in {".jsonl", ".ndjson"} and "lines" not in kwargs:
            kwargs["lines"] = True
        return pd.read_json(file_path, **kwargs)
    if suffix in {".feather", ".arrow"}:
        return pd.read_feather(file_path, **kwargs)
    raise ValueError(f'Unsupported assignment-table format for "{file_path}".')

def __analyst_available_tables():
    """Return the table names available in this assignment."""
    return tuple(__analyst_case_registry)

__analyst_module = __analyst_types.ModuleType("analyst")
__analyst_module.__doc__ = "Storage-independent access to the current assignment datasets."
__analyst_module.table = __analyst_load_table
__analyst_module.load_table = __analyst_load_table
__analyst_module.path = __analyst_table_path
__analyst_module.available_tables = __analyst_available_tables
__analyst_module.tables = __analyst_available_tables()
__analyst_module.__all__ = [
    "table",
    "load_table",
    "path",
    "available_tables",
    "tables",
]
__analyst_sys.modules["analyst"] = __analyst_module

# Keep the earlier experimental module name as a compatibility alias for
# saved worksheets; new worksheets should import from analyst.
__analyst_sys.modules["case_data"] = __analyst_module

# Also make the convenience spellings available without setup code.
analyst = __analyst_module
case_data = __analyst_module
load_table = __analyst_load_table
`);
  } finally {
    pyodide.globals.delete('__analyst_case_registry_json');
  }
}

async function initialize(files = [], packages = []) {
  if (pyodide) return;
  sendStatus('booting', 'Loading CPython runtime');
  const { loadPyodide } = await import(`${PYODIDE_INDEX_URL}pyodide.mjs`);
  pyodide = await loadPyodide({ indexURL: PYODIDE_INDEX_URL });
  sendStatus('booting', 'Loading core analysis packages');
  await pyodide.loadPackage([...new Set(['pandas', 'matplotlib', 'pyarrow', ...packages])]);

  if (files.length) {
    sendStatus('loading_data', `Mounting ${files.length} scenario files`);
    for (const file of files) await loadDataFile(file);
  }
  mountedFiles = [...files];
  await installCaseDataHelpers(mountedFiles);
  sendStatus('ready', `Python ${pyodide.runPython('import sys; sys.version.split()[0]')}`);
}

async function mountWorkspaceTable(id, table, path, bytes) {
  if (!pyodide) throw new Error('Start Python before publishing a workspace table.');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const directory = normalizedPath.slice(0, normalizedPath.lastIndexOf('/')) || '/';
  pyodide.FS.mkdirTree(directory);
  pyodide.FS.writeFile(normalizedPath, new Uint8Array(bytes));
  const record = { table, label: table, path: normalizedPath, url: '' };
  mountedFiles = [...mountedFiles.filter((file) => file.table !== table), record];
  await installCaseDataHelpers(mountedFiles);
  self.postMessage({ type: 'workspace_mounted', id, table, path: normalizedPath });
  sendStatus('ready', `${table} available to Python`);
}

async function runCell(id, code) {
  const stdout = [];
  const stderr = [];
  const started = performance.now();
  sendStatus('running', 'Executing Python worksheet');

  try {
    // Resolve opportunistic imports before capturing learner output so package
    // loader diagnostics do not appear as worksheet stdout.
    await pyodide.loadPackagesFromImports(code);
    pyodide.setStdout({ batched: (message) => stdout.push(message) });
    pyodide.setStderr({ batched: (message) => stderr.push(message) });
    pyodide.globals.set('__analyst_source', code);

    const serialized = await pyodide.runPythonAsync(`
import ast
import base64
import io
import json
import sys
import warnings

def __analyst_execute(source):
    figures = []
    # A worksheet run is a figure boundary: never carry an unrendered plot
    # into the next run, including after an exception.
    if "matplotlib.pyplot" in sys.modules:
        sys.modules["matplotlib.pyplot"].close("all")

    try:
        tree = ast.parse(source, filename="worksheet.py", mode="exec")
        result = None
        if tree.body and isinstance(tree.body[-1], ast.Expr):
            expression = ast.Expression(tree.body.pop().value)
            if tree.body:
                exec(compile(tree, "worksheet.py", "exec"), globals(), globals())
            result = eval(compile(expression, "worksheet.py", "eval"), globals(), globals())
        else:
            exec(compile(tree, "worksheet.py", "exec"), globals(), globals())

        if "matplotlib.pyplot" in sys.modules:
            plt = sys.modules["matplotlib.pyplot"]
            for figure_number in plt.get_fignums():
                figure = plt.figure(figure_number)
                with io.BytesIO() as buffer:
                    # The Pyodide canvas bridge can emit Matplotlib's own
                    # deprecation warnings while serializing an otherwise
                    # valid figure. Keep those runtime internals out of the
                    # learner's stderr without suppressing worksheet warnings.
                    with warnings.catch_warnings():
                        from matplotlib import MatplotlibDeprecationWarning
                        warnings.simplefilter("ignore", MatplotlibDeprecationWarning)
                        figure.savefig(buffer, format="png", dpi=130, bbox_inches="tight")
                    figures.append(
                        "data:image/png;base64,"
                        + base64.b64encode(buffer.getvalue()).decode("ascii")
                    )

        if result is None:
            display = ""
        else:
            try:
                display = repr(result)
            except Exception:
                display = f"<{type(result).__name__}>"

        return json.dumps({"display": display, "figures": figures})
    finally:
        if "matplotlib.pyplot" in sys.modules:
            sys.modules["matplotlib.pyplot"].close("all")

__analyst_execute(__analyst_source)
`);

    pyodide.globals.delete('__analyst_source');
    const result = JSON.parse(serialized);
    self.postMessage({
      type: 'result',
      id,
      stdout,
      stderr,
      display: result.display,
      figures: result.figures,
      elapsedMs: Math.max(1, Math.round(performance.now() - started)),
    });
    sendStatus('ready', 'Python runtime ready');
  } catch (error) {
    try {
      pyodide.globals.delete('__analyst_source');
    } catch {
      // The runtime may not have completed initialization.
    }
    self.postMessage({
      type: 'run_error',
      id,
      stdout,
      stderr,
      error: error instanceof Error ? error.message : String(error),
    });
    sendStatus('ready', 'Python runtime ready');
  }
}

self.onmessage = async (event) => {
  const message = event.data;
  try {
    if (message.type === 'init') {
      await initialize(message.files, message.packages);
      self.postMessage({ type: 'initialized', id: message.id });
      return;
    }
    if (message.type === 'run') {
      await initialize(message.files, message.packages);
      await runCell(message.id, message.code);
      return;
    }
    if (message.type === 'mount_workspace_table') {
      await initialize(message.files, message.packages);
      await mountWorkspaceTable(message.id, message.table, message.path, message.bytes);
    }
  } catch (error) {
    self.postMessage({
      type: 'fatal_error',
      id: message.id,
      error: error instanceof Error ? error.message : String(error),
    });
    sendStatus('error', 'Python runtime failed');
  }
};
