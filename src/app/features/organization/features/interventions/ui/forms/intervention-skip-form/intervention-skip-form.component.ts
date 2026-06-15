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

/** Presentational form used to justify skipping a work item. */
@Component({
  selector: 'app-intervention-skip-form',
  imports: [ButtonModule, ReactiveFormsModule, TextareaModule],
  templateUrl: './intervention-skip-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionSkipForm {
  public readonly loading: InputSignal<boolean> = input(false);
  public readonly disabled: InputSignal<boolean> = input(false);
  public readonly submitted: OutputEmitterRef<InterventionSkipFormValues> =
    output<InterventionSkipFormValues>();

  private readonly formBuilder: NonNullableFormBuilder = inject(NonNullableFormBuilder);

  protected readonly form: FormGroup<InterventionSkipFormData> =
    this.formBuilder.group<InterventionSkipFormData>({
      reason: this.formBuilder.control('', [Validators.required]),
    });

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
    this.submitted.emit({ reason: this.form.controls.reason.value.trim() });
    this.form.reset();
  }
}
