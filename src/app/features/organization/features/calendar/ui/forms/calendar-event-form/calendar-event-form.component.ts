import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type FormGroup,
  type ValidationErrors,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import type { CalendarEventFormData, CalendarEventFormValues } from './models';

/**
 * Function endsAfterStartsValidator
 *
 * @description
 * Group validator enforcing that, when both are set, `endsAt` is strictly
 * after `startsAt` — mirroring the backend handler's own check.
 *
 * @param {AbstractControl} control - The calendar event form group.
 *
 * @returns {ValidationErrors | null} `{ endsBeforeStarts: true }` when the end
 * precedes or equals the start, otherwise `null`.
 *
 * @since 1.0.0
 */
function endsAfterStartsValidator(control: AbstractControl): ValidationErrors | null {
  const startsAt: unknown = control.get('startsAt')?.value;
  const endsAt: unknown = control.get('endsAt')?.value;
  if (!(startsAt instanceof Date) || !(endsAt instanceof Date)) return null;
  return endsAt > startsAt ? null : { endsBeforeStarts: true };
}

/**
 * Component CalendarEventForm
 * @class CalendarEventForm
 *
 * @description
 * Presentational form used to create a standalone calendar event (title,
 * description, start/end, all-day). Owns only its form state; it emits the
 * validated values (`submitted`) or a dismissal (`cancelled`) and never
 * calls the API or controls drawer visibility — the parent page owns
 * orchestration. Fields mirror the backend `CreateCalendarEventInput` DTO; a
 * facility picker is not offered yet (see `FEATURE.md`).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-calendar-event-form',
  imports: [
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    MessageModule,
    ReactiveFormsModule,
    TextareaModule,
    ToggleSwitchModule,
  ],
  templateUrl: './calendar-event-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarEventForm {
  //#region Inputs
  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether a create request is in flight; disables the form controls.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the validated form values when the form is submitted.
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
   * Emits when the user dismisses the form without submitting.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property formBuilder
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {NonNullableFormBuilder}
   */
  private readonly formBuilder: NonNullableFormBuilder =
    inject<NonNullableFormBuilder>(NonNullableFormBuilder);

  /**
   * Property form
   * @readonly
   *
   * @description
   * Strictly typed event form (required title and start, optional
   * description/end, all-day toggle).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<CalendarEventFormData>}
   */
  protected readonly form: FormGroup<CalendarEventFormData> =
    this.formBuilder.group<CalendarEventFormData>(
      {
        title: this.formBuilder.control('', [Validators.required, Validators.maxLength(255)]),
        description: this.formBuilder.control('', [Validators.maxLength(5000)]),
        startsAt: this.formBuilder.control<Date | null>(null, [Validators.required]),
        endsAt: this.formBuilder.control<Date | null>(null),
        allDay: this.formBuilder.control(false),
      },
      { validators: endsAfterStartsValidator },
    );
  //#endregion

  //#region Constructor
  /**
   * Constructor.
   *
   * @description
   * Synchronizes the form's disabled state with the loading input.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() =>
      this.loading()
        ? this.form.disable({ emitEvent: false })
        : this.form.enable({ emitEvent: false }),
    );
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   *
   * @description
   * Emits the validated form values and resets the form. Marks all controls
   * as touched first so an invalid submit surfaces its errors.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue());
    this.form.reset({
      title: '',
      description: '',
      startsAt: null,
      endsAt: null,
      allDay: false,
    });
  }
  //#endregion
}
