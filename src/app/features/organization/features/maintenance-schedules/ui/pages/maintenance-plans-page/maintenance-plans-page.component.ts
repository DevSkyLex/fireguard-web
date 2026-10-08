import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
import { RouterLink } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  CreateMaintenancePlanInput,
  MaintenanceOperationKind,
  MaintenancePlanOutput,
} from '@features/organization/features/maintenance-schedules/models';
import {
  MaintenancePlansStore,
  maintenancePlansStoreEvents,
  type MaintenancePlansStoreType,
} from '@features/organization/features/maintenance-schedules/state';
import {
  maintenancePlanDateMode,
  maintenancePlanDateValue,
} from '@features/organization/features/maintenance-schedules/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  REGIONAL_FORMATTING_PORT,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import { CollectionPagination } from '@shared/collection-pagination';
import { CollectionSearchBox } from '@shared/collection-toolbar';
import { OrgDatePipe, type RegionalFormatSettings } from '@shared/regional-format';
import { ResourceIllustration } from '@shared/resource-illustration';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmSpinner } from '@shared/ui/spinner';
import { HlmTabsImports } from '@shared/ui/tabs';
import { MaintenancePlanList } from '../../components/maintenance-plan-list';
import { MaintenancePlanForm } from '../../forms/maintenance-plan-form';

/**
 * Class MaintenancePlansPage
 * @class MaintenancePlansPage
 *
 * @description
 * Equipment operation library with server previews, explicit activation and single-engine
 * migration. Authenticated reads start after hydration; equipment choices load only on editor
 * demand.
 */
