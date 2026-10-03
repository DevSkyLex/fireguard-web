import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  form,
  FormField,
  maxLength,
  required,
  validate,
  type FieldTree,
  type ValidationError,
} from '@angular/forms/signals';
import { DateTime } from 'luxon';
import type { CallState, StoreError } from '@core/request-state';
import type { CalendarFeedItemOutput } from '@features/organization/features/calendar/models';
import { toApiDateTime } from '@features/organization/features/calendar/utils';
import { RequiredMarker } from '@shared/required-marker';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmDatePicker, HlmDatePickerTrigger } from '@shared/ui/date-picker';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSheetFooter } from '@shared/ui/sheet';
import { HlmSwitch } from '@shared/ui/switch';
import { HlmTextareaImports } from '@shared/ui/textarea';
import type { CalendarEventDraft, CalendarEventFormValues } from './models';

/**
 * Constant NO_FACILITY_VALUE
 *
 * @description
 * The picker's value for an event without a facility association.
 */
const NO_FACILITY_VALUE: string = '';

/**
 * Constant DEFAULT_EVENT_TIME
 *
 * @description
 * The local wall-clock time a fresh draft's start defaults to, mirroring the page's own
 * quick-create default.
 */
const DEFAULT_EVENT_TIME: string = '09:00';

/**
 * Constant EMPTY_DRAFT
 *
 * @description
 * A blank draft.
 */
const EMPTY_DRAFT: CalendarEventDraft = {
  title: '',
  description: '',
  startsAtDate: null,
  startsAtTime: DEFAULT_EVENT_TIME,
  endsAtDate: null,
  endsAtTime: '',
  allDay: false,
  facilityId: NO_FACILITY_VALUE,
};

/**
 * Constant TITLE_MAX_LENGTH
 *
 * @description
 * How long a title may be, mirroring the backend's `Assert\Length` constraint.
 */
const TITLE_MAX_LENGTH: number = 255;

/**
 * Constant DESCRIPTION_MAX_LENGTH
 *
 * @description
 * How long a description may be, mirroring the backend's `Assert\Length` constraint.
 */
const DESCRIPTION_MAX_LENGTH: number = 5000;

/**
 * Component CalendarEventForm
 * @class CalendarEventForm
 *
 * @description
 * Names, times and optionally describes/locates a standalone calendar
 * event — title, start/end, all-day flag, optional description and
 * facility. Start and end are each a `hlm-date-picker` (`@shared/ui/date-picker`)
 * paired with an `hlmInput type="time"` for the hour — spartan/ui ships no
 * combined date-time control, and no range picker either: `endsAt` is
 * genuinely optional and independent of `startsAt` (unlike, say,
 * `intervention-create-form`'s `plannedRange`, whose two bounds are always
 * set together), while `hlm-date-range-picker` only ever commits a
 * *complete* pair — it structurally cannot represent "a start with no end".
 * Mode follows {@link editing}: `null` creates a new event, a value seeds
 * the draft with that record's fields and switches the submit label to
 * editing.
 *
 * Presentational: it validates and emits {@link submitted}; the hosting
 * `CalendarEventDialog` forwards it untouched and the page calls the store
 * (`ARCHITECTURE.md` §10.5). Reports its own dirtiness through
 * {@link dirtyChanged} so the hosting sheet can gate dismissal on it, in
 * both create and edit mode.
 *
 * @version 2.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```html
 * <app-calendar-event-form
 *   [visible]="eventDialogVisible()"
 *   [pending]="isEventWritePending()"
 *   [serverError]="eventWriteError()"
 *   [editing]="editingEvent()"
 *   [facilityOptions]="facilityOptions()"
 *   (submitted)="onEventFormSubmitted($event)"
 *   (cancelled)="eventDialogVisible.set(false)"
 * />
 * ```
 */
