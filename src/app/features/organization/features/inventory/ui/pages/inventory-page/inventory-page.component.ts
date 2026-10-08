import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  type Signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, FormField } from '@angular/forms/signals';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { ConnectivityService } from '@core/connectivity';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  InventoryConsumptionOutput,
  InventoryPartOutput,
  InventoryWarehouseOutput,
  InventoryPhysicalCommand,
} from '@features/organization/features/inventory/models';
import {
  InventoryStore,
  inventoryEvents,
  type InventorySection,
  type InventoryQuery,
  type InventoryRecord,
} from '@features/organization/features/inventory/state/inventory';
import { InventoryPartPicker } from '@features/organization/features/inventory/ui/components/inventory-part-picker';
import { InventoryWarehousePicker } from '@features/organization/features/inventory/ui/components/inventory-warehouse-picker';
import {
  InventoryDataview,
  type InventoryRow,
  type InventoryRowAction,
} from '@features/organization/features/inventory/ui/dataviews/inventory-dataview';
import {
  InventoryMovementForm,
  type InventoryMovementDraft,
} from '@features/organization/features/inventory/ui/forms/inventory-movement-form';
import {
  InventoryReferenceForm,
  type InventoryReferenceSubmission,
} from '@features/organization/features/inventory/ui/forms/inventory-reference-form';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { ORGANIZATION_MEMBER_ACCESS_PORT } from '@features/organization/ports/organization-member-access';
import { sheetSide } from '@shared/sheet-side';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSheetImports } from '@shared/ui/sheet';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import { UnsavedChangesDialog, type UnsavedChangesAware } from '@shared/unsaved-changes';

/**
 * Constant SECTION_LABELS
 *
 * @description
 * Route tabs describe operational stock responsibilities.
 */
const SECTION_LABELS: Record<InventorySection, string> = {
  balances: $localize`:@@inventory.section.balances:Stock`,
  parts: $localize`:@@inventory.section.parts:Parts and consumables`,
  warehouses: $localize`:@@inventory.section.warehouses:Warehouses`,
  consumptions: $localize`:@@inventory.section.consumptions:Consumption declarations`,
  movements: $localize`:@@inventory.section.movements:Movement history`,
};
/**
 * Constant MOVEMENT_LABELS
 *
 * @description
 * Wire movement kinds never become product labels.
 */
const MOVEMENT_LABELS = {
  receipt: $localize`:@@inventory.movement.receipt:Receipt`,
  receipt_return: $localize`:@@inventory.movement.supplierReturn:Supplier return`,
  consumption: $localize`:@@inventory.movement.consumption:Consumption`,
  return: $localize`:@@inventory.movement.return:Return`,
  correction: $localize`:@@inventory.movement.correction:Correction`,
};
/**
 * Constant REASON_LABELS
 *
 * @description
 * Pending stock explanations remain distinct from task completion.
 */
const REASON_LABELS = {
  missing_balance: $localize`:@@inventory.reason.missing:No stock balance is available for this part and warehouse.`,
  archived_reference: $localize`:@@inventory.reason.archived:This part or warehouse is archived. Review the retained declaration before reconciling.`,
  insufficient_stock: $localize`:@@inventory.reason.shortage:The declared quantity exceeds available stock. The full declaration is retained without a partial debit.`,
};

/**
 * Class InventoryPage
 *
 * @description
 * Quantity-only stock directory with protected reference drafts and durable physical movement
 * replay.
 */
