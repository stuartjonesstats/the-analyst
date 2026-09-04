import { access, mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
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

async function htmlDocuments(directory) {
  const documents = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) documents.push(...await htmlDocuments(target));
    else if (entry.isFile() && entry.name.endsWith('.html')) documents.push(target);
  }
  return documents;
}

// GitHub Pages serves directory indexes consistently at trailing-slash URLs.
// Vinext emits static routes as route.html, including nested generated routes,
// so normalize every document rather than maintaining a fragile route list.
for (const source of await htmlDocuments(outputRoot)) {
  const relative = path.relative(outputRoot, source);
  if (relative === 'index.html' || relative === '404.html' || path.basename(source) === 'index.html') continue;
  const route = relative.slice(0, -'.html'.length);
  const destinationDirectory = path.join(outputRoot, route);
  const destination = path.join(destinationDirectory, 'index.html');
  await mkdir(destinationDirectory, { recursive: true });
  await rename(source, destination);
}

await writeFile(path.join(outputRoot, '.nojekyll'), '', 'utf8');

console.log('GitHub Pages artifact prepared at dist/client.');
