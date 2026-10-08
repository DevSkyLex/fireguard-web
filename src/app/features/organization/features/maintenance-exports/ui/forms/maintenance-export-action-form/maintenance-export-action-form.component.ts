import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import {
  disabled,
  form,
  FormField,
  FormRoot,
  required,
  validate,
  type FieldTree,
} from '@angular/forms/signals';
import type { StoreError } from '@core/request-state';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSpinner } from '@shared/ui/spinner';
import { HlmTextarea } from '@shared/ui/textarea';

/**
 * Class MaintenanceExportActionForm
 * @class MaintenanceExportActionForm
 *
 * @description
 * Explicit adjustment reason or actual import reference is emitted as intent; receipts belong to
 * the store.
 */
@Component({
  selector: 'app-maintenance-export-action-form',
  templateUrl: './maintenance-export-action-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    FormRoot,
    HlmButton,
    HlmInput,
    HlmSpinner,
    HlmTextarea,
    ...HlmFieldImports,
    ...HlmAlertImports,
  ],
})
export class MaintenanceExportActionForm {
  //#region Properties
  /**
   * Property confirmation
   * @readonly
   *
   * @description
   * Whether this form records an actual external import reference.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly confirmation: InputSignal<boolean> = input(false);
  /**
   * Property locked
   * @readonly
   *
   * @description
   * Whether editing is prohibited by permissions, connectivity or receipt recovery.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly locked: InputSignal<boolean> = input(false);
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether an accepted command is waiting for its acknowledgement.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);
  /**
   * Property error
   * @readonly
   *
   * @description
   * Recoverable server rejection shown beside the unchanged draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly error: InputSignal<StoreError | null> = input<StoreError | null>(null);
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Validated native form intent; the owning page accepts the write.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly submitted: OutputEmitterRef<string> = output();
  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Intent to dismiss the draft through the owning page.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output();
  /**
   * Property dirtyChanged
   * @readonly
   *
   * @description
   * Native form dirtiness used by guarded dismissal.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged: OutputEmitterRef<boolean> = output();
  /**
   * Property draft
   * @readonly
   *
   * @description
   * Editable native form values; exact strings remain unchanged until validation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<{ value: string }>}
   */
  protected readonly draft: WritableSignal<{ value: string }> = signal({ value: '' });
  /**
   * Property fields
   * @readonly
   *
   * @description
   * Signal Forms schema, validation and real field state.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<{ value: string }>}
   */
  protected readonly fields: FieldTree<{ value: string }> = form(this.draft, (path) => {
    disabled(path, { when: () => this.locked() || this.pending() });
    required(path.value, {
      message: $localize`:@@maintenanceExport.action.required:Enter the reason or actual external import reference.`,
    });
    validate(path.value, ({ value }) => {
      const limit = this.confirmation() ? 200 : 1000;
      return Array.from(value().trim()).length <= limit
        ? null
        : {
            kind: 'maxLength',
            message: this.confirmation()
              ? $localize`:@@maintenanceExport.form.limit200:Use no more than 200 characters.`
              : $localize`:@@maintenanceExport.form.limit1000:Use no more than 1000 characters.`,
          };
    });
    validate(path.value, ({ value }) =>
      value().trim()
        ? null
        : {
            kind: 'required',
            message: $localize`:@@maintenanceExport.action.required:Enter the reason or actual external import reference.`,
          },
    );
  });

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Connects native draft, authenticated scope and acknowledged command consequences.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => this.dirtyChanged.emit(this.fields().dirty()));
  }

  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Validates native field state and emits the exact accepted form intent.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - Native control event.
   *
   * @returns {void} No return value.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.fields().markAsTouched();
    if (!this.fields().invalid() && !this.fields().disabled())
      this.submitted.emit(this.draft().value.trim());
  }
  //#endregion
}
