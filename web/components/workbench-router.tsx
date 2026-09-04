'use client';

import { useCallback, useEffect, useState } from 'react';

import { CaseWorkbench } from '@/components/case-workbench';
import { caseDefinitions, caseDefinitionsBySlug } from '@/lib/case-definitions';
import { priorityBriefBySlug, priorityBriefCaseDefinition } from '@/lib/priority-briefs';
import { sitePath } from '@/lib/site-path';
import type { ScaffoldMode } from '@/lib/analyst-case';

function routeFromLocation() {
  const search = new URLSearchParams(window.location.search);
  const requested = search.get('case');
  const slug = requested && caseDefinitionsBySlug[requested] ? requested : caseDefinitions[0].slug;
  const requestedBrief = search.get('brief');
  const brief = requestedBrief ? priorityBriefBySlug.get(requestedBrief) : undefined;
  return {
    slug,
    briefSlug: brief?.sourceCaseSlug === slug ? brief.slug : null,
  };
}

function modeFromLocation(): ScaffoldMode {
  const requested = new URLSearchParams(window.location.search).get('mode');
  return requested === 'guided' || requested === 'independent' ? requested : 'supported';
}

export function WorkbenchRouter() {
  const [slug, setSlug] = useState(caseDefinitions[0].slug);
  const [briefSlug, setBriefSlug] = useState<string | null>(null);
  const [mode, setMode] = useState<ScaffoldMode>('supported');

  useEffect(() => {
    const sync = () => {
      const route = routeFromLocation();
      setSlug(route.slug);
      setBriefSlug(route.briefSlug);
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
    setBriefSlug(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [mode]);

  const selectMode = useCallback((nextMode: ScaffoldMode) => {
    const briefQuery = briefSlug ? `&brief=${encodeURIComponent(briefSlug)}` : '';
    const url = `${sitePath('/workbench/')}?case=${encodeURIComponent(slug)}${briefQuery}&mode=${nextMode}`;
    window.history.pushState(null, '', url);
    setMode(nextMode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [briefSlug, slug]);

  const baseDefinition = caseDefinitionsBySlug[slug] ?? caseDefinitions[0];
  const brief = briefSlug ? priorityBriefBySlug.get(briefSlug) : undefined;
  const definition = brief
    ? priorityBriefCaseDefinition(brief, baseDefinition)
    : baseDefinition;
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
