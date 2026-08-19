import type { HydraItem } from '@core/api/models';

/**
 * Interface CalendarEventOutput
 * @interface CalendarEventOutput
 *
 * @description
 * A standalone calendar event's full detail, mirroring the backend's
 * `CalendarEventOutput`: what a create/update write returns, and what the
 * edit dialog reads off an `event`-source feed item to populate its fields.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface CalendarEventOutput extends HydraItem {
  //#region Properties
  /** The event's identifier. */
  readonly id: string;

  /** The organization this event belongs to. */
  readonly organizationId: string;

  /** Event title. */
  readonly title: string;

  /** Optional free-form description. */
  readonly description?: string | null;

  /** ISO start, with an explicit timezone offset. */
  readonly startsAt: string;

  /** Optional ISO end, with an explicit timezone offset. */
  readonly endsAt?: string | null;

  /** Whether the event spans whole day(s). */
  readonly allDay: boolean;

  /** Optional associated facility. */
  readonly facilityId?: string | null;

  /** The organization member who created the event. */
  readonly createdByMemberId: string;

  /** ISO creation timestamp. */
  readonly createdAt: string;

  /** ISO last-update timestamp. */
  readonly updatedAt: string;
  //#endregion
}
