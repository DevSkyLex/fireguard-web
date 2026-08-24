import type { InterventionRecurrenceFrequency } from '@features/organization/features/interventions/models';

/**
 * Interface InterventionRecurrenceFormDraft
 * @interface InterventionRecurrenceFormDraft
 *
 * @description
 * The Signal Forms model this form actually edits. It mirrors
 * `InterventionRecurrenceFormValues` except `recurrenceId`, which the form
 * derives from its {@link InterventionRecurrenceForm.recurrence} input at
 * submit time rather than editing directly.
 *
 * @since 1.0.0
 */
export interface InterventionRecurrenceFormDraft {
  /** What to call the recurring schedule. */
  readonly name: string;

  /** Id of the intervention template this recurrence materializes, or an empty string. */
  readonly templateId: string;

  /** Site (facility IRI) override, or `null` to use the template default. */
  readonly site: string | null;

  /** Responsible (member IRI) override, or `null` to use the template default. */
  readonly responsible: string | null;

  /** Cadence unit. */
  readonly frequency: InterventionRecurrenceFrequency;

  /** Cadence multiplier (1–12) applied to {@link frequency}. */
  readonly interval: number;

  /** The rule's reference date, or `null` until picked. */
  readonly anchorDate: Date | null;

  /** IANA timezone the rule's dates are interpreted in. */
  readonly timezone: string;

  /** Days before the computed occurrence date the materialized draft should be ready by. */
  readonly leadTimeDays: number;

  /** When the rule stops materializing new drafts, or `null` for no end. */
  readonly endAt: Date | null;
}
