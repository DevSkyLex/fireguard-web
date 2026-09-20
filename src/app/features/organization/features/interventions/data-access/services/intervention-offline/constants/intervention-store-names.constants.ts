/**
 * Constant INTERVENTION_STORE_NAMES
 * @const INTERVENTION_STORE_NAMES
 *
 * @description
 * Every object store cleared when local intervention data is purged.
 *
 * @since 1.1.0
 *
 * @type {readonly string[]}
 */
export const INTERVENTION_STORE_NAMES = [
  'interventions',
  'workItems',
  'timeJournals',
  'timeDrafts',
  'changes',
  'resources',
  'media',
  'outbox',
  'metadata',
] as const;
