import type { InterventionRecurrenceFrequency } from './intervention-recurrence-frequency.type';

/**
 * Interface InterventionRecurrenceFormValues
 * @interface InterventionRecurrenceFormValues
 *
 * @description
 * The payload a recurrence form submits — the create form's shape, reused
 * by the edit form (its `recurrenceId` is `null` for a create).
 */
export interface InterventionRecurrenceFormValues {
  //#region Properties
  /** `null` for a create submission, the edited rule's id otherwise. */
  readonly recurrenceId: string | null;
  /** @type {string} */
  readonly name: string;
  /** Intervention template IRI this recurrence materializes. */
  readonly templateId: string;
  /** Site (facility IRI) override, or `null` to use the template default. */
  readonly site: string | null;
  /** Responsible (member IRI) override, or `null` to use the template default. */
  readonly responsible: string | null;
  /** @type {InterventionRecurrenceFrequency} */
  readonly frequency: InterventionRecurrenceFrequency;
  /** Cadence multiplier (1–12) applied to {@link frequency}. */
  readonly interval: number;
  /** The rule's reference date. */
  readonly anchorDate: Date;
  /** IANA timezone the rule's dates are interpreted in. */
  readonly timezone: string;
  /** Days before the computed occurrence date the materialized draft should be ready by. */
  readonly leadTimeDays: number;
  /** When the rule stops materializing new drafts, or `null` for no end. */
  readonly endAt: Date | null;
  //#endregion
}
