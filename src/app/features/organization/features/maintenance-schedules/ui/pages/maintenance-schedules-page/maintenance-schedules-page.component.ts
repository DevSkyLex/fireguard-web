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
import { lucideCircleAlert, lucidePackage, lucideSparkles } from '@ng-icons/lucide';
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
import { CollectionPagination } from '@shared/collection-pagination';
import { CollectionToolbar } from '@shared/collection-toolbar';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmButton } from '@shared/ui/button';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
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

/**
 * Interface MaintenanceScheduleFilters
 *
 * @description
 * The page's own narrowing state — questions asked now, so never persisted,
 * matching `EquipmentsPage`'s `filters` signal shape.
 */
interface MaintenanceScheduleFilters {
  readonly dueStatus: MaintenanceDueStatus | null;
  readonly facility: string | null;
  readonly equipmentType: string | null;
  readonly dueBefore: string | null;
}

/**
 * Component MaintenanceSchedulesPage
 * @class MaintenanceSchedulesPage
 *
 * @description
 * Route entry page for the organization's maintenance schedules: a
 * dueStatus `hlm-toggle-group` row, facility/equipment-type selects and a
 * due-before date above the grid, an interval-override dialog gated
 * `organization.maintenance.manage`, and a "Generate inspection campaign"
 * header action gated on that permission **and**
 * `organization.interventions.plan` together — a single 403 otherwise, so
 * the button only ever offers what the backend will actually accept. The
 * toggle group is `nullable`, mirroring `InterventionWorkItemTable`'s
 * filter row, so re-activating the current chip clears the narrowing.
 *
 * Owns the query the table renders (filters, paging), the two dialogs'
 * visibility, and the campaign success reaction: the store already toasts
 * on success (`campaignSucceeded`), so this page's own job is closing the
 * dialog and navigating to the created intervention. Also resolves the
 * table's `facilityLabelOf` input ({@link tableFacilityLabelOf}) from its
 * own {@link facilityOptions}, so the grid can disambiguate rows sharing an
 * equipment type across facilities.
 *
 * @version 1.1.0
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
    CollectionPagination,
    CollectionToolbar,
    HlmButton,
    HlmInput,
    ...HlmSelectImports,
    ...HlmToggleGroupImports,
  ],
  providers: [provideIcons({ lucideCircleAlert, lucidePackage, lucideSparkles })],
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

  /** Whether the current view is narrowed at all, deciding what the empty state offers. */
  protected readonly hasFilters: Signal<boolean> = computed<boolean>(() => {
    const current = this.filters();

    return (
      current.dueStatus !== null ||
      current.facility !== null ||
      current.equipmentType !== null ||
      current.dueBefore !== null
    );
  });

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
          dueBefore: current.dueBefore ?? undefined,
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
   * Method onDueStatusChanged
   *
   * @description
   * Narrows `hlm-toggle-group`'s single-select payload down to a known
   * due-status, or `null` — the group is `nullable`, so re-clicking the
   * active chip clears the narrowing rather than requiring a separate
   * "Clear" action, mirroring `InterventionWorkItemTable.onFilterChanged`.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {string | readonly string[] | null | undefined} value - The toggle group's emitted value.
   *
   * @returns {void}
   */
  protected onDueStatusChanged(value: string | readonly string[] | null | undefined): void {
    const dueStatus: MaintenanceDueStatus | null =
      value === 'unscheduled' ||
      value === 'up_to_date' ||
      value === 'due_soon' ||
      value === 'overdue'
        ? value
        : null;

    this.applyFilter({ dueStatus });
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
      dueBefore: current.dueBefore ?? undefined,
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
