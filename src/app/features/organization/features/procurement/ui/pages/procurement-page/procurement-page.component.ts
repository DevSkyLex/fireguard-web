import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  EquipmentTypeCatalogStore,
  type EquipmentTypeCatalogStoreType,
} from '@features/organization/features/equipments';
import type {
  ChangeSupplierInput,
  ChangePurchaseOrderInput,
  SupplierOutput,
  PurchaseOrderOutput,
  PurchaseOrderLineOutput,
  ProcurementReceiptOutput,
  ProcurementReturnOutput,
  ReceivePurchaseOrderInput,
  ReturnProcurementReceiptInput,
} from '@features/organization/features/procurement/models';
import { procurementStatusLabel } from '@features/organization/features/procurement/models/procurement-tag/procurement-tag.util';
import {
  ProcurementStore,
  procurementStoreEvents,
  type ProcurementStoreType,
} from '@features/organization/features/procurement/state';
import type { ProcurementCommand } from '@features/organization/features/procurement/state/procurement/models/procurement-command.type';
import {
  exactDecimalDifference,
  exactDecimalUnits,
} from '@features/organization/features/procurement/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  REGIONAL_FORMATTING_PORT,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import { CollectionPagination } from '@shared/collection-pagination';
import { CollectionSearchBox } from '@shared/collection-toolbar';
import { OrgDatePipe, type RegionalFormatSettings } from '@shared/regional-format';
import { StateIllustration } from '@shared/state-illustration';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSheetImports } from '@shared/ui/sheet';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmSpinner } from '@shared/ui/spinner';
import { HlmTabsImports } from '@shared/ui/tabs';
import { UnsavedChangesDialog, type UnsavedChangesAware } from '@shared/unsaved-changes';
import { ProcurementReceiptForm } from '../../forms/procurement-receipt-form';
import { ProcurementReturnForm } from '../../forms/procurement-return-form';
import { PurchaseOrderForm } from '../../forms/purchase-order-form';
import { SupplierForm } from '../../forms/supplier-form';

/**
 * Class ProcurementPage
 * @class ProcurementPage
 *
 * @description
 * Organization purchase workspace. Physical deliveries, individualization and returns stay
 * distinct, permission-gated and linked to their original server records.
 *
 * @since unreleased
 */
