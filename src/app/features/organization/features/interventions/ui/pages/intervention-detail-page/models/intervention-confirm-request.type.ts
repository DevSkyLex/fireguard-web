import type { InterventionWorkItemOutput } from '@features/organization/features/interventions/models';

/**
 * What the page's text confirmation is currently asking about.
 *
 * One union rather than four nullable signals, so "two confirmations pending at
 * once" is not a state the page can be in.
 */
export type InterventionConfirmRequest =
  | { readonly kind: 'abandon' }
  | { readonly kind: 'deleteIntervention' }
  | { readonly kind: 'deleteWorkItem'; readonly workItem: InterventionWorkItemOutput }
  | { readonly kind: 'skipWorkItem'; readonly workItem: InterventionWorkItemOutput };