@Component({
  selector: 'app-calendar-event-form',
  imports: [
    RequiredMarker,
    FormField,
    HlmButton,
    HlmDatePicker,
    HlmDatePickerTrigger,
    HlmSwitch,
    HlmInput,
    ...HlmFieldImports,
    ...HlmComboboxImports,
    ...HlmTextareaImports,
    HlmSheetFooter,
  ],
  templateUrl: './calendar-event-form.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarEventForm {
  //#region Inputs
  /**
   * Property timezone
   * @readonly
   *
   * @description
   * Organization zone used to interpret every picked civil date and time.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly timezone: InputSignal<string> = input('UTC');

  /**
   * Property facilityCallState
   * @readonly
   *
   * @description
   * Current page request state for the searchable facility picker.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<CallState<unknown> | null>}
   */
  public readonly facilityCallState: InputSignal<CallState<unknown> | null> =
    input<CallState<unknown> | null>(null);

  /**
   * Property facilityPage
   * @readonly
   *
   * @description
   * Current server page of facility results.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly facilityPage: InputSignal<number> = input(1);

  /**
   * Property facilityHasNextPage
   * @readonly
   *
   * @description
   * Whether more matching facilities are available from the server.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly facilityHasNextPage: InputSignal<boolean> = input(false);

  /**
   * Property facilitySelectedError
   * @readonly
   *
   * @description
   * Recoverable failure resolving the original facility association.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly facilitySelectedError: InputSignal<StoreError | null> = input<StoreError | null>(
    null,
  );
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether the hosting overlay is open. Watched only to seed or clear the draft.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether the create/update write is in flight, which locks the footer controls.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   *
   * @description
   * Whatever the last write attempt failed with.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly serverError: InputSignal<StoreError | null> = input<StoreError | null>(null);

  /**
   * Property editing
   * @readonly
   *
   * @description
   * The `event`-source entry being edited, or `null` when creating a new one.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<CalendarFeedItemOutput | null>}
   */
  public readonly editing: InputSignal<CalendarFeedItemOutput | null> =
    input<CalendarFeedItemOutput | null>(null);

  /**
   * Property facilityOptions
   * @readonly
   *
   * @description
   * The organization's facilities, offered as the optional association.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ReadonlyArray<{ readonly label: string; readonly value: string }>>}
   */
  public readonly facilityOptions: InputSignal<
    ReadonlyArray<{ readonly label: string; readonly value: string }>
  > = input<ReadonlyArray<{ readonly label: string; readonly value: string }>>([]);

  /**
   * Property initialStartsAt
   * @readonly
   *
   * @description
   * A `yyyy-MM-ddTHH:mm` start pre-filling a fresh create draft — the quick-create path seeds the
   * clicked day here. Ignored while {@link editing} holds a record.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly initialStartsAt: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property facilitySearched
   * @readonly
   *
   * @description
   * Requests the first server page for a new facility search.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly facilitySearched: OutputEmitterRef<string> = output<string>();

  /**
   * Property facilityPageRequested
   * @readonly
   *
   * @description
   * Requests paging or retry without changing the selected facility.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly facilityPageRequested: OutputEmitterRef<number> = output<number>();

  /**
   * Property facilitySelectedRetried
   * @readonly
   *
   * @description
   * Requests another attempt to resolve the existing facility.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly facilitySelectedRetried: OutputEmitterRef<void> = output<void>();

  /**
   * Property facilitySelected
   * @readonly
   *
   * @description
   * Retains the chosen association outside subsequent server pages.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string | null>}
   */
  public readonly facilitySelected: OutputEmitterRef<string | null> = output<string | null>();
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * The validated draft, converted to ISO instants.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<CalendarEventFormValues>}
   */
  public readonly submitted: OutputEmitterRef<CalendarEventFormValues> =
    output<CalendarEventFormValues>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * The operator backed out without saving.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();

  /**
   * Property dirtyChanged
   * @readonly
   *
   * @description
   * Emits whenever the field tree's dirtiness changes.
   *
   * @access public
   * @since 2.1.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged: OutputEmitterRef<boolean> = output<boolean>();
  //#endregion

  //#region Properties
  /**
   * Property facilityFilter
   * @readonly
   *
   * @description
   * Keeps the server search results visible without filtering the page again in the browser.
   *
   * @access protected
   * @since unreleased
   *
   * @type {() => boolean}
   */
  protected readonly facilityFilter: () => boolean = () => true;
  /**
   * Property noFacilityValue
   * @readonly
   *
   * @description
   * The sentinel value representing "no facility".
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly noFacilityValue: string = NO_FACILITY_VALUE;

  /**
   * Property model
   * @readonly
   *
   * @description
   * The edited draft.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<CalendarEventDraft>}
   */
  protected readonly model: WritableSignal<CalendarEventDraft> =
    signal<CalendarEventDraft>(EMPTY_DRAFT);

  /**
   * Property eventForm
   * @readonly
   *
   * @description
   * The field tree and its rules, mirroring `CreateCalendarEventInput`/`UpdateCalendarEventInput`'s
   * constraints.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<CalendarEventDraft>}
   */
  protected readonly eventForm: FieldTree<CalendarEventDraft> = form(this.model, (path) => {
    required(path.title, {
      message: $localize`:@@calendar.eventDialog.titleRequired:A title is required.`,
    });
    maxLength(path.title, TITLE_MAX_LENGTH, {
      message: $localize`:@@calendar.eventDialog.titleTooLong:This title is too long.`,
    });
    maxLength(path.description, DESCRIPTION_MAX_LENGTH, {
      message: $localize`:@@calendar.eventDialog.descriptionTooLong:This description is too long.`,
    });
    required(path.startsAtDate, {
      message: $localize`:@@calendar.eventDialog.startsAtRequired:A start date is required.`,
    });
    required(path.startsAtTime, {
      message: $localize`:@@calendar.eventDialog.startsAtTimeRequired:A start time is required.`,
      when: ({ valueOf }) => !valueOf(path.allDay),
    });
    required(path.endsAtTime, {
      message: $localize`:@@calendar.eventDialog.endsAtTimeRequired:An end time is required.`,
      when: ({ valueOf }) => !!valueOf(path.endsAtDate) && !valueOf(path.allDay),
    });
    for (const timePath of [path.startsAtTime, path.endsAtTime]) {
      validate(timePath, ({ valueOf }): ValidationError | null => {
        if (valueOf(path.allDay)) return null;
        const date = valueOf(timePath === path.startsAtTime ? path.startsAtDate : path.endsAtDate);
        const time = valueOf(timePath);
        if (!date || !time) return null;
        const instant = combineDateAndTime(date, time, this.timezone());
        if (instant.isValid && instant.toFormat('HH:mm') === time) return null;
        return {
          kind: 'calendarEventInvalidTime',
          message: $localize`:@@calendar.eventDialog.invalidTime:This time does not exist in the organization timezone.`,
        };
      });
    }
    validate(path.endsAtDate, ({ value, valueOf }): ValidationError | null => {
      const endsAtDate: Date | null = value();
      const startsAtDate: Date | null = valueOf(path.startsAtDate);
      if (!endsAtDate || !startsAtDate) return null;

      const allDay = valueOf(path.allDay);
      const start: DateTime = combineDateAndTime(
        startsAtDate,
        allDay ? '00:00' : valueOf(path.startsAtTime),
        this.timezone(),
      );
      const end: DateTime = combineDateAndTime(
        endsAtDate,
        allDay ? '00:00' : valueOf(path.endsAtTime),
        this.timezone(),
      );
      if (end >= start) return null;

      return {
        kind: 'calendarEventEndBeforeStart',
        message: $localize`:@@calendar.eventDialog.endBeforeStart:The end must not be before the start.`,
      };
    });
  });

  /**
   * Property serverMessage
   * @readonly
   *
   * @description
   * The last failed attempt's message — `null` when there is nothing to show.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly serverMessage: Signal<string | null> = computed<string | null>(() => {
    const error: StoreError | null = this.serverError();

    return (
      error?.message ??
      (error ? $localize`:@@calendar.eventDialog.genericError:The event could not be saved.` : null)
    );
  });
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Seeds the draft from {@link editing} the moment the hosting overlay
   * opens, and clears it the moment it closes, so a reopened dialog never
   * resumes a discarded draft nor a stale prior record. Relays
   * {@link eventForm}'s dirtiness through {@link dirtyChanged}.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const visible: boolean = this.visible();
      const editing: CalendarFeedItemOutput | null = this.editing();

      if (!visible) {
        this.model.set(EMPTY_DRAFT);
        this.eventForm().reset();

        return;
      }

      this.model.set(
        editing
          ? toDraft(editing, this.timezone())
          : draftFromInitialStartsAt(this.initialStartsAt()),
      );
      this.eventForm().reset();
    });

    effect((): void => {
      const dirty: boolean = this.eventForm().dirty();

      untracked((): void => this.dirtyChanged.emit(dirty));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Property facilityLabelOf
   * @readonly
   *
   * @description
   * Names a facility value in the searchable picker, including the sentinel "no facility"
   * entry.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {(value: string) => string}
   *
   * @param {string} value - The picker's current value.
   *
   * @returns {string} The localized label.
   */
  protected readonly facilityLabelOf: (value: string) => string = (value: string): string => {
    if (value === NO_FACILITY_VALUE) {
      return $localize`:@@calendar.eventDialog.noFacility:No facility`;
    }

    return (
      this.facilityOptions().find((option) => option.value === value)?.label ??
      $localize`:@@common.unknownFacility:Unknown facility`
    );
  };

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Marks the tree touched so every unmet rule shows at once, then emits the
   * validated draft converted to ISO instants and blank-to-`null` sentinels.
   * A `null` {@link CalendarEventDraft.startsAtDate} at this point would mean
   * the schema's own `required` rule let an invalid tree through, so this
   * bails defensively rather than asserting the type away.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The submit event.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();
    if (this.pending() || !this.visible()) return;

    this.eventForm().markAsTouched();

    if (this.eventForm().invalid()) return;

    const draft: CalendarEventDraft = this.model();
    if (!draft.startsAtDate) return;

    let endsAt: string | null = null;
    if (draft.endsAtDate) {
      if (draft.allDay) {
        endsAt = combineDateAndTime(draft.endsAtDate, '00:00', this.timezone()).toISO({
          suppressMilliseconds: true,
        });
      } else {
        endsAt = toApiDateTime(
          combineDateAndTime(
            draft.endsAtDate,
            draft.endsAtTime,
            this.timezone(),
            this.editing()?.endsAt ?? undefined,
          ),
        );
      }
    }

    this.submitted.emit({
      title: draft.title.trim(),
      description: draft.description.trim() === '' ? null : draft.description.trim(),
      startsAt: draft.allDay
        ? (combineDateAndTime(draft.startsAtDate, '00:00', this.timezone()).toISO({
            suppressMilliseconds: true,
          }) ?? '')
        : toApiDateTime(
            combineDateAndTime(
              draft.startsAtDate,
              draft.startsAtTime,
              this.timezone(),
              this.editing()?.startsAt,
            ),
          ),
      endsAt,
      allDay: draft.allDay,
      facilityId: draft.facilityId === NO_FACILITY_VALUE ? null : draft.facilityId,
    });
  }
  //#endregion
}

