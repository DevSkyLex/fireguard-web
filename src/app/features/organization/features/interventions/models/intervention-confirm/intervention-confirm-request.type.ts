import type { InterventionWorkItemOutput } from '../intervention-work-item/intervention-work-item-output.interface';

/**
 * What a text confirmation is currently asking about.
 *
 * One union rather than four nullable signals, so "two confirmations pending
 * at once" is not a state the caller can be in. Shared by the page, which
 * owns the pending request, and `InterventionConfirmDialog`, which renders it.
 */
export type InterventionConfirmRequest =
  | { readonly kind: 'abandon' }
  | { readonly kind: 'deleteIntervention' }
  | { readonly kind: 'deleteWorkItem'; readonly workItem: InterventionWorkItemOutput }
  | { readonly kind: 'skipWorkItem'; readonly workItem: InterventionWorkItemOutput };
