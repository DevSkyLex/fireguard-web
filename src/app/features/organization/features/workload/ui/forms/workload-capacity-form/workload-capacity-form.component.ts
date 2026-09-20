import { DatePipe, formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  LOCALE_ID,
  output,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  apply,
  applyEach,
  disabled,
  form,
  FormField,
  required,
  validate,
  type FieldTree,
} from '@angular/forms/signals';
import type { BrnOverlayState } from '@spartan-ng/brain/overlay';
import { DateTime } from 'luxon';
import {
  INTERACTION_CAPABILITIES_PORT,
  type InteractionCapabilitiesPort,
} from '@core/interaction-capabilities';
import type {
  CapacityWeekInput,
  CapacityExceptionInput,
} from '@features/organization/features/workload/models';
import { formatDurationMinutes } from '@shared/duration-format';
import { HlmButton } from '@shared/ui/button';
import { HlmCalendar } from '@shared/ui/calendar';
import { HlmDatePickerImports } from '@shared/ui/date-picker';
import { HlmDrawerImports } from '@shared/ui/drawer';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmInputGroupImports } from '@shared/ui/input-group';
import type {
  CapacityFormValues,
  CapacityExceptionFormValues,
} from './models/capacity-form-values.interface';
import { CAPACITY_DURATION_SCHEMA } from './validators/capacity-duration.validator';

/**
 * Component WorkloadCapacityForm
 * @class WorkloadCapacityForm
 *
 * @description
 * Edits a dated weekly pattern or availability exception in hours and minutes.
 * A single row per day contains its validation, while the owning sheet supplies the save footer.
 * Unknown hours stay blank and failed writes never discard the draft.
 * The native desktop date picker and touch-sized mobile calendar share one Signal Forms value.
 *
 * @version 1.0.0
 */
