/** Public launch switches for finished features that are being held deliberately. */
export const publicFeatures = {
  fieldWork: process.env.NEXT_PUBLIC_FIELD_WORK === 'true',
} as const;

