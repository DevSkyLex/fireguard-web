import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  LOCALE_ID,
  PLATFORM_ID,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { ConnectivityService } from '@core/connectivity';
import type { StoreError } from '@core/request-state';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  CreateMaintenanceExpenseInput,
  CreateMaintenanceRateInput,
  MaintenanceCostItem,
  MaintenanceCostOutput,
} from '@features/organization/features/maintenance-costs/models';
import {
  MaintenanceCostStore,
  maintenanceCostStoreEvents,
  type MaintenanceCostStoreType,
} from '@features/organization/features/maintenance-costs/state';
import { formatMaintenanceAmount } from '@features/organization/features/maintenance-costs/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_MEMBER_ACCESS_PORT,
  REGIONAL_FORMATTING_PORT,
} from '@features/organization/ports';
import type { OrganizationMemberAccessPort } from '@features/organization/ports/organization-member-access';
import { OrgDatePipe, type RegionalFormatSettings } from '@shared/regional-format';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTabsImports } from '@shared/ui/tabs';
import { HlmLarge } from '@shared/ui/typography';
import type { UnsavedChangesAware } from '@shared/unsaved-changes';
import { MaintenanceCostFacts } from '../../components/maintenance-cost-facts';
import { MaintenanceCostSettings } from '../../components/maintenance-cost-settings';
import { MaintenanceExpenseForm } from '../../forms/maintenance-expense-form';
import {
  MaintenancePlanningForm,
  type MaintenancePlanningIntent,
} from '../../forms/maintenance-planning-form';

/**
 * Class MaintenanceCostsPage
 *
 * @description
 * Owns the private financial route, independent planning revisions and browser/session-scoped
 * reads.
 */
@Component({
  selector: 'app-maintenance-costs-page',
  templateUrl: './maintenance-costs-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MaintenanceCostStore],
  imports: [
    RouterLink,
    OrgDatePipe,
    HlmBadge,
    HlmButton,
    HlmLarge,
    HlmSkeleton,
    MaintenanceCostFacts,
    MaintenanceCostSettings,
    MaintenanceExpenseForm,
    MaintenancePlanningForm,
    ...HlmTabsImports,
    ...HlmEmptyImports,
    ...HlmAlertImports,
  ],
})
export class MaintenanceCostsPage implements UnsavedChangesAware {
  /**
   * Property renderedScope
   *
   * @description
   * Organization, intervention and authenticated-session identity already rendered.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private renderedScope: string = '';
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Owning organization route parameter.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Optional financial dossier context supplied by the route query.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly interventionId: InputSignal<string | undefined> = input<string | undefined>();
  /**
   * Property store
   * @readonly
   *
   * @description
   * Route-scoped browser-only financial state with session fences and stable replay commands.
   *
   * @access protected
   * @since unreleased
   *
   * @type {MaintenanceCostStoreType}
   */
  protected readonly store: MaintenanceCostStoreType = inject(MaintenanceCostStore);
  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Effective API-backed organization permissions.
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
   * Property session
   * @readonly
   *
   * @description
   * Authenticated session boundary that invalidates private data on account replacement.
   *
   * @access private
   * @since unreleased
   *
   * @type {AuthSessionPort}
   */
  private readonly session: AuthSessionPort = inject(AUTH_SESSION_PORT);

