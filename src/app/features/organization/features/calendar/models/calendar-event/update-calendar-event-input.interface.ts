/**
 * Interface UpdateCalendarEventInput
 * @interface UpdateCalendarEventInput
 *
 * @description
 * The wire shape of a standalone-event merge-patch update, mirroring the
 * backend's `UpdateCalendarEventInput`. Every property is optional and the
 * two states of "not sent" carry different meaning: an **omitted** property
 * (absent from the object entirely) leaves that field unchanged, while an
 * **explicit `null`** on `description`, `endsAt` or `facilityId` clears it.
 * `CalendarService.updateEvent` builds this object from only the dirty
 * fields, so the caller must never spread a full draft with untouched
 * fields defaulted to `null`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface UpdateCalendarEventInput {
  //#region Properties
  /** New title, 1–255 characters, when changed. */
  readonly title?: string;

  /** New description, up to 5000 characters; `null` clears it. */
  readonly description?: string | null;

  /** New start, ISO 8601 with an explicit timezone offset, when changed. */
  readonly startsAt?: string;

  /** New end, ISO 8601 with an explicit timezone offset; `null` clears it. */
  readonly endsAt?: string | null;

  /** New all-day flag, when changed. */
  readonly allDay?: boolean;

  /** New associated facility; `null` clears it. */
  readonly facilityId?: string | null;
  //#endregion
}
