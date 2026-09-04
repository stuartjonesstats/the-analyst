export type FieldWorkArtifactType = 'GitHub repository' | 'Notebook' | 'Article' | 'Portfolio page';

export type FieldWorkEntry = {
  id: string;
  title: string;
  url: string;
  artifactType: FieldWorkArtifactType;
  assignment: string;
  author: string;
  synopsis: string;
  reflection: string;
  skills: string[];
  sharedAt: string;
};

/**
 * Approved, voluntarily submitted work only.
 *
 * This registry intentionally starts empty. Add an entry only after completing
 * the checks in FIELD_WORK_REVIEW.md. The public page presents an honest intake
 * state until the first submission is approved; it must never fabricate
 * community work or imply that publication is an assessment credential.
 */
export const fieldWorkEntries: FieldWorkEntry[] = [];