@Component({
  selector: 'app-inventory-page',
  templateUrl: './inventory-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [InventoryStore],
  imports: [
    FormField,
    RouterLink,
    RouterLinkActive,
    InventoryDataview,
    InventoryReferenceForm,
    InventoryMovementForm,
    InventoryPartPicker,
    InventoryWarehousePicker,
    UnsavedChangesDialog,
    HlmButton,
    HlmInput,
    ...HlmAlertImports,
    ...HlmFieldImports,
    ...HlmSheetImports,
    ...HlmToggleGroupImports,
  ],
})
export class InventoryPage implements UnsavedChangesAware {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization authority from route binding.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').InputSignal<string>}
   */
  public readonly organizationId = input.required<string>();
  /**
   * Property section
   * @readonly
   *
   * @description
   * Route-owned directory section.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').InputSignal<InventorySection>}
   */
  public readonly section = input<InventorySection>('balances');
  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-owned directory, command and journal states.
   *
   * @access protected
   * @since unreleased
   *
   * @type {InventoryStoreType}
   */
  protected readonly store = inject(InventoryStore);
  /**
   * Property permission
   * @readonly
   *
   * @description
   * Dedicated organization rights remain server-enforced.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permission = inject(OrganizationPermissionService);
  /**
   * Property member
   * @readonly
   *
   * @description
   * Published account membership for journal isolation.
   *
   * @access private
   * @since unreleased
   *
   * @type {import('@features/organization/ports').OrganizationMemberAccessPort}
   */
  private readonly member = inject(ORGANIZATION_MEMBER_ACCESS_PORT);
  /**
   * Property session
   * @readonly
   *
   * @description
   * Local generation invalidates obsolete page effects.
   *
   * @access private
   * @since unreleased
   *
   * @type {import('@features/auth/ports').AuthSessionPort}
   */
  private readonly session = inject(AUTH_SESSION_PORT);
  /**
   * Property connectivity
   * @readonly
   *
   * @description
   * Physical admin writes require online transmission; uncertain intentions stay durable.
   *
   * @access private
   * @since unreleased
   *
   * @type {ConnectivityService}
   */
  private readonly connectivity = inject(ConnectivityService);
  /**
   * Property browser
   * @readonly
   *
   * @description
   * Secondary stock data never loads during SSR.
   *
   * @access private
   * @since unreleased
   *
   * @type {boolean}
   */
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  /**
   * Property userId
   * @readonly
   *
   * @description
   * Only the active membership for the route organization is accepted.
   *
   * @access private
   * @since unreleased
   *
   * @type {import('@angular/core').Signal<string | null>}
   */
  private readonly userId = computed(() => {
    const member = this.member.profile();
    return this.session.isAuthenticated() &&
      member?.isActive &&
      member.organizationId === this.organizationId()
      ? member.userId
      : null;
  });
  /**
   * Property canRead
   * @readonly
   *
   * @description
   * Unknown access is not a read grant.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/core').Signal<boolean>}
   */
  protected readonly canRead = computed(() =>
    this.permission.hasPermission(ORGANIZATION_PERMISSION.INVENTORY_READ),
  );
  /**
   * Property canManage
   * @readonly
   *
   * @description
   * Reference administration authorization.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/core').Signal<boolean>}
   */
  protected readonly canManage = computed(() =>
    this.permission.hasPermission(ORGANIZATION_PERMISSION.INVENTORY_MANAGE),
  );
  /**
   * Property canReconcile
   * @readonly
   *
   * @description
   * Reconciliation requires inventory administration and intervention execution.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/core').Signal<boolean>}
   */
  protected readonly canReconcile = computed(
    () =>
      this.canManage() &&
      this.permission.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE),
  );
  /**
   * Property canReturn
   * @readonly
   *
   * @description
   * Physical returns require consumption and execution grants.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/core').Signal<boolean>}
   */
  protected readonly canReturn = computed(
    () =>
      this.permission.hasPermission(ORGANIZATION_PERMISSION.INVENTORY_CONSUME) &&
      this.permission.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE),
  );
  /**
   * Property canCorrect
   * @readonly
   *
   * @description
   * Stock corrections require dedicated financial management authorization.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/core').Signal<boolean>}
   */
  protected readonly canCorrect = computed(
    () =>
      this.canManage() &&
      this.permission.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE),
  );
  /**
   * Property online
   * @readonly
   *
   * @description
   * Current network availability.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/core').Signal<boolean>}
   */
  protected readonly online = computed(() => this.connectivity.isOnline());
  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * Organization date pattern and timezone for occurrence history.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/core').Signal<
   *   import('../../../../../../../shared/regional-format').RegionalFormatSettings
   * >}
   */
  protected readonly regionalFormatting = inject(REGIONAL_FORMATTING_PORT).regionalFormatting;
  /**
   * Property tabs
   * @readonly
   *
   * @description
   * Internal route navigation keeps quantities, declarations and history distinct.
   *
   * @access protected
   * @since unreleased
   *
   * @type {{ value: string; label: string }[]}
   */
  protected readonly tabs = Object.entries(SECTION_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
  /**
   * Property filters
   * @readonly
   *
   * @description
   * Uncommitted filter draft; all matching is performed by the server.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/core').WritableSignal<{
   *   search: string;
   *   partId: string;
   *   warehouseId: string;
   *   archived: string;
   *   status: string;
   * }>}
   */
  protected readonly filters = signal({
    search: '',
    partId: '',
    warehouseId: '',
    archived: 'active',
    status: 'all',
  });
  /**
   * Property filterForm
   * @readonly
   *
   * @description
   * Native Signal Forms connect the reference pickers to server filters.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/forms/signals').FieldTree<
   *   { search: string; partId: string; warehouseId: string; archived: string; status: string },
   *   string | number,
   *   'writable'
   * >}
   */
  protected readonly filterForm = form(this.filters);
  /**
   * Property editor
   * @readonly
   *
   * @description
   * One hosted native sheet for reference or physical-movement preparation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/core').WritableSignal<
   *   'part' | 'warehouse' | 'return' | 'correction' | null
   * >}
   */
  protected readonly editor = signal<'part' | 'warehouse' | 'return' | 'correction' | null>(null);
  /**
   * Property editing
   * @readonly
   *
   * @description
   * Canonical reference being edited.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/core').WritableSignal<
   *   InventoryPartOutput | InventoryWarehouseOutput | null
   * >}
   */
  protected readonly editing = signal<InventoryPartOutput | InventoryWarehouseOutput | null>(null);
  /**
   * Property returning
   * @readonly
   *
   * @description
   * Original confirmed consumption for a compensating physical return.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/core').WritableSignal<InventoryConsumptionOutput | null>}
   */
  protected readonly returning = signal<InventoryConsumptionOutput | null>(null);
  /**
   * Property retained
   * @readonly
   *
   * @description
   * A submitted physical body is immutable until server confirmation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/core').WritableSignal<InventoryPhysicalCommand | null>}
   */
  protected readonly retained = signal<InventoryPhysicalCommand | null>(null);
  /**
   * Property retainedIsDurable
   * @readonly
   *
   * @description
   * A prepared identity is saved only after the journal commits it.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly retainedIsDurable = computed(() => {
    const id = this.retained()?.input.clientOperationId;
    return (
      !!id &&
      this.store.pendingCommandEntities().some((command) => command.input.clientOperationId === id)
    );
  });
  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Reference draft dismissal protection.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/core').WritableSignal<boolean>}
   */
  protected readonly dirty = signal(false);
  /**
   * Property confirmation
   * @readonly
   *
   * @description
   * Hosted native unsaved-input decision.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/core').WritableSignal<BrnDialogState>}
   */
  protected readonly confirmation = signal<BrnDialogState>('closed');
  /**
   * Property resolver
   *
   * @description
   * One route-deactivation decision at a time.
   *
   * @access private
   * @since unreleased
   *
   * @type {((allowed: boolean) => void) | null}
   */
  private resolver: ((allowed: boolean) => void) | null = null;
  /**
   * Property side
   * @readonly
   *
   * @description
   * Shared device-responsive sheet position.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/core').Signal<'right' | 'bottom'>}
   */
  protected readonly side = sheetSide();
  /**
   * Property editorTitle
   * @readonly
   *
   * @description
   * Accessible native sheet title.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/core').Signal<string>}
   */
  protected readonly editorTitle: Signal<string> = computed(() => {
    switch (this.editor()) {
      case 'part':
        return $localize`:@@inventory.editor.part:Part or consumable`;
      case 'warehouse':
        return $localize`:@@inventory.editor.warehouse:Warehouse`;
      case 'return':
        return $localize`:@@inventory.return:Record return`;
      default:
        return $localize`:@@inventory.editor.correction:Record stock correction`;
    }
  });
  /**
   * Property rows
   * @readonly
   *
   * @description
   * Quantity-only localized projections keep operational state separate from work validation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {import('@angular/core').Signal<readonly InventoryRow[]>}
   */
  protected readonly rows: Signal<readonly InventoryRow[]> = computed<readonly InventoryRow[]>(() =>
    this.store.recordEntities().map((record) => this.inventoryRow(record)),
  );
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Coordinates browser-only queries, scope clearing and confirmed-write refreshes.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const organizationId = this.organizationId(),
        section = this.section(),
        userId = this.userId();
      this.session.sessionRevision();
      untracked(() => {
        this.closeEditor();
        this.filterForm().reset({
          search: '',
          partId: '',
          warehouseId: '',
          archived: 'active',
          status: 'all',
        });
        this.store.load(null);
        this.store.loadJournal(null);
        if (this.browser && this.canRead() && userId) {
          this.store.loadJournal({ organizationId, userId });
          if (this.online()) this.store.load({ organizationId, userId, section });
        }
      });
    });
    effect(() => {
      const allowed = this.canRead(),
        online = this.online(),
        userId = this.userId();
      untracked(() => {
        if (!allowed || !userId) {
          this.store.load(null);
          this.store.loadJournal(null);
          this.closeEditor();
        } else if (this.browser && online && !this.store.query()) {
          this.store.loadJournal({ organizationId: this.organizationId(), userId });
          this.reload();
        }
      });
    });
    inject(Events)
      .on(inventoryEvents.saved)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        if (payload.organizationId !== this.organizationId() || payload.userId !== this.userId())
          return;
        this.closeEditor();
        this.reload();
      });
    inject(DestroyRef).onDestroy(() => this.resolver?.(false));
  }
  /**
   * Method inventoryRow
   *
   * @description
   * Projects stock facts separately from reference identity and operational permissions.
   *
   * @access private
   * @since unreleased
   *
   * @param {InventoryRecord} record - Canonical quantity-only record.
   *
   * @returns {InventoryRow} Localized row retaining the original fact.
   */
  private inventoryRow(record: InventoryRecord): InventoryRow {
    if ('label' in record) return this.partRow(record);
    if ('name' in record) return this.warehouseRow(record);
    const common = {
      record,
      title: this.store.partLabels()[record.partId] ?? record.partId,
      detail: this.store.warehouseLabels()[record.warehouseId] ?? record.warehouseId,
      quantity: record.quantity,
      unit: this.store.partUnits()[record.partId],
    };
    if ('status' in record)
      return {
        ...common,
        status:
          record.status === 'confirmed'
            ? $localize`:@@inventory.status.confirmed:Confirmed`
            : $localize`:@@inventory.status.pending:Received — to reconcile`,
        pending: record.status === 'received_pending',
        date: record.occurredAt,
        reason: record.reason ? REASON_LABELS[record.reason] : undefined,
        late: record.late,
        interventionId: record.interventionId,
        canReconcile: record.status === 'received_pending' && this.canReconcile(),
        canReturn: record.status === 'confirmed' && this.canReturn(),
      };
    if ('kind' in record)
      return {
        ...common,
        status: MOVEMENT_LABELS[record.kind],
        date: record.occurredAt,
        reason: record.reason,
        late: record.late,
        interventionId: record.interventionId ?? undefined,
      };
    return common;
  }

  /**
   * Method partRow
   *
   * @description
   * Presents the retained part identity with its current administration permissions.
   *
   * @access private
   * @since unreleased
   *
   * @param {InventoryPartOutput} record - Individual quantitative reference.
   *
   * @returns {InventoryRow} Localized part or consumable description.
   */
  private partRow(record: InventoryPartOutput): InventoryRow {
    return {
      record,
      title: record.label,
      detail:
        record.code +
        ' · ' +
        (record.kind === 'part'
          ? $localize`:@@inventory.kind.part:Part`
          : $localize`:@@inventory.kind.consumable:Consumable`),
      unit: record.unit,
      status: record.archived
        ? $localize`:@@inventory.archived:Archived`
        : $localize`:@@inventory.active:Active`,
      canEdit: this.canManage(),
      archived: record.archived,
      canArchive: this.canManage(),
    };
  }

  /**
   * Method warehouseRow
   *
   * @description
   * Presents a retained warehouse without mixing it with stock movements.
   *
   * @access private
   * @since unreleased
   *
   * @param {InventoryWarehouseOutput} record - Warehouse identity.
   *
   * @returns {InventoryRow} Localized warehouse description.
   */
  private warehouseRow(record: InventoryWarehouseOutput): InventoryRow {
    return {
      record,
      title: record.name,
      detail: record.code,
      status: record.archived
        ? $localize`:@@inventory.archived:Archived`
        : $localize`:@@inventory.active:Active`,
      canEdit: this.canManage(),
      archived: record.archived,
      canArchive: this.canManage(),
    };
  }

  /**
   * Method reload
   *
   * @description
   * Retries the committed query without overwriting an editor draft.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void}
   */
  protected reload(): void {
    const userId = this.userId();
    if (!this.browser || !this.canRead() || !userId || !this.online()) return;
    this.store.load(
      this.store.query() ?? {
        organizationId: this.organizationId(),
        userId,
        section: this.section(),
      },
    );
  }
  /**
   * Method applyFilters
   *
   * @description
   * Commits reference search and stock filters to server page one.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event | undefined} event - Optional native submit event.
   *
   * @returns {void}
   */
  protected applyFilters(event?: Event): void {
    event?.preventDefault();
    const userId = this.userId();
    if (!this.browser || !this.canRead() || !userId || !this.online()) return;
    const filters = this.filters();
    const query: InventoryQuery = {
      organizationId: this.organizationId(),
      userId,
      section: this.section(),
      page: 1,
      search: filters.search.trim() || undefined,
      archived: filters.archived === 'archived',
      partId: filters.partId || undefined,
      warehouseId: filters.warehouseId || undefined,
      status:
        filters.status === 'confirmed' || filters.status === 'received_pending'
          ? filters.status
          : undefined,
    };
    this.store.load(query);
  }
  /**
   * Method filterChoice
   *
   * @description
   * Native option sets update filters and issue one explicit query.
   *
   * @access protected
   * @since unreleased
   *
   * @param {'archived' | 'status'} field - Controlled filter field.
   * @param {unknown} value - Native toggle choice.
   *
   * @returns {void}
   */
  protected filterChoice(field: 'archived' | 'status', value: unknown): void {
    if (typeof value !== 'string') return;
    if (field === 'archived' && value !== 'active' && value !== 'archived') return;
    if (
      field === 'status' &&
      value !== 'all' &&
      value !== 'confirmed' &&
      value !== 'received_pending'
    )
      return;
    this.filters.update((draft) => ({ ...draft, [field]: value }));
    this.applyFilters();
  }
  /**
   * Method changePage
   *
   * @description
   * Uses the same committed filters for the next server page.
   *
   * @access protected
   * @since unreleased
   *
   * @param {number} page - Requested page.
   *
   * @returns {void}
   */
  protected changePage(page: number): void {
    const query = this.store.query();
    if (query && this.online()) this.store.load({ ...query, page });
  }
  /**
   * Method open
   *
   * @description
   * Starts an authorized editor without changing existing reference identity.
   *
   * @access protected
   * @since unreleased
   *
   * @param {'part' | 'warehouse' | 'correction'} kind - Editor intent.
   * @param {InventoryPartOutput | InventoryWarehouseOutput | null} entry - Existing reference.
   *
   * @returns {void}
   */
  protected open(
    kind: 'part' | 'warehouse' | 'correction',
    entry: InventoryPartOutput | InventoryWarehouseOutput | null = null,
  ): void {
    if (
      !this.userId() ||
      !this.online() ||
      this.store.writeCallState().status === 'pending' ||
      (kind === 'correction' ? !this.canCorrect() : !this.canManage())
    )
      return;
    this.store.clearWrite();
    this.editing.set(entry);
    this.retained.set(null);
    this.returning.set(null);
    this.dirty.set(false);
    this.editor.set(kind);
  }
  /**
   * Method rowAction
   *
   * @description
   * Checks the distinct permission for every action before accepting its command.
   *
   * @access protected
   * @since unreleased
   *
   * @param {InventoryRowAction} action - Stateless row intention.
   *
   * @returns {void}
   */
  protected rowAction(action: InventoryRowAction): void {
    const userId = this.userId();
    if (!userId || !this.online() || this.store.writeCallState().status === 'pending') return;
    const record = action.record,
      scope = { organizationId: this.organizationId(), userId };
    if (action.kind === 'edit' && 'archived' in record && this.canManage())
      this.open('label' in record ? 'part' : 'warehouse', record);
    else if (action.kind === 'archive' && 'archived' in record && this.canManage()) {
      this.store.save({
        ...scope,
        kind: 'label' in record ? 'updatePart' : 'updateWarehouse',
        id: record.id,
        input: { archived: !record.archived },
      });
    } else if (
      action.kind === 'reconcile' &&
      'status' in record &&
      record.status === 'received_pending' &&
      this.canReconcile()
    )
      this.store.save({ ...scope, kind: 'reconcile', id: record.id });
    else if (
      action.kind === 'return' &&
      'status' in record &&
      record.status === 'confirmed' &&
      this.canReturn()
    ) {
      this.store.clearWrite();
      this.returning.set(record);
      this.retained.set(null);
      this.dirty.set(false);
      this.editor.set('return');
    }
  }
  /**
   * Method referenceSubmitted
   *
   * @description
   * Only mutable fields are transported for existing references.
   *
   * @access protected
   * @since unreleased
   *
   * @param {InventoryReferenceSubmission} submission - Validated draft.
   *
   * @returns {void}
   */
  protected referenceSubmitted(submission: InventoryReferenceSubmission): void {
    const userId = this.userId();
    if (!userId || !this.online() || !this.canManage()) return;
    const scope = { organizationId: this.organizationId(), userId },
      entry = this.editing();
    if ('label' in submission)
      this.store.save(
        entry
          ? {
              ...scope,
              kind: 'updatePart',
              id: entry.id,
              input: { label: submission.label, unit: submission.unit },
            }
          : { ...scope, kind: 'createPart', input: submission },
      );
    else
      this.store.save(
        entry
          ? { ...scope, kind: 'updateWarehouse', id: entry.id, input: { name: submission.name } }
          : { ...scope, kind: 'createWarehouse', input: submission },
      );
  }
  /**
   * Method movementSubmitted
   *
   * @description
   * Creates one immutable operation identity before durable acceptance and transmission.
   *
   * @access protected
   * @since unreleased
   *
   * @param {InventoryMovementDraft} draft - Validated physical fields.
   *
   * @returns {void}
   */
  protected movementSubmitted(draft: InventoryMovementDraft): void {
    const userId = this.userId();
    if (!userId || !this.online() || this.retained()) return;
    const scope = { organizationId: this.organizationId(), userId },
      clientOperationId = crypto.randomUUID(),
      returning = this.returning();
    let command: InventoryPhysicalCommand;
    if (this.editor() === 'return' && this.canReturn() && returning)
      command = {
        ...scope,
        kind: 'return',
        input: {
          clientOperationId,
          consumptionId: returning.id,
          quantity: draft.quantity,
          reason: draft.reason,
        },
      };
    else if (this.editor() === 'correction' && this.canCorrect())
      command = {
        ...scope,
        kind: 'correction',
        input: {
          clientOperationId,
          partId: draft.partId,
          warehouseId: draft.warehouseId,
          quantity: draft.quantity,
          reason: draft.reason,
        },
      };
    else return;
    this.retained.set(command);
    this.dirty.set(false);
    this.store.save(command);
  }
  /**
   * Method retryPhysical
   *
   * @description
   * Replays the retained body with the original UUID; never prepares a second movement.
   *
   * @access protected
   * @since unreleased
   *
   * @param {InventoryPhysicalCommand} command - Immutable local intention.
   *
   * @returns {void}
   */
  protected retryPhysical(command: InventoryPhysicalCommand): void {
    if (
      !this.online() ||
      command.userId !== this.userId() ||
      command.organizationId !== this.organizationId() ||
      (command.kind === 'return' ? !this.canReturn() : !this.canCorrect())
    )
      return;
    this.store.save(command);
  }
  /**
   * Method retryJournal
   *
   * @description
   * Reloads only local journal errors without sending any pending operation.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void}
   */
  protected retryJournal(): void {
    const userId = this.userId();
    if (this.browser && userId)
      this.store.loadJournal({ organizationId: this.organizationId(), userId });
  }
  /**
   * Method closeEditor
   *
   * @description
   * Clears transient editor state; durable pending intentions remain in the journal.
   *
   * @access private
   * @since unreleased
   *
   * @returns {void}
   */
  private closeEditor(): void {
    this.editor.set(null);
    this.editing.set(null);
    this.returning.set(null);
    this.retained.set(null);
    this.dirty.set(false);
  }
  /**
   * Method requestClose
   *
   * @description
   * Accepted physical commands remain durable when the editor is dismissed.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void}
   */
  protected requestClose(): void {
    if (this.store.writeCallState().status === 'pending') return;
    if (this.dirty() || (this.retained() && !this.retainedIsDurable()))
      this.confirmation.set('open');
    else this.closeEditor();
  }
  /**
   * Method stateChanged
   *
   * @description
   * Native sheet dismissal obeys the same in-flight and draft guards.
   *
   * @access protected
   * @since unreleased
   *
   * @param {BrnDialogState} state - Requested native state.
   *
   * @returns {void}
   */
  protected stateChanged(state: BrnDialogState): void {
    if (state === 'closed' && this.editor()) this.requestClose();
  }
  /**
   * Method hasUnsavedChanges
   *
   * @description
   * Navigation protects transient drafts and in-flight commands.
   *
   * @access public
   * @since unreleased
   *
   * @returns {boolean} Whether controlled deactivation is required.
   */
  public hasUnsavedChanges(): boolean {
    return (
      this.dirty() ||
      (this.retained() !== null && !this.retainedIsDurable()) ||
      this.store.writeCallState().status === 'pending'
    );
  }
  /**
   * Method confirmDeactivation
   *
   * @description
   * Blocks in-flight commands and hosts the native discard decision for reference drafts.
   *
   * @access public
   * @since unreleased
   *
   * @returns {Promise<boolean>} Operator decision.
   */
  public confirmDeactivation(): Promise<boolean> {
    if (this.store.writeCallState().status === 'pending') return Promise.resolve(false);
    this.confirmation.set('open');
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }
  /**
   * Method resolveConfirmation
   *
   * @description
   * Resolves editor and navigation confirmation exactly once.
   *
   * @access protected
   * @since unreleased
   *
   * @param {boolean} allowed - Whether to discard transient input.
   *
   * @returns {void}
   */
  protected resolveConfirmation(allowed: boolean): void {
    this.confirmation.set('closed');
    if (allowed) this.closeEditor();
    this.resolver?.(allowed);
    this.resolver = null;
  }
}
