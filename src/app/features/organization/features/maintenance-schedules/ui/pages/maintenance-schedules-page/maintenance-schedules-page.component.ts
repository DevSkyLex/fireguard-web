import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendar,
  lucideCircleAlert,
  lucideClock,
  lucideMapPin,
  lucidePackage,
  lucideSparkles,
  lucideTag,
} from '@ng-icons/lucide';
import type { BrnOverlayState } from '@spartan-ng/brain/overlay';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import { isCallSuccess } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type {
  GenerateMaintenanceCampaignInput,
  MaintenanceDueStatus,
  MaintenanceScheduleOutput,
} from '@features/organization/features/maintenance-schedules/models';
import {
  MaintenanceSchedulesStore,
  type MaintenanceSchedulesStoreType,
} from '@features/organization/features/maintenance-schedules/state';
import { iriId } from '@features/organization/features/maintenance-schedules/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  CollectionFilterBar,
  CollectionFilterToggle,
  initialCollectionFilterBarVisibility,
  type CollectionFilterField,
} from '@shared/collection-filters';
import { CollectionPagination } from '@shared/collection-pagination';
import { CollectionToolbar } from '@shared/collection-toolbar';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmButton } from '@shared/ui/button';
import { HlmDatePickerImports } from '@shared/ui/date-picker';
import { HlmSelectImports } from '@shared/ui/select';
import { MaintenanceDueStatusTag } from '../../components/maintenance-due-status-tag';
import { MaintenanceCampaignDialog } from '../../dialogs/maintenance-campaign-dialog';
import { MaintenanceOverrideDialog } from '../../dialogs/maintenance-override-dialog';
import { MaintenanceScheduleTable } from '../../tables/maintenance-schedule-table';

/** The page sizes offered under the table — the server default first. */
const PAGE_SIZES: readonly [number, number, number] = [30, 60, 100];

/** Every due-status chip offered in the filter bar. */
const DUE_STATUS_VALUES: readonly MaintenanceDueStatus[] = [
  'unscheduled',
  'up_to_date',
  'due_soon',
  'overdue',
];

/** How many facilities the scoping select fetches — organizations rarely exceed this. */
const FACILITY_OPTIONS_PAGE_SIZE: number = 200;

/** The filter bar's field keys — this page's whole narrowing surface. */
type MaintenanceScheduleFilterKey = 'dueStatus' | 'facility' | 'equipmentType' | 'dueBefore';

/**
 * Interface MaintenanceScheduleFilters
 *
 * @description
 * The page's own narrowing state — questions asked now, so never persisted.
 * {@link dueBefore} is a `Date`, matching what `hlm-date-picker` emits; it is
 * converted to an ISO-8601 string only where the store's `load` input
 * requires one.
 */
interface MaintenanceScheduleFilters {
  readonly dueStatus: MaintenanceDueStatus | null;
  readonly facility: string | null;
  readonly equipmentType: string | null;
  readonly dueBefore: Date | null;
}

