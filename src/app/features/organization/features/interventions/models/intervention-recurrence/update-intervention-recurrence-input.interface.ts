import type { InterventionRecurrenceFrequency } from './intervention-recurrence-frequency.type';

/**
 * Interface UpdateInterventionRecurrenceInput
 * @interface UpdateInterventionRecurrenceInput
 *
 * @description
 * Merge-patch body of `PATCH /intervention-recurrences/{id}`. Every field is
 * optional; `organization` and `template` are immutable and never appear
 * here. `isActive` is update-only — it is how the pause/resume toggle
 * writes.
 */
export interface UpdateInterventionRecurrenceInput {
  //#region Properties
  /** @type {string} */
  readonly name?: string;
  /** `null` clears the override back to the template default. */
  readonly site?: string | null;
  /** `null` clears the override back to the template default. */
  readonly responsible?: string | null;
  /** @type {InterventionRecurrenceFrequency} */
  readonly frequency?: InterventionRecurrenceFrequency;
  /** Cadence multiplier (1–12). */
  readonly interval?: number;
  /** @type {Date} */
  readonly anchorDate?: Date;
  /** IANA timezone. */
  readonly timezone?: string;
  /** Lead time in days (0–90). */
  readonly leadTimeDays?: number;
  /** `null` clears the end date, making the rule run indefinitely. */
  readonly endAt?: Date | null;
  /** Pause (`false`) or resume (`true`) the rule. */
  readonly isActive?: boolean;
  //#endregion
}
