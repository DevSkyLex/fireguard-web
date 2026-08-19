import type { HydraItem } from '@core/api/models';
import type { InterventionRecurrenceFrequency } from './intervention-recurrence-frequency.type';

/**
 * Interface InterventionRecurrenceOutput
 * @interface InterventionRecurrenceOutput
 *
 * @description
 * A recurring intervention schedule (`/api/intervention-recurrences`): a
 * rule that periodically materializes an intervention template into a real
 * draft. `nextOccurrenceAt` is **always present and authoritative** — the
 * backend recomputes it on every write, so a client must never derive it
 * itself; the same holds for a PATCH response after `update`. A
 * materialized intervention carries **no back-reference** to the recurrence
 * that produced it (a documented API gap, not a frontend omission) — do not
 * build UI that implies otherwise.
 */
export interface InterventionRecurrenceOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly id: string;
  /** Organization IRI. Immutable after creation. */
  readonly organization: string;
  /** Intervention template IRI this recurrence materializes. Immutable after creation. */
  readonly template: string;
  /** @type {string} */
  readonly name: string;
  /** Site (facility IRI) override, or `null` to use the template default. */
  readonly site: string | null;
  /** Responsible (member IRI) override, or `null` to use the template default. */
  readonly responsible: string | null;
  /** @type {InterventionRecurrenceFrequency} */
  readonly frequency: InterventionRecurrenceFrequency;
  /** Cadence multiplier (1–12) applied to {@link frequency}. */
  readonly interval: number;
  /**
   * The rule's reference date (ATOM timestamp). When its day-of-month is
   * past the 28th, occurrences drift after a short month — a documented
   * backend caveat, not a bug.
   */
  readonly anchorDate: string;
  /** IANA timezone the rule's dates are interpreted in. */
  readonly timezone: string;
  /** Days before the computed occurrence date the materialized draft should be ready by. */
  readonly leadTimeDays: number;
  /** The next occurrence's authoritative timestamp — never derive this client-side. */
  readonly nextOccurrenceAt: string;
  /** When this rule last materialized a draft, or `null` if it never has. */
  readonly lastMaterializedAt: string | null;
  /** Whether the rule is currently armed (`false` = paused). */
  readonly isActive: boolean;
  /** When the rule stops materializing new drafts, or `null` for no end. */
  readonly endAt: string | null;
  /** @type {string} */
  readonly createdAt: string;
  /** @type {string} */
  readonly updatedAt: string;
  //#endregion
}
