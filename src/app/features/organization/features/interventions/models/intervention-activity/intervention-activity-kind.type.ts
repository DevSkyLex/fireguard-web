/**
 * Type InterventionActivityKind
 *
 * @description
 * Discriminates a user-authored comment from a system-recorded activity
 * entry (e.g. a status change) on the intervention timeline.
 */
export type InterventionActivityKind = 'comment' | 'system';
