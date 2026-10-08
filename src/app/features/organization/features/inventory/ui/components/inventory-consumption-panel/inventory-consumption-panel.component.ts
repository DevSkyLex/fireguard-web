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
import type {
  DeclareInventoryConsumptionInput,
  InventoryConsumptionIntent,
  InventoryConsumptionOutput,
  InventoryPartOutput,
  InventoryWarehouseOutput,
} from '@features/organization/features/inventory/models';
import { InventoryConsumptionForm } from '@features/organization/features/inventory/ui/forms/inventory-consumption-form';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmItemImports } from '@shared/ui/item';

/**
 * Class InventoryConsumptionPanel
 * @class InventoryConsumptionPanel
 *
 * @description
 * Presents factual consumption states and immutable intent; the caller owns durable outbox and
 * transport.
 */
@Component({
  selector: 'app-inventory-consumption-panel',
  templateUrl: './inventory-consumption-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    InventoryConsumptionForm,
    OrgDatePipe,
    HlmBadge,
    HlmButton,
    ...HlmItemImports,
    ...HlmAlertImports,
  ],
})
export class InventoryConsumptionPanel {
  //#region Properties
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Immutable organization authority captured with each emitted command.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input('');

  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Owning intervention for new declarations and visible history.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly interventionId: InputSignal<string> = input('');

  /**
   * Property workItemId
   * @readonly
   *
   * @description
   * Optional work-item context restricting history and new declarations.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly workItemId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * Optional equipment context for factual usage.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly equipmentId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property parts
   * @readonly
   *
   * @description
   * Authorized cached parts supplied by the parent, including offline choices.
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
   * Authorized cached warehouse references supplied by the parent.
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
   * Property declarations
   * @readonly
   *
   * @description
   * Server-received physical facts with stock confirmation state.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly InventoryConsumptionOutput[]>}
   */
  public readonly declarations: InputSignal<readonly InventoryConsumptionOutput[]> = input<
    readonly InventoryConsumptionOutput[]
  >([]);

  /**
   * Property localIntents
   * @readonly
   *
   * @description
   * Parent-owned durable local queue projection; not server stock confirmation.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly InventoryConsumptionIntent[]>}
   */
  public readonly localIntents: InputSignal<readonly InventoryConsumptionIntent[]> = input<
    readonly InventoryConsumptionIntent[]
  >([]);

  /**
   * Property acceptedOperationId
   * @readonly
   *
   * @description
   * Explicit acknowledgment of durable local acceptance, correlated by client operation UUID.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly acceptedOperationId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Owner submission progress; local protection also prevents same-turn repeated clicks.
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
   * Owner rejection displayed without changing the retained command.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property canDeclare
   * @readonly
   *
   * @description
   * Caller-owned execution and inventory permission gate.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canDeclare: InputSignal<boolean> = input(true);

  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * Organization-owned timezone and formatting for recorded instants.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> = input(
    DEFAULT_REGIONAL_FORMAT_SETTINGS,
  );

  /**
   * Property declared
   * @readonly
   *
   * @description
   * Immutable intent; retry emits the same operation UUID and physical facts.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<DeclareInventoryConsumptionInput>}
   */
  public readonly declared: OutputEmitterRef<DeclareInventoryConsumptionInput> =
    output<DeclareInventoryConsumptionInput>();

  /**
   * Property retainedCommand
   * @readonly
   *
   * @description
   * Accepted submit retained until durable owner acknowledgment, including lost replies.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<DeclareInventoryConsumptionInput | null>}
   */
  protected readonly retainedCommand: WritableSignal<DeclareInventoryConsumptionInput | null> =
    signal<DeclareInventoryConsumptionInput | null>(null);

  /**
   * Property resetKey
   * @readonly
   *
   * @description
   * Form reset advances only once for an explicitly acknowledged command.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly resetKey: WritableSignal<number> = signal(0);

  /**
   * Property inFlight
   * @readonly
   *
   * @description
   * Synchronous emission lock closes the gap before the owner updates its pending input.
   *
   * @access private
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly inFlight: WritableSignal<boolean> = signal(false);

  /**
   * Property retryingOperationId
   * @readonly
   *
   * @description
   * Locks repeated replay clicks until the durable queue reflects transmission progress.
   *
   * @access private
   * @since unreleased
   *
   * @type {WritableSignal<string | null>}
   */
  private readonly retryingOperationId: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property commandOrganizationId
   *
   * @description
   * Original organization never changes when an uncertain command survives a context switch.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private commandOrganizationId: string = '';