  /**
   * Property memberAccess
   * @readonly
   *
   * @description
   * Published actor identity clears local drafts even before session cleanup effects flush.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationMemberAccessPort}
   */
  private readonly memberAccess: OrganizationMemberAccessPort = inject(
    ORGANIZATION_MEMBER_ACCESS_PORT,
  );
  /**
   * Property platform
   * @readonly
   *
   * @description
   * Angular rendering platform used to prevent financial reads during SSR.
   *
   * @access private
   * @since unreleased
   *
   * @type {object}
   */
  private readonly platform: object = inject(PLATFORM_ID);
  /**
   * Property connectivity
   * @readonly
   *
   * @description
   * Current connectivity used to prohibit creating a new financial declaration offline.
   *
   * @access private
   * @since unreleased
   *
   * @type {ConnectivityService}
   */
  private readonly connectivity: ConnectivityService = inject(ConnectivityService);
  /**
   * Property locale
   * @readonly
   *
   * @description
   * Interface locale for exact decimal grouping.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly locale: string = inject(LOCALE_ID);
  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * Organization timezone and date presentation preferences.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    inject(REGIONAL_FORMATTING_PORT).regionalFormatting;
  /**
   * Property tab
   * @readonly
   *
   * @description
   * Selected financial dossier or organization-settings tab.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly tab: WritableSignal<string> = signal('costs');
  /**
   * Property planningReset
   * @readonly
   *
   * @description
   * Confirmed preparation save or context replacement resets this draft.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly planningReset: WritableSignal<number> = signal(0);
  /**
   * Property expenseReset
   * @readonly
   *
   * @description
   * Confirmed expense acknowledgement or context replacement resets this draft.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly expenseReset: WritableSignal<number> = signal(0);
  /**
   * Property currencyReset
   * @readonly
   *
   * @description
   * Confirmed currency acknowledgement or context replacement resets this draft.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly currencyReset: WritableSignal<number> = signal(0);
  /**
   * Property rateReset
   * @readonly
   *
   * @description
   * Confirmed hourly-rate acknowledgement or context replacement resets this draft.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly rateReset: WritableSignal<number> = signal(0);
  /**
   * Property adjustment
   * @readonly
   *
   * @description
   * Original expense currently selected for a motivated signed correction.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<MaintenanceCostItem | null>}
   */
  protected readonly adjustment: WritableSignal<MaintenanceCostItem | null> =
    signal<MaintenanceCostItem | null>(null);
  /**
   * Property money
   * @readonly
   *
   * @description
   * Exact string formatter keeping unknown values distinct from known zero.
   *
   * @access protected
   * @since unreleased
   *
   * @type {typeof formatMaintenanceAmount}
   */
  protected readonly money: typeof formatMaintenanceAmount = formatMaintenanceAmount;
  /**
   * Property canRead
   * @readonly
   *
   * @description
   * Dedicated financial reading permission.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canRead: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ),
  );
  /**
   * Property enabled
   * @readonly
   *
   * @description
   * Private information is available only in an authorized browser session.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly enabled: Signal<boolean> = computed(
    () => isPlatformBrowser(this.platform) && this.session.isAuthenticated() && this.canRead(),
  );
  /**
   * Property canManage
   * @readonly
   *
   * @description
   * Dedicated financial management permission within the current private context.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canManage: Signal<boolean> = computed(
    () =>
      this.enabled() &&
      this.permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE),
  );
  /**
   * Property membersAllowed
   * @readonly
   *
   * @description
   * Independent member-directory permission required to choose named hourly-rate owners.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly membersAllowed: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.MEMBERS_READ),
  );
  /**
   * Property canReadInterventions
   * @readonly
   *
   * @description
   * Independent work permission controlling links to the intervention routes.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadInterventions: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_READ),
  );
  /**
   * Property canWrite
   * @readonly
   *
   * @description
   * Authorized online state without an accepted or uncertain financial write.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canWrite: Signal<boolean> = computed(
    () =>
      this.canManage() &&
      this.connectivity.isOnline() &&
      this.store.journalReady() &&
      !this.store.writePending() &&
      !this.store.uncertainWrite(),
  );
  /**
   * Property cost
   * @readonly
   *
   * @description
   * Dedicated private financial dossier, including the separate closure snapshot.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<MaintenanceCostOutput | null>}
   */
  protected readonly cost: Signal<MaintenanceCostOutput | null> = computed(
    () => this.store.costCallState().data,
  );
  /**
   * Property planningError
   * @readonly
   *
   * @description
   * Failure of the retained preparation command.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<StoreError | null>}
   */
  protected readonly planningError: Signal<StoreError | null> = computed(() =>
    this.store.command()?.kind === 'planning' ? this.store.writeCallState().error : null,
  );
  /**
   * Property expenseError
   * @readonly
   *
   * @description
   * Failure of the retained expense command.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<StoreError | null>}
   */
  protected readonly expenseError: Signal<StoreError | null> = computed(() =>
    this.store.command()?.kind === 'expense' ? this.store.writeCallState().error : null,
  );
  /**
   * Property currencyError
   * @readonly
   *
   * @description
   * Failure of the retained currency command.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<StoreError | null>}
   */
  protected readonly currencyError: Signal<StoreError | null> = computed(() =>
    this.store.command()?.kind === 'currency' ? this.store.writeCallState().error : null,
  );
  /**
   * Property rateError
   * @readonly
   *
   * @description
   * Failure of the retained hourly-rate command.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<StoreError | null>}
   */
  protected readonly rateError: Signal<StoreError | null> = computed(() =>
    this.store.command()?.kind === 'rate' ? this.store.writeCallState().error : null,
  );
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Connects native draft initialization and private financial session transitions.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const organizationId = this.organizationId(),
        interventionId = this.interventionId() ?? null,
        revision = this.session.sessionRevision(),
        userId = this.memberAccess.profile()?.userId ?? '',
        enabled = this.enabled();
      const valid =
        !interventionId ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          interventionId,
        );
      untracked(() => {
        const identity = `${organizationId}/${interventionId ?? ''}/${revision}/${userId}/${enabled}`;
        if (identity !== this.renderedScope) {
          this.renderedScope = identity;
          this.planningReset.update((value) => value + 1);
          this.expenseReset.update((value) => value + 1);
          this.currencyReset.update((value) => value + 1);
          this.rateReset.update((value) => value + 1);
        }
        this.adjustment.set(null);
        const scope = enabled
          ? {
              organizationId,
              interventionId: valid ? (interventionId?.toLowerCase() ?? null) : null,
              sessionRevision: revision,
            }
          : null;
        this.store.setScope(scope);
        this.store.readCost(scope);
      });
    });
    effect(() => {
      const settings = this.tab() === 'settings',
        scope = this.store.scope(),
        allowed = this.enabled(),
        members = this.membersAllowed();
      untracked(() => {
        const query = settings && allowed ? scope : null;
        this.store.readCurrency(query);
        this.store.readRates(query ? { scope: query, page: 1 } : null);
        this.store.readMembers(query && members ? query : null);
      });
    });
    inject(Events)
      .on(maintenanceCostStoreEvents.saved)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        if (payload.organizationId !== this.organizationId()) return;
        switch (payload.kind) {
          case 'planning':
            this.planningReset.update((value) => value + 1);
            break;
          case 'expense':
            this.expenseReset.update((value) => value + 1);
            this.adjustment.set(null);
            break;
          case 'currency':
            this.currencyReset.update((value) => value + 1);
            break;
          case 'rate':
            this.rateReset.update((value) => value + 1);
            break;
        }
      });
  }
  /**
   * Method changeTab
   *
   * @description
   * Selects one of the two allowed financial workspace tabs.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} tab - Selected tab identifier.
   *
   * @returns {void} No return value.
   */
  protected changeTab(tab: string): void {
    if (tab === 'costs' || tab === 'settings') this.tab.set(tab);
  }
  /**
   * Method reloadCost
   *
   * @description
   * Reads the latest current and frozen dossier without resetting unacknowledged edits.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected reloadCost(): void {
    if (this.enabled()) this.store.readCost(this.store.scope());
  }
  /**
   * Method reloadCurrency
   *
   * @description
   * Reads the latest organization currency and its server lock.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected reloadCurrency(): void {
    if (this.enabled()) this.store.readCurrency(this.store.scope());
  }
  /**
   * Method reloadRates
   *
   * @description
   * Reads a bounded page of immutable hourly-rate history.
   *
   * @access protected
   * @since unreleased
   *
   * @param {unknown} page - Requested bounded history page.
   *
   * @returns {void} No return value.
   */
  protected reloadRates(page = this.store.ratePage()): void {
    const scope = this.store.scope();
    if (scope && this.enabled()) this.store.readRates({ scope, page });
  }
  /**
   * Method savePlanning
   *
   * @description
   * Saves exact forecast fields with the independent displayed preparation revision.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenancePlanningIntent} intent - Validated forecast with its displayed revision.
   *
   * @returns {void} No return value.
   */
  protected savePlanning(intent: MaintenancePlanningIntent): void {
    const cost = this.cost();
    if (!cost?.planningEditable || !this.canWrite()) return;
    this.store.write({
      kind: 'planning',
      organizationId: this.organizationId(),
      interventionId: cost.interventionId,
      input: intent.input,
      revision: intent.revision,
    });
  }
  /**
   * Method saveExpense
   *
   * @description
   * Assigns one stable replay identity to a validated expense or signed adjustment.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Omit<CreateMaintenanceExpenseInput, 'clientId'>} declaration - Validated exact immutable
   *   declaration.
   *
   * @returns {void} No return value.
   */
  protected saveExpense(declaration: Omit<CreateMaintenanceExpenseInput, 'clientId'>): void {
    const cost = this.cost();
    if (!cost || !this.canWrite()) return;
    this.store.write({
      kind: 'expense',
      organizationId: this.organizationId(),
      interventionId: cost.interventionId,
      input: { ...declaration, clientId: crypto.randomUUID() },
    });
  }
  /**
   * Method saveCurrency
   *
   * @description
   * Updates an unlocked organization currency with financial management permission.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} currency - Contract input value.
   *
   * @returns {void} No return value.
   */
  protected saveCurrency(currency: string): void {
    if (this.canWrite() && !this.store.currencyCallState().data?.locked)
      this.store.write({ kind: 'currency', organizationId: this.organizationId(), currency });
  }
  /**
   * Method saveRate
   *
   * @description
   * Assigns one stable replay identity to a validated dated hourly rate.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Omit<CreateMaintenanceRateInput, 'clientId'>} declaration - Validated exact immutable
   *   declaration.
   *
   * @returns {void} No return value.
   */
  protected saveRate(declaration: Omit<CreateMaintenanceRateInput, 'clientId'>): void {
    if (this.canWrite())
      this.store.write({
        kind: 'rate',
        organizationId: this.organizationId(),
        input: { ...declaration, clientId: crypto.randomUUID() },
      });
  }
  /**
   * Method adjust
   *
   * @description
   * Selects the original immutable expense for a motivated signed adjustment.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenanceCostItem} item - Original operational contribution.
   *
   * @returns {void} No return value.
   */
  protected adjust(item: MaintenanceCostItem): void {
    if (this.canWrite()) this.adjustment.set(item);
  }
  /**
   * Method retryWrite
   *
   * @description
   * Replays the retained unchanged declaration to confirm an uncertain server acknowledgement.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected retryWrite(): void {
    if (this.canManage() && this.connectivity.isOnline()) this.store.retryWrite();
  }

  /**
   * Method recoverCommands
   * @method recoverCommands
   *
   * @description
   * Retries durable journal recovery before permitting a new financial declaration.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected recoverCommands(): void {
    if (this.enabled()) this.store.hydrate(this.store.scope());
  }

  /**
   * Method hasUnsavedChanges
   * @method hasUnsavedChanges
   *
   * @description
   * Accepted writes retain their live request owner until transmission settles.
   *
   * @access public
   * @since unreleased
   *
   * @returns {boolean} Whether navigation would destroy an active write.
   */
  public hasUnsavedChanges(): boolean {
    return this.enabled() && !!this.store.command() && this.store.writePending();
  }

  /**
   * Method confirmDeactivation
   * @method confirmDeactivation
   *
   * @description
   * Active writes finish before navigation; durable uncertain intentions remain safe to leave.
   *
   * @access public
   * @since unreleased
   *
   * @returns {Promise<boolean>} Navigation waits for the current request.
   */
  public confirmDeactivation(): Promise<boolean> {
    return Promise.resolve(!this.hasUnsavedChanges());
  }
}
