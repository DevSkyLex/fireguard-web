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
  applyEach,
  disabled,
  form,
  FormField,
  maxLength,
  required,
  validate,
  type FieldTree,
} from '@angular/forms/signals';
import type { CallState } from '@core/request-state';
import { idleCallState } from '@core/request-state';
import type { EquipmentTypeOption } from '@features/organization/features/equipments';
import { InventoryPartPicker } from '@features/organization/features/inventory/ui/components/inventory-part-picker';
import type {
  ChangePurchaseOrderInput,
  ProcurementLineKind,
  PurchaseOrderLineInput,
  PurchaseOrderOutput,
  SupplierOutput,
} from '@features/organization/features/procurement/models';
import { canonicalExactDecimal } from '@features/organization/features/procurement/utils';
import { isProcurementQuantity } from '@features/organization/features/procurement/validators';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSpinner } from '@shared/ui/spinner';
import type {
  PurchaseOrderDraft,
  PurchaseOrderLineDraft,
} from './models/purchase-order-draft.interface';

/**
 * Function newLine
 *
 * @description
 * Creates one local line identity before any server mutation.
 *
 * @access public
 * @since unreleased
 *
 * @returns {PurchaseOrderLineDraft} New local draft line with a stable UUID.
 */
function newLine(): PurchaseOrderLineDraft {
  return {
    id: globalThis.crypto.randomUUID(),
    kind: 'part',
    partId: '',
    typeCode: '',
    quantity: '1',
    unitCost: '',
    name: '',
    brand: '',
    model: '',
    identityTemplate: {},
  };
}

/**
 * Class PurchaseOrderForm
 * @class PurchaseOrderForm
 *
 * @description
 * Native purchase draft form with exact strings, explicit resource kinds and recoverable edits.
 */
