import type { HydraItem } from '@core/api/models';

/**
 * A standalone organization calendar event, as returned by the calendar
 * event CRUD resource. Distinct from {@link CalendarFeedItem}, which is the
 * read-only, merged feed shape this record also appears through.
 *
 * @since 1.0.0
 */
export interface CalendarEventOutput extends HydraItem {
  readonly id: string;
  readonly organizationId: string;
  readonly title: string;
  readonly description: string | null;
  readonly startsAt: string;
  readonly endsAt: string | null;
  readonly allDay: boolean;
  readonly facilityId: string | null;
  readonly createdByMemberId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
