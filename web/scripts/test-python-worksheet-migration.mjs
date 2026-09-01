import assert from 'node:assert/strict';

import { migrateLegacyPythonWorksheet } from '../lib/python-worksheet-migration.ts';

const files = [
  {
    table: 'support.csat_response',
    pythonPath: '/data/support/csat_response.parquet',
    url: '/data/support/csat_response.parquet',
  },
  {
    table: 'scenario.asset_cohort',
    pythonPath:
      '/data/cases/rollback-before-dawn/scenario/asset_cohort.parquet',
    url: '/data/cases/rollback-before-dawn/scenario/asset_cohort.parquet',
  },
  {
    table: 'growth.session',
    pythonPath: '/data/cases/the-navigation-vote/growth_session.parquet',
    url: '/data/cases/the-navigation-vote/growth_session.parquet',
  },
];

const literal = `import pandas as pd

csat = pd.read_parquet("/data/support/csat_response.parquet")
other = pd.read_parquet("/data/support/not_registered.parquet")
# example = pd.read_parquet("/data/support/csat_response.parquet")
example = 'pd.read_parquet("/data/support/csat_response.parquet")'
`;
const migratedLiteral = migrateLegacyPythonWorksheet(literal, files);
assert.match(migratedLiteral, /from analyst import table/);
assert.match(migratedLiteral, /csat = table\("support\.csat_response"\)/);
assert.match(
  migratedLiteral,
  /other = pd\.read_parquet\("\/data\/support\/not_registered\.parquet"\)/,
);
assert.match(migratedLiteral, /# example = pd\.read_parquet/);
assert.match(migratedLiteral, /example = 'pd\.read_parquet/);

const interpolated = `import pandas as pd
from analyst import table

root = "/data/cases/rollback-before-dawn"
CASE = '/data/cases/the-navigation-vote'
cohort = pd.read_parquet(f"{root}/scenario/asset_cohort.parquet")
sessions = pd.read_parquet(f'{CASE}/growth_session.parquet')
`;
const migratedInterpolated = migrateLegacyPythonWorksheet(interpolated, files);
assert.equal(
  (migratedInterpolated.match(/from analyst import table/g) ?? []).length,
  1,
);
assert.match(
  migratedInterpolated,
  /cohort = table\("scenario\.asset_cohort"\)/,
);
assert.match(migratedInterpolated, /sessions = table\("growth\.session"\)/);
assert.equal(
  migrateLegacyPythonWorksheet(migratedInterpolated, files),
  migratedInterpolated,
);

const ambiguousRoot = `root = "/data/cases/rollback-before-dawn"
root = choose_data_root()
cohort = pd.read_parquet(f"{root}/scenario/asset_cohort.parquet")
`;
assert.equal(migrateLegacyPythonWorksheet(ambiguousRoot, files), ambiguousRoot);

const exactPathOnly =
  'csat = pd.read_parquet("/data/support/csat_response.parquet.bak")';
assert.equal(migrateLegacyPythonWorksheet(exactPathOnly, files), exactPathOnly);

console.log('python worksheet migration: all checks passed');
