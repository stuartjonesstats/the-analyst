'use client';

import { useCallback, useEffect, useState } from 'react';

import { CaseWorkbench } from '@/components/case-workbench';
import { caseDefinitions, caseDefinitionsBySlug } from '@/lib/case-definitions';
import { sitePath } from '@/lib/site-path';
import type { ScaffoldMode } from '@/lib/analyst-case';

function slugFromLocation() {
  const requested = new URLSearchParams(window.location.search).get('case');
  return requested && caseDefinitionsBySlug[requested] ? requested : caseDefinitions[0].slug;
}

function modeFromLocation(): ScaffoldMode {
  const requested = new URLSearchParams(window.location.search).get('mode');
  return requested === 'guided' || requested === 'independent' ? requested : 'supported';
}

export function WorkbenchRouter() {
  const [slug, setSlug] = useState(caseDefinitions[0].slug);
  const [mode, setMode] = useState<ScaffoldMode>('supported');

  useEffect(() => {
    const sync = () => {
      setSlug(slugFromLocation());
      setMode(modeFromLocation());
    };
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const selectCase = useCallback((nextSlug: string) => {
    if (!caseDefinitionsBySlug[nextSlug]) return;
    const url = `${sitePath('/workbench/')}?case=${encodeURIComponent(nextSlug)}&mode=${mode}`;
    window.history.pushState(null, '', url);
    setSlug(nextSlug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [mode]);

  const selectMode = useCallback((nextMode: ScaffoldMode) => {
    const url = `${sitePath('/workbench/')}?case=${encodeURIComponent(slug)}&mode=${nextMode}`;
    window.history.pushState(null, '', url);
    setMode(nextMode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  const definition = caseDefinitionsBySlug[slug] ?? caseDefinitions[0];
  return (
    <CaseWorkbench
      key={`${definition.slug}:${mode}`}
      definition={definition}
      mode={mode}
      onSelectCase={selectCase}
      onSelectMode={selectMode}
    />
  );
}
