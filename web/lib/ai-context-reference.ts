import {
  filterAiContextReference,
  type AiAssignmentTableCatalog,
  type AiCatalogRelationship,
  type AiExtractCatalog,
} from '@/lib/ai-context';
import { sitePath } from '@/lib/site-path';

export async function loadAiContextReference(tableNames: string[], assignmentSlug: string) {
  const [catalogResponse, relationshipsResponse, extractsResponse] = await Promise.all([
    fetch(sitePath('/data/catalog/assignment_table_catalog.json')),
    fetch(sitePath('/data/catalog/relationships.json')),
    fetch(sitePath('/data/catalog/assignment_extracts.json')),
  ]);
  if (!catalogResponse.ok || !relationshipsResponse.ok || !extractsResponse.ok) {
    throw new Error('The public data dictionary could not be loaded. Try the download again.');
  }
  return filterAiContextReference(
    await catalogResponse.json() as AiAssignmentTableCatalog,
    await relationshipsResponse.json() as AiCatalogRelationship[],
    await extractsResponse.json() as AiExtractCatalog,
    tableNames,
    assignmentSlug,
  );
}
