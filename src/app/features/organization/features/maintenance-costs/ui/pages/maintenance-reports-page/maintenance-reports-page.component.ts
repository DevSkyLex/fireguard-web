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
import { RouterLink } from '@angular/router';
import { DateTime } from 'luxon';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  MaintenanceEconomicReportOutput,
  MaintenanceEconomicRow,
  MaintenanceFinancialDirectoryQuery,
  MaintenanceFinancialSourceDossier,
  MaintenanceProcurementAmount,
  MaintenanceReportQuery,
  MaintenanceReportScopeKind,
  MaintenanceReportScopeSelection,
} from '@features/organization/features/maintenance-costs/models';
import {
  MaintenanceReportStore,
  type MaintenanceReportStoreType,
} from '@features/organization/features/maintenance-costs/state';
import { formatMaintenanceAmount } from '@features/organization/features/maintenance-costs/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { OrgDatePipe, type RegionalFormatSettings } from '@shared/regional-format';
import { sheetSide } from '@shared/sheet-side';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCollapsibleImports } from '@shared/ui/collapsible';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSheetImports } from '@shared/ui/sheet';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmLarge } from '@shared/ui/typography';
import { MaintenanceFinancialDirectory } from '../../dataviews/maintenance-financial-directory';
import { MaintenanceReportFilterForm } from '../../forms/maintenance-report-filter-form';
import { MaintenanceReportTable } from '../../tables/maintenance-report-table';

/**
 * Class MaintenanceReportsPage
 * @class MaintenanceReportsPage
 *
 * @description
 * Owns read-only economic pilotage, explicit allocation and independent minimal financial directory
 * navigation.
 */
@Component({
  selector: 'app-maintenance-reports-page',
  templateUrl: './maintenance-reports-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MaintenanceReportStore],
  imports: [
    RouterLink,
    OrgDatePipe,
    HlmBadge,
    HlmButton,
    HlmLarge,
    HlmSkeleton,
    MaintenanceFinancialDirectory,
    MaintenanceReportFilterForm,
    MaintenanceReportTable,
    ...HlmCollapsibleImports,
    ...HlmEmptyImports,
    ...HlmAlertImports,
    ...HlmItemImports,
    ...HlmSheetImports,
  ],
})
export class MaintenanceReportsPage {
  //#region Properties
  /**
   * Property scopeKey
   * @readonly
   *
   * @description
   * Credential-free draft reset key for the current account and organization.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly scopeKey: Signal<string> = computed(
    () => `${this.organizationId()}/${this.session.sessionRevision()}`,
  );

  /**
   * Property sourceRow
   * @readonly
   *
   * @description
   * Explicit allocation whose exact original source dossiers are being inspected.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<MaintenanceEconomicRow | null>}
   */
  protected readonly sourceRow: WritableSignal<MaintenanceEconomicRow | null> =
    signal<MaintenanceEconomicRow | null>(null);

  /**
   * Property sourceDossiers
   * @readonly
   *
   * @description
   * Exact named source subset already bounded and authorized by the confirmed report.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly MaintenanceFinancialSourceDossier[]>}
   */
  protected readonly sourceDossiers: Signal<readonly MaintenanceFinancialSourceDossier[]> =
    computed(() => {
      const ids = new Set(this.sourceRow()?.interventionIds ?? []);
      return this.report()?.dossiers.filter((source) => ids.has(source.id)) ?? [];
    });

  /**
   * Property sourceSide
   * @readonly
   *
   * @description
   * Adaptive native sheet placement with comfortable touch behavior.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly sourceSide: Signal<'right' | 'bottom'> = sheetSide();
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Owning organization route context.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property store
   * @readonly
   *
   * @description
   * Route-owned private report and directory state.
   *
   * @access protected
   * @since unreleased
   *
   * @type {MaintenanceReportStoreType}
   */
  protected readonly store: MaintenanceReportStoreType = inject(MaintenanceReportStore);

  /**
   * Property session
   * @readonly
   *
   * @description
   * Current account identity boundary for private request fencing.
   *
   * @access private
   * @since unreleased
   *
   * @type {AuthSessionPort}
   */
  private readonly session: AuthSessionPort = inject(AUTH_SESSION_PORT);

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Effective dedicated financial permissions.
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
   * Property platform
   * @readonly
   *
   * @description
   * Rendering platform used to prevent private reads during SSR.
   *
   * @access private
   * @since unreleased
   *
   * @type {object}
   */
  private readonly platform: object = inject(PLATFORM_ID);

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Interface locale for exact integer and decimal display.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly locale: string = inject(LOCALE_ID);

