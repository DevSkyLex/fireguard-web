import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
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
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { StoreError } from '@core/request-state';
import type { CalendarFeedItemOutput } from '@features/organization/features/calendar/models';
import { HlmButton } from '@shared/ui/button';
import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSwitch } from '@shared/ui/switch';
import { HlmTextareaImports } from '@shared/ui/textarea';
import type { CalendarEventDraft, CalendarEventFormValues } from './models';

/** The select's value for "no facility" — no narrowing. */
const NO_FACILITY_VALUE: string = '';

/** A blank draft. */
const EMPTY_DRAFT: CalendarEventDraft = {
  title: '',
  description: '',
  startsAt: '',
  endsAt: '',
  allDay: false,
  facilityId: NO_FACILITY_VALUE,
};

/** How long a title may be, mirroring the backend's `Assert\Length` constraint. */
const TITLE_MAX_LENGTH: number = 255;

/** How long a description may be, mirroring the backend's `Assert\Length` constraint. */
const DESCRIPTION_MAX_LENGTH: number = 5000;

/**
 * Component CalendarEventDialog
 * @class CalendarEventDialog
 *
 * @description
 * The spartan dialog that creates or edits a standalone calendar event —
 * title, start/end, all-day flag, optional description and facility. Mode
 * follows {@link editing}: `null` creates a new event, a value seeds the
 * draft with that record's fields and switches the copy/submit label to
 * editing. Owns the overlay and the Signal Forms draft only; the page keeps
 * the store call, the permission gate and the source-gating that decides
 * whether editing is even offered — this dialog never inspects
 * `sourceKey` (`ARCHITECTURE.md` §10.5).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-calendar-event-dialog
 *   [visible]="eventDialogVisible()"
 *   [pending]="isEventWritePending()"
 *   [serverError]="eventWriteError()"
 *   [editing]="editingEvent()"
 *   [facilityOptions]="facilityOptions()"
 *   (visibleChange)="onEventDialogVisibleChanged($event)"
 *   (submitted)="onEventFormSubmitted($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-calendar-event-dialog',
  imports: [
    FormField,
    HlmButton,
    HlmSwitch,
    HlmInput,
    ...HlmDialogImports,
    ...HlmFieldImports,
    ...HlmSelectImports,
    ...HlmTextareaImports,
  ],
  templateUrl: './calendar-event-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarEventDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the dialog is open. Owned by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   * @description Whether the create/update write is in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the last write attempt failed with.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<StoreError | null>}
   */
  public readonly serverError: InputSignal<StoreError | null> = input<StoreError | null>(null);

  /**
   * Property editing
   * @readonly
   * @description The `event`-source entry being edited, or `null` when creating a new one.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<CalendarFeedItemOutput | null>}
   */
  public readonly editing: InputSignal<CalendarFeedItemOutput | null> =
    input<CalendarFeedItemOutput | null>(null);

  /**
   * Property facilityOptions
   * @readonly
   * @description The organization's facilities, offered as the optional association.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlyArray<{ readonly label: string; readonly value: string }>>}
   */
  public readonly facilityOptions: InputSignal<
    ReadonlyArray<{ readonly label: string; readonly value: string }>
  > = input<ReadonlyArray<{ readonly label: string; readonly value: string }>>([]);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description The dialog wants to open or close.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property submitted
   * @readonly
   * @description The validated draft, converted to ISO instants.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<CalendarEventFormValues>}
   */
  public readonly submitted: OutputEmitterRef<CalendarEventFormValues> =
    output<CalendarEventFormValues>();
  //#endregion

  //#region Properties
  /** The sentinel value representing "no facility". */
  protected readonly noFacilityValue: string = NO_FACILITY_VALUE;

  /** The edited draft. */
  protected readonly model: WritableSignal<CalendarEventDraft> =
    signal<CalendarEventDraft>(EMPTY_DRAFT);

  /**
   * Property eventForm
   * @readonly
   * @description The field tree and its rules, mirroring `CreateCalendarEventInput`/`UpdateCalendarEventInput`'s constraints.
   * @access protected
   * @since 1.0.0
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
    required(path.startsAt, {
      message: $localize`:@@calendar.eventDialog.startsAtRequired:A start date/time is required.`,
    });
    validate(path.endsAt, ({ value, valueOf }): ValidationError | null => {
      const endsAt: string = value();
      const startsAt: string = valueOf(path.startsAt);
      if (!endsAt || !startsAt || new Date(endsAt) >= new Date(startsAt)) return null;

      return {
        kind: 'calendarEventEndBeforeStart',
        message: $localize`:@@calendar.eventDialog.endBeforeStart:The end must not be before the start.`,
      };
    });
  });

  /**
   * Property dialogState
   * @readonly
   * @description The overlay state, derived from {@link visible} so there is no second copy of the truth.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.visible() ? 'open' : 'closed',
  );

  /**
   * Property serverMessage
   * @readonly
   * @description The last failed attempt's message — `null` when there is nothing to show.
   * @access protected
   * @since 1.0.0
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
   *
   * @description
   * Seeds the draft from {@link editing} the moment the dialog opens, and
   * clears it the moment it closes, so a reopened dialog never resumes a
   * discarded draft nor a stale prior record.
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

      this.model.set(editing ? toDraft(editing) : EMPTY_DRAFT);
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Relays a dismissal — escape, the backdrop, the close button — ignoring
   * the echo of a change the page already made.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The overlay's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method facilityLabelOf
   * @description Names a facility value on the closed select trigger, including the sentinel "no facility" entry.
   * @access protected
   * @since 1.0.0
   * @param {string} value - The select's current value.
   * @returns {string} The localized label.
   */
  protected facilityLabelOf = (value: string): string => {
    if (value === NO_FACILITY_VALUE) {
      return $localize`:@@calendar.eventDialog.noFacility:No facility`;
    }

    return this.facilityOptions().find((option) => option.value === value)?.label ?? value;
  };

  /**
   * Method submit
   *
   * @description
   * Marks the tree touched so every unmet rule shows at once, then emits the
   * validated draft converted to ISO instants and blank-to-`null` sentinels.
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

    this.eventForm().markAsTouched();

    if (this.eventForm().invalid()) return;

    const draft: CalendarEventDraft = this.model();

    this.submitted.emit({
      title: draft.title.trim(),
      description: draft.description.trim() === '' ? null : draft.description.trim(),
      startsAt: new Date(draft.startsAt).toISOString(),
      endsAt: draft.endsAt.trim() === '' ? null : new Date(draft.endsAt).toISOString(),
      allDay: draft.allDay,
      facilityId: draft.facilityId === NO_FACILITY_VALUE ? null : draft.facilityId,
    });
  }
  //#endregion
}

/**
 * Function toDraft
 * @access private
 * @since 1.0.0
 * @param {CalendarFeedItemOutput} item - The `event`-source entry being edited.
 * @returns {CalendarEventDraft} The dialog's draft shape, seeded from the record.
 */
function toDraft(item: CalendarFeedItemOutput): CalendarEventDraft {
  return {
    title: item.title,
    description: item.description ?? '',
    startsAt: toDatetimeLocalValue(item.startsAt),
    endsAt: item.endsAt ? toDatetimeLocalValue(item.endsAt) : '',
    allDay: item.allDay,
    facilityId: item.facilityId ?? NO_FACILITY_VALUE,
  };
}

/**
 * Function toDatetimeLocalValue
 * @access private
 * @since 1.0.0
 * @param {string} iso - An ISO 8601 instant.
 * @returns {string} The equivalent `yyyy-MM-ddTHH:mm` value in the browser's local time, as a native `datetime-local` input expects.
 */
function toDatetimeLocalValue(iso: string): string {
  const date: Date = new Date(iso);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Function pad
 * @access private
 * @since 1.0.0
 * @param {number} value - A date/time component.
 * @returns {string} The value, zero-padded to two digits.
 */
function pad(value: number): string {
  return value.toString().padStart(2, '0');
}