@Component({
  selector: 'app-maintenance-plans-page',
  imports: [
    RouterLink,
    OrgDatePipe,
    CollectionPagination,
    CollectionSearchBox,
    ResourceIllustration,
    MaintenancePlanList,
    MaintenancePlanForm,
    HlmButton,
    HlmSpinner,
    HlmSkeleton,
    ...HlmAlertImports,
    ...HlmAlertDialogImports,
    ...HlmEmptyImports,
    ...HlmTabsImports,
  ],
  templateUrl: './maintenance-plans-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenancePlansPage {
  //#region Properties
  /**
   * Property dateMode
   * @readonly
   *
   * @description
   * Date-only anchors remain on the selected calendar day in every organization timezone.
   *
   * @access protected
   * @since unreleased
   *
   * @type {typeof maintenancePlanDateMode}
   */
  protected readonly dateMode: typeof maintenancePlanDateMode = maintenancePlanDateMode;

  /**
   * Property dateValue
   * @readonly
   *
   * @description
   * Supplies the server's calendar day to date-only formatting without converting its offset.
   *
   * @access protected
   * @since unreleased
   *
   * @type {typeof maintenancePlanDateValue}
   */
  protected readonly dateValue: typeof maintenancePlanDateValue = maintenancePlanDateValue;

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Route-bound organization.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * Optional equipment scope bound from the dossier's navigation query.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly equipmentId: InputSignal<string | undefined> = input<string>();

  /**
   * Property operationKind
   * @readonly
   *
   * @description
   * Optional operation kind bound from a dossier link, validated before querying.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<MaintenanceOperationKind | undefined>}
   */
  public readonly operationKind: InputSignal<MaintenanceOperationKind | undefined> =
    input<MaintenanceOperationKind>();

  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped plans and operation states.
   *
   * @access protected
   * @since unreleased
   *
   * @type {MaintenancePlansStoreType}
   */
  protected readonly store: MaintenancePlansStoreType = inject(MaintenancePlansStore);

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Existing API grants gate all commands.
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
   * Property formatting
   * @readonly
   *
   * @description
   * Organization date context.
   *
   * @access private
   * @since unreleased
   *
   * @type {RegionalFormattingPort}
   */
  private readonly formatting: RegionalFormattingPort = inject(REGIONAL_FORMATTING_PORT);

  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * Dates render in the organization timezone.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    this.formatting.regionalFormatting;

  /**
   * Property browserReady
   * @readonly
   *
   * @description
   * Prevents secondary authenticated reads during SSR.
   *
   * @access private
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly browserReady: WritableSignal<boolean> = signal(false);

  /**
   * Property kind
   * @readonly
   *
   * @description
   * Current server operation filter.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<MaintenanceOperationKind>}
   */
  protected readonly kind: WritableSignal<MaintenanceOperationKind> =
    signal<MaintenanceOperationKind>('control');

  /**
   * Property search
   * @readonly
   *
   * @description
   * Applied server search term.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly search: WritableSignal<string> = signal('');

  /**
   * Property page
   * @readonly
   *
   * @description
   * Current server list page.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly page: WritableSignal<number> = signal(1);

  /**
   * Property pageSize
   * @readonly
   *
   * @description
   * Current bounded server page size.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly pageSize: WritableSignal<number> = signal(30);

  /**
   * Property formVisible
   * @readonly
   *
   * @description
   * Explicit preparation/configuration editor visibility.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly formVisible: WritableSignal<boolean> = signal(false);

  /**
   * Property editingPlan
   * @readonly
   *
   * @description
   * Immutable original equipment and operation when configuring.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<MaintenancePlanOutput | null>}
   */
  protected readonly editingPlan: WritableSignal<MaintenancePlanOutput | null> =
    signal<MaintenancePlanOutput | null>(null);

  /**
   * Property equipmentSearch
   * @readonly
   *
   * @description
   * Last equipment server search.
   *
   * @access private
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  private readonly equipmentSearch: WritableSignal<string> = signal('');

  /**
   * Property equipmentPage
   * @readonly
   *
   * @description
   * Current authorized equipment option page.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly equipmentPage: WritableSignal<number> = signal(1);

  /**
   * Property migrationConfirmed
   * @readonly
   *
   * @description
   * Explicit consequential authority confirmation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly migrationConfirmed: WritableSignal<boolean> = signal(false);

  /**
   * Property canManage
   * @readonly
   *
   * @description
   * Existing maintenance management permission.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canManage: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_MANAGE),
  );

  /**
   * Property legacyMode
   * @readonly
   *
   * @description
   * Confirmed historical scheduling authority.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly legacyMode: Signal<boolean> = computed(
    () => this.store.engineCallState().data?.mode === 'legacy',
  );

  /**
   * Property canGenerate
   * @readonly
   *
   * @description
   * Plan engine plus both API command permissions.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canGenerate: Signal<boolean> = computed(
    () =>
      this.canManage() &&
      this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN) &&
      this.store.engineCallState().status === 'success' &&
      this.store.engineCallState().data?.mode === 'plans',
  );

  /**
   * Property pageCount
   * @readonly
   *
   * @description
   * Pages from the authoritative total.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<number>}
   */
  protected readonly pageCount: Signal<number> = computed(() =>
    Math.max(1, Math.ceil(this.store.totalPlans() / this.pageSize())),
  );

  /**
   * Property equipmentPageCount
   * @readonly
   *
   * @description
   * Authorized selector pages from server total.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<number>}
   */
  protected readonly equipmentPageCount: Signal<number> = computed(() =>
    Math.max(1, Math.ceil(this.store.totalEquipment() / 30)),
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Initializes hydrated scope and confirmed command consequences.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    const events: Events = inject(Events);
    const destroyRef: DestroyRef = inject(DestroyRef);
    afterNextRender(() => this.browserReady.set(true));
    effect(() => {
      const operationKind: MaintenanceOperationKind | undefined = this.operationKind();
      untracked(() => {
        this.page.set(1);
        this.kind.set(operationKind === 'maintenance' ? 'maintenance' : 'control');
      });
    });
    effect(() => {
      const organizationId: string = this.organizationId();
      if (!this.browserReady()) return;
      untracked(() => {
        this.formVisible.set(false);
        this.editingPlan.set(null);
        this.migrationConfirmed.set(false);
        this.store.setScope(organizationId);
        this.store.loadEngine(organizationId);
      });
    });
    effect(() => {
      const organizationId: string = this.organizationId();
      const operationKind: MaintenanceOperationKind = this.kind();
      const search: string = this.search();
      const page: number = this.page();
      const itemsPerPage: number = this.pageSize();
      const equipmentId: string | undefined = this.equipmentId();
      if (!this.browserReady()) return;
      untracked(() =>
        this.store.load({
          organizationId,
          options: {
            search,
            page,
            itemsPerPage,
            params: { operationKind, ...(equipmentId ? { equipmentId } : {}) },
          },
        }),
      );
    });
    events
      .on(maintenancePlansStoreEvents.planPrepared)
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(({ payload }) => {
        if (payload.organizationId !== this.organizationId()) return;
        this.formVisible.set(false);
        this.store.preview(payload.plan);
        this.reload();
      });
    events
      .on(maintenancePlansStoreEvents.planChanged)
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(({ payload }) => {
        if (payload.organizationId !== this.organizationId()) return;
        if (this.store.updateCallState().status === 'success') this.formVisible.set(false);
        if (this.store.engineCallState().data?.mode === 'plans') this.migrationConfirmed.set(false);
        this.reload();
        const plan: MaintenancePlanOutput | null = this.store.selectedPlan();
        if (plan) this.store.preview(plan);
      });
  }
  //#endregion

  //#region Methods
  /**
   * Method reload
   *
   * @description
   * Retries the current server plan query.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} Keeps narrowing unchanged.
   */
  protected reload(): void {
    this.store.load({
      organizationId: this.organizationId(),
      options: {
        search: this.search(),
        page: this.page(),
        itemsPerPage: this.pageSize(),
        params: {
          operationKind: this.kind(),
          ...(this.equipmentId() ? { equipmentId: this.equipmentId() as string } : {}),
        },
      },
    });
  }

  /**
   * Method selectKind
   *
   * @description
   * Separates control and maintenance queries.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} value - Native tab value.
   *
   * @returns {void} Resets paging for the selected operation kind.
   */
  protected selectKind(value: string): void {
    if (value === 'control' || value === 'maintenance') {
      this.page.set(1);
      this.kind.set(value);
    }
  }

  /**
   * Method openForm
   *
   * @description
   * Opens an explicit new preparation or configuration.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenancePlanOutput | null} plan - Saved plan to configure, otherwise new.
   *
   * @returns {void} Loads options only when needed.
   */
  protected openForm(plan: MaintenancePlanOutput | null): void {
    if (this.store.commandPending() || !this.canManage()) return;
    this.editingPlan.set(plan);
    this.store.resetCreate();
    this.formVisible.set(true);
    if (!plan) this.searchEquipment('');
  }

  /**
   * Method submitPlan
   *
   * @description
   * Saves the inactive preparation or editable fields.
   *
   * @access protected
   * @since unreleased
   *
   * @param {CreateMaintenancePlanInput} values - Validated form values.
   *
   * @returns {void} Retains the editor until server confirmation.
   */
  protected submitPlan(values: CreateMaintenancePlanInput): void {
    const plan: MaintenancePlanOutput | null = this.editingPlan();
    if (plan)
      this.store.update({
        organizationId: this.organizationId(),
        planId: plan.id,
        input: {
          name: values.name,
          ...(!plan.openOccurrence && values.interval !== plan.interval
            ? { interval: values.interval }
            : {}),
          ...(!plan.openOccurrence && values.anchorOn !== plan.anchorAt?.slice(0, 10)
            ? { anchorOn: values.anchorOn }
            : {}),
          ...(!plan.openOccurrence &&
          values.nextDueOn &&
          values.nextDueOn !== plan.nextDueAt?.slice(0, 10)
            ? { nextDueOn: values.nextDueOn }
            : {}),
        },
      });
    else this.store.create({ organizationId: this.organizationId(), input: values });
  }

  /**
   * Method searchEquipment
   *
   * @description
   * Sends an authorized server search.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} search - Search query.
   *
   * @returns {void} Resets equipment option paging.
   */
  protected searchEquipment(search: string): void {
    this.equipmentSearch.set(search);
    this.loadEquipmentPage(1);
  }

  /**
   * Method loadEquipmentPage
   *
   * @description
   * Reads one equipment option page.
   *
   * @access protected
   * @since unreleased
   *
   * @param {number} page - Requested server page.
   *
   * @returns {void} Keeps the selected form label.
   */
  protected loadEquipmentPage(page: number): void {
    this.equipmentPage.set(page);
    this.store.loadEquipment({
      organizationId: this.organizationId(),
      search: this.equipmentSearch(),
      page,
    });
  }

  /**
   * Method setActive
   *
   * @description
   * Changes activation only after date review.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenancePlanOutput} plan - Reviewed saved plan.
   * @param {boolean} active - Explicit desired activation.
   *
   * @returns {void} Sends the backend-owned activation command.
   */
  protected setActive(plan: MaintenancePlanOutput, active: boolean): void {
    this.store.update({
      organizationId: this.organizationId(),
      planId: plan.id,
      input: { active },
    });
  }

  /**
   * Method generate
   *
   * @description
   * Sends bounded work creation or an explicit new attempt.
   *
   * @access protected
   * @since unreleased
   *
   * @param {{ planId: string; retry: boolean }} request - User's generation intent.
   *
   * @returns {void} Preserves the occurrence's original due date.
   */
  protected generate(request: { planId: string; retry: boolean }): void {
    this.store.generate({ organizationId: this.organizationId(), ...request });
  }

  /**
   * Method closeMigration
   *
   * @description
   * Keeps an accepted authority change busy-locked.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} state - Native overlay state.
   *
   * @returns {void} Dismisses only an idle confirmation.
   */
  protected closeMigration(state: string): void {
    if (state === 'closed' && this.store.migrationCallState().status !== 'pending')
      this.migrationConfirmed.set(false);
  }
  //#endregion
}