  /**
   * Property regional
   * @readonly
   *
   * @description
   * Organization civil-date and timezone preferences.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regional: Signal<RegionalFormatSettings> =
    inject(REGIONAL_FORMATTING_PORT).regionalFormatting;

  /**
   * Property enabled
   * @readonly
   *
   * @description
   * Authorized browser session; finance management alone grants no report access.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly enabled: Signal<boolean> = computed(
    () =>
      isPlatformBrowser(this.platform) &&
      this.session.isAuthenticated() &&
      this.permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ),
  );

  /**
   * Property query
   * @readonly
   *
   * @description
   * Requested dates, grouping and scoped filters retained across pagination.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<MaintenanceReportQuery | null>}
   */
  protected readonly query: WritableSignal<MaintenanceReportQuery | null> =
    signal<MaintenanceReportQuery | null>(null);

  /**
   * Property selectedScope
   * @readonly
   *
   * @description
   * Minimal named scope selected from the authorized financial directory.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<MaintenanceReportScopeSelection>}
   */
  protected readonly selectedScope: WritableSignal<MaintenanceReportScopeSelection> =
    signal<MaintenanceReportScopeSelection>({});

  /**
   * Property resetToken
   * @readonly
   *
   * @description
   * New organization or account reset boundary for editable date drafts.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly resetToken: WritableSignal<number> = signal(0);

  /**
   * Property directoryOpen
   * @readonly
   *
   * @description
   * Private directory disclosure state; closed secondary data is not fetched.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly directoryOpen: WritableSignal<boolean> = signal(false);

  /**
   * Property report
   * @readonly
   *
   * @description
   * Confirmed full-scope report with its own dates and pagination metadata.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<MaintenanceEconomicReportOutput | null>}
   */
  protected readonly report: Signal<MaintenanceEconomicReportOutput | null> = computed(
    () => this.store.reportCallState().data,
  );

  /**
   * Property money
   * @readonly
   *
   * @description
   * Exact amount formatter preserving unknown and large six-place values.
   *
   * @access protected
   * @since unreleased
   *
   * @type {typeof formatMaintenanceAmount}
   */
  protected readonly money: typeof formatMaintenanceAmount = formatMaintenanceAmount;

