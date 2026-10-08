import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
  type Signal,
  computed,
} from '@angular/core';
import {
  disabled,
  form,
  FormField,
  required,
  validate,
  type FieldTree,
} from '@angular/forms/signals';
import type {
  InventoryPartOutput,
  InventoryWarehouseOutput,
} from '@features/organization/features/inventory/models';
import { normalizeInventoryQuantity } from '@features/organization/features/inventory/utils';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSpinner } from '@shared/ui/spinner';
import type { InventoryConsumptionDraft } from './models/inventory-consumption-draft.type';

/**
 * Class InventoryConsumptionForm
 * @class InventoryConsumptionForm
 *
 * @description
 * Exact-decimal consumption presenter using authorized cached choices without transport.
 */
@Component({
  selector: 'app-inventory-consumption-form',
  templateUrl: './inventory-consumption-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    HlmButton,
    HlmInput,
    HlmSpinner,
    ...HlmComboboxImports,
    ...HlmFieldImports,
    ...HlmAlertImports,
  ],
})
export class InventoryConsumptionForm {
  //#region Properties
  /**
   * Property parts
   * @readonly
   *
   * @description
   * Authorized cached parts; archived references cannot be newly consumed.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly InventoryPartOutput[]>}
   */
  public readonly parts: InputSignal<readonly InventoryPartOutput[]> = input<
    readonly InventoryPartOutput[]
  >([]);

  /**
   * Property warehouses
   * @readonly
   *
   * @description
   * Authorized cached warehouses usable without a new online lookup.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly InventoryWarehouseOutput[]>}
   */
  public readonly warehouses: InputSignal<readonly InventoryWarehouseOutput[]> = input<
    readonly InventoryWarehouseOutput[]
  >([]);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Submission progress provided by the owning workflow.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);

  /**
   * Property locked
   * @readonly
   *
   * @description
   * An uncertain retained declaration prevents changing its immutable command fields.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly locked: InputSignal<boolean> = input(false);

  /**
   * Property error
   * @readonly
   *
   * @description
   * Submission error never replaces the entered draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property resetKey
   * @readonly
   *
   * @description
   * Changes only after the owner confirms durable acceptance of the submitted declaration.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly resetKey: InputSignal<number> = input(0);

  /**
   * Property inputPrefix
   * @readonly
   *
   * @description
   * Unique native label prefix when several forms are mounted.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly inputPrefix: InputSignal<string> = input('inventory-consumption');

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Validated references and decimal string; the owner adds command identity and context.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<
   *   InventoryConsumptionDraft
   * >}
   */
  public readonly submitted: OutputEmitterRef<InventoryConsumptionDraft> =
    output<InventoryConsumptionDraft>();

  /**
   * Property draft
   * @readonly
   *
   * @description
   * Quantity remains a string through validation and submission.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<
   *   InventoryConsumptionDraft
   * >}
   */
  protected readonly draft: WritableSignal<InventoryConsumptionDraft> = signal({
    partId: '',
    warehouseId: '',
    quantity: '',
  });

  /**
   * Property activeParts
   * @readonly
   *
   * @description
   * Only active cached parts are offered for new declarations.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly InventoryPartOutput[]>}
   */
  protected readonly activeParts: Signal<readonly InventoryPartOutput[]> = computed(() =>
    this.parts().filter((part) => !part.archived),
  );

  /**
   * Property activeWarehouses
   * @readonly
   *
   * @description
   * Only active cached warehouses are offered for new declarations.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly InventoryWarehouseOutput[]>}
   */
  protected readonly activeWarehouses: Signal<readonly InventoryWarehouseOutput[]> = computed(() =>
    this.warehouses().filter((warehouse) => !warehouse.archived),
  );

  /**
   * Property partLabelOf
   * @readonly
   *
   * @description
   * Keeps an entered part recognizable when its authorized projection refreshes.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: unknown) => string}
   */
  protected readonly partLabelOf: (value: unknown) => string = (value) =>
    typeof value === 'string'
      ? (this.parts().find((part) => part.id === value)?.label ?? value)
      : '';

  /**
   * Property warehouseLabelOf
   * @readonly
   *
   * @description
   * Keeps an entered warehouse recognizable after reference refreshes.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: unknown) => string}
   */
  protected readonly warehouseLabelOf: (value: unknown) => string = (value) =>
    typeof value === 'string'
      ? (this.warehouses().find((warehouse) => warehouse.id === value)?.name ?? value)
      : '';

  /**
   * Property consumptionForm
   * @readonly
   *
   * @description
   * Validates actual cached authorization and positive decimals without floating-point coercion.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<
   *   InventoryConsumptionDraft
   * >}
   */
  protected readonly consumptionForm: FieldTree<InventoryConsumptionDraft> = form(
    this.draft,
    (path) => {
      disabled(path, { when: () => this.pending() || this.locked() });
      required(path.partId, {
        message: $localize`:@@inventory.consumption.partRequired:Choose an active part.`,
      });
      validate(path.partId, ({ value }) =>
        this.activeParts().some((part) => part.id === value())
          ? null
          : {
              kind: 'reference',
              message: $localize`:@@inventory.consumption.partRequired:Choose an active part.`,
            },
      );
      required(path.warehouseId, {
        message: $localize`:@@inventory.consumption.warehouseRequired:Choose an active warehouse.`,
      });
      validate(path.warehouseId, ({ value }) =>
        this.activeWarehouses().some((warehouse) => warehouse.id === value())
          ? null
          : {
              kind: 'reference',
              message: $localize`:@@inventory.consumption.warehouseRequired:Choose an active warehouse.`,
            },
      );
      required(path.quantity, {
        message: $localize`:@@inventory.consumption.quantityRequired:Enter the quantity used.`,
      });
      validate(path.quantity, ({ value }) =>
        normalizeInventoryQuantity(value())
          ? null
          : {
              kind: 'quantity',
              message: $localize`:@@inventory.consumption.quantityInvalid:Enter a positive decimal with up to 18 whole digits and 6 decimal places, using a dot.`,
            },
      );
    },
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Only explicit durable acceptance resets the entered consumption draft.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      this.resetKey();
      untracked(() => this.consumptionForm().reset({ partId: '', warehouseId: '', quantity: '' }));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Reveals errors and emits the exact string only when the draft is valid and unlocked.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - Native form submit event.
   *
   * @returns {void} No return value.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.consumptionForm().markAsTouched();
    if (this.pending() || this.locked() || this.consumptionForm().invalid()) return;
    const draft = this.draft();
    const quantity = normalizeInventoryQuantity(draft.quantity);
    if (!quantity) return;
    this.submitted.emit({ ...draft, quantity });
  }
  //#endregion
}
