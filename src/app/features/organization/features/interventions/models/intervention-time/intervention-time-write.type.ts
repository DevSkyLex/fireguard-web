import type { WriteInterventionTimeEntryInput } from './write-intervention-time-entry-input.interface';

/**
 * Type InterventionTimeWrite
 * @type InterventionTimeWrite
 *
 * @description
 * Complete independent journal mutation, with an explicit revision for corrections.
 *
 * @since 1.0.0
 */
export type InterventionTimeWrite =
  | { readonly kind: 'create'; readonly input: WriteInterventionTimeEntryInput }
  | {
      readonly kind: 'correct';
      readonly input: WriteInterventionTimeEntryInput;
      readonly revision: number;
    }
  | { readonly kind: 'cancel'; readonly id: string; readonly revision: number };
