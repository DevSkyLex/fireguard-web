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

/** Presentational form used to record work discovered in the field. */
@Component({
  selector: 'app-intervention-discovery-form',
  imports: [ButtonModule, InputTextModule, ReactiveFormsModule, SelectModule],
  templateUrl: './intervention-discovery-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionDiscoveryForm {
  public readonly loading: InputSignal<boolean> = input(false);
  public readonly disabled: InputSignal<boolean> = input(false);
  public readonly submitted: OutputEmitterRef<InterventionDiscoveryFormValues> =
    output<InterventionDiscoveryFormValues>();

  private readonly formBuilder: NonNullableFormBuilder = inject(NonNullableFormBuilder);

  protected readonly form: FormGroup<InterventionDiscoveryFormData> =
    this.formBuilder.group<InterventionDiscoveryFormData>({
      action: this.formBuilder.control<InterventionWorkItemAction>('inventory'),
      target: this.formBuilder.control('', [Validators.required]),
      result: this.formBuilder.control<InspectionResult>('pass'),
    });

  protected readonly actionOptions: readonly SelectOption<InterventionWorkItemAction>[] = [
    { label: 'Site setup', value: 'site_setup' },
    { label: 'Inventory', value: 'inventory' },
    { label: 'Inspection', value: 'inspection' },
  ];

  protected readonly resultOptions: readonly SelectOption<InspectionResult>[] = [
    { label: 'Pass', value: 'pass' },
    { label: 'Partial', value: 'partial' },
    { label: 'Fail', value: 'fail' },
  ];

  public constructor() {
    effect(() => {
      if (this.loading() || this.disabled()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

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