  /**
   * Property formLocked
   * @readonly
   *
   * @description
   * Entered command facts remain immutable while awaiting durable acknowledgment.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly formLocked: Signal<boolean> = computed(
    () => this.retainedCommand() !== null || !this.canDeclare(),
  );

  /**
   * Property mayRetry
   * @readonly
   *
   * @description
   * Explicit retry remains within the original scope and waits for a known owner error.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly mayRetry: Signal<boolean> = computed(() => {
    const command = this.retainedCommand();
    return (
      !!command &&
      !!this.error() &&
      !this.pending() &&
      !this.inFlight() &&
      this.canDeclare() &&
      command.interventionId === this.interventionId() &&
      this.commandOrganizationId === this.organizationId() &&
      (command.workItemId ?? null) === this.workItemId() &&
      (command.equipmentId ?? null) === this.equipmentId()
    );
  });

  /**
   * Property declarationRows
   * @readonly
   *
   * @description
   * Server state labels remain separate from work completion and dossier validation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<
   *   readonly {
   *     id: string;
   *     title: string;
   *     warehouse: string;
   *     quantity: string;
   *     occurredAt: string;
   *     label: string;
   *     reason: string | null;
   *     late: boolean;
   *   }[]
   * >}
   */
  protected readonly declarationRows: Signal<
    readonly {
      id: string;
      title: string;
      warehouse: string;
      quantity: string;
      occurredAt: string;
      label: string;
      reason: string | null;
      late: boolean;
    }[]
  > = computed(() =>
    this.declarations()
      .filter((item) => this.inContext(item))
      .map((item) => ({
        id: item.id,
        title: this.partTitle(item.partId),
        warehouse: this.warehouseTitle(item.warehouseId),
        quantity: item.quantity,
        occurredAt: item.occurredAt,
        label:
          item.status === 'confirmed'
            ? $localize`:@@inventory.consumption.confirmed:Stock debit confirmed`
            : $localize`:@@inventory.consumption.receivedPending:Received — reconciliation needed`,
        reason:
          item.reason === 'missing_balance'
            ? $localize`:@@inventory.consumption.missingBalance:No stock balance is recorded for this source.`
            : item.reason === 'archived_reference'
              ? $localize`:@@inventory.consumption.archivedReference:The part or warehouse is archived.`
              : item.reason === 'insufficient_stock'
                ? $localize`:@@inventory.consumption.insufficientStock:Recorded stock is insufficient for the full quantity.`
                : null,
        late: item.late,
      })),
  );

