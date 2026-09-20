import type {
  InterventionTimeScope,
  InterventionTimeWrite,
  InterventionTimeDraft,
} from '@features/organization/features/interventions/models';

/**
 * Type InterventionTimePersistenceRequest
 * @type InterventionTimePersistenceRequest
 *
 * @description
 * Ordered local persistence and explicit journal submission.
 *
 * @since 1.0.0
 */
export type InterventionTimePersistenceRequest =
  | {
      readonly kind: 'draft';
      readonly scope: InterventionTimeScope;
      readonly draft: InterventionTimeDraft | null;
    }
  | {
      readonly kind: 'write';
      readonly scope: InterventionTimeScope;
      readonly command: InterventionTimeWrite;
    };
