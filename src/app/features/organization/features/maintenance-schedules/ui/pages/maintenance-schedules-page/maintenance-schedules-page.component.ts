import type { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  type InputSignal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendar,
  lucideCircleAlert,
  lucideClock,
  lucideDownload,
  lucideMapPin,
  lucidePackage,
  lucideSparkles,
  lucideTag,
} from '@ng-icons/lucide';
import type { BrnOverlayState } from '@spartan-ng/brain/overlay';
import { debounceTime, distinctUntilChanged, take } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import { isCallSuccess } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { MaintenanceScheduleService } from '@features/organization/features/maintenance-schedules/data-access';
import type {
  GenerateMaintenanceCampaignInput,
  MaintenanceDueStatus,
  MaintenanceScheduleOutput,
} from '@features/organization/features/maintenance-schedules/models';
import { resolveMaintenanceTag } from '@features/organization/features/maintenance-schedules/models';
import {
  MaintenanceSchedulesStore,
  type MaintenanceSchedulesStoreType,
} from '@features/organization/features/maintenance-schedules/state';
import { iriId } from '@features/organization/features/maintenance-schedules/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  REGIONAL_FORMATTING_PORT,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import { BrowserDownloadService } from '@features/organization/services/browser-download';
import { buildCsvExportFilename, resolveCsvExportErrorDetail } from '@features/organization/utils';
import {
  CollectionFilterBar,
  CollectionFilterDate,
  CollectionFilterSelect,
  CollectionFilterToggle,
  initialCollectionFilterBarVisibility,
  type CollectionFilterField,
  type CollectionFilterOption,
} from '@shared/collection-filters';
import { CollectionPagination } from '@shared/collection-pagination';
import { CollectionSearchBox, CollectionToolbar } from '@shared/collection-toolbar';
import type { RegionalFormatSettings } from '@shared/regional-format';
import { ResourceIllustration } from '@shared/resource-illustration';
import { StateIllustration } from '@shared/state-illustration';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSpinner } from '@shared/ui/spinner';
import { MaintenanceDueStatusTag } from '../../components/maintenance-due-status-tag';
import { MaintenanceCampaignDialog } from '../../dialogs/maintenance-campaign-dialog';
import { MaintenanceOverrideDialog } from '../../dialogs/maintenance-override-dialog';
import { MaintenanceScheduleTable } from '../../tables/maintenance-schedule-table';

/**
 * Constant PAGE_SIZES
 *
 * @description
 * The page sizes offered under the table — the server default first.
 */
const PAGE_SIZES: readonly [number, number, number] = [30, 60, 100];

/**
 * Constant SEARCH_DEBOUNCE_MS
 *
 * @description
 * How long typing settles before the search reaches the wire.
 */
const SEARCH_DEBOUNCE_MS: number = 300;

/**
 * Constant DUE_STATUS_VALUES
 *
 * @description
 * Every due-status chip offered in the filter bar.
 */
const DUE_STATUS_VALUES: readonly MaintenanceDueStatus[] = [
  'unscheduled',
  'up_to_date',
  'due_soon',
  'overdue',
];

/**
 * Constant FACILITY_OPTIONS_PAGE_SIZE
 *
 * @description
 * How many facilities the scoping select fetches — organizations rarely exceed this.
 */
const FACILITY_OPTIONS_PAGE_SIZE: number = 200;

/**
 * Type MaintenanceScheduleFilterKey
 *
 * @description
 * Names the filter controls that can be applied to the maintenance schedule list.
 *
 * @type MaintenanceScheduleFilterKey
 */
type MaintenanceScheduleFilterKey = 'dueStatus' | 'facility' | 'equipmentType' | 'dueBefore';

/**
 * Interface MaintenanceScheduleFilters
 * @interface
 *
 * @description
 * The page's own narrowing state — questions asked now, so never persisted.
 * {@link dueBefore} is a `Date`, matching what `app-collection-filter-date`
 * emits; it is converted to an ISO-8601 string only where the store's
 * `load` input requires one.
 */