@Component({
  selector: 'app-workload-capacity-form',
  templateUrl: './workload-capacity-form.component.html',
  imports: [
    DatePipe,
    FormField,
    HlmDatePickerImports,
    HlmCalendar,
    HlmDrawerImports,
    HlmFieldImports,
    HlmInput,
    HlmInputGroupImports,
    HlmButton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkloadCapacityForm {
  /**
   * Property interaction
   * @readonly
   *
   * @description
   * Uses the application classification for a touch-sized calendar drawer on mobile devices.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InteractionCapabilitiesPort}
   */
  protected readonly interaction: InteractionCapabilitiesPort = inject(
    INTERACTION_CAPABILITIES_PORT,
  );

  /**
   * Property calendarState
   * @readonly
   *
   * @description
   * Visibility of the mobile date choice; dismissal never changes the shared form value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<BrnOverlayState>}
   */
  protected readonly calendarState: WritableSignal<BrnOverlayState> = signal('closed');

  /**
   * Property effectiveDateTrigger
   * @readonly
   *
   * @description
   * Native mobile trigger receives focus when a missing date blocks submission.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<ElementRef<HTMLButtonElement> | undefined>}
   */
  private readonly effectiveDateTrigger: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild('effectiveDateTrigger');

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Active UI locale for the calendar-date label.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private readonly locale: string = inject(LOCALE_ID);

  /**
   * Property formatEffectiveDate
   * @readonly
   *
   * @description
   * Formats the selected calendar day without shifting it to another timezone.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {(date: Date) => string}
   */
  protected readonly formatEffectiveDate: (date: Date) => string = (date) =>
    formatDate(date, 'mediumDate', this.locale);

  /**
   * Property mode
   * @readonly
   *
   * @description
   * Selected factual availability operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<'week' | 'exception'>}
   */
  public readonly mode: InputSignal<'week' | 'exception'> = input<'week' | 'exception'>('week');

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Prevents editing or submitting while saving or offline.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);

  /**
   * Property initialWeek
   * @readonly
   *
   * @description
   * Effective configured ISO week; null preserves unknown hours.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly number[] | null>}
   */
  public readonly initialWeek: InputSignal<readonly number[] | null> = input<
    readonly number[] | null
  >(null);

  /**
   * Property initialDate
   * @readonly
   *
   * @description
   * Today's calendar date in the organization timezone.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly initialDate: InputSignal<string> = input('');

  /**
   * Property firstDayOfWeek
   * @readonly
   *
   * @description
   * Organization week order; the emitted payload remains ISO Monday first.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly firstDayOfWeek: InputSignal<string> = input('monday');

  /**
   * Property formId
   * @readonly
   *
   * @description
   * Native form identifier for the sheet footer's submit button.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly formId: InputSignal<string> = input('workload-capacity-form');

  /**
   * Property weekSubmitted
   * @readonly
   *
   * @description
   * Validated effective-dated week.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<CapacityWeekInput>}
   */
  public readonly weekSubmitted: OutputEmitterRef<CapacityWeekInput> = output();

  /**
   * Property exceptionSubmitted
   * @readonly
   *
   * @description
   * Validated daily availability exception.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<CapacityExceptionInput>}
   */
  public readonly exceptionSubmitted: OutputEmitterRef<CapacityExceptionInput> = output();

  /**
   * Property dirtyChanged
   * @readonly
   *
   * @description
   * Whether the current values differ from the initial configuration.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged: OutputEmitterRef<boolean> = output();

  /**
   * Property initialWeekModel
   * @readonly
   *
   * @description
   * Initial draft copies existing capacity without inventing hours.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<CapacityFormValues>}
   */
  private readonly initialWeekModel: Signal<CapacityFormValues> = computed(() => ({
    effectiveOn: this.initialDate() ? DateTime.fromISO(this.initialDate()).toJSDate() : null,
    days: Array.from({ length: 7 }, (_, index) => {
      const minutes = this.initialWeek()?.[index];
      return {
        hours: minutes == null ? '' : String(Math.floor(minutes / 60)),
        minutes: minutes == null ? '0' : String(minutes % 60),
      };
    }),
  }));

  /**
   * Property initialExceptionModel
   * @readonly
   *
   * @description
   * Initial exception keeps availability unknown until explicitly entered.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<CapacityExceptionFormValues>}
   */
  private readonly initialExceptionModel: Signal<CapacityExceptionFormValues> = computed(() => ({
    startsOn: this.initialDate(),
    endsOn: this.initialDate(),
    duration: { hours: '', minutes: '0' },
  }));

  /**
   * Property weekModel
   * @readonly
   *
   * @description
   * Editable week in integral hour and minute parts.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<CapacityFormValues>}
   */
  protected readonly weekModel: WritableSignal<CapacityFormValues> = signal(
    this.initialWeekModel(),
  );

  /**
   * Property exceptionModel
   * @readonly
   *
   * @description
   * Editable exception preserves actual available duration.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<CapacityExceptionFormValues>}
   */
  protected readonly exceptionModel: WritableSignal<CapacityExceptionFormValues> = signal(
    this.initialExceptionModel(),
  );

  /**
   * Property weekdays
   * @readonly
   *
   * @description
   * Localized labels follow the organization week while retaining ISO payload indexes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly { readonly index: number; readonly date: string }[]>}
   */
  protected readonly weekdays: Signal<
    readonly { readonly index: number; readonly date: string }[]
  > = computed(() => {
    const first =
      this.firstDayOfWeek() === 'sunday' ? 6 : this.firstDayOfWeek() === 'saturday' ? 5 : 0;
    return Array.from({ length: 7 }, (_, offset) => {
      const index = (first + offset) % 7;
      return { index, date: `2024-01-0${index + 1}T00:00:00Z` };
    });
  });

  /**
   * Property weekForm
   * @readonly
   *
   * @description
   * Schema validates dates and all explicit daily durations.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<CapacityFormValues>}
   */
  protected readonly weekForm: FieldTree<CapacityFormValues> = form(this.weekModel, (path) => {
    required(path.effectiveOn, { message: $localize`:@@workload.dateRequired:Choose a date.` });
    disabled(path.effectiveOn, { when: () => this.pending() });
    applyEach(path.days, CAPACITY_DURATION_SCHEMA);
  });

  /**
   * Property exceptionForm
   * @readonly
   *
   * @description
   * Schema rejects reversed periods and durations exceeding one day.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<CapacityExceptionFormValues>}
   */
  protected readonly exceptionForm: FieldTree<CapacityExceptionFormValues> = form(
    this.exceptionModel,
    (path) => {
      required(path.startsOn, { message: $localize`:@@workload.dateRequired:Choose a date.` });
      required(path.endsOn, { message: $localize`:@@workload.dateRequired:Choose a date.` });
      apply(path.duration, CAPACITY_DURATION_SCHEMA);
      validate(path.endsOn, ({ value, valueOf }) =>
        !value() || value() >= valueOf(path.startsOn)
          ? null
          : {
              kind: 'period',
              message: $localize`:@@workload.periodOrder:The end must not precede the start.`,
            },
      );
    },
  );

  /**
   * Property weeklyTotal
   * @readonly
   *
   * @description
   * Incomplete or invalid capacity never produces a fabricated zero total.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly weeklyTotal: Signal<string> = computed(() =>
    formatDurationMinutes(
      this.weekForm.days().invalid()
        ? null
        : this.weekModel().days.reduce(
            (sum, day) => sum + Number(day.hours) * 60 + Number(day.minutes),
            0,
          ),
    ),
  );

  /**
   * Property repeatSource
   * @readonly
   *
   * @description
   * First explicitly configured working day in organization order; never invents a default day.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<{ readonly index: number; readonly date: string } | undefined>}
   */
  protected readonly repeatSource: Signal<
    { readonly index: number; readonly date: string } | undefined
  > = computed(() =>
    this.weekdays().find(({ index }) => {
      const day = this.weekModel().days[index];
      const field = this.weekForm.days[index];
      return (
        day !== undefined &&
        field !== undefined &&
        field().valid() &&
        Number(day.hours) * 60 + Number(day.minutes) > 0
      );
    }),
  );

  /**
   * Method repeatWorkingDay
   * @method repeatWorkingDay
   *
   * @description
   * Repeats the displayed day into working or unknown days, preserving explicit days off.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected repeatWorkingDay(): void {
    const source = this.repeatSource();
    if (!source || this.pending()) return;
    const repeatedDay = this.weekModel().days[source.index];
    if (!repeatedDay) return;
    this.weekModel.update((week) => ({
      ...week,
      days: week.days.map((day) =>
        day.hours.trim() !== '' && Number(day.hours) === 0 && Number(day.minutes) === 0
          ? day
          : { ...repeatedDay },
      ),
    }));
  }

  /**
   * Method chooseEffectiveDate
   * @method chooseEffectiveDate
   *
   * @description
   * Commits a mobile calendar selection to the desktop picker's Signal Forms field.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Date | undefined} date - Calendar selection, or an explicitly cleared date.
   * @returns {void}
   */
  protected chooseEffectiveDate(date: Date | undefined): void {
    if (this.pending()) return;
    this.weekForm.effectiveOn().value.set(date ?? null);
    this.weekForm.effectiveOn().markAsDirty();
    this.weekForm.effectiveOn().markAsTouched();
    this.calendarState.set('closed');
  }

  /**
   * Method setFullAbsence
   * @method setFullAbsence
   *
   * @description
   * Explicit shortcut to zero availability throughout the selected exception period.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected setFullAbsence(): void {
    if (this.pending()) return;
    this.exceptionModel.update((value) => ({ ...value, duration: { hours: '0', minutes: '0' } }));
  }

  /**
   * Method resetDraft
   * @method resetDraft
   *
   * @description
   * Restores the server-prefilled draft only after the sheet confirms discarding edits.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public resetDraft(): void {
    if (this.pending()) return;
    this.weekForm().reset(this.initialWeekModel());
    this.exceptionForm().reset(this.initialExceptionModel());
  }

  /**
   * Constructor
   * @constructor
   *
   * @description
   * Initializes from the selected scope and reports real edits without treating prefill as dirty.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      const week = this.initialWeekModel();
      const exception = this.initialExceptionModel();
      this.mode();
      untracked(() => {
        this.weekForm().reset(week);
        this.exceptionForm().reset(exception);
      });
    });
    effect(() => {
      const dirty =
        this.mode() === 'week'
          ? JSON.stringify(this.weekModel()) !== JSON.stringify(this.initialWeekModel())
          : JSON.stringify(this.exceptionModel()) !== JSON.stringify(this.initialExceptionModel());
      untracked(() => this.dirtyChanged.emit(dirty));
    });
  }

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Validates only the active form and emits minutes to the API boundary.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - Native form submit.
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();
    if (this.pending()) return;
    const active = this.mode() === 'week' ? this.weekForm : this.exceptionForm;
    active().markAsTouched();
    if (active().invalid()) {
      if (
        this.mode() === 'week' &&
        this.weekForm.effectiveOn().invalid() &&
        this.effectiveDateTrigger()
      ) {
        this.effectiveDateTrigger()?.nativeElement.focus();
      } else {
        active().errorSummary()[0]?.fieldTree().focusBoundControl();
      }
      return;
    }
    if (this.mode() === 'week') {
      const value = this.weekModel();
      if (!value.effectiveOn) return;
      const effectiveOn = DateTime.fromJSDate(value.effectiveOn).toISODate();
      if (!effectiveOn) return;
      this.weekSubmitted.emit({
        effectiveOn,
        minutes: value.days.map((day) => Number(day.hours) * 60 + Number(day.minutes)),
      });
    } else {
      const value = this.exceptionModel();
      this.exceptionSubmitted.emit({
        startsOn: value.startsOn,
        endsOn: value.endsOn,
        minutes: Number(value.duration.hours) * 60 + Number(value.duration.minutes),
      });
    }
  }
}
