import type { InterventionEditTarget } from './intervention-edit-target.type';

/**
 * What a readiness item points at.
 *
 * Every in-place editor, plus `workItems` — the one gap that is filled by
 * adding to the checklist rather than by opening a property editor.
 */
export type InterventionReadinessTarget = InterventionEditTarget | 'workItems';
