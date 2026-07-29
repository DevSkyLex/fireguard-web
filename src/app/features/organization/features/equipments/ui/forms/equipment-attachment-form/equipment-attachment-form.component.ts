import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import type { AddAttachmentInput } from '@features/organization/features/equipments/models';
import { toServerFieldErrors, toUnmatchedViolations, type ServerFieldErrors } from '@shared/utils';

/** Pristine values the form returns to once an attachment is accepted. */
const EMPTY_ATTACHMENT = {
  fileName: '',
  mimeType: 'application/octet-stream',
  content: '',
} as const;

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
  /** Whether this form's own submission is pending. */
  public readonly loading: InputSignal<boolean> = input(false);

  /**
   * Last rejection of an attachment submission, as held by the store's call state.
   *
   * Drives both the field-level messages and the decision not to clear the form:
   * this surface stays mounted between attempts, so a failed submit must leave the
   * entry intact for the user to correct.
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);

  /** Emits valid attachment values. */
  public readonly submitted: OutputEmitterRef<AddAttachmentInput> = output();

  /** Server message per field, projected from the last 422. */
  protected readonly serverFieldErrors: Signal<ServerFieldErrors> = computed(() =>
    toServerFieldErrors(this.serverError()),
  );

  /** Message of the first violation naming no field of this form. */
  protected readonly unmatchedViolation: Signal<string | null> = computed(
    () =>
      toUnmatchedViolations(this.serverError(), ['fileName', 'mimeType', 'content'])[0]?.message ??
      null,
  );

  /** Non-nullable builder preserving strict form value types. */
  private readonly formBuilder: NonNullableFormBuilder =
    inject<NonNullableFormBuilder>(NonNullableFormBuilder);

  /** Strictly typed attachment form. */
  protected readonly form = this.formBuilder.group({
    fileName: this.formBuilder.control(EMPTY_ATTACHMENT.fileName, [Validators.required]),
    mimeType: this.formBuilder.control(EMPTY_ATTACHMENT.mimeType, [Validators.required]),
    content: this.formBuilder.control(EMPTY_ATTACHMENT.content, [Validators.required]),
  });

  /** Whether a submission was in flight on the previous evaluation. */
  private wasLoading = false;

  /**
   * Synchronizes the disabled state with submission, and clears the form once —
   * and only once — a submission has actually been accepted.
   *
   * Unlike the drawer-hosted forms, this one stays mounted between attempts, so it
   * cannot rely on being destroyed to come back empty. Clearing on emit instead
   * threw away the entry whenever the server refused it.
   */
  public constructor() {
    effect(() => {
      const loading: boolean = this.loading();
      const failed: boolean = this.serverError() !== null;

      untracked(() => {
        if (loading) this.form.disable({ emitEvent: false });
        else this.form.enable({ emitEvent: false });

        if (this.wasLoading && !loading && !failed) {
          this.form.reset(EMPTY_ATTACHMENT, { emitEvent: false });
        }

        this.wasLoading = loading;
      });
    });
  }

  /** Emits valid attachment values. */
  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue());
  }
}
