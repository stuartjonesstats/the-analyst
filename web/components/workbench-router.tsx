'use client';

import { useCallback, useEffect, useState } from 'react';

import { CaseWorkbench } from '@/components/case-workbench';
import { caseDefinitions, caseDefinitionsBySlug } from '@/lib/case-definitions';
import { sitePath } from '@/lib/site-path';

function slugFromLocation() {
  const requested = new URLSearchParams(window.location.search).get('case');
  return requested && caseDefinitionsBySlug[requested] ? requested : caseDefinitions[0].slug;
}

export function WorkbenchRouter() {
  const [slug, setSlug] = useState(caseDefinitions[0].slug);

  useEffect(() => {
    const sync = () => setSlug(slugFromLocation());
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const selectCase = useCallback((nextSlug: string) => {
    if (!caseDefinitionsBySlug[nextSlug]) return;
    const url = `${sitePath('/workbench/')}?case=${encodeURIComponent(nextSlug)}`;
    window.history.pushState(null, '', url);
    setSlug(nextSlug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const definition = caseDefinitionsBySlug[slug] ?? caseDefinitions[0];
  return <CaseWorkbench key={definition.slug} definition={definition} onSelectCase={selectCase} />;
}

