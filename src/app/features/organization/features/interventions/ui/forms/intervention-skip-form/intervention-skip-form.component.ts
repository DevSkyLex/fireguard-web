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
  type FormGroup,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import type { InterventionSkipFormData, InterventionSkipFormValues } from './models';

/**
 * Component InterventionSkipForm
 * @class InterventionSkipForm
 *
 * @description
 * Presentational form used to justify skipping a work item.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-skip-form',
  imports: [ButtonModule, ReactiveFormsModule, TextareaModule],
  templateUrl: './intervention-skip-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionSkipForm {
  //#region Inputs
  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether a skip submission is in flight; disables all form controls.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Whether skipping is forbidden for the current user or context.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the trimmed skip reason when the form is submitted successfully.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionSkipFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionSkipFormValues> =
    output<InterventionSkipFormValues>();
  //#endregion

  //#region Properties
  /**
   * Property formBuilder
   * @readonly
   *
   * @description
   * Builds the typed reactive form controls.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {NonNullableFormBuilder}
   */
  private readonly formBuilder: NonNullableFormBuilder = inject<NonNullableFormBuilder>(NonNullableFormBuilder);

  /**
   * Property form
   * @readonly
   *
   * @description
   * Reactive form group holding the skip reason textarea control.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<InterventionSkipFormData>}
   */
  protected readonly form: FormGroup<InterventionSkipFormData> =
    this.formBuilder.group<InterventionSkipFormData>({
      reason: this.formBuilder.control('', [Validators.required]),
    });

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Synchronizes the form disabled state with the {@link loading} and
   * {@link disabled} inputs.
   *
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      if (this.loading() || this.disabled()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

  //#endregion

  //#region Methods
  /**
   * Method onSubmit
   * @method onSubmit
   *
   * @description
   * Validates the form, emits the trimmed skip reason via {@link submitted}
   * and resets the form. Marks controls as touched to surface validation
   * errors when the reason is empty.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onSubmit(): void {
    if (this.form.invalid || this.loading() || this.disabled()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit({ reason: this.form.controls.reason.value.trim() });
    this.form.reset();
  }
  //#endregion
}
