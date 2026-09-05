import type { InterventionStatus } from '@features/organization/features/interventions/models';
/**
 * Type InterventionBatchAction
 * @description Repeatable user intention, applied only to failed eligible rows after a partial result.
 * @since 1.0.0
 */
export type InterventionBatchAction =
  | { readonly kind: 'transition'; readonly status: InterventionStatus }
  | { readonly kind: 'assign'; readonly responsible: string }
  | { readonly kind: 'delete' };
