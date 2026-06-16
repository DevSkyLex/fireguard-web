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
  /** Input loading. @readonly @description Indicates whether submission is running. @access public @since 1.0.0 @type {InputSignal<boolean>} */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Input disabled. @readonly @description Indicates whether the form is disabled. @access public @since 1.0.0 @type {InputSignal<boolean>} */
  public readonly disabled: InputSignal<boolean> = input(false);
  /** Output submitted. @readonly @description Emits the validated skip reason. @access public @since 1.0.0 @type {OutputEmitterRef<InterventionSkipFormValues>} */
  public readonly submitted: OutputEmitterRef<InterventionSkipFormValues> =
    output<InterventionSkipFormValues>();

  /** Property formBuilder. @readonly @description Builds the typed reactive form. @access private @since 1.0.0 @type {NonNullableFormBuilder} */
  private readonly formBuilder: NonNullableFormBuilder = inject(NonNullableFormBuilder);

  /** Property form. @readonly @description Stores the skip reason control. @access protected @since 1.0.0 @type {FormGroup<InterventionSkipFormData>} */
  protected readonly form: FormGroup<InterventionSkipFormData> =
    this.formBuilder.group<InterventionSkipFormData>({
      reason: this.formBuilder.control('', [Validators.required]),
    });

  /** @constructor @description Synchronizes the form disabled state with component inputs. */
  public constructor() {
    effect(() => {
      if (this.loading() || this.disabled()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

  /** Method onSubmit. @method onSubmit @description Validates and emits the skip reason. @access protected @since 1.0.0 @returns {void} */
  protected onSubmit(): void {
    if (this.form.invalid || this.loading() || this.disabled()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit({ reason: this.form.controls.reason.value.trim() });
    this.form.reset();
  }
}