@Component({
  selector: 'app-procurement-page',
  templateUrl: './procurement-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [EquipmentTypeCatalogStore],
  imports: [
    RouterLink,
    OrgDatePipe,
    StateIllustration,
    CollectionSearchBox,
    CollectionPagination,
    SupplierForm,
    PurchaseOrderForm,
    ProcurementReceiptForm,
    ProcurementReturnForm,
    UnsavedChangesDialog,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    HlmSpinner,
    ...HlmAlertImports,
    ...HlmAlertDialogImports,
    ...HlmEmptyImports,
    ...HlmItemImports,
    ...HlmSelectImports,
    ...HlmSheetImports,
    ...HlmTabsImports,
  ],
  host: {
    class: 'flex min-h-0 min-w-0 flex-1 flex-col',
    '(window:beforeunload)': 'beforeUnload($event)',
  },
})
export class ProcurementPage implements UnsavedChangesAware {
  //#region Properties
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Tenant resolved by the organization route and API access projection.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  /**
   * Property section
   * @readonly
   *
   * @description
   * Explicit navigable workspace section.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly section: InputSignal<string | undefined> = input<string | undefined>();
  /**
   * Property orderId
   * @readonly
   *
   * @description
   * Selected source order, retained when opening physical receipts.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly orderId: InputSignal<string | undefined> = input<string | undefined>();
  /**
   * Property store
   * @readonly
   *
   * @description
   * Route-scoped query and accepted command state.
   *
   * @access protected
   * @since unreleased
   *
   * @type {ProcurementStoreType}
   */
  protected readonly store: ProcurementStoreType = inject(ProcurementStore);
  /**
   * Property catalog
   * @readonly
   *
   * @description
   * Authorized dynamic equipment catalogue, including historical labels.
   *
   * @access protected
   * @since unreleased
   *
   * @type {EquipmentTypeCatalogStoreType}
   */
  protected readonly catalog: EquipmentTypeCatalogStoreType = inject(EquipmentTypeCatalogStore);
  /**
   * Property permissions
   * @readonly
   *
   * @description
   * API permissions remain the sole source of capabilities.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );
  /**
   * Property router
   * @readonly
   *
   * @description
   * URL state and guard-protected navigation.
   *
   * @access private
   * @since unreleased
   *
   * @type {Router}
   */
  private readonly router: Router = inject(Router);
  /**
   * Property events
   * @readonly
   *
   * @description
   * Confirmed mutation consequences.
   *
   * @access private
   * @since unreleased
   *
   * @type {Events}
   */
  private readonly events: Events = inject(Events);
  /**
   * Property destroyRef
   * @readonly
   *
   * @description
   * Subscription and browser event lifecycle.
   *
   * @access private
   * @since unreleased
   *
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  /**
   * Property formattingPort
   * @readonly
   *
   * @description
   * Organization date format for physical instants.
   *
   * @access private
   * @since unreleased
   *
   * @type {RegionalFormattingPort}
   */
  private readonly formattingPort: RegionalFormattingPort = inject(REGIONAL_FORMATTING_PORT);
  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * Typed organization presentation settings.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    this.formattingPort.regionalFormatting;
  /**
   * Property browserReady
   * @readonly
   *
   * @description
   * Secondary authenticated reads begin only in the browser.
   *
   * @access private
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly browserReady: WritableSignal<boolean> = signal(false);
  /**
   * Property browser
   * @readonly
   *
   * @description
   * Explicit platform authority keeps authenticated reads excluded from server rendering.
   *
   * @access private
   * @since unreleased
   *
   * @type {boolean}
   */
  private readonly browser: boolean = isPlatformBrowser(inject(PLATFORM_ID));
  /**
   * Property view
   * @readonly
   *
   * @description
   * Native tabs preserve source order and do not recreate the command store.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<'suppliers' | 'orders' | 'receipts'>}
   */
  protected readonly view: Signal<'suppliers' | 'orders' | 'receipts'> = computed(() => {
    const section = this.section();
    if (section === 'suppliers' || section === 'receipts') return section;
    return 'orders';
  });
  /**
   * Property editor
   * @readonly
   *
   * @description
   * Current editor's native form.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<'supplier' | 'order' | 'receipt' | 'return' | null>}
   */
  protected readonly editor: WritableSignal<'supplier' | 'order' | 'receipt' | 'return' | null> =
    signal(null);
  /**
   * Property editingSupplier
   * @readonly
   *
   * @description
   * Existing supplier snapshot used by optimistic changes.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<SupplierOutput | null>}
   */
  protected readonly editingSupplier: WritableSignal<SupplierOutput | null> = signal(null);
  /**
   * Property editingOrder
   * @readonly
   *
   * @description
   * Existing purchase draft snapshot used by optimistic changes.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<PurchaseOrderOutput | null>}
   */
  protected readonly editingOrder: WritableSignal<PurchaseOrderOutput | null> = signal(null);
  /**
   * Property receivingLine
   * @readonly
   *
   * @description
   * Source line for one physical delivery.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<PurchaseOrderLineOutput | null>}
   */
  protected readonly receivingLine: WritableSignal<PurchaseOrderLineOutput | null> = signal(null);
  /**
   * Property returningReceipt
   * @readonly
   *
   * @description
   * Source receipt for one physical return.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ProcurementReceiptOutput | null>}
   */
  protected readonly returningReceipt: WritableSignal<ProcurementReceiptOutput | null> =
    signal(null);
  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Typed form dirtiness is relayed by the currently active editor.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly dirty: WritableSignal<boolean> = signal(false);
  /**
   * Property confirmation
   * @readonly
   *
   * @description
   * Consequential operation awaits an explicit native confirmation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ProcurementCommand | null>}
   */
  protected readonly confirmation: WritableSignal<ProcurementCommand | null> = signal(null);
  /**
   * Property reviewRequested
   * @readonly
   *
   * @description
   * A revision is not adoptable until the reader explicitly requested its server refresh.
   *
   * @access private
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly reviewRequested: WritableSignal<boolean> = signal(false);
  /**
   * Property supplierContextId
   * @readonly
   *
   * @description
   * Primitive source identity prevents repeated supplier fetches for unchanged order revisions.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<string | null>}
   */
  private readonly supplierContextId: Signal<string | null> = computed(() =>
    this.editor() === 'order'
      ? (this.editingOrder()?.supplierId ?? null)
      : (this.store.selectedOrder()?.supplierId ?? null),
  );
  /**
   * Property discardState
   * @readonly
   *
   * @description
   * Controlled editor or route dismissal.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<'open' | 'closed'>}
   */
  protected readonly discardState: WritableSignal<'open' | 'closed'> = signal('closed');
  /**
   * Property deactivationResolver
   *
   * @description
   * Waiting route guard decision.
   *
   * @access private
   * @since unreleased
   *
   * @type {((allowed: boolean) => void) | null}
   */
  private deactivationResolver: ((allowed: boolean) => void) | null = null;
  /**
   * Property catalogueOrganizationId
   *
   * @description
   * Prevents a successful scope's secondary catalogue from refetching on every list refresh.
   *
   * @access private
   * @since unreleased
   *
   * @type {string | null}
   */
  private catalogueOrganizationId: string | null = null;
  /**
   * Property displayOrganizationId
   *
   * @description
   * Identity whose editor drafts have been reset on an organization switch.
   *
   * @access private
   * @since unreleased
   *
   * @type {string | null}
   */
  private displayOrganizationId: string | null = null;
  /**
   * Property supplierSearch
   * @readonly
   *
   * @description
   * Supplier server-search draft.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly supplierSearch: WritableSignal<string> = signal('');
  /**
   * Property supplierPage
   * @readonly
   *
   * @description
   * Supplier directory server page.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly supplierPage: WritableSignal<number> = signal(1);
  /**
   * Property supplierFilter
   * @readonly
   *
   * @description
   * Supplier archive filter; archival history remains readable.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly supplierFilter: WritableSignal<string> = signal('active');
  /**
   * Property orderPage
   * @readonly
   *
   * @description
   * Purchase server page.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly orderPage: WritableSignal<number> = signal(1);
  /**
   * Property orderStatus
   * @readonly
   *
   * @description
   * Purchase lifecycle server filter.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly orderStatus: WritableSignal<string> = signal('all');
  /**
   * Property receiptPage
   * @readonly
   *
   * @description
   * Receipt server page.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly receiptPage: WritableSignal<number> = signal(1);
  /**
   * Property returnPage
   * @readonly
   *
   * @description
   * Physical return history server page.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly returnPage: WritableSignal<number> = signal(1);
  /**
   * Property returnsReceiptId
   * @readonly
   *
   * @description
   * Receipt whose motivated return history is expanded.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly returnsReceiptId: WritableSignal<string | null> = signal(null);
  /**
   * Property pickerSearch
   * @readonly
   *
   * @description
   * Order form supplier server-search draft.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly pickerSearch: WritableSignal<string> = signal('');
  /**
   * Property pickerPage
   * @readonly
   *
   * @description
   * Order form supplier server page.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly pickerPage: WritableSignal<number> = signal(1);
  /**
   * Property canManage
   * @readonly
   *
   * @description
   * Explicit procurement management permission.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canManage: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.PROCUREMENT_MANAGE),
  );
  /**
   * Property canManageStock
   * @readonly
   *
   * @description
   * Stock receipt and reversal additionally require Inventory's actual manage permission.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canManageStock: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INVENTORY_MANAGE),
  );
  /**
   * Property canCreateEquipment
   * @readonly
   *
   * @description
   * Reserve equipment creation additionally requires Equipment's actual write permission.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canCreateEquipment: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_WRITE),
  );
  /**
   * Property canReadCosts
   * @readonly
   *
   * @description
   * Cost visibility is independent from procurement read and write rights.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadCosts: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ),
  );
  /**
   * Property canEditCosts
   * @readonly
   *
   * @description
   * Editing known costs requires both independent financial capabilities.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canEditCosts: Signal<boolean> = computed(
    () =>
      this.canReadCosts() &&
      this.permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE),
  );
  /**
   * Property locked
   * @readonly
   *
   * @description
   * One uncertain physical declaration must be recovered before a conflicting new command.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly locked: Signal<boolean> = computed(
    () => this.store.commandPending() || this.store.uncertainCommand(),
  );
  /**
   * Property commandError
   * @readonly
   *
   * @description
   * Recoverable normalized error, never a raw HTTP exception.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string | null>}
   */
  protected readonly commandError: Signal<string | null> = computed(
    () => this.store.commandCallState().error?.message ?? null,
  );
  /**
   * Property revisionConflict
   * @readonly
   *
   * @description
   * Revision rejection exposes explicit refresh without silently replacing any typed draft.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly revisionConflict: Signal<boolean> = computed(() =>
    [409, 412].includes(Number(this.store.commandCallState().error?.code)),
  );
  /**
   * Property supplierPageCount
   * @readonly
   *
   * @description
   * Server page counts are presentation only, never client aggregation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<number>}
   */
  protected readonly supplierPageCount: Signal<number> = computed(() =>
    Math.max(1, Math.ceil(this.store.totalSuppliers() / 30)),
  );
  /**
   * Property orderPageCount
   * @readonly
   *
   * @description
   * Server purchase page count.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<number>}
   */
  protected readonly orderPageCount: Signal<number> = computed(() =>
    Math.max(1, Math.ceil(this.store.totalOrders() / 30)),
  );
  /**
   * Property receiptPageCount
   * @readonly
   *
   * @description
   * Server receipt page count.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<number>}
   */
  protected readonly receiptPageCount: Signal<number> = computed(() =>
    Math.max(1, Math.ceil(this.store.totalReceipts() / 30)),
  );
  /**
   * Property returnPageCount
   * @readonly
   *
   * @description
   * Server retained return page count.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<number>}
   */
  protected readonly returnPageCount: Signal<number> = computed(() =>
    Math.max(1, Math.ceil(this.store.totalReturns() / 30)),
  );
  /**
   * Property statusLabel
   * @readonly
   *
   * @description
   * Friendly status registry, preserving new server values as readable fallback labels.
   *
   * @access protected
   * @since unreleased
   *
   * @type {typeof procurementStatusLabel}
   */
  protected readonly statusLabel: typeof procurementStatusLabel = procurementStatusLabel;
  /**
   * Property supplierFilters
   * @readonly
   *
   * @description
   * Native supplier archival choices.
   *
   * @access protected
   * @since unreleased
   *
   * @type {readonly { value: string; label: string }[]}
   */
  protected readonly supplierFilters: readonly { value: string; label: string }[] = [
    { value: 'active', label: $localize`:@@procurement.suppliers.active:Active suppliers` },
    { value: 'archived', label: $localize`:@@procurement.suppliers.archived:Archived suppliers` },
    { value: 'all', label: $localize`:@@procurement.suppliers.all:All suppliers` },
  ];
  /**
   * Property orderStatuses
   * @readonly
   *
   * @description
   * Native purchase lifecycle choices delegate filtering to the API.
   *
   * @access protected
   * @since unreleased
   *
   * @type {readonly { value: string; label: string }[]}
   */
  protected readonly orderStatuses: readonly { value: string; label: string }[] = [
    { value: 'all', label: $localize`:@@procurement.orders.all:All orders` },
    ...['draft', 'ordered', 'partial_received', 'received', 'cancelled'].map((value) => ({
      value,
      label: procurementStatusLabel('order', value),
    })),
  ];
  /**
   * Property supplierFilterLabelOf
   * @readonly
   *
   * @description
   * Native select label resolver.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: string) => string}
   */
  protected readonly supplierFilterLabelOf: (value: string) => string = (value) =>
    this.supplierFilters.find((option) => option.value === value)?.label ?? value;
  /**
   * Property orderStatusLabelOf
   * @readonly
   *
   * @description
   * Native select purchase label resolver.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: string) => string}
   */
  protected readonly orderStatusLabelOf: (value: string) => string = (value) =>
    this.orderStatuses.find((option) => option.value === value)?.label ?? value;
  /**
   * Property editorTitle
   * @readonly
   *
   * @description
   * Descriptive editor title, retaining named native sheet semantics.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly editorTitle: Signal<string> = computed(() => {
    switch (this.editor()) {
      case 'supplier':
        return $localize`:@@procurement.editor.supplier:Supplier information`;
      case 'order':
        return $localize`:@@procurement.editor.order:Purchase draft`;
      case 'receipt':
        return $localize`:@@procurement.editor.receipt:Record a physical delivery`;
      case 'return':
        return $localize`:@@procurement.editor.return:Record a physical return`;
      default:
        return $localize`:@@procurement.editor.title:Procurement`;
    }
  });
  /**
   * Property confirmationTitle
   * @readonly
   *
   * @description
   * Clear operation-specific commitment title.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly confirmationTitle: Signal<string> = computed(() => {
    switch (this.confirmation()?.kind) {
      case 'archive_supplier':
        return $localize`:@@procurement.confirm.archiveTitle:Archive this supplier?`;
      case 'place_order':
        return $localize`:@@procurement.confirm.placeTitle:Place this purchase order?`;
      case 'cancel_remaining':
        return $localize`:@@procurement.confirm.cancelTitle:Cancel undelivered quantities?`;
      case 'individualize':
        return $localize`:@@procurement.confirm.unitsTitle:Create reserve equipment for this receipt?`;
      case 'reconcile':
        return $localize`:@@procurement.confirm.reconcileTitle:Reconcile this physical return?`;
      default:
        return $localize`:@@procurement.confirm.title:Confirm operation`;
    }
  });
  /**
   * Property confirmationDescription
   * @readonly
   *
   * @description
   * Explicit effect of the confirmed action.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly confirmationDescription: Signal<string> = computed(() => {
    switch (this.confirmation()?.kind) {
      case 'archive_supplier':
        return $localize`:@@procurement.confirm.archiveHint:The supplier remains in existing purchases and history. New orders require an active supplier.`;
      case 'place_order':
        return $localize`:@@procurement.confirm.placeHint:The draft becomes an order. Physical deliveries will be recorded separately.`;
      case 'cancel_remaining':
        return $localize`:@@procurement.confirm.cancelHint:Only quantities still awaiting delivery are cancelled. Previous receipts and returns remain retained.`;
      case 'individualize':
        return $localize`:@@procurement.confirm.unitsHint:The server creates a bounded set of individually identified reserve equipment. A quota or unavailable type keeps the physical receipt awaiting action.`;
      case 'reconcile':
        return $localize`:@@procurement.confirm.reconcileHint:The server tries to confirm the inventory reversal. The original physical quantity and reason stay unchanged if stock is still insufficient.`;
      default:
        return '';
    }
  });

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Starts browser-only scoped reads and responds only to confirmed same-organization writes.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    afterNextRender(() => {
      if (this.browser) this.browserReady.set(true);
    });
    effect(() => {
      if (!this.browserReady()) return;
      const org = this.organizationId();
      untracked(() => {
        this.store.setScope(org);
        if (this.displayOrganizationId !== org) {
          this.displayOrganizationId = org;
          this.editor.set(null);
          this.confirmation.set(null);
          this.dirty.set(false);
          this.returnsReceiptId.set(null);
          this.catalog.clear();
          this.catalogueOrganizationId = null;
        }
      });
    });
    effect(() => {
      if (!this.browserReady()) return;
      const org = this.organizationId();
      const view = this.view();
      const page = this.supplierPage();
      const search = this.supplierSearch();
      const archived = this.supplierFilter();
      if (view !== 'suppliers') return;
      untracked(() =>
        this.store.loadSuppliers({
          organizationId: org,
          options: {
            page,
            itemsPerPage: 30,
            search,
            params: { archived: archived === 'all' ? 'all' : archived === 'archived' },
          },
        }),
      );
    });
    effect(() => {
      if (!this.browserReady()) return;
      const org = this.organizationId();
      const view = this.view();
      const page = this.orderPage();
      const status = this.orderStatus();
      if (view === 'suppliers') return;
      untracked(() =>
        this.store.loadOrders({
          organizationId: org,
          options: { page, itemsPerPage: 30, params: status === 'all' ? {} : { status } },
        }),
      );
    });
    effect(() => {
      if (!this.browserReady()) return;
      const org = this.organizationId();
      const orderId = this.orderId();
      untracked(() => {
        if (orderId) this.store.readOrder({ organizationId: org, orderId });
        else this.store.clearOrder();
      });
    });
    effect(() => {
      if (!this.browserReady() || this.view() !== 'receipts' || !this.orderId()) return;
      const org = this.organizationId();
      const orderId = this.orderId();
      const page = this.receiptPage();
      if (orderId)
        untracked(() =>
          this.store.loadReceipts({
            organizationId: org,
            orderId,
            options: { page, itemsPerPage: 30 },
          }),
        );
    });
    effect(() => {
      if (!this.browserReady() || !this.returnsReceiptId()) return;
      const org = this.organizationId();
      const receiptId = this.returnsReceiptId();
      const page = this.returnPage();
      if (receiptId)
        untracked(() =>
          this.store.loadReturns({
            organizationId: org,
            receiptId,
            options: { page, itemsPerPage: 30 },
          }),
        );
    });
    effect(() => {
      if (!this.browserReady() || this.editor() !== 'order') return;
      const org = this.organizationId();
      const search = this.pickerSearch();
      const page = this.pickerPage();
      untracked(() =>
        this.store.loadSuppliers({
          organizationId: org,
          options: { page, itemsPerPage: 30, search, params: { archived: false } },
        }),
      );
    });
    effect(() => {
      if (!this.browserReady()) return;
      const supplierId = this.supplierContextId();
      const org = this.organizationId();
      if (supplierId) untracked(() => this.store.readSupplier({ organizationId: org, supplierId }));
    });
    effect(() => {
      if (!this.browserReady()) return;
      const org = this.organizationId();
      const needed = this.store
        .selectedOrder()
        ?.lines.some((line) => line.kind === 'equipment_to_individualize');
      if (needed && this.catalogueOrganizationId !== org) {
        this.catalogueOrganizationId = org;
        untracked(() => this.catalog.load(org));
      }
    });
    this.events
      .on(procurementStoreEvents.saved)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ payload }) => {
        if (payload.organizationId !== this.organizationId()) return;
        this.editor.set(null);
        this.confirmation.set(null);
        this.dirty.set(false);
        if (payload.command.kind === 'create_order' || payload.command.kind === 'update_order') {
          void this.router.navigate([], {
            queryParams: { orderId: payload.result.id, section: 'orders' },
            queryParamsHandling: 'merge',
          });
        }
        this.reload();
      });
  }

  //#endregion

  //#region Methods
  /**
   * Method selectSection
   * @method selectSection
   *
   * @description
   * Native tabs keep URL and physical source context coherent.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} section - Displayed resource or choice for the procurement workflow.
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected selectSection(section: string): void {
    if (this.locked()) return;
    void this.router.navigate([], { queryParams: { section }, queryParamsHandling: 'merge' });
  }
  /**
   * Method ensureEquipmentTypes
   * @method ensureEquipmentTypes
   *
   * @description
   * Loads the Equipment catalogue only when its native picker or retained material lines need it.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected ensureEquipmentTypes(): void {
    const org = this.organizationId();
    if (this.catalogueOrganizationId === org) return;
    this.catalogueOrganizationId = org;
    this.catalog.load(org);
  }
  /**
   * Method selectOrder
   * @method selectOrder
   *
   * @description
   * Selects a server order without relying on the current collection page as authority.
   *
   * @access protected
   * @since unreleased
   *
   * @param {PurchaseOrderOutput} order - Displayed resource or choice for the procurement workflow.
   * @param {boolean} receipts - Displayed resource or choice for the procurement workflow.
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected selectOrder(order: PurchaseOrderOutput, receipts: boolean = false): void {
    if (this.locked()) return;
    this.receiptPage.set(1);
    this.returnsReceiptId.set(null);
    void this.router.navigate([], {
      queryParams: { orderId: order.id, section: receipts ? 'receipts' : 'orders' },
      queryParamsHandling: 'merge',
    });
  }
  /**
   * Method clearSelection
   * @method clearSelection
   *
   * @description
   * Clears only source context; retained records remain on the server.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected clearSelection(): void {
    if (this.locked()) return;
    void this.router.navigate([], { queryParams: { orderId: null }, queryParamsHandling: 'merge' });
  }
  /**
   * Method openSupplier
   * @method openSupplier
   *
   * @description
   * Opens an authorized supplier editor with the displayed revision.
   *
   * @access protected
   * @since unreleased
   *
   * @param {SupplierOutput | null} supplier - Displayed resource or choice for the procurement
   *   workflow.
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected openSupplier(supplier: SupplierOutput | null): void {
    if (!this.canManage() || this.locked()) return;
    this.store.clearCommand();
    this.reviewRequested.set(false);
    this.editingSupplier.set(supplier);
    this.dirty.set(false);
    this.editor.set('supplier');
  }
  /**
   * Method openOrder
   * @method openOrder
   *
   * @description
   * Opens an authorized purchase draft editor without publishing or placing it.
   *
   * @access protected
   * @since unreleased
   *
   * @param {PurchaseOrderOutput | null} order - Displayed resource or choice for the procurement
   *   workflow.
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected openOrder(order: PurchaseOrderOutput | null): void {
    if (!this.canManage() || this.locked() || (order && order.status !== 'draft')) return;
    this.store.clearCommand();
    this.reviewRequested.set(false);
    this.editingOrder.set(order);
    this.pickerPage.set(1);
    this.pickerSearch.set('');
    this.dirty.set(false);
    this.editor.set('order');
  }
  /**
   * Method saveSupplier
   * @method saveSupplier
   *
   * @description
   * Emits the draft supplier change while retaining its original revision snapshot.
   *
   * @access protected
   * @since unreleased
   *
   * @param {ChangeSupplierInput} commandInput - Validated native form payload, retaining its exact
   *   strings.
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected saveSupplier(commandInput: ChangeSupplierInput): void {
    if (!this.canManage() || this.locked()) return;
    const supplier = this.editingSupplier();
    this.store.execute(
      supplier
        ? {
            kind: 'update_supplier',
            organizationId: this.organizationId(),
            supplier,
            input: commandInput,
          }
        : { kind: 'create_supplier', organizationId: this.organizationId(), input: commandInput },
    );
  }
  /**
   * Method saveOrder
   * @method saveOrder
   *
   * @description
   * Saves exact purchase input; the server alone permits draft transitions.
   *
   * @access protected
   * @since unreleased
   *
   * @param {ChangePurchaseOrderInput} commandInput - Validated native form payload, retaining its
   *   exact strings.
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected saveOrder(commandInput: ChangePurchaseOrderInput): void {
    if (!this.canManage() || this.locked()) return;
    const order = this.editingOrder();
    this.store.execute(
      order
        ? {
            kind: 'update_order',
            organizationId: this.organizationId(),
            order,
            input: commandInput,
          }
        : { kind: 'create_order', organizationId: this.organizationId(), input: commandInput },
    );
  }
  /**
   * Method canEditOrder
   * @method canEditOrder
   *
   * @description
   * Native draft actions are available only after its displayed source has finished loading.
   *
   * @access protected
   * @since unreleased
   *
   * @param {PurchaseOrderOutput} order - Displayed resource or choice for the procurement workflow.
   *
   * @returns {boolean} The presentation or navigation decision for the current server source.
   */
  protected canEditOrder(order: PurchaseOrderOutput): boolean {
    return (
      this.canManage() &&
      order.status === 'draft' &&
      this.store.orderCallState().status === 'success'
    );
  }
  /**
   * Method canCancelOrder
   * @method canCancelOrder
   *
   * @description
   * The server permits cancellation only while an order still has undelivered quantities.
   *
   * @access protected
   * @since unreleased
   *
   * @param {PurchaseOrderOutput} order - Displayed resource or choice for the procurement workflow.
   *
   * @returns {boolean} The presentation or navigation decision for the current server source.
   */
  protected canCancelOrder(order: PurchaseOrderOutput): boolean {
    return (
      this.canManage() &&
      order.status !== 'received' &&
      order.status !== 'cancelled' &&
      this.store.orderCallState().status === 'success'
    );
  }
  /**
   * Method canIndividualize
   * @method canIndividualize
   *
   * @description
   * Individualization remains a separate explicit operation with Equipment write capability.
   *
   * @access protected
   * @since unreleased
   *
   * @param {ProcurementReceiptOutput} receipt - Displayed resource or choice for the procurement
   *   workflow.
   *
   * @returns {boolean} The presentation or navigation decision for the current server source.
   */
  protected canIndividualize(receipt: ProcurementReceiptOutput): boolean {
    return (
      this.canManage() &&
      this.canCreateEquipment() &&
      receipt.status === 'awaiting_individualization' &&
      !receipt.equipmentIds.length &&
      this.store.receiptsCallState().status === 'success'
    );
  }
  /**
   * Method canReconcile
   * @method canReconcile
   *
   * @description
   * Retained physical returns require a separate Inventory management operation to reconcile.
   *
   * @access protected
   * @since unreleased
   *
   * @param {ProcurementReturnOutput} returned - Displayed resource or choice for the procurement
   *   workflow.
   *
   * @returns {boolean} The presentation or navigation decision for the current server source.
   */
  protected canReconcile(returned: ProcurementReturnOutput): boolean {
    return (
      this.canManage() &&
      this.canManageStock() &&
      returned.status === 'awaiting_reconciliation' &&
      this.store.returnsCallState().status === 'success'
    );
  }
  /**
   * Method canReceive
   * @method canReceive
   *
   * @description
   * Distinguishes stock versus reserve type authorization for one physical source line.
   *
   * @access protected
   * @since unreleased
   *
   * @param {PurchaseOrderOutput} order - Displayed resource or choice for the procurement workflow.
   * @param {PurchaseOrderLineOutput} line - Displayed resource or choice for the procurement
   *   workflow.
   *
   * @returns {boolean} The presentation or navigation decision for the current server source.
   */
  protected canReceive(order: PurchaseOrderOutput, line: PurchaseOrderLineOutput): boolean {
    return (
      this.canManage() &&
      order.id === this.orderId() &&
      this.store.orderCallState().status === 'success' &&
      (order.status === 'ordered' || order.status === 'partial_received') &&
      (exactDecimalUnits(line.remainingQuantity) ?? 0n) > 0n &&
      (line.kind !== 'part' || this.canManageStock())
    );
  }
  /**
   * Method openReceipt
   * @method openReceipt
   *
   * @description
   * Opens one bounded physical delivery; it never implies reserve equipment creation.
   *
   * @access protected
   * @since unreleased
   *
   * @param {PurchaseOrderOutput} order - Displayed resource or choice for the procurement workflow.
   * @param {PurchaseOrderLineOutput} line - Displayed resource or choice for the procurement
   *   workflow.
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected openReceipt(order: PurchaseOrderOutput, line: PurchaseOrderLineOutput): void {
    if (!this.canReceive(order, line) || this.locked()) return;
    this.store.clearCommand();
    this.reviewRequested.set(false);
    this.editingOrder.set(order);
    this.receivingLine.set(line);
    this.dirty.set(false);
    this.editor.set('receipt');
  }
  /**
   * Method recordReceipt
   * @method recordReceipt
   *
   * @description
   * Sends one physical delivery with its original displayed source order revision.
   *
   * @access protected
   * @since unreleased
   *
   * @param {ReceivePurchaseOrderInput} commandInput - Validated native form payload, retaining its
   *   exact strings.
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected recordReceipt(commandInput: ReceivePurchaseOrderInput): void {
    const order = this.editingOrder();
    const line = this.receivingLine();
    if (!order || !line || !this.canReceive(order, line) || this.locked()) return;
    this.store.execute({
      kind: 'receive',
      organizationId: this.organizationId(),
      order,
      input: commandInput,
    });
  }
  /**
   * Method canReturn
   * @method canReturn
   *
   * @description
   * Original physical quantities and Equipment lifecycle bound the return action.
   *
   * @access protected
   * @since unreleased
   *
   * @param {ProcurementReceiptOutput} receipt - Displayed resource or choice for the procurement
   *   workflow.
   *
   * @returns {boolean} The presentation or navigation decision for the current server source.
   */
  protected canReturn(receipt: ProcurementReceiptOutput): boolean {
    return (
      this.canManage() &&
      !receipt.equipmentIds.length &&
      (exactDecimalUnits(exactDecimalDifference(receipt.quantity, receipt.returnedQuantity)) ??
        0n) > 0n &&
      (receipt.kind !== 'part' || this.canManageStock())
    );
  }
  /**
   * Method openReturn
   * @method openReturn
   *
   * @description
   * Opens a motivated return linked to a retained source.
   *
   * @access protected
   * @since unreleased
   *
   * @param {ProcurementReceiptOutput} receipt - Displayed resource or choice for the procurement
   *   workflow.
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected openReturn(receipt: ProcurementReceiptOutput): void {
    if (!this.canReturn(receipt) || this.locked()) return;
    this.store.clearCommand();
    this.reviewRequested.set(false);
    this.returningReceipt.set(receipt);
    this.dirty.set(false);
    this.editor.set('return');
  }
  /**
   * Method recordReturn
   * @method recordReturn
   *
   * @description
   * Records the physical fact even when stock will need later reconciliation.
   *
   * @access protected
   * @since unreleased
   *
   * @param {ReturnProcurementReceiptInput} commandInput - Validated native form payload, retaining
   *   its exact strings.
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected recordReturn(commandInput: ReturnProcurementReceiptInput): void {
    const receipt = this.returningReceipt();
    if (!receipt || !this.canReturn(receipt) || this.locked()) return;
    this.store.execute({
      kind: 'return',
      organizationId: this.organizationId(),
      receipt,
      input: commandInput,
    });
  }
  /**
   * Method requestConfirmation
   * @method requestConfirmation
   *
   * @description
   * Consequential operations always carry displayed revisions into explicit confirmation.
   *
   * @access protected
   * @since unreleased
   *
   * @param {ProcurementCommand} command - Displayed server resource and the explicit proposed
   *   operation.
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected requestConfirmation(command: ProcurementCommand): void {
    if (this.locked() || !this.canManage()) return;
    if (command.kind === 'individualize' && !this.canCreateEquipment()) return;
    if (command.kind === 'reconcile' && !this.canManageStock()) return;
    this.store.clearCommand();
    this.reviewRequested.set(false);
    this.confirmation.set(command);
  }
  /**
   * Method requestIndividualization
   * @method requestIndividualization
   *
   * @description
   * A fresh individualization attempt is distinct from transport retry of a previous UUID.
   *
   * @access protected
   * @since unreleased
   *
   * @param {ProcurementReceiptOutput} receipt - Displayed resource or choice for the procurement
   *   workflow.
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected requestIndividualization(receipt: ProcurementReceiptOutput): void {
    this.requestConfirmation({
      kind: 'individualize',
      organizationId: this.organizationId(),
      receipt,
      input: { clientOperationId: globalThis.crypto.randomUUID() },
    });
  }
  /**
   * Method requestReconciliation
   * @method requestReconciliation
   *
   * @description
   * A fresh reconciliation attempt keeps the original physical return declaration immutable.
   *
   * @access protected
   * @since unreleased
   *
   * @param {ProcurementReturnOutput} returned - Displayed resource or choice for the procurement
   *   workflow.
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected requestReconciliation(returned: ProcurementReturnOutput): void {
    this.requestConfirmation({
      kind: 'reconcile',
      organizationId: this.organizationId(),
      returned,
      input: { clientOperationId: globalThis.crypto.randomUUID() },
    });
  }
  /**
   * Method confirmOperation
   * @method confirmOperation
   *
   * @description
   * Sends only the operation the reader reviewed in the native confirmation.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected confirmOperation(): void {
    const command = this.confirmation();
    if (command && !this.locked()) this.store.execute(command);
  }
  /**
   * Method retryCommand
   * @method retryCommand
   *
   * @description
   * Replays the retained original scope, revision and physical payload verbatim.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected retryCommand(): void {
    const command = this.store.command();
    if (command && !this.store.commandPending()) this.store.execute(command);
  }
  /**
   * Method reviewLatest
   * @method reviewLatest
   *
   * @description
   * Refreshes displayed revisions explicitly while the forms keep their current draft identity.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected reviewLatest(): void {
    if (this.locked()) return;
    this.reviewRequested.set(true);
    const command = this.confirmation();
    const supplier =
      this.editingSupplier() ?? (command?.kind === 'archive_supplier' ? command.supplier : null);
    const order =
      this.editingOrder() ??
      (command?.kind === 'place_order' || command?.kind === 'cancel_remaining'
        ? command.order
        : this.store.selectedOrder());
    this.reload();
    if (supplier)
      this.store.readSupplier({ organizationId: this.organizationId(), supplierId: supplier.id });
    if (order && order.id !== this.orderId())
      this.store.readOrder({ organizationId: this.organizationId(), orderId: order.id });
    const receipt =
      this.returningReceipt() ?? (command?.kind === 'individualize' ? command.receipt : null);
    if (receipt)
      this.store.readReceipt({ organizationId: this.organizationId(), receiptId: receipt.id });
    if (command?.kind === 'reconcile')
      this.store.readReturn({
        organizationId: this.organizationId(),
        returnId: command.returned.id,
      });
  }
  /**
   * Method reviewReady
   * @method reviewReady
   *
   * @description
   * A newly reviewed source must have finished successfully before adopting its revision.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {boolean} The presentation or navigation decision for the current server source.
   */
  protected reviewReady(): boolean {
    if (!this.reviewRequested() || this.locked()) return false;
    const command = this.confirmation();
    if (this.editor() === 'supplier' || command?.kind === 'archive_supplier') {
      const id =
        this.editingSupplier()?.id ??
        (command?.kind === 'archive_supplier' ? command.supplier.id : null);
      return (
        this.store.supplierCallState().status === 'success' &&
        this.store.supplierCallState().data?.id === id
      );
    }
    if (
      this.editor() === 'order' ||
      this.editor() === 'receipt' ||
      command?.kind === 'place_order' ||
      command?.kind === 'cancel_remaining'
    ) {
      const id =
        this.editingOrder()?.id ??
        (command?.kind === 'place_order' || command?.kind === 'cancel_remaining'
          ? command.order.id
          : null);
      return (
        this.store.orderCallState().status === 'success' && this.store.selectedOrder()?.id === id
      );
    }
    if (this.editor() === 'return' || command?.kind === 'individualize') {
      const id =
        this.returningReceipt()?.id ??
        (command?.kind === 'individualize' ? command.receipt.id : null);
      return (
        this.store.receiptCallState().status === 'success' &&
        this.store.receiptCallState().data?.id === id
      );
    }
    if (command?.kind === 'reconcile')
      return (
        this.store.returnCallState().status === 'success' &&
        this.store.returnCallState().data?.id === command.returned.id
      );
    return false;
  }
  /**
   * Method adoptLatestRevision
   * @method adoptLatestRevision
   *
   * @description
   * Latest resource snapshots become authority only after the reader chose review.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected adoptLatestRevision(): void {
    if (!this.reviewReady()) return;
    this.adoptEditorRevision();
    this.adoptConfirmationRevision();
    this.reviewRequested.set(false);
    this.store.clearCommand();
  }

  /**
   * Method adoptEditorRevision
   * @method adoptEditorRevision
   *
   * @description
   * Refreshes only the reviewed editor's source snapshot while retaining its physical draft.
   *
   * @access private
   * @since unreleased
   *
   * @returns {void} No return value; updates the retained editor source.
   */
  private adoptEditorRevision(): void {
    const supplier = this.store.supplierCallState().data;
    const order = this.store.selectedOrder();
    if (this.editor() === 'supplier' && supplier?.id === this.editingSupplier()?.id)
      this.editingSupplier.set(supplier);
    if (this.editor() === 'order' && order?.id === this.editingOrder()?.id)
      this.editingOrder.set(order);
    const line = this.receivingLine();
    if (this.editor() === 'receipt' && line && order) {
      const current = order.lines.find((item) => item.id === line.id);
      if (current) {
        this.receivingLine.set(current);
        this.editingOrder.set(order);
      }
    }
    const receipt = this.returningReceipt();
    if (this.editor() === 'return' && receipt) {
      const current = this.store.receiptCallState().data;
      if (current) this.returningReceipt.set(current);
    }
  }