  /**
   * Property renderedScope
   *
   * @description
   * Last rendered account and organization identity.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private renderedScope: string = '';

  /**
   * Property procurementMetrics
   * @readonly
   *
   * @description
   * Separate procurement metrics; they never add to intervention realized totals.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<
   *   readonly { readonly label: string; readonly amount: MaintenanceProcurementAmount }[]
   * >}
   */
  protected readonly procurementMetrics: Signal<
    readonly { readonly label: string; readonly amount: MaintenanceProcurementAmount }[]
  > = computed(() => {
    const overview = this.report()?.procurement;
    return overview
      ? [
          {
            label: $localize`:@@maintenanceReport.procurement.ordered:Committed purchases`,
            amount: overview.ordered,
          },
          {
            label: $localize`:@@maintenanceReport.procurement.received:Gross deliveries`,
            amount: overview.received,
          },
          {
            label: $localize`:@@maintenanceReport.procurement.outstanding:Still to receive`,
            amount: overview.outstanding,
          },
          {
            label: $localize`:@@maintenanceReport.procurement.returned:Declared supplier returns`,
            amount: overview.returned,
          },
        ]
      : [];
  });

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Clears private filters and financial facts at every account or organization boundary.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const organizationId = this.organizationId(),
        sessionRevision = this.session.sessionRevision(),
        enabled = this.enabled();
      untracked(() => {
        const identity = `${organizationId}/${sessionRevision}/${enabled}`;
        if (identity === this.renderedScope) return;
        this.renderedScope = identity;
        this.store.setScope(enabled ? { organizationId, sessionRevision } : null);
        this.selectedScope.set({});
        this.sourceRow.set(null);
        this.directoryOpen.set(false);
        this.resetToken.update((value) => value + 1);
        this.query.set(null);
        if (!enabled) return;
        const end = DateTime.now().setZone(this.regional().timezone);
        const query: MaintenanceReportQuery = {
          from: end.minus({ days: 29 }).toFormat('yyyy-MM-dd'),
          to: end.toFormat('yyyy-MM-dd'),
          groupBy: 'equipment',
          page: 1,
          itemsPerPage: 30,
        };
        this.query.set(query);
        this.loadReport(query);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method loadReport
   * @method loadReport
   *
   * @description
   * Requests one exact server-calculated allocation page without deriving totals from visible rows.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenanceReportQuery} query - Bounded date window, grouping, filters and page.
   *
   * @returns {void} No return value.
   */
  protected loadReport(query: MaintenanceReportQuery): void {
    const scope = this.store.scope();
    if (!scope || !this.enabled()) return;
    this.query.set(query);
    this.sourceRow.set(null);
    this.store.readReport({ scope, query });
  }

  /**
   * Method changePage
   * @method changePage
   *
   * @description
   * Keeps the committed date and target scope while requesting another server page.
   *
   * @access protected
   * @since unreleased
   *
   * @param {number} page - Requested one-based result page.
   *
   * @returns {void} No return value.
   */
  protected changePage(page: number): void {
    const query = this.query();
    if (query) this.loadReport({ ...query, page });
  }

  /**
   * Method changePageSize
   * @method changePageSize
   *
   * @description
   * Returns to the first allocation page after choosing a new bounded result size.
   *
   * @access protected
   * @since unreleased
   *
   * @param {number} itemsPerPage - Requested page size.
   *
   * @returns {void} No return value.
   */
  protected changePageSize(itemsPerPage: number): void {
    const query = this.query();
    if (query) this.loadReport({ ...query, page: 1, itemsPerPage });
  }

  /**
   * Method selectScope
   * @method selectScope
   *
   * @description
   * Replaces target filters with a consistent named context from one authorized directory entry.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenanceReportScopeSelection} selected - Explicit named site, customer or equipment
   *   context.
   *
   * @returns {void} No return value.
   */
  protected selectScope(selected: MaintenanceReportScopeSelection): void {
    const query = this.query();
    if (!query || !this.enabled()) return;
    this.selectedScope.set(selected);
    this.loadReport({
      from: query.from,
      to: query.to,
      groupBy: query.groupBy,
      page: 1,
      itemsPerPage: query.itemsPerPage,
      ...(selected.site ? { siteId: selected.site.id } : {}),
      ...(selected.customer ? { customerId: selected.customer.id } : {}),
      ...(selected.equipment ? { equipmentId: selected.equipment.id } : {}),
    });
  }

  /**
   * Method clearScope
   * @method clearScope
   *
   * @description
   * Explicitly clears one target while preserving editable dates and remaining named selections.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenanceReportScopeKind} kind - Scope dimension to remove, or all dimensions.
   *
   * @returns {void} No return value.
   */
  protected clearScope(kind: MaintenanceReportScopeKind): void {
    const selected = { ...this.selectedScope() };
    if (kind === 'all') this.selectScope({});
    else {
      delete selected[kind];
      this.selectScope(selected);
    }
  }

  /**
   * Method toggleDirectory
   * @method toggleDirectory
   *
   * @description
   * Reads secondary private source identities only after the user opens their disclosure.
   *
   * @access protected
   * @since unreleased
   *
   * @param {boolean} expanded - Requested disclosure visibility.
   *
   * @returns {void} No return value.
   */
  protected toggleDirectory(expanded: boolean): void {
    this.directoryOpen.set(expanded);
    if (expanded) this.loadDirectory(this.store.directoryQuery() ?? { page: 1, itemsPerPage: 30 });
  }

  /**
   * Method loadDirectory
   * @method loadDirectory
   *
   * @description
   * Browses minimal named work sources without ordinary customer, equipment or intervention reads.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenanceFinancialDirectoryQuery} query - Server-paginated source search and optional
   *   scope.
   *
   * @returns {void} No return value.
   */
  protected loadDirectory(query: MaintenanceFinancialDirectoryQuery): void {
    const scope = this.store.scope();
    if (scope && this.enabled()) this.store.readDirectory({ scope, query });
  }

  /**
   * Method searchDirectory
   * @method searchDirectory
   *
   * @description
   * Applies the named work search on the server and resets only its pagination.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} search - Human-readable work reference or name to find.
   *
   * @returns {void} No return value.
   */
  protected searchDirectory(search: string): void {
    this.loadDirectory({
      ...(this.store.directoryQuery() ?? { itemsPerPage: 30 }),
      page: 1,
      search,
    });
  }

  /**
   * Method pageDirectory
   * @method pageDirectory
   *
   * @description
   * Preserves the directory's server search and optional allocation filters.
   *
   * @access protected
   * @since unreleased
   *
   * @param {number} page - Requested source page.
   *
   * @returns {void} No return value.
   */
  protected pageDirectory(page: number): void {
    this.loadDirectory({ ...(this.store.directoryQuery() ?? { itemsPerPage: 30 }), page });
  }

  /**
   * Method resizeDirectory
   * @method resizeDirectory
   *
   * @description
   * Chooses another bounded source page size without resetting its search draft.
   *
   * @access protected
   * @since unreleased
   *
   * @param {number} itemsPerPage - Requested directory page size.
   *
   * @returns {void} No return value.
   */
  protected resizeDirectory(itemsPerPage: number): void {
    this.loadDirectory({ ...this.store.directoryQuery(), page: 1, itemsPerPage });
  }

  /**
   * Method showSourceDossiers
   * @method showSourceDossiers
   *
   * @description
   * Opens the authorized financial source directory for a report allocation destination.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenanceEconomicRow} row - Allocation destination whose original sources are
   *   requested.
   *
   * @returns {void} No return value.
   */
  protected showSourceDossiers(row: MaintenanceEconomicRow): void {
    if (this.enabled() && this.report()) this.sourceRow.set(row);
  }
  //#endregion
}
