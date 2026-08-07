import type {
  InterventionPriority,
  InterventionType,
} from '@features/organization/features/interventions/models';

/**
 * Interface InterventionCreateFormDraft
 * @interface InterventionCreateFormDraft
 *
 * @description
 * The Signal Forms model this form actually edits. It mirrors
 * {@link InterventionCreateFormValues} except for the planned window, which
 * `hlm-date-range-picker` binds as a single `[start, end]` tuple field.
 * `submit()` splits `plannedRange` back into `plannedStartAt`/`dueAt` when it
 * builds the emitted {@link InterventionCreateFormValues}.
 *
 * @since 4.0.0
 */
export interface InterventionCreateFormDraft {
  /** What to call the intervention. */
  readonly name: string;

  /** What the intervention prepares. */
  readonly type: InterventionType;

  /** How urgent it is. */
  readonly priority: InterventionPriority;

  /** IRI of the site it concerns, or an empty string. */
  readonly site: string;

  /** IRI of the responsible member, or an empty string. */
  readonly responsible: string;

  /** The planned start and due dates, chosen together, or `null` until both are picked. */
  readonly plannedRange: [Date, Date] | null;
}