  /**
   * Method adoptConfirmationRevision
   * @method adoptConfirmationRevision
   *
   * @description
   * Adopts reviewed command authority without replacing its original operation identity or payload.
   *
   * @access private
   * @since unreleased
   *
   * @returns {void} No return value; updates the retained confirmation source.
   */
  private adoptConfirmationRevision(): void {
    const supplier = this.store.supplierCallState().data;
    const order = this.store.selectedOrder();
    const command = this.confirmation();
    if (command?.kind === 'archive_supplier' && supplier)
      this.confirmation.set({ ...command, supplier });
    if ((command?.kind === 'place_order' || command?.kind === 'cancel_remaining') && order)
      this.confirmation.set({ ...command, order });
    if (command?.kind === 'individualize' && this.store.receiptCallState().data) {
      const current = this.store.receiptCallState().data;
      if (current) this.confirmation.set({ ...command, receipt: current });
    }
    if (command?.kind === 'reconcile' && this.store.returnCallState().data) {
      const current = this.store.returnCallState().data;
      if (current) this.confirmation.set({ ...command, returned: current });
    }
  }
  /**
   * Method reload
   * @method reload
   *
   * @description
   * Reloads the active server view and physical source without deriving local quantities.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected reload(): void {
    const org = this.organizationId();
    if (this.view() === 'suppliers')
      this.store.loadSuppliers({
        organizationId: org,
        options: {
          page: this.supplierPage(),
          itemsPerPage: 30,
          search: this.supplierSearch(),
          params: {
            archived:
              this.supplierFilter() === 'all' ? 'all' : this.supplierFilter() === 'archived',
          },
        },
      });
    else
      this.store.loadOrders({
        organizationId: org,
        options: {
          page: this.orderPage(),
          itemsPerPage: 30,
          params: this.orderStatus() === 'all' ? {} : { status: this.orderStatus() },
        },
      });
    const orderId = this.orderId();
    if (orderId) {
      this.store.readOrder({ organizationId: org, orderId });
      if (this.view() === 'receipts')
        this.store.loadReceipts({
          organizationId: org,
          orderId,
          options: { page: this.receiptPage(), itemsPerPage: 30 },
        });
    }
    const receiptId = this.returnsReceiptId();
    if (receiptId)
      this.store.loadReturns({
        organizationId: org,
        receiptId,
        options: { page: this.returnPage(), itemsPerPage: 30 },
      });
  }
  /**
   * Method showReturns
   * @method showReturns
   *
   * @description
   * Reads return history only when the reader opens the retained receipt's own section.
   *
   * @access protected
   * @since unreleased
   *
   * @param {ProcurementReceiptOutput} receipt - Displayed resource or choice for the procurement
   *   workflow.
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected showReturns(receipt: ProcurementReceiptOutput): void {
    this.returnPage.set(1);
    this.returnsReceiptId.set(this.returnsReceiptId() === receipt.id ? null : receipt.id);
  }
  /**
   * Method lineTitle
   * @method lineTitle
   *
   * @description
   * Current catalogue name or preserved fallback, never an invented equipment family.
   *
   * @access protected
   * @since unreleased
   *
   * @param {PurchaseOrderLineOutput} line - Displayed resource or choice for the procurement
   *   workflow.
   *
   * @returns {string} The presentation or navigation decision for the current server source.
   */
  protected lineTitle(line: PurchaseOrderLineOutput): string {
    if (line.kind === 'part') {
      if (!line.partLabel)
        return $localize`:@@procurement.line.articleUnavailable:Stock article label unavailable`;
      return line.partCode ? `${line.partCode} — ${line.partLabel}` : line.partLabel;
    }
    const type =
      this.catalog.options().find((option) => option.value === line.typeCode)?.label ??
      line.typeCode ??
      '';
    const identity = line.identityTemplate;
    const name =
      'name' in identity && typeof identity['name'] === 'string' ? identity['name'] : null;
    return name ? `${name} · ${type}` : type;
  }
  /**
   * Method lineUnit
   * @method lineUnit
   *
   * @description
   * Never substitutes an assumed unit when a historical stock reference cannot be read.
   *
   * @access protected
   * @since unreleased
   *
   * @param {PurchaseOrderLineOutput} line - Displayed resource or choice for the procurement
   *   workflow.
   *
   * @returns {string} The presentation or navigation decision for the current server source.
   */
  protected lineUnit(line: PurchaseOrderLineOutput): string {
    if (line.kind !== 'part') return $localize`:@@procurement.line.units:units`;
    return line.partUnit
      ? line.partUnit
      : $localize`:@@procurement.line.unitUnavailable:unit unavailable`;
  }
  /**
   * Method receiptUnit
   * @method receiptUnit
   *
   * @description
   * Physical receipt inherits its source line's unit, not an unrelated global default.
   *
   * @access protected
   * @since unreleased
   *
   * @param {ProcurementReceiptOutput} receipt - Displayed resource or choice for the procurement
   *   workflow.
   *
   * @returns {string} The presentation or navigation decision for the current server source.
   */
  protected receiptUnit(receipt: ProcurementReceiptOutput): string {
    const line = this.store.selectedOrder()?.lines.find((item) => item.id === receipt.lineId);
    return line ? this.lineUnit(line) : '';
  }
  /**
   * Method blockedLabel
   * @method blockedLabel
   *
   * @description
   * Friendly blocking reasons preserve the server decision without claiming completed stock.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} reason - Displayed resource or choice for the procurement workflow.
   *
   * @returns {string} The presentation or navigation decision for the current server source.
   */
  protected blockedLabel(reason: string): string {
    const labels: Readonly<Record<string, string>> = {
      quota_exceeded: $localize`:@@procurement.blocked.quota:Reserve equipment could not be created because the organization quota was reached.`,
      unavailable_type: $localize`:@@procurement.blocked.type:The equipment type is currently unavailable. The physical receipt is retained.`,
      insufficient_stock: $localize`:@@procurement.blocked.stock:The physical return is retained. Inventory needs reconciliation before its movement can be confirmed.`,
    };
    return labels[reason] ?? reason.replaceAll('_', ' ');
  }
  /**
   * Method requestClose
   * @method requestClose
   *
   * @description
   * Locks dismissal during any accepted or transport-uncertain physical operation.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected requestClose(): void {
    if (this.locked()) return;
    if (this.dirty()) this.discardState.set('open');
    else this.editor.set(null);
  }
  /**
   * Method sheetStateChanged
   * @method sheetStateChanged
   *
   * @description
   * Native sheet close follows the same controlled draft decision.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} state - Displayed resource or choice for the procurement workflow.
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected sheetStateChanged(state: string): void {
    if (state === 'closed' && this.editor()) this.requestClose();
  }
  /**
   * Method confirmationStateChanged
   * @method confirmationStateChanged
   *
   * @description
   * Native operation dialog never dismisses an accepted or uncertain command.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} state - Displayed resource or choice for the procurement workflow.
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected confirmationStateChanged(state: string): void {
    if (state === 'closed' && !this.locked()) this.confirmation.set(null);
  }
  /**
   * Method hasUnsavedChanges
   * @method hasUnsavedChanges
   *
   * @description
   * Typed drafts and unresolved facts participate in guarded navigation.
   *
   * @access public
   * @since unreleased
   *
   * @returns {boolean} The presentation or navigation decision for the current server source.
   */
  public hasUnsavedChanges(): boolean {
    return this.dirty() || this.locked();
  }
  /**
   * Method confirmDeactivation
   * @method confirmDeactivation
   *
   * @description
   * Accepted or uncertain physical writes require result recovery before leaving the workspace.
   *
   * @access public
   * @since unreleased
   *
   * @returns {Promise<boolean>} The presentation or navigation decision for the current server
   *   source.
   */
  public confirmDeactivation(): Promise<boolean> {
    if (this.locked()) return Promise.resolve(false);
    this.discardState.set('open');
    return new Promise((resolve) => {
      this.deactivationResolver = resolve;
    });
  }
  /**
   * Method resolveDiscard
   * @method resolveDiscard
   *
   * @description
   * Resolves controlled editor and navigation dismissal exactly once.
   *
   * @access protected
   * @since unreleased
   *
   * @param {boolean} allowed - Whether the reader confirmed discarding the local draft.
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected resolveDiscard(allowed: boolean): void {
    this.discardState.set('closed');
    if (allowed) {
      this.dirty.set(false);
      this.editor.set(null);
    }
    this.deactivationResolver?.(allowed);
    this.deactivationResolver = null;
  }
  /**
   * Method beforeUnload
   * @method beforeUnload
   *
   * @description
   * Browser close keeps the standard native warning for drafts or unresolved physical results.
   *
   * @access protected
   * @since unreleased
   *
   * @param {BeforeUnloadEvent} event - Native browser event.
   *
   * @returns {void} No return value; updates or emits the explicit workflow intent.
   */
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }
  //#endregion
}
