import type { InputSignal, OutputEmitterRef, WritableSignal } from '@angular/core';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { form, FormField, required, validate } from '@angular/forms/signals';
import type { StoreError } from '@core/request-state';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSpinner } from '@shared/ui/spinner';

/**
 * Component RecoveryCodeForm
 * @class RecoveryCodeForm
 *
 * @description
 * Enters a single recovery proof in memory; its model disappears with the form.
 */
@Component({
  selector: 'app-recovery-code-form',
  imports: [FormField, HlmButton, HlmInput, HlmSpinner, ...HlmAlertImports, ...HlmFieldImports],
  templateUrl: './recovery-code-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecoveryCodeForm {
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether the current operation is pending.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);
  /**
   * Property serverError
   * @readonly
   *
   * @description
   * Sanitized feedback for the current proof verification.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly serverError: InputSignal<StoreError | null> = input<StoreError | null>(null);
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits a canonical recovery proof for the current operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly submitted: OutputEmitterRef<string> = output<string>();
  /**
   * Property model
   * @readonly
   *
   * @description
   * Transient form values owned by this component.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<{ code: string }>}
   */
  protected readonly model: WritableSignal<{ code: string }> = signal({ code: '' });
  /**
   * Property recoveryForm
   * @readonly
   *
   * @description
   * Signal Form validating all eight groups of a recovery proof.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<{ code: string }>}
   */
  protected readonly recoveryForm: FieldTree<{ code: string }> = form(this.model, (path) => {
    required(path.code, { message: $localize`:@@auth.recovery.required:Enter a recovery code` });
    validate(path.code, ({ value }) =>
      /^[a-f0-9]{32}$/i.test(value().replace(/[\s-]/g, ''))
        ? null
        : {
            kind: 'recoveryCode',
            message: $localize`:@@auth.recovery.format:Enter all eight groups of four characters`,
          },
    );
  });
  /**
   * Method submit
   *
   * @description
   * Handles submit for the current authentication flow.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - Form submission event.
   *
   * @returns {void} Completes the local action.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.recoveryForm().markAsTouched();
    if (this.pending() || this.recoveryForm().invalid()) return;
    this.submitted.emit(this.model().code.replace(/[\s-]/g, '').toLowerCase());
  }
}