/**
 * Function toDraft
 *
 * @description
 * Creates the editable form draft from a calendar feed item.
 *
 * @access private
 * @since 1.0.0
 *
 * @param {CalendarFeedItemOutput} item - The `event`-source entry being edited.
 * @param {string} timezone - Organization timezone used for the civil date and hour.
 *
 * @returns {CalendarEventDraft} The form's draft shape, seeded from the record.
 */
function toDraft(item: CalendarFeedItemOutput, timezone: string): CalendarEventDraft {
  const starts: DateTime = DateTime.fromISO(item.startsAt, { zone: timezone });
  const ends: DateTime | null = item.endsAt
    ? DateTime.fromISO(item.endsAt, { zone: timezone })
    : null;

  return {
    title: item.title,
    description: item.description ?? '',
    startsAtDate: toDateOnly(starts),
    startsAtTime: toTimeString(starts),
    endsAtDate: ends ? toDateOnly(ends) : null,
    endsAtTime: ends ? toTimeString(ends) : '',
    allDay: item.allDay,
    facilityId: item.facilityId ?? NO_FACILITY_VALUE,
  };
}

/**
 * Function draftFromInitialStartsAt
 *
 * @description
 * Seeds a blank quick-create draft with its requested local start date and time.
 *
 * @access private
 * @since 2.0.0
 *
 * @param {string | null} value - The quick-create path's `yyyy-MM-ddTHH:mm` seed, or `null` for a
 *   plain blank draft.
 *
 * @returns {CalendarEventDraft} {@link EMPTY_DRAFT} with the start date/time pre-filled from
 *   `value`, when given.
 */
