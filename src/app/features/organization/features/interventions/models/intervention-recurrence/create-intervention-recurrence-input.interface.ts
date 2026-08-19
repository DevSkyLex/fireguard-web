import type { InterventionRecurrenceFrequency } from './intervention-recurrence-frequency.type';

/**
 * Interface CreateInterventionRecurrenceInput
 * @interface CreateInterventionRecurrenceInput
 *
 * @description
 * Body of `POST /intervention-recurrences`. `organization` and `template`
 * are the only two fields the backend never lets `update` touch afterward —
 * a recurrence's template is fixed at creation, there is no template-less
 * recurrence.
 */
export interface CreateInterventionRecurrenceInput {
  //#region Properties
  /** Organization IRI. */
  readonly organization: string;
  /** Intervention template IRI. Required — no template-less recurrence. */
  readonly template: string;
  /** Name (≤160 chars). */
  readonly name: string;
  /** Site (facility IRI) override; omitted uses the template default. */
  readonly site?: string;
  /** Responsible (member IRI) override; omitted uses the template default. */
  readonly responsible?: string;
  /** Cadence unit. Defaults to `'monthly'` server-side when omitted. */
  readonly frequency?: InterventionRecurrenceFrequency;
  /** Cadence multiplier (1–12). Defaults to `1` server-side when omitted. */
  readonly interval?: number;
  /** The rule's reference date. */
  readonly anchorDate: Date;
  /** IANA timezone. Defaults to `'UTC'` server-side when omitted. */
  readonly timezone?: string;
  /** Lead time in days (0–90). Defaults to `7` server-side when omitted. */
  readonly leadTimeDays?: number;
  /** When the rule stops materializing new drafts. */
  readonly endAt?: Date;
  //#endregion
}
