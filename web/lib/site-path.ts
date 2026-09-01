const configuredBasePath = process.env.NEXT_PUBLIC_SITE_PATH ?? '';

function basePath() {
  if (configuredBasePath) return configuredBasePath;
  if (typeof document !== 'undefined') {
    const assetScript = Array.from(document.scripts).find((script) => script.src.includes('/_next/'));
    if (assetScript) {
      const marker = '/_next/';
      const markerIndex = new URL(assetScript.src).pathname.indexOf(marker);
      if (markerIndex > 0) return new URL(assetScript.src).pathname.slice(0, markerIndex);
    }
  }
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.github.io')) {
    return '/the-analyst';
  }
  return '';
}

export function sitePath(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${basePath()}${normalized}`;
}
