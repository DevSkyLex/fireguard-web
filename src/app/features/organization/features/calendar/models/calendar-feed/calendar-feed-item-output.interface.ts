import type { CalendarSourceKey } from './calendar-source-key.type';

/**
 * Interface CalendarFeedItemOutput
 * @interface CalendarFeedItemOutput
 *
 * @description
 * One entry of the unified calendar feed, mirroring the backend's
 * `CalendarFeedItemOutput`: what happens (`title`), when (`startsAt`,
 * optional `endsAt`, `allDay`), where it came from (`sourceKey`) and what it
 * points at (`targetType`/`targetId`, e.g. the intervention to open).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface CalendarFeedItemOutput {
  //#region Properties
  /** Which source contributed the entry. */
  readonly sourceKey: CalendarSourceKey;

  /** Feed-stable identifier of the entry. */
  readonly id: string;

  /** Human title of the entry. */
  readonly title: string;

  /** Optional free-text description. */
  readonly description?: string | null;

  /** ISO start of the entry. */
  readonly startsAt: string;

  /** Optional ISO end. */
  readonly endsAt?: string | null;

  /** Whether the entry spans its whole day. */
  readonly allDay: boolean;

  /** Optional facility the entry concerns. */
  readonly facilityId?: string | null;

  /** Source-specific status literal, when the source carries one. */
  readonly status?: string | null;

  /** Kind of record `targetId` identifies. */
  readonly targetType: string;

  /** Identifier of the underlying record. */
  readonly targetId: string;
  //#endregion
}
