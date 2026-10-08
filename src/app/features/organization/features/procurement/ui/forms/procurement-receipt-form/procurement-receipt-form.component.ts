import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  disabled,
  form,
  FormField,
  required,
  validate,
  type FieldTree,
} from '@angular/forms/signals';
import { DateTime } from 'luxon';
import { InventoryWarehousePicker } from '@features/organization/features/inventory/ui/components/inventory-warehouse-picker';
import type {
  PurchaseOrderLineOutput,
  ReceivePurchaseOrderInput,
} from '@features/organization/features/procurement/models';
import {
  canonicalExactDecimal,
  exactDecimalUnits,
} from '@features/organization/features/procurement/utils';
import { isProcurementQuantity } from '@features/organization/features/procurement/validators';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSpinner } from '@shared/ui/spinner';
import type { ProcurementReceiptDraft } from './models/procurement-receipt-draft.interface';

/**
 * Class ProcurementReceiptForm
 * @class ProcurementReceiptForm
 *
 * @description
 * Native physical delivery form; no stock or reserve units are created until server confirmation.
 */
@Component({
  selector: 'app-procurement-receipt-form',
  templateUrl: './procurement-receipt-form.component.html',
  imports: [
    FormField,
    HlmInput,
    HlmButton,
    HlmSpinner,
    InventoryWarehousePicker,
    ...HlmAlertImports,
    ...HlmFieldImports,
    ...HlmSelectImports,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcurementReceiptForm {
  //#region Properties
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Tenant passed to the warehouse picker.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property line
   * @readonly
   *
   * @description
   * Source line with the current server remaining quantity.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<PurchaseOrderLineOutput>}
   */
  public readonly line: InputSignal<PurchaseOrderLineOutput> =
    input.required<PurchaseOrderLineOutput>();

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Accepted or transport-uncertain writes lock editing.
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
   * Normalized recoverable server failure.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Validated physical declaration; its operation UUID is retained by the store.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<ReceivePurchaseOrderInput>}
   */
  public readonly submitted: OutputEmitterRef<ReceivePurchaseOrderInput> =
    output<ReceivePurchaseOrderInput>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Controlled dismissal intent.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();

  /**
   * Property dirtyChanged
   * @readonly
   *
   * @description
   * Actual native dirtiness for dismissal protection.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property draft
   * @readonly
   *
   * @description
   * Text input never converts quantity through a floating-point number.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ProcurementReceiptDraft>}
   */
  protected readonly draft: WritableSignal<ProcurementReceiptDraft> = signal({
    quantity: '',
    warehouseId: '',
    localTime: '',
    offsetChoice: '',
  });
  /**
   * Property possibleTimes
   * @readonly
   *
   * @description
   * Rejects normalized nonexistent local hours and retains both possible instants of a repeated
   * hour.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly DateTime[]>}
   */
  protected readonly possibleTimes: Signal<readonly DateTime[]> = computed(() => {
    const value: string = this.draft().localTime;
    const date: DateTime = DateTime.fromISO(value);
    return date.isValid && date.toFormat("yyyy-MM-dd'T'HH:mm") === value
      ? date.getPossibleOffsets()
      : [];
  });
  /**
   * Property resolvedTime
   * @readonly
   *
   * @description
   * A repeated hour remains unresolved until the reader explicitly selects its UTC offset.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<DateTime | null>}
   */
  protected readonly resolvedTime: Signal<DateTime | null> = computed(() => {
    const times: readonly DateTime[] = this.possibleTimes();
    return times.length === 1
      ? (times[0] ?? null)
      : (times.find((date) => date.toFormat('ZZ') === this.draft().offsetChoice) ?? null);
  });

  /**
   * Property limit
   * @readonly
   *
   * @description
   * A single equipment receipt is bounded to 100 units and the server remaining quantity.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly limit: Signal<string> = computed(() =>
    this.line().kind === 'equipment_to_individualize' &&
    (exactDecimalUnits(this.line().remainingQuantity) ?? 0n) > 100000000n
      ? '100.000000'
      : this.line().remainingQuantity,
  );

  /**
   * Property receiptForm
   * @readonly
   *
   * @description
   * Native field tree and local bounds; concurrency remains authoritative on the server.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<ProcurementReceiptDraft>}
   */
  protected readonly receiptForm: FieldTree<ProcurementReceiptDraft> = form(this.draft, (path) => {
    disabled(path, () => this.pending());
    validate(path.quantity, ({ value }) =>
      isProcurementQuantity(value(), this.line().kind, this.limit())
        ? null
        : {
            kind: 'quantity',
            message: $localize`:@@procurement.receipt.quantityInvalid:Enter a positive quantity within the remaining delivery. Equipment needs whole units, up to 100 per receipt.`,
          },
    );
    required(path.warehouseId, {
      when: () => this.line().kind === 'part',
      message: $localize`:@@procurement.receipt.warehouseRequired:Choose the receiving warehouse.`,
    });
    required(path.localTime, {
      message: $localize`:@@procurement.receipt.timeRequired:Enter the physical receipt date and time.`,
    });
    validate(path.localTime, () => {
      const date: DateTime | null =
        this.resolvedTime() ??
        this.possibleTimes().find((candidate) => candidate <= DateTime.now()) ??
        null;
      return date !== null && date <= DateTime.now()
        ? null
        : {
            kind: 'date',
            message: $localize`:@@procurement.receipt.timeInvalid:Choose a valid receipt date and time that is not in the future.`,
          };
    });
    validate(path.offsetChoice, () =>
      this.possibleTimes().length <= 1 || this.resolvedTime() !== null
        ? null
        : {
            kind: 'offset',
            message: $localize`:@@procurement.receipt.offsetRequired:This local hour occurs twice. Choose the UTC offset of the actual receipt.`,
          },
    );
  });

  /**
   * Property seededLineId
   *
   * @description
   * Source identity already seeded; revision refresh never discards typed physical facts.
   *
   * @access private
   * @since unreleased
   *
   * @type {string | null}
   */
  private seededLineId: string | null = null;
  /**
   * Property offsetTime
   *
   * @description
   * A changed local time requires a new explicit repeated-hour decision.
   *
   * @access private
   * @since unreleased
   *
   * @type {string | null}
   */
  private offsetTime: string | null = null;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Defaults the physical time only once for the selected source line.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const id = this.line().id;
      if (id === this.seededLineId) return;
      this.seededLineId = id;
      untracked(() =>
        this.receiptForm().reset({
          quantity: '',
          warehouseId: '',
          localTime: DateTime.local().toFormat("yyyy-MM-dd'T'HH:mm"),
          offsetChoice: '',
        }),
      );
    });
    effect(() => {
      const localTime: string = this.draft().localTime;
      if (localTime === this.offsetTime) return;
      this.offsetTime = localTime;
      untracked(() => this.draft.update((draft) => ({ ...draft, offsetChoice: '' })));
    });
    effect(() => {
      const dirty = this.receiptForm().dirty();
      untracked(() => this.dirtyChanged.emit(dirty));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Emits one explicit-offset physical declaration and a fresh UUID for its first attempt.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - Native form submission event.
   *
   * @returns {void} No return value; emits or updates the local draft only.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.receiptForm().markAsTouched();
    if (this.pending() || this.receiptForm().invalid()) return;
    const draft: ProcurementReceiptDraft = this.draft();
    const receivedAt: string | null =
      this.resolvedTime()?.toUTC().toISO({ suppressMilliseconds: true }) ?? null;
    const quantity: string | null = canonicalExactDecimal(draft.quantity);
    if (!receivedAt || !quantity) return;
    this.submitted.emit({
      lineId: this.line().id,
      quantity,
      receivedAt,
      clientOperationId: globalThis.crypto.randomUUID(),
      ...(this.line().kind === 'part' ? { warehouseId: draft.warehouseId } : {}),
    });
  }
  //#endregion
}
