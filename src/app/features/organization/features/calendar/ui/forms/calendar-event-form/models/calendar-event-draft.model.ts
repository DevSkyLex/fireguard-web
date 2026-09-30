/**
 * Interface CalendarEventDraft
 * @interface
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
  /**
   * Property title
   * @readonly
   *
   * @description
   * Provides the title displayed for this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly title: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Provides descriptive text entered for this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly description: string;

  /**
   * Property startsAtDate
   * @readonly
   *
   * @description
   * Date portion of the event start value before form submission.
   *
   * @access public
   *
   * @type {Date | null}
   */
  readonly startsAtDate: Date | null;

  /**
   * Property startsAtTime
   * @readonly
   *
   * @description
   * Local time portion used with startsAtDate to build the event start value.
   *
   * @access public
   *
   * @type {string}
   */
  readonly startsAtTime: string;

  /**
   * Property endsAtDate
   * @readonly
   *
   * @description
   * Date portion of the event end value before form submission.
   *
   * @access public
   *
   * @type {Date | null}
   */
  readonly endsAtDate: Date | null;

  /**
   * Property endsAtTime
   * @readonly
   *
   * @description
   * Local time portion used with endsAtDate to build the event end value.
   *
   * @access public
   *
   * @type {string}
   */
  readonly endsAtTime: string;

  /**
   * Property allDay
   * @readonly
   *
   * @description
   * Indicates that the event spans whole calendar days.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly allDay: boolean;

  /**
   * Property facilityId
   * @readonly
   *
   * @description
   * Identifies the facility associated with this event.
   *
   * @access public
   *
   * @type {string}
   */
  readonly facilityId: string;
}

/**
 * Interface CalendarEventFormValues
 * @interface
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
  /**
   * Property title
   * @readonly
   *
   * @description
   * Provides the title displayed for this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly title: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Provides descriptive text entered for this record.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly description: string | null;

  /**
   * Property startsAt
   * @readonly
   *
   * @description
   * Records when this calendar event form starts.
   *
   * @access public
   *
   * @type {string}
   */
  readonly startsAt: string;

  /**
   * Property endsAt
   * @readonly
   *
   * @description
   * Records when this calendar event form ends.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly endsAt: string | null;

  /**
   * Property allDay
   * @readonly
   *
   * @description
   * Indicates that the event spans whole calendar days.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly allDay: boolean;

  /**
   * Property facilityId
   * @readonly
   *
   * @description
   * Identifies the facility associated with this event.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly facilityId: string | null;
}
