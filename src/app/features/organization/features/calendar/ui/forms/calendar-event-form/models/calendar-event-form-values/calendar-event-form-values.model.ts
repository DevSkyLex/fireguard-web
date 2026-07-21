/**
 * Editable values emitted by the calendar event form.
 *
 * `facilityId` is intentionally not offered yet — the calendar feature has no
 * facility picker data source of its own; see `FEATURE.md` for the gap.
 *
 * @since 1.0.0
 */
export interface CalendarEventFormValues {
  readonly title: string;
  /** Free-text description; empty string is normalized to `undefined` on submit. */
  readonly description: string;
  readonly startsAt: Date | null;
  /** `null` leaves the event open-ended (no end). */
  readonly endsAt: Date | null;
  readonly allDay: boolean;
}
