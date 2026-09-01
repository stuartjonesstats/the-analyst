import { access, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const outputRoot = path.resolve('dist/client');
const nestedAssets = path.join(outputRoot, 'the-analyst', '_next');
const finalAssets = path.join(outputRoot, '_next');

await access(path.join(outputRoot, 'index.html'), constants.R_OK);

async function exists(target) {
  try {
    await access(target, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

if (await exists(nestedAssets)) {
  await rm(finalAssets, { recursive: true, force: true });
  await mkdir(path.dirname(finalAssets), { recursive: true });
  await rename(nestedAssets, finalAssets);
  await rm(path.join(outputRoot, 'the-analyst'), { recursive: true, force: true });
} else {
  await access(finalAssets, constants.R_OK);
}

for (const route of ['workbench', 'projects', 'approach', 'guide', 'data', 'teach', 'teach/replay', 'teach/spoilers']) {
  const source = path.join(outputRoot, `${route}.html`);
  const destinationDirectory = path.join(outputRoot, route);
  const destination = path.join(destinationDirectory, 'index.html');
  if (await exists(source)) {
    await mkdir(destinationDirectory, { recursive: true });
    await rename(source, destination);
  } else {
    await access(destination, constants.R_OK);
  }
}

await writeFile(path.join(outputRoot, '.nojekyll'), '', 'utf8');

console.log('GitHub Pages artifact prepared at dist/client.');
