/**
 * Interface CreateCalendarEventInput
 * @interface CreateCalendarEventInput
 *
 * @description
 * The wire shape of a standalone-event creation, mirroring the backend's
 * `CreateCalendarEventInput` byte for byte: `title` and `startsAt` are
 * required, everything else optional.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface CreateCalendarEventInput {
  //#region Properties
  /** Event title, 1–255 characters. */
  readonly title: string;

  /** Optional free-form description, up to 5000 characters. */
  readonly description?: string | null;

  /** Event start, ISO 8601 with an explicit timezone offset. */
  readonly startsAt: string;

  /** Optional event end, ISO 8601 with an explicit timezone offset. */
  readonly endsAt?: string | null;

  /** Whether the event spans whole day(s). Defaults to `false` server-side. */
  readonly allDay?: boolean;

  /** Optional associated facility. */
  readonly facilityId?: string | null;
  //#endregion
}
