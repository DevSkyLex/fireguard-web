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
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import type { InspectionResult } from '@features/organization/features/inspections/models';
import type {
  InterventionWorkItemAction,
  SelectOption,
} from '@features/organization/features/interventions/models';
import type { InterventionDiscoveryFormData, InterventionDiscoveryFormValues } from './models';

/**
 * Component InterventionDiscoveryForm
 * @class InterventionDiscoveryForm
 *
 * @description
 * Presentational form used to record work discovered in the field.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-discovery-form',
  imports: [ButtonModule, InputTextModule, ReactiveFormsModule, SelectModule],
  templateUrl: './intervention-discovery-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionDiscoveryForm {
  /** Input loading. @readonly @description Indicates whether submission is running. @access public @since 1.0.0 @type {InputSignal<boolean>} */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Input disabled. @readonly @description Indicates whether the form is disabled. @access public @since 1.0.0 @type {InputSignal<boolean>} */
  public readonly disabled: InputSignal<boolean> = input(false);
  /** Output submitted. @readonly @description Emits validated discovery values. @access public @since 1.0.0 @type {OutputEmitterRef<InterventionDiscoveryFormValues>} */
  public readonly submitted: OutputEmitterRef<InterventionDiscoveryFormValues> =
    output<InterventionDiscoveryFormValues>();

  /** Property formBuilder. @readonly @description Builds the typed reactive form. @access private @since 1.0.0 @type {NonNullableFormBuilder} */
  private readonly formBuilder: NonNullableFormBuilder = inject(NonNullableFormBuilder);

  /** Property form. @readonly @description Stores discovery controls. @access protected @since 1.0.0 @type {FormGroup<InterventionDiscoveryFormData>} */
  protected readonly form: FormGroup<InterventionDiscoveryFormData> =
    this.formBuilder.group<InterventionDiscoveryFormData>({
      action: this.formBuilder.control<InterventionWorkItemAction>('inventory'),
      target: this.formBuilder.control('', [Validators.required]),
      result: this.formBuilder.control<InspectionResult>('pass'),
    });

  /** Property actionOptions. @readonly @description Available discovery actions. @access protected @since 1.0.0 @type {readonly SelectOption<InterventionWorkItemAction>[]} */
  protected readonly actionOptions: readonly SelectOption<InterventionWorkItemAction>[] = [
    { label: 'Site setup', value: 'site_setup' },
    { label: 'Inventory', value: 'inventory' },
    { label: 'Inspection', value: 'inspection' },
  ];

  /** Property resultOptions. @readonly @description Available inspection results. @access protected @since 1.0.0 @type {readonly SelectOption<InspectionResult>[]} */
  protected readonly resultOptions: readonly SelectOption<InspectionResult>[] = [
    { label: 'Pass', value: 'pass' },
    { label: 'Partial', value: 'partial' },
    { label: 'Fail', value: 'fail' },
  ];

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

  /** Method onSubmit. @method onSubmit @description Validates, normalizes, emits and resets discovery values. @access protected @since 1.0.0 @returns {void} */
  protected onSubmit(): void {
    if (this.form.invalid || this.loading() || this.disabled()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit({
      ...this.form.getRawValue(),
      target: this.form.controls.target.value.trim(),
    });
    this.form.reset({ action: 'inventory', target: '', result: 'pass' });
  }
}