/**
 * Component MaintenanceSchedulesPage
 * @class MaintenanceSchedulesPage
 *
 * @description
 * Route entry page for the organization's maintenance schedules: a
 * `app-collection-filter-toggle` above an editable `app-collection-filter-bar`
 * carrying all four narrowings this endpoint accepts — due status, facility,
 * equipment type, due-before — as chips (`@shared/collection-filters`),
 * above the grid. There is no search box: `MaintenanceScheduleResource`'s
 * collection has no `SearchExtractor`, so offering one would fake a
 * narrowing the API cannot serve. An interval-override dialog is gated
 * `organization.maintenance.manage`, and a "Generate inspection campaign"
 * header action is gated on that permission **and**
 * `organization.interventions.plan` together — a single 403 otherwise, so
 * the button only ever offers what the backend will actually accept.
 *
 * Owns the query the table renders (filters, paging), the two dialogs'
 * visibility, and the campaign success reaction: the store already toasts
 * on success (`campaignSucceeded`), so this page's own job is closing the
 * dialog and navigating to the created intervention. Also resolves the
 * table's `facilityLabelOf` input ({@link tableFacilityLabelOf}) from its
 * own {@link facilityOptions}, so the grid can disambiguate rows sharing an
 * equipment type across facilities.
 *
 * @version 1.2.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-maintenance-schedules-page',
  imports: [
    NgIcon,
    EmptyState,
    ErrorState,
    MaintenanceDueStatusTag,
    MaintenanceScheduleTable,
    MaintenanceOverrideDialog,
    MaintenanceCampaignDialog,
    CollectionFilterBar,
    CollectionFilterToggle,
    CollectionPagination,
    CollectionToolbar,
    HlmButton,
    ...HlmDatePickerImports,
    ...HlmSelectImports,
  ],
  providers: [
    provideIcons({
      lucideCalendar,
      lucideCircleAlert,
      lucideClock,
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
   * @description The workspace whose schedules are listed, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /** The list and mutation dataset, provided by this route. */
  protected readonly store: MaintenanceSchedulesStoreType =
    inject<MaintenanceSchedulesStoreType>(MaintenanceSchedulesStore);

  /** Organization permission checks gating override and campaign actions. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Cross-feature dependency for the facility scoping selects — the same direct-service pattern `FacilityPlansStore` already takes on `EquipmentService`. */
  private readonly facilityService: FacilityService = inject(FacilityService);

  /** Navigates to the created intervention after a successful campaign. */
  private readonly router: Router = inject(Router);

  /** The active narrowing. */
  protected readonly filters: WritableSignal<MaintenanceScheduleFilters> =
    signal<MaintenanceScheduleFilters>({
      dueStatus: null,
      facility: null,
      equipmentType: null,
      dueBefore: null,
    });

  /** The page window, one-based. */
  protected readonly page: WritableSignal<number> = signal<number>(1);

  /** How many rows a page holds. */
  protected readonly pageSize: WritableSignal<number> = signal<number>(PAGE_SIZES[0]);

  /** Every due-status chip offered. */
  protected readonly dueStatusValues: readonly MaintenanceDueStatus[] = DUE_STATUS_VALUES;

  /** The equipment-type choices offered, reused from the equipments feature's public catalog. */
  protected readonly equipmentTypeOptions: typeof EQUIPMENT_TYPE_OPTIONS = EQUIPMENT_TYPE_OPTIONS;

  /** The organization's facilities, offered by both the filter select and the campaign dialog. */
  protected readonly facilityOptions: WritableSignal<
    ReadonlyArray<{ readonly label: string; readonly value: string }>
  > = signal([]);

  /** The row currently opened in the override dialog, or `null` when the dialog is closed. */
  protected readonly overrideTarget: WritableSignal<MaintenanceScheduleOutput | null> =
    signal<MaintenanceScheduleOutput | null>(null);

  /** Whether the override dialog is open. */
  protected readonly overrideDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /** Whether the campaign dialog is open. */
  protected readonly campaignDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /** The rows the table currently renders. */
  protected readonly items: Signal<readonly MaintenanceScheduleOutput[]> = computed(() =>
    this.store.schedules(),
  );

  /**
   * Property pageCount
   * @readonly
   * @description How many pages the current total spans, at least one.
   * @access protected
   * @since 1.0.0
   * @type {Signal<number>}
   */
  protected readonly pageCount: Signal<number> = computed<number>(() =>
    Math.max(1, Math.ceil(this.store.totalSchedules() / this.pageSize())),
  );

  /** The filter bar's field catalog: due status, facility, equipment type, then due-before. */
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
   * @description Which of {@link filterFields} currently carry a value — the bar's `activeKeys` input and {@link hasFilters} both read this.
   * @access protected
   * @since 1.2.0
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

  /** Whether the current view is narrowed at all, deciding what the empty state offers. */
  protected readonly hasFilters: Signal<boolean> = computed<boolean>(
    () => this.activeFilterKeys().length > 0,
  );

  /** Which field's value selector currently renders forced open — `null` when none is. */
  protected readonly openFilterKey: WritableSignal<MaintenanceScheduleFilterKey | null> =
    signal<MaintenanceScheduleFilterKey | null>(null);

  /**
   * Property filtersVisible
   * @readonly
   * @description Whether `app-collection-filter-bar` is currently mounted below the toolbar — presentation-only. Seeded by `initialCollectionFilterBarVisibility` (`@shared/collection-filters`), then purely driven by `app-collection-filter-toggle`.
   * @access protected
   * @since 1.2.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly filtersVisible: WritableSignal<boolean> = initialCollectionFilterBarVisibility(
    this.hasFilters,
  );

  /** The "Due status" chip's value control, projected into the filter bar. */
  private readonly dueStatusChipTemplate = viewChild<TemplateRef<unknown>>('dueStatusChip');

  /** The "Facility" chip's value control, projected into the filter bar. */
  private readonly facilityChipTemplate = viewChild<TemplateRef<unknown>>('facilityChip');

  /** The "Equipment type" chip's value control, projected into the filter bar. */
  private readonly equipmentTypeChipTemplate = viewChild<TemplateRef<unknown>>('equipmentTypeChip');

  /** The "Due before" chip's value control, projected into the filter bar. */
  private readonly dueBeforeChipTemplate = viewChild<TemplateRef<unknown>>('dueBeforeChip');

  /**
   * Property chipTemplates
   * @readonly
   * @description Every filter field's value-control `TemplateRef`, for `app-collection-filter-bar`'s `templates` input.
   * @access protected
   * @since 1.2.0
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

  /** Whether the active member may open the interval-override dialog. */
  protected readonly canManage: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_MANAGE),
  );

  /** Whether the active member may generate an inspection campaign — both permissions, one 403 otherwise. */
  protected readonly canPlanCampaign: Signal<boolean> = computed<boolean>(
    () =>
      this.canManage() &&
      this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /** Where the equipment link column points. */
  protected readonly equipmentRouteBase: Signal<readonly string[]> = computed<readonly string[]>(
    () => ['/organizations', this.organizationId(), 'equipments'],
  );

  /** Where the facility link column points. */
  protected readonly facilityRouteBase: Signal<readonly string[]> = computed<readonly string[]>(
    () => ['/organizations', this.organizationId(), 'facilities'],
  );

  /** Registers {@link pageActions} on the shell header. */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /** The "Generate inspection campaign" button, registered on the shell header. */
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
      const page: number = this.page();
      const pageSize: number = this.pageSize();

      untracked((): void => {
        this.store.load({
          organization: `/api/organizations/${organizationId}`,
          facility: current.facility ?? undefined,
          equipmentType: current.equipmentType ?? undefined,
          dueStatus: current.dueStatus ?? undefined,
          dueBefore: current.dueBefore?.toISOString(),
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
   * Method facilityLabelOf
   * @description Names a facility value on the closed filter select trigger.
   * @access protected
   * @since 1.0.0
   * @param {string} value - The select's current value.
   * @returns {string} The matching facility's name, or the raw value if unknown.
   */
  protected facilityLabelOf = (value: string): string =>
    this.facilityOptions().find((option) => option.value === value)?.label ?? value;

  /**
   * Method tableFacilityLabelOf
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
   * @param {string} facilityId - The bare facility id.
   *
   * @returns {string | null} The facility's name, or `null` when it does not resolve.
   */
  protected tableFacilityLabelOf = (facilityId: string): string | null =>
    this.facilityOptions().find((option) => iriId(option.value) === facilityId)?.label ?? null;

  /**
   * Method equipmentTypeLabelOf
   * @description Names an equipment-type value on the closed filter select trigger.
   * @access protected
   * @since 1.0.0
   * @param {string} value - The select's current value.
   * @returns {string} The localized label, or the raw value humanized if unknown.
   */
  protected equipmentTypeLabelOf = (value: string): string =>
    this.equipmentTypeOptions.find((option) => option.value === value)?.label ??
    value.replace(/_/g, ' ');

  /**
   * Method applyFilter
   * @description Replaces one narrowing, which reloads the list from the first page.
   * @access protected
   * @since 1.0.0
   * @param {Partial<MaintenanceScheduleFilters>} patch - The field to change.
   * @returns {void}
   */
  protected applyFilter(patch: Partial<MaintenanceScheduleFilters>): void {
    this.page.set(1);
    this.filters.update((current) => ({ ...current, ...patch }));
  }

  /**
   * Method onFieldPicked
   * @description Reacts to the filter bar's `fieldPicked` output by forcing the picked field's value control open.
   * @access protected
   * @since 1.2.0
   * @param {string} key - The field key the bar's "+ Filter" menu just picked.
   * @returns {void}
   */
  protected onFieldPicked(key: string): void {
    this.openFilterKey.set(key as MaintenanceScheduleFilterKey);
  }

  /**
   * Method onFieldRemoved
   * @description Reacts to the filter bar's `fieldRemoved` output by clearing that field's narrowing.
   * @access protected
   * @since 1.2.0
   * @param {string} key - The field key a chip's remove button cleared.
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
   * @description Reacts to `app-collection-filter-toggle`'s `visibleChange` by setting {@link filtersVisible} to the value it reports.
   * @access protected
   * @since 1.2.0
   * @param {boolean} visible - The toggle button's intended next state.
   * @returns {void}
   */
  protected toggleFiltersVisible(visible: boolean): void {
    this.filtersVisible.set(visible);
  }

  /**
   * Method fieldPopoverState
   * @description Whether a select-backed field's value control should currently render open — true only for {@link openFilterKey}. `dueBefore`'s date picker manages its own popover state, so this is never called for it.
   * @access protected
   * @since 1.2.0
   * @param {'dueStatus' | 'facility' | 'equipmentType'} key - The field to read.
   * @returns {BrnOverlayState} `'open'` or `'closed'`.
   */
  protected fieldPopoverState(key: 'dueStatus' | 'facility' | 'equipmentType'): BrnOverlayState {
    return this.openFilterKey() === key ? 'open' : 'closed';
  }

  /**
   * Method onFieldPopoverStateChanged
   * @description Keeps {@link openFilterKey} in sync with a select-backed field's own value control.
   * @access protected
   * @since 1.2.0
   * @param {'dueStatus' | 'facility' | 'equipmentType'} key - The field whose selector changed.
   * @param {BrnOverlayState} state - Its next state.
   * @returns {void}
   */
  protected onFieldPopoverStateChanged(
    key: 'dueStatus' | 'facility' | 'equipmentType',
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
   * @description Drops every narrowing at once.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected clearFilters(): void {
    this.page.set(1);
    this.filters.set({ dueStatus: null, facility: null, equipmentType: null, dueBefore: null });
  }

  /**
   * Method setPageSize
   * @description Changes the page size and returns to the first page.
   * @access protected
   * @since 1.0.0
   * @param {number} size - The chosen page size.
   * @returns {void}
   */
  protected setPageSize(size: number): void {
    this.page.set(1);
    this.pageSize.set(size);
  }

  /**
   * Method goToPage
   * @description Moves to a page within bounds.
   * @access protected
   * @since 1.0.0
   * @param {number} target - The requested page.
   * @returns {void}
   */
  protected goToPage(target: number): void {
    this.page.set(Math.min(Math.max(1, target), this.pageCount()));
  }

  /**
   * Method reload
   * @description Re-runs the current query, for the error state's retry.
   * @access protected
   * @since 1.0.0
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
      page: this.page(),
      itemsPerPage: this.pageSize(),
    });
  }

  /**
   * Method openOverrideDialog
   * @description Opens the override dialog for one row.
   * @access protected
   * @since 1.0.0
   * @param {MaintenanceScheduleOutput} schedule - The row activated.
   * @returns {void}
   */
  protected openOverrideDialog(schedule: MaintenanceScheduleOutput): void {
    this.overrideTarget.set(schedule);
    this.overrideDialogVisible.set(true);
  }

  /**
   * Method closeOverrideDialog
   * @description Closes the override dialog and resets its operation state.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected closeOverrideDialog(): void {
    this.overrideDialogVisible.set(false);
    this.overrideTarget.set(null);
    this.store.resetOverrideOperation();
  }

  /**
   * Method submitOverride
   * @description Calls the store for the currently opened row.
   * @access protected
   * @since 1.0.0
   * @param {string | null} value - The chosen override, or `null` for the organization default.
   * @returns {void}
   */
  protected submitOverride(value: string | null): void {
    const target: MaintenanceScheduleOutput | null = this.overrideTarget();

    if (!target) return;

    this.store.setIntervalOverride({ scheduleId: target.id, intervalOverride: value });
  }

  /**
   * Method openCampaignDialog
   * @description Opens the campaign dialog.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected openCampaignDialog(): void {
    this.store.resetCampaignOperation();
    this.campaignDialogVisible.set(true);
  }

  /**
   * Method closeCampaignDialog
   * @description Closes the campaign dialog and resets its operation state.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected closeCampaignDialog(): void {
    this.campaignDialogVisible.set(false);
    this.store.resetCampaignOperation();
  }

  /**
   * Method submitCampaign
   * @description Folds in the organization IRI the dialog does not own and calls the store.
   * @access protected
   * @since 1.0.0
   * @param {Omit<GenerateMaintenanceCampaignInput, 'organization'>} scope - The dialog's validated scope.
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