@Component({
  selector: 'app-purchase-order-form',
  templateUrl: './purchase-order-form.component.html',
  imports: [
    FormField,
    HlmInput,
    HlmButton,
    HlmSpinner,
    InventoryPartPicker,
    ...HlmAlertImports,
    ...HlmFieldImports,
    ...HlmComboboxImports,
    ...HlmSelectImports,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrderForm {
  //#region Properties
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Owning organization passed to authorized stock pickers.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property order
   * @readonly
   *
   * @description
   * Selected draft, or null to create a new one.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<PurchaseOrderOutput | null>}
   */
  public readonly order: InputSignal<PurchaseOrderOutput | null> =
    input<PurchaseOrderOutput | null>(null);

  /**
   * Property suppliers
   * @readonly
   *
   * @description
   * Current server-authorized supplier page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly SupplierOutput[]>}
   */
  public readonly suppliers: InputSignal<readonly SupplierOutput[]> = input<
    readonly SupplierOutput[]
  >([]);

  /**
   * Property selectedSupplier
   * @readonly
   *
   * @description
   * Retained selected supplier, including its archived label.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<SupplierOutput | null>}
   */
  public readonly selectedSupplier: InputSignal<SupplierOutput | null> =
    input<SupplierOutput | null>(null);

  /**
   * Property supplierState
   * @readonly
   *
   * @description
   * Supplier picker read status.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<CallState>}
   */
  public readonly supplierState: InputSignal<CallState> = input<CallState>(idleCallState());

  /**
   * Property supplierPage
   * @readonly
   *
   * @description
   * Current server supplier page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly supplierPage: InputSignal<number> = input(1);

  /**
   * Property supplierPageCount
   * @readonly
   *
   * @description
   * Server-derived number of supplier pages.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly supplierPageCount: InputSignal<number> = input(1);

  /**
   * Property typeOptions
   * @readonly
   *
   * @description
   * Organization catalogue, including historical type labels.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly EquipmentTypeOption[]>}
   */
  public readonly typeOptions: InputSignal<readonly EquipmentTypeOption[]> = input<
    readonly EquipmentTypeOption[]
  >([]);

  /**
   * Property canEditCosts
   * @readonly
   *
   * @description
   * Independent dedicated financial read and manage capability.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canEditCosts: InputSignal<boolean> = input(false);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Accepted or unresolved mutation locks all editing.
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
   * Recoverable normalized server error.
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
   * Validated draft intent; this form makes no API calls.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<ChangePurchaseOrderInput>}
   */
  public readonly submitted: OutputEmitterRef<ChangePurchaseOrderInput> =
    output<ChangePurchaseOrderInput>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Requested controlled dismissal.
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
   * Actual native dirtiness for editor and route protection.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property supplierSearched
   * @readonly
   *
   * @description
   * Server search intent; local filtering does not hide later pages.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly supplierSearched: OutputEmitterRef<string> = output<string>();

  /**
   * Property supplierPageChanged
   * @readonly
   *
   * @description
   * Server pagination intent.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly supplierPageChanged: OutputEmitterRef<number> = output<number>();
  /**
   * Property equipmentTypesRequested
   * @readonly
   *
   * @description
   * The hidden equipment catalogue is needed only after an individual-material line is selected.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly equipmentTypesRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property draft
   * @readonly
   *
   * @description
   * Editable text fields and declarative identities.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<PurchaseOrderDraft>}
   */
  protected readonly draft: WritableSignal<PurchaseOrderDraft> = signal<PurchaseOrderDraft>({
    name: '',
    supplierId: '',
    lines: [],
  });

  /**
   * Property orderForm
   * @readonly
   *
   * @description
   * Native schema validates conditional references and exact quantity boundaries.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<PurchaseOrderDraft>}
   */
  protected readonly orderForm: FieldTree<PurchaseOrderDraft> = form(this.draft, (path) => {
    disabled(path, { when: () => this.pending() });
    required(path.name, {
      message: $localize`:@@procurement.order.nameRequired:Enter the order name.`,
    });
    validate(path.name, ({ value }) =>
      value().trim()
        ? null
        : {
            kind: 'required',
            message: $localize`:@@procurement.order.nameRequired:Enter the order name.`,
          },
    );
    maxLength(path.name, 160);
    required(path.supplierId, {
      message: $localize`:@@procurement.order.supplierRequired:Choose an internal supplier.`,
    });
    validate(path.lines, ({ value }) =>
      value().length > 0 && value().length <= 100
        ? null
        : {
            kind: 'lines',
            message: $localize`:@@procurement.order.linesRequired:Add between 1 and 100 lines.`,
          },
    );
    applyEach(path.lines, (line) => {
      required(line.partId, {
        when: ({ valueOf }) => valueOf(line.kind) === 'part',
        message: $localize`:@@procurement.order.partRequired:Choose a stock article.`,
      });
      required(line.typeCode, {
        when: ({ valueOf }) => valueOf(line.kind) === 'equipment_to_individualize',
        message: $localize`:@@procurement.order.typeRequired:Choose an equipment type.`,
      });
      validate(line.quantity, ({ value, valueOf }) =>
        isProcurementQuantity(value(), valueOf(line.kind))
          ? null
          : {
              kind: 'quantity',
              message: $localize`:@@procurement.quantity.invalid:Enter a positive quantity up to 100000 with at most six decimals. Equipment needs whole units.`,
            },
      );
      validate(line.unitCost, ({ value }) =>
        !value() || canonicalExactDecimal(value()) !== null
          ? null
          : {
              kind: 'cost',
              message: $localize`:@@procurement.cost.invalid:Enter a nonnegative amount with at most six decimals.`,
            },
      );
      maxLength(line.name, 160);
      maxLength(line.brand, 255);
      maxLength(line.model, 255);
    });
  });

  /**
   * Property supplierLabels
   * @readonly
   *
   * @description
   * Retained labels remain readable when the server picker changes page.
   *
   * @access private
   * @since unreleased
   *
   * @type {WritableSignal<Readonly<Record<string, string>>>}
   */
  private readonly supplierLabels: WritableSignal<Readonly<Record<string, string>>> = signal({});

  /**
   * Property remoteFilter
   * @readonly
   *
   * @description
   * No client filter on an already server-filtered supplier page.
   *
   * @access protected
   * @since unreleased
   *
   * @type {() => boolean}
   */
  protected readonly remoteFilter: () => boolean = () => true;

  /**
   * Property supplierLabelOf
   * @readonly
   *
   * @description
   * Native reference resolver for supplier option values.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: string) => string}
   */
  protected readonly supplierLabelOf: (value: string) => string = (value) =>
    this.supplierLabels()[value] ?? value;

  /**
   * Property typeLabelOf
   * @readonly
   *
   * @description
   * Native type resolver includes retained historical labels.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: string) => string}
   */
  protected readonly typeLabelOf: (value: string) => string = (value) =>
    this.typeOptions().find((item) => item.value === value)?.label ?? value;

  /**
   * Property kinds
   * @readonly
   *
   * @description
   * Explicit stock versus individual park choices.
   *
   * @access protected
   * @since unreleased
   *
   * @type {readonly { value: ProcurementLineKind; label: string }[]}
   */
  protected readonly kinds: readonly { value: ProcurementLineKind; label: string }[] = [
    { value: 'part', label: $localize`:@@procurement.kind.part:Stock article` },
    {
      value: 'equipment_to_individualize',
      label: $localize`:@@procurement.kind.equipment:Equipment to individualize`,
    },
  ];

  /**
   * Property kindLabelOf
   * @readonly
   *
   * @description
   * Native reference resolver for line kinds.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: string) => string}
   */
  protected readonly kindLabelOf: (value: string) => string = (value) =>
    this.kinds.find((item) => item.value === value)?.label ?? value;

  /**
   * Property activeSuppliers
   * @readonly
   *
   * @description
   * Archival flags only prevent new assignments; history retains its labels.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly SupplierOutput[]>}
   */
  protected readonly activeSuppliers: Signal<readonly SupplierOutput[]> = computed(() =>
    this.suppliers().filter((item) => !item.archivedAt),
  );

  /**
   * Property seededIdentity
   *
   * @description
   * Seeding follows identity, preserving typed edits during revision refreshes.
   *
   * @access private
   * @since unreleased
   *
   * @type {string | null | undefined}
   */
  private seededIdentity: string | null | undefined = undefined;

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Seeds new or existing drafts once and reports the native form's dirtiness.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const needed: boolean = this.draft().lines.some(
        (line) => line.kind === 'equipment_to_individualize',
      );
      if (needed) untracked(() => this.equipmentTypesRequested.emit());
    });
    effect(() => {
      const supplier = this.selectedSupplier();
      const choices = supplier ? [...this.suppliers(), supplier] : this.suppliers();
      this.supplierLabels.update((previous) => ({
        ...previous,
        ...Object.fromEntries(
          choices.map((item) => [item.id, item.code ? `${item.code} — ${item.name}` : item.name]),
        ),
      }));
    });
    effect(() => {
      const order = this.order();
      const identity = order?.id ?? null;
      if (identity === this.seededIdentity) return;
      this.seededIdentity = identity;
      untracked(() =>
        this.orderForm().reset(
          order
            ? {
                name: order.name,
                supplierId: order.supplierId,
                lines: order.lines.map((line) => {
                  const identityTemplate: Record<string, unknown> = Array.isArray(
                    line.identityTemplate,
                  )
                    ? {}
                    : { ...line.identityTemplate };
                  return {
                    id: line.id,
                    kind: line.kind,
                    partId: line.partId ?? '',
                    typeCode: line.typeCode ?? '',
                    quantity: line.quantity,
                    unitCost: line.unitCost ?? '',
                    name:
                      typeof identityTemplate['name'] === 'string' ? identityTemplate['name'] : '',
                    brand:
                      typeof identityTemplate['brand'] === 'string'
                        ? identityTemplate['brand']
                        : '',
                    model:
                      typeof identityTemplate['model'] === 'string'
                        ? identityTemplate['model']
                        : '',
                    identityTemplate,
                  };
                }),
              }
            : { name: '', supplierId: '', lines: [newLine()] },
        ),
      );
    });
    effect(() => {
      const dirty = this.orderForm().dirty();
      untracked(() => this.dirtyChanged.emit(dirty));
    });
  }

  //#endregion

  //#region Methods
  /**
   * Method addLine
   * @method addLine
   *
   * @description
   * Adds a local line without posting or changing any inventory.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value; emits or updates the local draft only.
   */
  protected addLine(): void {
    if (this.pending() || this.draft().lines.length >= 100) return;
    this.draft.update((draft) => ({ ...draft, lines: [...draft.lines, newLine()] }));
    this.orderForm().markAsDirty();
  }

  /**
   * Method removeLine
   * @method removeLine
   *
   * @description
   * Removes only a local draft line.
   *
   * @access protected
   * @since unreleased
   *
   * @param {number} index - Position of the local draft item to remove.
   *
   * @returns {void} No return value; emits or updates the local draft only.
   */
  protected removeLine(index: number): void {
    if (this.pending()) return;
    this.draft.update((draft) => ({
      ...draft,
      lines: draft.lines.filter((_, position) => position !== index),
    }));
    this.orderForm().markAsDirty();
  }

  /**
   * Method selectableTypes
   * @method selectableTypes
   *
   * @description
   * Retains the current type label while limiting new choices to active catalogue entries.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} value - Current selected value whose historical label remains readable.
   *
   * @returns {readonly EquipmentTypeOption[]} Active types and the retained historical selection.
   */
  protected selectableTypes(value: string): readonly EquipmentTypeOption[] {
    return this.typeOptions().filter((item) => !item.archived || item.value === value);
  }

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Emits normalized exact values and omits costs the current user cannot manage.
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
    this.orderForm().markAsTouched();
    if (this.pending() || this.orderForm().invalid()) return;
    const draft: PurchaseOrderDraft = this.draft();
    const lines: PurchaseOrderLineInput[] = [];
    for (const [index, line] of draft.lines.entries()) {
      const quantity: string | null = canonicalExactDecimal(line.quantity);
      if (quantity === null) return;
      const costUpdated: boolean =
        this.canEditCosts() && this.orderForm.lines[index].unitCost().dirty();
      const unitCost: string | null = line.unitCost.trim()
        ? canonicalExactDecimal(line.unitCost)
        : null;
      if (costUpdated && line.unitCost.trim() && unitCost === null) return;
      lines.push({
        id: line.id,
        kind: line.kind,
        quantity,
        ...(line.kind === 'part'
          ? { partId: line.partId }
          : {
              typeCode: line.typeCode,
              identityTemplate: {
                ...line.identityTemplate,
                name: line.name.trim() || null,
                brand: line.brand.trim() || null,
                model: line.model.trim() || null,
              },
            }),
        ...(costUpdated ? { unitCost } : {}),
      });
    }
    this.submitted.emit({
      name: draft.name.trim(),
      supplierId: draft.supplierId,
      lines,
    });
  }
  //#endregion
}