  /**
   * Property localRows
   * @readonly
   *
   * @description
   * Durable local intents retain their identity without implying any confirmed stock debit.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<
   *   readonly {
   *     intent: InventoryConsumptionIntent;
   *     title: string;
   *     warehouse: string;
   *     label: string;
   *     retryable: boolean;
   *   }[]
   * >}
   */
  protected readonly localRows: Signal<
    readonly {
      intent: InventoryConsumptionIntent;
      title: string;
      warehouse: string;
      label: string;
      retryable: boolean;
    }[]
  > = computed(() =>
    this.localIntents()
      .filter((intent) => this.inContext(intent.input))
      .map((intent) => ({
        intent,
        title: this.partTitle(intent.input.partId),
        warehouse: this.warehouseTitle(intent.input.warehouseId),
        label:
          intent.status === 'sending'
            ? $localize`:@@inventory.consumption.sending:Sending — stock not confirmed`
            : intent.status === 'failed'
              ? $localize`:@@inventory.consumption.localFailed:Queued locally — retry needed`
              : $localize`:@@inventory.consumption.queued:Queued locally — awaiting synchronization`,
        retryable:
          intent.status === 'failed' &&
          this.retryingOperationId() !== intent.input.clientOperationId,
      })),
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Correlates durable acceptance using operation identity, never unrelated server IDs.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const command = this.retainedCommand();
      const acceptedOperationId = this.acceptedOperationId();
      const localIntents = this.localIntents();
      if (
        !command ||
        (acceptedOperationId !== command.clientOperationId &&
          !localIntents.some(
            (intent) => intent.input.clientOperationId === command.clientOperationId,
          ))
      )
        return;
      untracked(() => {
        this.retainedCommand.set(null);
        this.inFlight.set(false);
        this.resetKey.update((value) => value + 1);
      });
    });
    effect(() => {
      const pending = this.pending();
      const error = this.error();
      if (!pending && error) untracked(() => this.inFlight.set(false));
    });
    effect(() => {
      const intents = this.localIntents();
      untracked(() => {
        const operationId = this.retryingOperationId();
        if (
          operationId &&
          !intents.some(
            (intent) =>
              intent.input.clientOperationId === operationId && intent.status === 'failed',
          )
        )
          this.retryingOperationId.set(null);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method declare
   * @method declare
   *
   * @description
   * Captures context, timestamp and UUID once before emitting an accepted user intent.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Pick<DeclareInventoryConsumptionInput, 'partId' | 'warehouseId' | 'quantity'>} draft -
   *   Validated consumption draft.
   *
   * @returns {void} No return value.
   */
  protected declare(
    draft: Pick<DeclareInventoryConsumptionInput, 'partId' | 'warehouseId' | 'quantity'>,
  ): void {
    if (
      !this.canDeclare() ||
      this.pending() ||
      this.inFlight() ||
      this.retainedCommand() ||
      !this.organizationId() ||
      !this.interventionId()
    )
      return;
    const command: DeclareInventoryConsumptionInput = Object.freeze({
      ...draft,
      clientOperationId: crypto.randomUUID(),
      interventionId: this.interventionId(),
      workItemId: this.workItemId(),
      equipmentId: this.equipmentId(),
      occurredAt: new Date().toISOString(),
    });
    this.commandOrganizationId = this.organizationId();
    this.retainedCommand.set(command);
    this.inFlight.set(true);
    this.declared.emit(command);
  }

  /**
   * Method retry
   * @method retry
   *
   * @description
   * Re-emits the retained physical fact exactly, without a new UUID or timestamp.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected retry(): void {
    const command = this.retainedCommand();
    if (!command || !this.mayRetry()) return;
    this.inFlight.set(true);
    this.declared.emit(command);
  }

  /**
   * Method retryIntent
   * @method retryIntent
   *
   * @description
   * Requests replay of a parent-owned failed durable intent with its original identity.
   *
   * @access protected
   * @since unreleased
   *
   * @param {InventoryConsumptionIntent} intent - Failed durable queue entry supplied by the owner.
   *
   * @returns {void} No return value.
   */
  protected retryIntent(intent: InventoryConsumptionIntent): void {
    if (
      !this.canDeclare() ||
      this.pending() ||
      this.inFlight() ||
      this.retryingOperationId() === intent.input.clientOperationId ||
      intent.status !== 'failed' ||
      !this.inContext(intent.input)
    )
      return;
    this.retryingOperationId.set(intent.input.clientOperationId);
    this.declared.emit(intent.input);
  }

  /**
   * Method inContext
   * @method inContext
   *
   * @description
   * Prevents a supplied broader collection from leaking another intervention's history.
   *
   * @access private
   * @since unreleased
   *
   * @param {Pick<
   *   DeclareInventoryConsumptionInput,
   *   'interventionId' | 'workItemId' | 'equipmentId'
   * >} item
   *   - Declaration context.
   *
   * @returns {boolean} Whether the declaration belongs to the rendered scope.
   */
  private inContext(
    item: Pick<DeclareInventoryConsumptionInput, 'interventionId' | 'workItemId' | 'equipmentId'>,
  ): boolean {
    return (
      item.interventionId === this.interventionId() &&
      (!this.workItemId() || item.workItemId === this.workItemId()) &&
      (!this.equipmentId() || item.equipmentId === this.equipmentId())
    );
  }

  /**
   * Method partTitle
   * @method partTitle
   *
   * @description
   * Resolves authorized cached labels and keeps an unknown reference identifiable.
   *
   * @access private
   * @since unreleased
   *
   * @param {string} id - Part UUID.
   *
   * @returns {string} Available part label or unchanged reference.
   */
  private partTitle(id: string): string {
    return this.parts().find((part) => part.id === id)?.label ?? id;
  }

  /**
   * Method warehouseTitle
   * @method warehouseTitle
   *
   * @description
   * Resolves the authorized source label without an extra network request.
   *
   * @access private
   * @since unreleased
   *
   * @param {string} id - Warehouse UUID.
   *
   * @returns {string} Available warehouse name or unchanged reference.
   */
  private warehouseTitle(id: string): string {
    return this.warehouses().find((warehouse) => warehouse.id === id)?.name ?? id;
  }
  //#endregion
}