function draftFromInitialStartsAt(value: string | null): CalendarEventDraft {
  if (!value) return EMPTY_DRAFT;

  const [datePart, timePart]: readonly string[] = value.split('T');
  const [year, month, day]: readonly number[] = datePart.split('-').map(Number);

  return {
    ...EMPTY_DRAFT,
    startsAtDate: new Date(year, month - 1, day),
    startsAtTime: timePart ?? DEFAULT_EVENT_TIME,
  };
}

/**
 * Function toDateOnly
 *
 * @description
 * Adapts the organization civil day to the native date picker's date-only value.
 *
 * @access private
 * @since 2.0.0
 *
 * @param {DateTime} date - An instant already resolved in the organization timezone.
 *
 * @returns {Date} Local midnight on `date`'s calendar day — the value shape `hlm-date-picker`
 *   expects.
 */
function toDateOnly(date: DateTime): Date {
  return new Date(date.year, date.month - 1, date.day);
}

/**
 * Function toTimeString
 *
 * @description
 * Formats local hours and minutes for the event form's time input.
 *
 * @access private
 * @since 2.0.0
 *
 * @param {DateTime} date - An instant already resolved in the organization timezone.
 *
 * @returns {string} The local wall-clock time as `HH:mm`, matching a native `type="time"` input.
 */
