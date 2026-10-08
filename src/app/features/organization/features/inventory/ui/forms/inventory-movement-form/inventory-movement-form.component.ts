import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { disabled, form, FormField, maxLength, required, validate } from '@angular/forms/signals';
import { InventoryPartPicker } from '@features/organization/features/inventory/ui/components/inventory-part-picker';
import { InventoryWarehousePicker } from '@features/organization/features/inventory/ui/components/inventory-warehouse-picker';
import { normalizeInventoryQuantity } from '@features/organization/features/inventory/utils';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSpinner } from '@shared/ui/spinner';
import { HlmTextarea } from '@shared/ui/textarea';

/**
 * Interface InventoryMovementDraft
 * @interface InventoryMovementDraft
 *
 * @description
 * Validated exact-decimal physical movement fields; the page supplies stable identity.
 */
export interface InventoryMovementDraft {
  /**
   * Property partId
   * @readonly
   *
   * @description
   * Selected active part.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly partId: string;
  /**
   * Property warehouseId
   * @readonly
   *
   * @description
   * Selected active warehouse.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly warehouseId: string;
  /**
   * Property quantity
   * @readonly
   *
   * @description
   * Signed correction or positive return quantity.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly quantity: string;
  /**
   * Property reason
   * @readonly
   *
   * @description
   * Motivation preserved in the movement history.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly reason: string;
}

/**
 * Class InventoryMovementForm
 *
 * @description
 * A motivated stock correction or return emits exact strings without arithmetic.
 */
@Component({
  selector: 'app-inventory-movement-form',
  templateUrl: './inventory-movement-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    InventoryPartPicker,
    InventoryWarehousePicker,
    HlmButton,
    HlmInput,
    HlmTextarea,
    HlmSpinner,
    ...HlmFieldImports,
    ...HlmAlertImports,
  ],
})
export class InventoryMovementForm {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Scope for authorized server choices.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').InputSignal<string>}
   */
  public readonly organizationId = input.required<string>();
  /**
   * Property mode
   * @readonly
   *
   * @description
   * Return quantity is positive, correction quantity is signed.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').InputSignal<'return' | 'correction'>}
   */
  public readonly mode = input.required<'return' | 'correction'>();
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Progress while the page persists and transmits.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').InputSignal<boolean>}
   */
  public readonly pending = input(false);
  /**
   * Property available
   * @readonly
   *
   * @description
   * Caller supplies current operation-specific authorization.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').InputSignal<boolean>}
   */
  public readonly available = input(true);
  /**
   * Property error
   * @readonly
   *
   * @description
   * Rejection retains entered fields.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').InputSignal<string | null>}
   */
  public readonly error = input<string | null>(null);
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Validated physical intention without operation identity.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').OutputEmitterRef<InventoryMovementDraft>}
   */
  public readonly submitted = output<InventoryMovementDraft>();
  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Requests dismissal before accepting the physical command.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').OutputEmitterRef<void>}
   */
  public readonly cancelled = output<void>();
  /**
   * Property dirtyChanged
   * @readonly
   *
   * @description
   * Actual draft edits protect dismissal before accepting the physical command.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged = output<boolean>();
  /**
   * Property draft
   * @readonly
   *
   * @description
   * String-only draft.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/core').WritableSignal<{
   *   partId: string;
   *   warehouseId: string;
   *   quantity: string;
   *   reason: string;
   * }>}
   */
  protected readonly draft = signal({ partId: '', warehouseId: '', quantity: '', reason: '' });
  /**
   * Property fields
   * @readonly
   *
   * @description
   * Exact quantity and nonblank reason validation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/forms/signals').FieldTree<
   *   { partId: string; warehouseId: string; quantity: string; reason: string },
   *   string | number,
   *   'writable'
   * >}
   */
  protected readonly fields = form(this.draft, (path) => {
    disabled(path, () => this.pending() || !this.available());
    required(path.partId, { when: () => this.mode() === 'correction' });
    required(path.warehouseId, { when: () => this.mode() === 'correction' });
    required(path.quantity);
    validate(path.quantity, ({ value }) =>
      normalizeInventoryQuantity(value(), this.mode() === 'correction')
        ? null
        : {
            kind: 'quantity',
            message: $localize`:@@inventory.movement.quantityInvalid:Enter a non-zero decimal with up to 18 whole digits and 6 decimal places, using a dot.`,
          },
    );
    validate(path.reason, ({ value }) =>
      value().trim()
        ? null
        : {
            kind: 'required',
            message: $localize`:@@inventory.movement.reasonRequired:Explain why this movement is needed.`,
          },
    );
    maxLength(path.reason, 2000);
  });
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Publishes native form dirtiness before durable command acceptance.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const dirty = this.fields().dirty();
      untracked(() => this.dirtyChanged.emit(dirty));
    });
  }
  /**
   * Method submit
   *
   * @description
   * Emits once with normalized exact decimals; the host persists the stable command.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - Native submit event.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.fields().markAsTouched();
    if (this.pending() || !this.available() || this.fields().invalid()) return;
    const draft = this.draft(),
      quantity = normalizeInventoryQuantity(draft.quantity, this.mode() === 'correction');
    if (quantity) this.submitted.emit({ ...draft, quantity, reason: draft.reason.trim() });
  }
}
