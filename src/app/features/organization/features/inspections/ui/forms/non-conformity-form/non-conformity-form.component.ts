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
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import type {
  AddNonConformityInput,
  NonConformitySeverity,
} from '@features/organization/features/inspections/models';

/**
 * Form used to add a non-conformity to an inspection.
 */
@Component({
  selector: 'app-non-conformity-form',
  imports: [
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    MessageModule,
    ReactiveFormsModule,
    SelectModule,
    TextareaModule,
  ],
  templateUrl: './non-conformity-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NonConformityForm {
  /** Whether non-conformity submission is pending. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Emits valid non-conformity creation values. */
  public readonly submitted: OutputEmitterRef<AddNonConformityInput> = output();
  /** Non-nullable builder preserving strict form value types. */
  private readonly formBuilder: NonNullableFormBuilder = inject(NonNullableFormBuilder);
  /** Supported non-conformity severity options. */
  protected readonly severityOptions: { label: string; value: NonConformitySeverity }[] = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Critical', value: 'critical' },
  ];
  /** Strictly typed non-conformity form. */
  protected readonly form = this.formBuilder.group({
    description: this.formBuilder.control('', [Validators.required, Validators.minLength(3)]),
    severity: this.formBuilder.control<NonConformitySeverity>('medium', [Validators.required]),
    dueAt: this.formBuilder.control<Date | null>(null),
    notes: this.formBuilder.control(''),
  });

  /** Synchronizes the form disabled state with submission. */
  public constructor() {
    effect(() => {
      if (this.loading()) this.form.disable({ emitEvent: false });
      else this.form.enable({ emitEvent: false });
    });
  }

  /** Emits valid non-conformity values and resets the form. */
  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const values = this.form.getRawValue();
    this.submitted.emit({
      description: values.description,
      severity: values.severity,
      dueAt: values.dueAt?.toISOString() ?? null,
      notes: values.notes || null,
    });
    this.form.reset({ description: '', severity: 'medium', dueAt: null, notes: '' });
  }
}