function toTimeString(date: DateTime): string {
  return date.toFormat('HH:mm');
}

/**
 * Function combineDateAndTime
 *
 * @description
 * Interprets a civil date and hour in the organization timezone. Repeated autumn hours
 * keep an unchanged original instant; new values choose the earlier occurrence.
 *
 * @access private
 * @since 2.0.0
 *
 * @param {Date} date - A calendar day, as {@link toDateOnly} produces.
 * @param {string} time - An `HH:mm` organization wall-clock time.
 * @param {string} timezone - Organization IANA timezone.
 * @param {string | undefined} original - Original edited instant, when available.
 *
 * @returns {DateTime} The zoned instant combining both values.
 */
function combineDateAndTime(
  date: Date,
  time: string,
  timezone: string,
  original?: string,
): DateTime {
  const [hours, minutes]: readonly number[] = time.split(':').map(Number);

  const instant = DateTime.fromObject(
    {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: hours,
      minute: minutes,
    },
    { zone: timezone },
  );
  const previous = original ? DateTime.fromISO(original, { zone: timezone }) : null;
  if (previous?.toFormat('yyyy-MM-dd HH:mm') === instant.toFormat('yyyy-MM-dd HH:mm'))
    return previous;
  return instant.getPossibleOffsets().toSorted((a, b) => a.toMillis() - b.toMillis())[0] ?? instant;
}
