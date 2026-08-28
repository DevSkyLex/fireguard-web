/**
 * Interface CalendarEventDraft
 *
 * @description
 * The form's own field shape: a start/end each split into a calendar-day
 * `Date | null` (`hlm-date-picker`'s own value shape) and an independent
 * `HH:mm` string a native `type="time"` input produces — `spartan/ui` ships
 * no dedicated time picker, so the hour is entered through `hlmInput` beside
 * the date picker rather than folded into one control. `description` and
 * `facilityId` are the sentinel `''` when left blank. Converted to
 * {@link CalendarEventFormValues} on submit, once the picked local instants
 * are read as ISO 8601 with an explicit timezone offset.
 *
 * @since 1.0.0
 */
export interface CalendarEventDraft {
  readonly title: string;
  readonly description: string;
  readonly startsAtDate: Date | null;
  readonly startsAtTime: string;
  readonly endsAtDate: Date | null;
  readonly endsAtTime: string;
  readonly allDay: boolean;
  readonly facilityId: string;
}

/**
 * Interface CalendarEventFormValues
 *
 * @description
 * The form's validated submit payload: `startsAt` and — when set —
 * `endsAt` as ISO 8601 with an explicit timezone offset, and `description`/
 * `facilityId` as `null` when the reader left them blank. The page maps this
 * directly onto `CreateCalendarEventInput` for a new event, or diffs it
 * against the record being edited to build a merge-patch
 * `UpdateCalendarEventInput` (`Calendar\MODULE.md`'s omitted-vs-`null`
 * semantics — a form output can only say "here is the full value", never
 * "leave this field alone", so only the page can tell the two apart).
 *
 * @since 1.0.0
 */
export interface CalendarEventFormValues {
  readonly title: string;
  readonly description: string | null;
  readonly startsAt: string;
  readonly endsAt: string | null;
  readonly allDay: boolean;
  readonly facilityId: string | null;
}