interface MaintenanceScheduleFilters {
  /**
   * Property dueStatus
   * @readonly
   *
   * @description
   * Selects the due status variant used to interpret this maintenance schedule filters.
   *
   * @access public
   *
   * @type {MaintenanceDueStatus | null}
   */
  readonly dueStatus: MaintenanceDueStatus | null;

  /**
   * Property facility
   * @readonly
   *
   * @description
   * Filters maintenance schedules to the selected facility.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly facility: string | null;

  /**
   * Property equipmentType
   * @readonly
   *
   * @description
   * Filters maintenance schedules to the selected equipment type.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly equipmentType: string | null;

  /**
   * Property dueBefore
   * @readonly
   *
   * @description
   * Limits maintenance schedules to items due before this date.
   *
   * @access public
   *
   * @type {Date | null}
   */
  readonly dueBefore: Date | null;
}

/**
 * Class MaintenanceSchedulesPage
 * @class MaintenanceSchedulesPage
 *
 * @description
 * Route entry page for the organization's maintenance schedules: a
 * `app-collection-filter-toggle` above an editable `app-collection-filter-bar`
 * carrying all four structured narrowings this endpoint accepts — due status,
 * facility, equipment type, due-before — as chips (`@shared/collection-filters`),
 * above the grid. The shared search box debounces free-text input before
 * forwarding it through `MaintenanceScheduleListOptions`. An interval-override dialog is gated
 * `organization.maintenance.manage`, and a "Generate inspection campaign"
 * header action is gated on that permission **and**
 * `organization.interventions.plan` together — a single 403 otherwise, so
 * the button only ever offers what the backend will actually accept.
 * Owns the query the table renders (filters, paging), the two dialogs'
 * visibility, and the campaign success reaction: the store already toasts
 * on success (`campaignSucceeded`), so this page's own job is closing the
 * dialog and navigating to the created intervention. Also resolves the
 * table's `facilityLabelOf` input ({@link tableFacilityLabelOf}) from its
 * own {@link facilityOptions}, so the grid can disambiguate rows sharing an
 * equipment type across facilities.
 * Every chip's value control is now one of `@shared/collection-filters`'
 * generic field components — `app-collection-filter-select` for "Due
 * status", "Facility" and "Equipment type", `app-collection-filter-date`
 * for "Due before" — replacing the page's earlier hand-rolled `hlm-select`
 * and `hlm-date-picker` markup, which had drifted from the shared trigger
 * chrome other converted collection pages already carry (no width clamp, no
 * hover surface, no double-padding fix). "Facility" and "Equipment type"
 * offer a popover search — the former's catalog is organization-sized and
 * unbounded, the latter's twelve-entry `EQUIPMENT_TYPE_OPTIONS` is the same
 * catalog the equipments feature's own type filter already searches; "Due
 * status" stays unsearched at four fixed entries.
 *
 * @version 1.3.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-maintenance-schedules-page',
  imports: [
    NgIcon,
    RouterLink,
    ...HlmEmptyImports,
    ResourceIllustration,
    StateIllustration,
    MaintenanceDueStatusTag,
    MaintenanceScheduleTable,
    MaintenanceOverrideDialog,
    MaintenanceCampaignDialog,
    CollectionFilterBar,
    CollectionFilterDate,
    CollectionFilterSelect,
    CollectionFilterToggle,
    CollectionPagination,
    CollectionSearchBox,
    CollectionToolbar,
    HlmButton,
    HlmSpinner,
  ],
  providers: [
    provideIcons({
      lucideCalendar,
      lucideCircleAlert,
      lucideClock,
      lucideDownload,
      lucideMapPin,
      lucidePackage,
      lucideSparkles,
      lucideTag,
    }),
  ],
  templateUrl: './maintenance-schedules-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenanceSchedulesPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * The workspace whose schedules are listed, bound from the route.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property listForbidden
   * @readonly
   *
   * @description
   * Indicates whether the current organization member may view the schedule list.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly listForbidden: Signal<boolean> = computed<boolean>(() =>
    this.store.isListForbidden(),
  );

  //#endregion

  //#region Properties
  /**
   * Property regionalFormattingPort
   * @readonly
   *
   * @description
   * Provides organization-specific date and timezone formatting settings.
   *
   * @access private
   * @since unreleased
   *
   * @type {RegionalFormattingPort}
   */
  private readonly regionalFormattingPort: RegionalFormattingPort =
    inject<RegionalFormattingPort>(REGIONAL_FORMATTING_PORT);

  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * The active organization's date pattern and timezone, read by `appOrgDate` bindings and
   * forwarded to date-rendering children.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    this.regionalFormattingPort.regionalFormatting;

  /**
   * Property store
   * @readonly
   *
   * @description
   * Provides the schedule rows, filters, and loading state for this page.
   *
   * @access protected
   * @since unreleased
   *
   * @type {MaintenanceSchedulesStoreType}
   */
  protected readonly store: MaintenanceSchedulesStoreType =
    inject<MaintenanceSchedulesStoreType>(MaintenanceSchedulesStore);

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Checks the current member’s schedule permissions.
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
   * Property facilityService
   * @readonly
   *
   * @description
   * Loads facilities used by schedule filters and forms.
   *
   * @access private
   * @since unreleased
   *
   * @type {FacilityService}
   */
  private readonly facilityService: FacilityService = inject(FacilityService);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Navigates to schedule, facility, and equipment routes.
   *
   * @access private
   * @since unreleased
   *
   * @type {Router}
   */
  private readonly router: Router = inject(Router);

  /**
   * Property maintenanceScheduleService
   * @readonly
   *
   * @description
   * Loads and exports maintenance schedule data.
   *
   * @access private
   * @since unreleased
   *
   * @type {MaintenanceScheduleService}
   */
  private readonly maintenanceScheduleService: MaintenanceScheduleService = inject(
    MaintenanceScheduleService,
  );

  /**
   * Property browserDownload
   * @readonly
   *
   * @description
   * Downloads the generated schedule export in the browser.
   *
   * @access private
   * @since unreleased
   *
   * @type {BrowserDownloadService}
   */
  private readonly browserDownload: BrowserDownloadService = inject(BrowserDownloadService);

  /**
   * Property feedback
   * @readonly
   *
   * @description
   * Reports success and failure messages to the operator.
   *
   * @access private
   * @since unreleased
   *
   * @type {FeedbackService}
   */
  private readonly feedback: FeedbackService = inject(FeedbackService);

  /**
   * Property destroyRef
   * @readonly
   *
   * @description
   * Scopes subscriptions to the lifetime of this page.
   *
   * @access private
   * @since unreleased
   *
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /**
   * Property exportBusy
   * @readonly
   *
   * @description
   * Tracks whether a schedule export is being prepared.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly exportBusy: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property exportDisabled
   * @readonly
   *
   * @description
   * Disables export while data is loading, an export is running, or no schedules exist.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly exportDisabled: Signal<boolean> = computed(
    (): boolean => this.store.isLoading() || this.exportBusy() || this.store.totalSchedules() === 0,
  );

  /**
   * Property filters
   * @readonly
   *
   * @description
   * Stores the applied due, facility, equipment-type, and date filters.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<MaintenanceScheduleFilters>}
   */
  protected readonly filters: WritableSignal<MaintenanceScheduleFilters> =
    signal<MaintenanceScheduleFilters>({
      dueStatus: null,
      facility: null,
      equipmentType: null,
      dueBefore: null,
    });

  /**
   * Property draftSearch
   * @readonly
   *
   * @description
   * Holds search text before it is applied to the schedule query.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly draftSearch: WritableSignal<string> = signal<string>('');

  /**
   * Property searchTerm
   * @readonly
   *
   * @description
   * Stores the search term applied to the schedule list.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly searchTerm: WritableSignal<string> = signal<string>('');

  /**
   * Property page
   * @readonly
   *
   * @description
   * Tracks the current schedule-list page.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly page: WritableSignal<number> = signal<number>(1);

  /**
   * Property pageSize
   * @readonly
   *
   * @description
   * Sets the number of schedule rows displayed per page.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly pageSize: WritableSignal<number> = signal<number>(PAGE_SIZES[0]);

  /**
   * Property dueStatusOptions
   * @readonly
   *
   * @description
   * Due-status choices offered in the "Due status" chip, labelled through the maintenance tag
   * registry rather than a second copy (`ARCHITECTURE.md` §10.10).
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {readonly CollectionFilterOption[]}
   */
  protected readonly dueStatusOptions: readonly CollectionFilterOption[] = DUE_STATUS_VALUES.map(
    (status: MaintenanceDueStatus): CollectionFilterOption => ({
      value: status,
      label: resolveMaintenanceTag(status).label,
    }),
  );

  /**
   * Property equipmentTypeOptions
   * @readonly
   *
   * @description
   * Provides equipment-type choices available to the schedule filter.
   *
   * @access protected
   * @since unreleased
   *
   * @type {typeof EQUIPMENT_TYPE_OPTIONS}
   */
  protected readonly equipmentTypeOptions: typeof EQUIPMENT_TYPE_OPTIONS = EQUIPMENT_TYPE_OPTIONS;

  /**
   * Property facilityOptions
   * @readonly
   *
   * @description
   * Provides facility choices available to the schedule filter.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<
   *     ReadonlyArray<{ readonly label: string; readonly value: string }>
   *   >}
   */
  protected readonly facilityOptions: WritableSignal<
    ReadonlyArray<{ readonly label: string; readonly value: string }>
  > = signal([]);

  /**
   * Property overrideTarget
   * @readonly
   *
   * @description
   * Identifies the schedule selected for an override action.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<MaintenanceScheduleOutput | null>}
   */
  protected readonly overrideTarget: WritableSignal<MaintenanceScheduleOutput | null> =
    signal<MaintenanceScheduleOutput | null>(null);

  /**
   * Property overrideDialogVisible
   * @readonly
   *
   * @description
   * Controls visibility of the schedule override dialog.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly overrideDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property campaignDialogVisible
   * @readonly
   *
   * @description
   * Controls visibility of the maintenance campaign dialog.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly campaignDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property items
   * @readonly
   *
   * @description
   * Returns the schedule rows displayed on the current page.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly MaintenanceScheduleOutput[]>}
   */
  protected readonly items: Signal<readonly MaintenanceScheduleOutput[]> = computed(() =>
    this.store.schedules(),
  );

  /**
   * Property pageCount
   * @readonly
   *
   * @description
   * How many pages the current total spans, at least one.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly pageCount: Signal<number> = computed<number>(() =>
    Math.max(1, Math.ceil(this.store.totalSchedules() / this.pageSize())),
  );

  /**
   * Property filterFields
   * @readonly
   *
   * @description
   * Defines the filter controls and their current values.
   *
   * @access protected
   * @since unreleased
   *
   * @type {readonly CollectionFilterField[]}
   */
  protected readonly filterFields: readonly CollectionFilterField[] = [
    {
      key: 'dueStatus',
      fieldLabel: $localize`:@@maintenance.filter.dueStatus:Due status`,
      icon: 'lucideClock',
      operators: ['equals'],
    },
    {
      key: 'facility',
      fieldLabel: $localize`:@@maintenance.filter.facility:Facility`,
      icon: 'lucideMapPin',
      operators: ['equals'],
    },
    {
      key: 'equipmentType',
      fieldLabel: $localize`:@@maintenance.filter.equipmentType:Equipment type`,
      icon: 'lucideTag',
      operators: ['equals'],
    },
    {
      key: 'dueBefore',
      fieldLabel: $localize`:@@maintenance.filter.dueBefore:Due before`,
      icon: 'lucideCalendar',
      operators: ['lessThan'],
      operatorLabels: {
        lessThan: $localize`:@@maintenance.filter.dueBeforeOperator:before`,
      },
    },
  ];

  /**
   * Property activeFilterKeys
   * @readonly
   *
   * @description
   * Which of {@link filterFields} currently carry a value — the bar's `activeKeys` input and
   * {@link hasFilters} both read this.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly activeFilterKeys: Signal<readonly string[]> = computed<readonly string[]>(
    () => {
      const current: MaintenanceScheduleFilters = this.filters();

      return [
        ...(current.dueStatus !== null ? ['dueStatus'] : []),
        ...(current.facility !== null ? ['facility'] : []),
        ...(current.equipmentType !== null ? ['equipmentType'] : []),
        ...(current.dueBefore !== null ? ['dueBefore'] : []),
      ];
    },
  );

  /**
   * Property hasFilters
   * @readonly
   *
   * @description
   * Indicates whether any schedule filter is active.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasFilters: Signal<boolean> = computed<boolean>(
    () => this.searchTerm() !== '' || this.activeFilterKeys().length > 0,
  );

  /**
   * Property openFilterKey
   * @readonly
   *
   * @description
   * Identifies the filter popover currently open.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<MaintenanceScheduleFilterKey | null>}
   */
  protected readonly openFilterKey: WritableSignal<MaintenanceScheduleFilterKey | null> =
    signal<MaintenanceScheduleFilterKey | null>(null);

  /**
   * Property filtersVisible
   * @readonly
   *
   * @description
   * Whether `app-collection-filter-bar` is currently mounted below the toolbar — presentation-only.
   * Seeded by `initialCollectionFilterBarVisibility` (`@shared/collection-filters`), then purely
   * driven by `app-collection-filter-toggle`.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly filtersVisible: WritableSignal<boolean> = initialCollectionFilterBarVisibility(
    this.hasFilters,
  );

  /**
   * Property dueStatusChipTemplate
   * @readonly
   *
   * @description
   * Provides the chip template for an applied due-status filter.
   *
   * @access private
   * @since unreleased
   *
   * @type {unknown}
   */
  private readonly dueStatusChipTemplate = viewChild<TemplateRef<unknown>>('dueStatusChip');

  /**
   * Property facilityChipTemplate
   * @readonly
   *
   * @description
   * Provides the chip template for an applied facility filter.
   *
   * @access private
   * @since unreleased
   *
   * @type {unknown}
   */
  private readonly facilityChipTemplate = viewChild<TemplateRef<unknown>>('facilityChip');

  /**
   * Property equipmentTypeChipTemplate
   * @readonly
   *
   * @description
   * Provides the chip template for an applied equipment-type filter.
   *
   * @access private
   * @since unreleased
   *
   * @type {unknown}
   */
  private readonly equipmentTypeChipTemplate = viewChild<TemplateRef<unknown>>('equipmentTypeChip');

  /**
   * Property dueBeforeChipTemplate
   * @readonly
   *
   * @description
   * Provides the chip template for an applied due-date filter.
   *
   * @access private
   * @since unreleased
   *
   * @type {unknown}
   */
  private readonly dueBeforeChipTemplate = viewChild<TemplateRef<unknown>>('dueBeforeChip');

  /**
   * Property chipTemplates
   * @readonly
   *
   * @description
   * Every filter field's value-control `TemplateRef`, for `app-collection-filter-bar`'s `templates`
   * input.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<Readonly<Record<string, TemplateRef<unknown> | undefined>>>}
   */
  protected readonly chipTemplates: Signal<
    Readonly<Record<string, TemplateRef<unknown> | undefined>>
  > = computed(() => ({
    dueStatus: this.dueStatusChipTemplate(),
    facility: this.facilityChipTemplate(),
    equipmentType: this.equipmentTypeChipTemplate(),
    dueBefore: this.dueBeforeChipTemplate(),
  }));

  /**
   * Property canManage
   * @readonly
   *
   * @description
   * Indicates whether the current member may manage maintenance schedules.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canManage: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_MANAGE),
  );

  /**
   * Property canPlanCampaign
   * @readonly
   *
   * @description
   * Indicates whether the current member may create a maintenance campaign.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canPlanCampaign: Signal<boolean> = computed<boolean>(
    () =>
      this.canManage() &&
      this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /**
   * Property equipmentRouteBase
   * @readonly
   *
   * @description
   * Builds the route prefix used to open equipment details.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly equipmentRouteBase: Signal<readonly string[]> = computed<readonly string[]>(
    () => ['/organizations', this.organizationId(), 'equipments'],
  );

  /**
   * Property facilityRouteBase
   * @readonly
   *
   * @description
   * Builds the route prefix used to open facility details.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly facilityRouteBase: Signal<readonly string[]> = computed<readonly string[]>(
    () => ['/organizations', this.organizationId(), 'facilities'],
  );

  /**
   * Property pageActionsService
   * @readonly
   *
   * @description
   * Creates the page action model for schedule-page commands.
   *
   * @access private
   * @since unreleased
   *
   * @type {PageActionsService}
   */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /**
   * Property pageActions
   * @readonly
   *
   * @description
   * Exposes the actions available from the maintenance schedules page.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the load effect over the active filters and paging, fetches the
   * facility scoping options once, registers {@link pageActions}, and
   * auto-closes each dialog on its own operation's success — the override
   * dialog on `overrideCallState` success, the campaign dialog by navigating
   * to the created intervention once `campaignResult` lands.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    registerPageActions(this.pageActions, this.pageActionsService, inject(DestroyRef));

    toObservable(this.draftSearch)
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term: string): void => {
        const search: string = term.trim();
        if (search === this.searchTerm()) return;

        this.page.set(1);
        this.searchTerm.set(search);
      });

    effect((): void => {
      const organizationId: string = this.organizationId();

      untracked((): void => {
        this.facilityService
          .list(organizationId, { itemsPerPage: FACILITY_OPTIONS_PAGE_SIZE })
          .subscribe((response) => {
            this.facilityOptions.set(
              response.member.map((facility) => ({ label: facility.name, value: facility['@id'] })),
            );
          });
      });
    });

    effect((): void => {
      const organizationId: string = this.organizationId();
      const current: MaintenanceScheduleFilters = this.filters();
      const search: string = this.searchTerm();
      const page: number = this.page();
      const pageSize: number = this.pageSize();

      untracked((): void => {
        this.store.load({
          organization: `/api/organizations/${organizationId}`,
          facility: current.facility ?? undefined,
          equipmentType: current.equipmentType ?? undefined,
          dueStatus: current.dueStatus ?? undefined,
          dueBefore: current.dueBefore?.toISOString(),
          search: search || undefined,
          page,
          itemsPerPage: pageSize,
        });
      });
    });

    effect((): void => {
      const state = this.store.overrideCallState();

      untracked((): void => {
        if (isCallSuccess(state) && this.overrideDialogVisible()) {
          this.overrideDialogVisible.set(false);
          this.overrideTarget.set(null);
          this.store.resetOverrideOperation();
        }
      });
    });

    effect((): void => {
      const result = this.store.campaignResult();

      untracked((): void => {
        if (result) {
          this.campaignDialogVisible.set(false);
          this.store.resetCampaignOperation();
          void this.router.navigate([
            '/organizations',
            this.organizationId(),
            'interventions',
            result.interventionId,
          ]);
        }
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onSearchQueryChanged
   * @method onSearchQueryChanged
   *
   * @description
   * Updates the draft search value before it is applied to the schedule query.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} term - Search text entered in the schedule list.
   *
   * @returns {void}
   */
  protected onSearchQueryChanged(term: string): void {
    this.draftSearch.set(term);
  }

  /**
   * Property tableFacilityLabelOf
   *
   * @description
   * Resolves a bare facility id — as {@link MaintenanceScheduleTable} reads
   * it off `MaintenanceScheduleOutput.facility` — to its name from
   * {@link facilityOptions}, whose own `value` is the full facility IRI.
   * Passed to the table as its `facilityLabelOf` input so two rows sharing
   * an equipment type at different facilities render distinguishable text
   * and accessible names.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {unknown}
   *
   * @param {string} facilityId - The bare facility id.
   *
   * @returns {string | null} The facility's name, or `null` when it does not resolve.
   */
  protected tableFacilityLabelOf = (facilityId: string): string | null =>
    this.facilityOptions().find((option) => iriId(option.value) === facilityId)?.label ?? null;

  /**
   * Method applyFilter
   * @method applyFilter
   *
   * @description
   * Replaces one narrowing, which reloads the list from the first page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Partial<MaintenanceScheduleFilters>} patch - The field to change.
   *
   * @returns {void}
   */
  protected applyFilter(patch: Partial<MaintenanceScheduleFilters>): void {
    this.page.set(1);
    this.filters.update((current) => ({ ...current, ...patch }));
  }

  /**
   * Method onFieldPicked
   * @method onFieldPicked
   *
   * @description
   * Reacts to the filter bar's `fieldPicked` output by forcing the picked field's value control
   * open.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {string} key - The field key the bar's "+ Filter" menu just picked.
   *
   * @returns {void}
   */
  protected onFieldPicked(key: string): void {
    this.openFilterKey.set(key as MaintenanceScheduleFilterKey);
  }

  /**
   * Method onFieldRemoved
   * @method onFieldRemoved
   *
   * @description
   * Reacts to the filter bar's `fieldRemoved` output by clearing that field's narrowing.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {string} key - The field key a chip's remove button cleared.
   *
   * @returns {void}
   */
  protected onFieldRemoved(key: string): void {
    switch (key as MaintenanceScheduleFilterKey) {
      case 'dueStatus':
        this.applyFilter({ dueStatus: null });
        return;
      case 'facility':
        this.applyFilter({ facility: null });
        return;
      case 'equipmentType':
        this.applyFilter({ equipmentType: null });
        return;
      case 'dueBefore':
        this.applyFilter({ dueBefore: null });
        return;
    }
  }

  /**
   * Method toggleFiltersVisible
   * @method toggleFiltersVisible
   *
   * @description
   * Reacts to `app-collection-filter-toggle`'s `visibleChange` by setting {@link filtersVisible} to
   * the value it reports.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {boolean} visible - The toggle button's intended next state.
   *
   * @returns {void}
   */
  protected toggleFiltersVisible(visible: boolean): void {
    this.filtersVisible.set(visible);
  }

  /**
   * Method fieldPopoverState
   * @method fieldPopoverState
   *
   * @description
   * Whether a field's value control should currently render open — true only for
   * {@link openFilterKey}.
   *
   * @access protected
   * @since 1.3.0
   *
   * @param {MaintenanceScheduleFilterKey} key - The field to read.
   *
   * @returns {BrnOverlayState} `'open'` or `'closed'`.
   */
  protected fieldPopoverState(key: MaintenanceScheduleFilterKey): BrnOverlayState {
    return this.openFilterKey() === key ? 'open' : 'closed';
  }

  /**
   * Method onFieldPopoverStateChanged
   * @method onFieldPopoverStateChanged
   *
   * @description
   * Keeps {@link openFilterKey} in sync with a field's own value control.
   *
   * @access protected
   * @since 1.3.0
   *
   * @param {MaintenanceScheduleFilterKey} key - The field whose value control changed.
   * @param {BrnOverlayState} state - Its next state.
   *
   * @returns {void}
   */
  protected onFieldPopoverStateChanged(
    key: MaintenanceScheduleFilterKey,
    state: BrnOverlayState,
  ): void {
    if (state === 'open') {
      this.openFilterKey.set(key);
      return;
    }

    if (this.openFilterKey() === key) this.openFilterKey.set(null);
  }

  /**
   * Method clearFilters
   * @method clearFilters
   *
   * @description
   * Drops every narrowing at once.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected clearFilters(): void {
    this.page.set(1);
    this.draftSearch.set('');
    this.searchTerm.set('');
    this.filters.set({ dueStatus: null, facility: null, equipmentType: null, dueBefore: null });
  }

  /**
   * Method setPageSize
   * @method setPageSize
   *
   * @description
   * Changes the page size and returns to the first page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number} size - The chosen page size.
   *
   * @returns {void}
   */
  protected setPageSize(size: number): void {
    this.page.set(1);
    this.pageSize.set(size);
  }

  /**
   * Method goToPage
   * @method goToPage
   *
   * @description
   * Moves to a page within bounds.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number} target - The requested page.
   *
   * @returns {void}
   */
  protected goToPage(target: number): void {
    this.page.set(Math.min(Math.max(1, target), this.pageCount()));
  }

  /**
   * Method exportCsv
   * @method exportCsv
   *
   * @description
   * Downloads the organization's maintenance schedules as CSV
   * (`MaintenanceScheduleService.exportCsv`), forwarding the screen's
   * filters, including the inclusive `dueBefore` bound used by the list.
   *
   * @access protected
   * @since 1.4.0
   *
   * @returns {void}
   */
  protected exportCsv(): void {
    if (this.store.totalSchedules() === 0) return;

    const current: MaintenanceScheduleFilters = this.filters();

    this.exportBusy.set(true);

    this.maintenanceScheduleService
      .exportCsv({
        organization: `/api/organizations/${this.organizationId()}`,
        facility: current.facility ?? undefined,
        equipmentType: current.equipmentType ?? undefined,
        dueStatus: current.dueStatus ?? undefined,
        dueBefore: current.dueBefore?.toISOString(),
      })
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob: Blob): void => {
          this.exportBusy.set(false);
          this.browserDownload.trigger(
            blob,
            buildCsvExportFilename('maintenance-schedules', this.organizationId()),
          );
        },
        error: (error: HttpErrorResponse): void => {
          this.exportBusy.set(false);
          void resolveCsvExportErrorDetail(error).then((detail: string | null): void => {
            this.feedback.error(
              detail ??
                $localize`:@@maintenance.list.exportFailed:Couldn't export maintenance schedules.`,
            );
          });
        },
      });
  }

  /**
   * Method reload
   * @method reload
   *
   * @description
   * Re-runs the current query, for the error state's retry.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected reload(): void {
    const current: MaintenanceScheduleFilters = this.filters();

    this.store.load({
      organization: `/api/organizations/${this.organizationId()}`,
      facility: current.facility ?? undefined,
      equipmentType: current.equipmentType ?? undefined,
      dueStatus: current.dueStatus ?? undefined,
      dueBefore: current.dueBefore?.toISOString(),
      search: this.searchTerm() || undefined,
      page: this.page(),
      itemsPerPage: this.pageSize(),
    });
  }

  /**
   * Method openOverrideDialog
   * @method openOverrideDialog
   *
   * @description
   * Opens the override dialog for one row.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MaintenanceScheduleOutput} schedule - The row activated.
   *
   * @returns {void}
   */
  protected openOverrideDialog(schedule: MaintenanceScheduleOutput): void {
    this.overrideTarget.set(schedule);
    this.overrideDialogVisible.set(true);
  }

  /**
   * Method closeOverrideDialog
   * @method closeOverrideDialog
   *
   * @description
   * Closes the override dialog and resets its operation state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected closeOverrideDialog(): void {
    this.overrideDialogVisible.set(false);
    this.overrideTarget.set(null);
    this.store.resetOverrideOperation();
  }

  /**
   * Method submitOverride
   * @method submitOverride
   *
   * @description
   * Calls the store for the currently opened row.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null} value - The chosen override, or `null` for the organization default.
   *
   * @returns {void}
   */
  protected submitOverride(value: string | null): void {
    const target: MaintenanceScheduleOutput | null = this.overrideTarget();

    if (!target) return;

    this.store.setIntervalOverride({ scheduleId: target.id, intervalOverride: value });
  }

  /**
   * Method openCampaignDialog
   * @method openCampaignDialog
   *
   * @description
   * Opens the campaign dialog.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected openCampaignDialog(): void {
    this.store.resetCampaignOperation();
    this.campaignDialogVisible.set(true);
  }

  /**
   * Method closeCampaignDialog
   * @method closeCampaignDialog
   *
   * @description
   * Closes the campaign dialog and resets its operation state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected closeCampaignDialog(): void {
    this.campaignDialogVisible.set(false);
    this.store.resetCampaignOperation();
  }

  /**
   * Method submitCampaign
   * @method submitCampaign
   *
   * @description
   * Folds in the organization IRI the dialog does not own and calls the store.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Omit<GenerateMaintenanceCampaignInput, 'organization'>} scope - The dialog's validated
   *   scope.
   *
   * @returns {void}
   */
  protected submitCampaign(scope: Omit<GenerateMaintenanceCampaignInput, 'organization'>): void {
    this.store.generateCampaign({
      organization: `/api/organizations/${this.organizationId()}`,
      ...scope,
    });
  }
  //#endregion
}
