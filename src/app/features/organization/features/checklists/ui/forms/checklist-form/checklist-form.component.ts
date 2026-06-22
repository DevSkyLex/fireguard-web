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
import { FormArray, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TextareaModule } from 'primeng/textarea';
import type { ChecklistFormValues, ChecklistItemForm } from './models';

/**
 * Form used to create an immutable checklist and its dynamic item rows.
 */
@Component({
  selector: 'app-checklist-form',
  imports: [
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    MessageModule,
    ReactiveFormsModule,
    TextareaModule,
  ],
  templateUrl: './checklist-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistForm {
  /** Whether submission is currently pending. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Emits valid checklist creation values. */
  public readonly submitted: OutputEmitterRef<ChecklistFormValues> = output<ChecklistFormValues>();
  /** Emits when the user cancels checklist creation. */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();

  /** Non-nullable builder used to preserve strict form value types. */
  private readonly formBuilder: NonNullableFormBuilder =
    inject<NonNullableFormBuilder>(NonNullableFormBuilder);

  /** Strictly typed checklist creation form. */
  protected readonly form = this.formBuilder.group({
    name: this.formBuilder.control('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(255),
    ]),
    version: this.formBuilder.control('1.0', [Validators.required, Validators.maxLength(50)]),
    items: this.formBuilder.array<ChecklistItemForm>([]),
  });

  /** Initializes the first item and synchronizes the pending state. */
  public constructor() {
    this.addItem();
    effect(() => {
      if (this.loading()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

  /** Dynamic checklist item controls. */
  protected get items(): FormArray<ChecklistItemForm> {
    return this.form.controls.items;
  }

  /** Appends an empty checklist item row. */
  protected addItem(): void {
    this.items.push(
      this.formBuilder.group({
        label: this.formBuilder.control('', [Validators.required, Validators.maxLength(255)]),
        description: this.formBuilder.control(''),
        required: this.formBuilder.control(true),
      }),
    );
  }

  /** Removes a checklist item while preserving at least one row. */
  protected removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  /** Emits the raw form value when the form is valid. */
  protected onSubmit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue());
  }
}
