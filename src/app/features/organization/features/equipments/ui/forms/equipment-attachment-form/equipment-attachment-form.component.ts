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
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import type { AddAttachmentInput } from '@features/organization/features/equipments/models';

/**
 * Form used to attach an existing uploaded file to equipment.
 */
@Component({
  selector: 'app-equipment-attachment-form',
  imports: [ButtonModule, InputTextModule, MessageModule, ReactiveFormsModule],
  templateUrl: './equipment-attachment-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentAttachmentForm {
  /** Whether attachment submission is pending. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Emits valid attachment values. */
  public readonly submitted: OutputEmitterRef<AddAttachmentInput> = output();
  /** Non-nullable builder preserving strict form value types. */
  private readonly formBuilder: NonNullableFormBuilder = inject(NonNullableFormBuilder);
  /** Strictly typed attachment form. */
  protected readonly form = this.formBuilder.group({
    fileName: this.formBuilder.control('', [Validators.required]),
    mimeType: this.formBuilder.control('application/octet-stream', [Validators.required]),
    content: this.formBuilder.control('', [Validators.required]),
  });

  /** Synchronizes the form disabled state with submission. */
  public constructor() {
    effect(() => {
      if (this.loading()) this.form.disable({ emitEvent: false });
      else this.form.enable({ emitEvent: false });
    });
  }

  /** Emits valid attachment values and resets the form. */
  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue());
    this.form.reset({ fileName: '', mimeType: 'application/octet-stream', content: '' });
  }
}
