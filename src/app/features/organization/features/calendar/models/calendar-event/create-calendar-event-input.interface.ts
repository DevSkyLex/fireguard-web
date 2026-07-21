/**
 * Payload to create a standalone calendar event
 * (`POST /organizations/{organizationId}/calendar/events`).
 *
 * Mirrors the backend `CreateCalendarEventInput` DTO field-for-field: there is
 * no type/category on the wire — a standalone event always feeds the calendar
 * as `calendar_event` (see {@link CalendarFeedSourceKey}).
 *
 * @since 1.0.0
 */
export interface CreateCalendarEventInput {
  readonly title: string;
  readonly description?: string;
  /** ISO 8601 with an explicit timezone offset, e.g. `2026-08-01T09:00:00+02:00`. */
  readonly startsAt: string;
  /** ISO 8601 with an explicit timezone offset. Omitted for an open-ended event. */
  readonly endsAt?: string;
  readonly allDay?: boolean;
  readonly facilityId?: string;
}
