import type { CaseDataFile } from '@/lib/case-definition';

type PythonWorksheetDataFile = Pick<
  CaseDataFile,
  'pythonPath' | 'table' | 'url'
>;

const TABLE_IMPORT = 'from analyst import table';

function pythonCodeMask(source: string) {
  const mask = new Uint8Array(source.length);
  let index = 0;

  while (index < source.length) {
    const character = source[index];

    if (character === '#') {
      while (index < source.length && source[index] !== '\n') index += 1;
      continue;
    }

    if (character === '"' || character === "'") {
      const quote = character;
      const triple = source.slice(index, index + 3) === quote.repeat(3);
      index += triple ? 3 : 1;

      while (index < source.length) {
        if (source[index] === '\\') {
          index += 2;
          continue;
        }
        if (triple && source.slice(index, index + 3) === quote.repeat(3)) {
          index += 3;
          break;
        }
        if (!triple && source[index] === quote) {
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }

    mask[index] = 1;
    index += 1;
  }

  return mask;
}

function registeredTables(dataFiles: PythonWorksheetDataFile[]) {
  const tables = new Map<string, string | null>();

  for (const file of dataFiles) {
    for (const path of new Set([file.pythonPath, file.url])) {
      const existing = tables.get(path);
      if (existing === undefined || existing === file.table) {
        tables.set(path, file.table);
      } else {
        // An ambiguous path should never be migrated automatically.
        tables.set(path, null);
      }
    }
  }

  return tables;
}

function literalRoots(source: string, codeMask: Uint8Array) {
  const roots = new Map<string, string | null>();
  const assignment =
    /^[\t ]*(root|CASE)[\t ]*(?::[^=\r\n]+)?=[\t ]*([^\r\n]*)$/gm;

  for (const match of source.matchAll(assignment)) {
    if (!codeMask[match.index]) continue;

    const value = match[2].match(
      /^(?:[rRuU])?(["'])([^"'\\]*)\1[\t ]*(?:#.*)?$/,
    );
    const next = value?.[2] ?? null;
    const previous = roots.get(match[1]);

    if (previous === undefined) {
      roots.set(match[1], next);
    } else if (previous !== next) {
      roots.set(match[1], null);
    }
  }

  return roots;
}

function hasTableImport(source: string, codeMask: Uint8Array) {
  const importLine = /^[\t ]*from[\t ]+analyst[\t ]+import[\t ]+([^\r\n#]+)/gm;

  for (const match of source.matchAll(importLine)) {
    if (!codeMask[match.index]) continue;
    const imports = match[1].split(',').map((name) => name.trim());
    if (imports.some((name) => name === 'table' || name === 'table as table'))
      return true;
  }

  return false;
}

function tableImportIndex(lines: string[]) {
  let index = 0;

  if (lines[index]?.startsWith('#!')) index += 1;
  if (/^[\t ]*#.*coding[:=]/.test(lines[index] ?? '')) index += 1;

  while (index < lines.length && /^[\t ]*(?:#.*)?$/.test(lines[index]))
    index += 1;

  const docstring = lines[index]?.match(/^[\t ]*(?:[rRuU])?(["']{3})/);
  if (docstring) {
    const delimiter = docstring[1];
    const openingOffset = lines[index].indexOf(delimiter) + delimiter.length;
    if (!lines[index].slice(openingOffset).includes(delimiter)) {
      index += 1;
      while (index < lines.length && !lines[index].includes(delimiter))
        index += 1;
    }
    if (index < lines.length) index += 1;
    while (index < lines.length && /^[\t ]*(?:#.*)?$/.test(lines[index]))
      index += 1;
  }

  let lastImport = -1;
  while (index < lines.length) {
    if (/^(?:import[\t ]|from[\t ])/.test(lines[index])) {
      lastImport = index;
      index += 1;
      while (index < lines.length && /^[\t ]+(?:[^#].*)?$/.test(lines[index])) {
        lastImport = index;
        index += 1;
      }
      continue;
    }
    if (/^[\t ]*(?:#.*)?$/.test(lines[index])) {
      index += 1;
      continue;
    }
    break;
  }

  return lastImport >= 0 ? lastImport + 1 : index;
}

function injectTableImport(source: string) {
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const lines = source.split(/\r?\n/);
  lines.splice(tableImportIndex(lines), 0, TABLE_IMPORT);
  return lines.join(newline);
}

/**
 * Migrates persisted worksheets from the former filesystem-facing starter API.
 * Only a simple read of a path registered to the active work item is rewritten.
 */
export function migrateLegacyPythonWorksheet(
  source: string,
  dataFiles: PythonWorksheetDataFile[],
) {
  const codeMask = pythonCodeMask(source);
  const tables = registeredTables(dataFiles);
  const roots = literalRoots(source, codeMask);
  const readParquet =
    /\bpd\.read_parquet[\t ]*\([\t \r\n]*([fF]?)(["'])([^"'\\\r\n]*)\2[\t \r\n]*\)/g;
  const replacements: Array<{ start: number; end: number; table: string }> = [];

  for (const match of source.matchAll(readParquet)) {
    if (!codeMask[match.index]) continue;

    let path = match[3];
    if (match[1]) {
      const interpolated = path.match(/^\{(root|CASE)\}([^{}]*)$/);
      if (!interpolated) continue;
      const base = roots.get(interpolated[1]);
      if (base === undefined || base === null) continue;
      path = `${base}${interpolated[2]}`;
    }

    const table = tables.get(path);
    if (!table) continue;
    replacements.push({
      start: match.index,
      end: match.index + match[0].length,
      table,
    });
  }

  if (replacements.length === 0) return source;

  let migrated = '';
  let cursor = 0;
  for (const replacement of replacements) {
    migrated += source.slice(cursor, replacement.start);
    migrated += `table(${JSON.stringify(replacement.table)})`;
    cursor = replacement.end;
  }
  migrated += source.slice(cursor);

  return hasTableImport(source, codeMask)
    ? migrated
    : injectTableImport(migrated);
}
