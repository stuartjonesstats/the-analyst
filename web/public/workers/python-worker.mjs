const PYODIDE_VERSION = '314.0.6';
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodide = null;

function sendStatus(status, detail) {
  self.postMessage({ type: 'status', status, detail });
}

async function loadDataFile(file) {
  const response = await fetch(file.url);
  if (!response.ok) {
    throw new Error(`Could not load ${file.label || file.path}: HTTP ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const directory = file.path.slice(0, file.path.lastIndexOf('/')) || '/';
  pyodide.FS.mkdirTree(directory);
  pyodide.FS.writeFile(file.path, bytes);
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
  sendStatus('ready', `Python ${pyodide.runPython('import sys; sys.version.split()[0]')}`);
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

def __analyst_execute(source):
    tree = ast.parse(source, filename="worksheet.py", mode="exec")
    result = None
    if tree.body and isinstance(tree.body[-1], ast.Expr):
        expression = ast.Expression(tree.body.pop().value)
        if tree.body:
            exec(compile(tree, "worksheet.py", "exec"), globals(), globals())
        result = eval(compile(expression, "worksheet.py", "eval"), globals(), globals())
    else:
        exec(compile(tree, "worksheet.py", "exec"), globals(), globals())

    figures = []
    if "matplotlib.pyplot" in sys.modules:
        import matplotlib.pyplot as plt
        for figure_number in plt.get_fignums():
            figure = plt.figure(figure_number)
            buffer = io.BytesIO()
            figure.savefig(buffer, format="png", dpi=130, bbox_inches="tight")
            figures.append("data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii"))
        plt.close("all")

    if result is None:
        display = ""
    else:
        try:
            display = repr(result)
        except Exception:
            display = f"<{type(result).__name__}>"

    return json.dumps({"display": display, "figures": figures})

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
