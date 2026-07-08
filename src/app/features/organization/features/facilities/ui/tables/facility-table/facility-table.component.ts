import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  numberAttribute,
  OnInit,
  output,
  signal,
  viewChild,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MenuItem, PrimeIcons } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { Popover, PopoverModule } from 'primeng/popover';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { SplitButtonModule } from 'primeng/splitbutton';
import { Table, TableModule, type TableLazyLoadEvent } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import type { RequestOptions } from '@core/api';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  FacilityOutput,
  FacilityStatus,
  FacilityType,
} from '@features/organization/features/facilities/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { EmptyState, Tag, TableShell } from '@shared/components';
import { buildTableFilterParams } from '@shared/utils';
import { FACILITY_FILTER_MAPPING } from './constants';
import type { FacilityStatusOption, FacilityTypeIconMap, FacilityTypeOption } from './models';

/**
 * Component FacilityTable
 * @class FacilityTable
 *
 * @description
 * Presentational table component that displays a paginated, lazy-loaded list
 * of root facilities. It owns local search, pagination, sorting, and row menu
 * state while delegating data loading and mutations to the parent page through
 * output emitters.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-table',
  imports: [
    AvatarModule,
    ButtonModule,
    DatePipe,
    EmptyState,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MenuModule,
    PopoverModule,
    ReactiveFormsModule,
    SelectModule,
    SkeletonModule,
    SplitButtonModule,
    TableModule,
    TableShell,
    TooltipModule,
    Tag,
  ],
  templateUrl: './facility-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityTable implements OnInit {
  //#region Inputs
  /**
   * Input facilities
   * @readonly
   *
   * @description
   * Root facility rows currently displayed by the table.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly FacilityOutput[]>}
   */
  public readonly facilities: InputSignal<readonly FacilityOutput[]> =
    input.required<readonly FacilityOutput[]>();

  /**
   * Input total
   * @readonly
   *
   * @description
   * Total number of root facilities matching the current query.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly total: InputSignal<number> = input.required<number>();

  /**
   * Input loading
   * @readonly
   *
   * @description
   * Whether the facility list is currently loading.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input.required<boolean>();

  /**
   * Input empty
   * @readonly
   *
   * @description
   * Whether the current query has no root facility rows.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly empty: InputSignal<boolean> = input.required<boolean>();

  /**
   * Input initialPage
   * @readonly
   *
   * @description
   * One-based page restored from the parent route query parameter.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignalWithTransform<number, unknown>}
   */
  public readonly initialPage: InputSignalWithTransform<number, unknown> = input<number, unknown>(
    1,
    { transform: (value: unknown): number => Math.max(1, numberAttribute(value, 1)) },
  );

  /**
   * Input createDisabled
   * @readonly
   *
   * @description
   * Whether facility creation is blocked because the organization has reached
   * its plan limit for facilities. Disables the "New facility" actions.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly createDisabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input createDisabledTooltip
   * @readonly
   *
   * @description
   * Tooltip explaining why creation is blocked, shown when `createDisabled` is
   * set (e.g. "Plan limit reached — upgrade to add more").
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly createDisabledTooltip: InputSignal<string> = input<string>('');
  //#endregion

  //#region Outputs
  /**
   * Output load
   * @readonly
   *
   * @description
   * Emits normalized lazy-load request options for the parent store.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<RequestOptions>}
   */
  public readonly load: OutputEmitterRef<RequestOptions> = output<RequestOptions>();

  /**
   * Output pageChange
   * @readonly
   *
   * @description
   * Emits the one-based page selected by the user.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly pageChange: OutputEmitterRef<number> = output<number>();

  /**
   * Output view
   * @readonly
   *
   * @description
   * Emits the facility selected for detail navigation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<FacilityOutput>}
   */
  public readonly view: OutputEmitterRef<FacilityOutput> = output<FacilityOutput>();

  /**
   * Output edit
   * @readonly
   *
   * @description
   * Emits the facility selected for edit navigation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<FacilityOutput>}
   */
  public readonly edit: OutputEmitterRef<FacilityOutput> = output<FacilityOutput>();

  /**
   * Output add
   * @readonly
   *
   * @description
   * Requests navigation to facility creation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly add: OutputEmitterRef<void> = output<void>();

  /**
   * Output archive
   * @readonly
   *
   * @description
   * Emits the facility selected for archival.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<FacilityOutput>}
   */
  public readonly archive: OutputEmitterRef<FacilityOutput> = output<FacilityOutput>();

  /**
   * Output restore
   * @readonly
   *
   * @description
   * Emits the archived facility selected for restoration.
   */
  public readonly restore: OutputEmitterRef<FacilityOutput> = output<FacilityOutput>();

  /**
   * Output bulkArchive
   * @readonly
   *
   * @description
   * Emits the selected facilities when the user requests a bulk archival from
   * the toolbar split button.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<readonly FacilityOutput[]>}
   */
  public readonly bulkArchive: OutputEmitterRef<readonly FacilityOutput[]> =
    output<readonly FacilityOutput[]>();
  //#endregion

  //#region Properties
  /**
   * Property organizationPermissionService
   * @readonly
   *
   * @description
   * Permission helper used to gate facility mutation actions.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationPermissionService}
   */
  private readonly organizationPermissionService: OrganizationPermissionService =
    inject<OrganizationPermissionService>(OrganizationPermissionService);

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Default number of facility rows per page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {number}
   */
  protected readonly rows: number = 12;

  /**
   * Property skeletonItems
   * @readonly
   *
   * @description
   * Placeholder collection rendered while loading.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {undefined[]}
   */
  protected readonly skeletonItems: undefined[] = Array(this.rows);

  /**
   * Property hasLoadedOnce
   * @readonly
   *
   * @description
   * Whether the table has completed at least one lazy load (successful or
   * genuinely empty). Gates {@link showSkeleton} to the very first load only,
   * so a filter, sort, or page change never flashes skeleton rows over
   * already-visible data for what is typically a sub-second request.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly hasLoadedOnce: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property hasStartedLoading
   *
   * @description
   * Tracks whether {@link loading} has ever been observed `true`, so the
   * constructor effect can detect the loading→settled edge that marks the
   * first completed lazy load. `total() === 0` alone cannot distinguish
   * "never loaded" from "loaded but zero rows", hence this separate flag.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {boolean}
   */
  private hasStartedLoading: boolean = false;

  /**
   * Property showSkeleton
   * @readonly
   *
   * @description
   * Whether to render skeleton placeholders in place of {@link facilities}.
   * True only while the first lazy load is in flight; see
   * {@link hasLoadedOnce}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly showSkeleton: Signal<boolean> = computed(
    (): boolean => this.loading() && !this.hasLoadedOnce(),
  );

  /**
   * Property facilityTypeIcons
   * @readonly
   *
   * @description
   * PrimeIcon mapping used for facility type avatars.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FacilityTypeIconMap}
   */
  protected readonly facilityTypeIcons: FacilityTypeIconMap = {
    site: PrimeIcons.GLOBE,
    building: PrimeIcons.BUILDING,
    floor: PrimeIcons.TH_LARGE,
    zone: PrimeIcons.MAP,
    area: PrimeIcons.MAP_MARKER,
  };

  /**
   * Property typeOptions
   * @readonly
   *
   * @description
   * Visual options used to render the "Type" column filter select. No
   * dedicated colour/severity registry exists for facility types today, so
   * each option only pairs a title-cased label with the {@link facilityTypeIcons}
   * icon already used for the type avatar.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FacilityTypeOption[]}
   */
  protected readonly typeOptions: FacilityTypeOption[] = (
    ['site', 'building', 'floor', 'zone', 'area'] as const satisfies readonly FacilityType[]
  ).map(
    (type: FacilityType): FacilityTypeOption => ({
      label: this.toDisplayLabel(type),
      value: type,
      icon: this.facilityTypeIcons[type],
    }),
  );

  /**
   * Property statusOptions
   * @readonly
   *
   * @description
   * Visual options used to render facility status badges.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FacilityStatusOption[]}
   */
  protected readonly statusOptions: FacilityStatusOption[] = [
    {
      label: $localize`:@@status.active:Active`,
      value: 'active',
      icon: PrimeIcons.CHECK_CIRCLE,
      severity: 'success',
    },
    {
      label: $localize`:@@status.archived:Archived`,
      value: 'archived',
      icon: PrimeIcons.BOX,
      severity: 'secondary',
    },
  ];

  /**
   * Property searchControl
   * @readonly
   *
   * @description
   * Free-text search control forwarded as the `search` query parameter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<string>}
   */
  protected readonly searchControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /**
   * Property statusControl
   * @readonly
   *
   * @description
   * Draft value of the "Status" column filter, edited inside
   * {@link filterPopover} and only forwarded to the table's native
   * `filter()` API when {@link onApplyColumnFilters} runs.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<FacilityStatus | null>}
   */
  protected readonly statusControl: FormControl<FacilityStatus | null> =
    new FormControl<FacilityStatus | null>(null);

  /**
   * Property typeControl
   * @readonly
   *
   * @description
   * Draft value of the "Type" column filter, edited inside
   * {@link filterPopover} and only forwarded to the table's native
   * `filter()` API when {@link onApplyColumnFilters} runs.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<FacilityType | null>}
   */
  protected readonly typeControl: FormControl<FacilityType | null> =
    new FormControl<FacilityType | null>(null);

  /**
   * Property codeControl
   * @readonly
   *
   * @description
   * Draft value of the "Code" column filter, edited inside
   * {@link filterPopover} and only forwarded to the table's native
   * `filter()` API when {@link onApplyColumnFilters} runs.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<string>}
   */
  protected readonly codeControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /**
   * Property activeFilterCount
   * @readonly
   *
   * @description
   * Number of column filters currently applied to the table (set on
   * {@link onApplyColumnFilters}, cleared on {@link onResetColumnFilters}).
   * Drives {@link filterBadge}.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<number>}
   */
  private readonly activeFilterCount: WritableSignal<number> = signal<number>(0);

  /**
   * Property filterBadge
   * @readonly
   *
   * @description
   * Badge text shown on the "Filters" toolbar button, or `undefined` when no
   * column filter is applied.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | undefined>}
   */
  protected readonly filterBadge: Signal<string | undefined> = computed((): string | undefined =>
    this.activeFilterCount() > 0 ? String(this.activeFilterCount()) : undefined,
  );

  /**
   * Property filterPopover
   * @readonly
   *
   * @description
   * Reference to the popover hosting the column filter controls, toggled by
   * the "Filters" toolbar button.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<Popover>}
   */
  private readonly filterPopover: Signal<Popover> = viewChild.required<Popover>('filterPopover');

  /**
   * Property selectedFacilities
   * @readonly
   *
   * @description
   * Facility rows currently selected through the table checkbox column.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<FacilityOutput[]>}
   */
  protected readonly selectedFacilities: WritableSignal<FacilityOutput[]> = signal<
    FacilityOutput[]
  >([]);

  /**
   * Property toolbarActions
   * @readonly
   *
   * @description
   * Split-button actions for refresh and filter reset.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly toolbarActions: Signal<MenuItem[]> = computed((): MenuItem[] => [
    {
      label: $localize`:@@common.refresh:Refresh`,
      icon: PrimeIcons.REFRESH,
      command: (): void => this.onRefresh(),
    },
    {
      label: $localize`:@@common.clearFilters:Clear filters`,
      icon: PrimeIcons.FILTER_SLASH,
      command: (): void => this.onClearFilters(),
    },
    ...(this.selectedFacilities().length > 0
      ? [
          {
            label: $localize`:@@common.clearSelection:Clear selection`,
            icon: PrimeIcons.TIMES,
            command: (): void => this.onClearSelection(),
          },
        ]
      : []),
    ...(this.canManageFacilities()
      ? [
          { separator: true },
          {
            label: $localize`:@@facility.archiveSelected:Archive selected (${this.selectedFacilities().length}:count:)`,
            icon: PrimeIcons.BOX,
            disabled: this.selectedFacilities().length === 0,
            styleClass: 'text-red-500',
            command: (): void => this.onBulkArchive(),
          },
        ]
      : []),
  ]);

  /**
   * Property canManageFacilities
   * @readonly
   *
   * @description
   * Whether the member can create, edit, or archive facilities.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canManageFacilities: Signal<boolean> = computed((): boolean =>
    this.organizationPermissionService.hasPermission(ORGANIZATION_PERMISSION.FACILITIES_WRITE),
  );

  /**
   * Property rowMenu
   * @readonly
   *
   * @description
   * Shared popup menu used by facility rows for contextual actions.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<Menu>}
   */
  private readonly rowMenu: Signal<Menu> = viewChild.required<Menu>('rowMenu');

  /**
   * Property table
   * @readonly
   *
   * @description
   * Reference to the underlying PrimeNG table, used to apply and reset native
   * column filters from the "Filters" popover.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<Table>}
   */
  private readonly table: Signal<Table> = viewChild.required<Table>(Table);

  /**
   * Property selectedFacility
   * @readonly
   *
   * @description
   * Facility currently targeted by the row menu.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<FacilityOutput | null>}
   */
  private readonly selectedFacility: WritableSignal<FacilityOutput | null> =
    signal<FacilityOutput | null>(null);

  /**
   * Property rowMenuItems
   * @readonly
   *
   * @description
   * Contextual row actions for the selected facility.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly rowMenuItems: Signal<MenuItem[]> = computed((): MenuItem[] => {
    const facility: FacilityOutput | null = this.selectedFacility();

    if (!facility) {
      return [];
    }

    return [
      {
        label: $localize`:@@common.view:View`,
        icon: PrimeIcons.EYE,
        command: (): void => this.view.emit(facility),
      },
      ...(this.canManageFacilities()
        ? [
            {
              label: $localize`:@@common.edit:Edit`,
              icon: PrimeIcons.PENCIL,
              command: (): void => this.edit.emit(facility),
            },
            { separator: true },
            facility.status === 'archived'
              ? {
                  label: $localize`:@@facility.restore:Restore`,
                  icon: PrimeIcons.REFRESH,
                  command: (): void => this.restore.emit(facility),
                }
              : {
                  label: $localize`:@@facility.archive:Archive`,
                  icon: PrimeIcons.BOX,
                  styleClass: 'text-red-500',
                  command: (): void => this.archive.emit(facility),
                },
          ]
        : []),
    ];
  });

  /**
   * Property firstPage
   * @readonly
   *
   * @description
   * Zero-based row offset consumed by PrimeNG for the current page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<number>}
   */
  protected readonly firstPage: WritableSignal<number> = signal<number>(0);

  /**
   * Property initialized
   *
   * @description
   * Tracks whether PrimeNG has emitted the initial lazy-load event.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {boolean}
   */
  private initialized: boolean = false;

  /**
   * Property lastLazyEvent
   * @readonly
   *
   * @description
   * Last lazy-load event reused when filters trigger a reload.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<TableLazyLoadEvent | null>}
   */
  private readonly lastLazyEvent: WritableSignal<TableLazyLoadEvent | null> =
    signal<TableLazyLoadEvent | null>(null);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Registers search subscriptions, disables controls while loading, and
   * tracks the loading→settled edge that marks the first completed lazy
   * load (see {@link hasLoadedOnce}).
   */
  public constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.reload());

    effect(() => {
      if (this.loading()) {
        this.searchControl.disable({ emitEvent: false });
      } else {
        this.searchControl.enable({ emitEvent: false });
      }
    });

    effect(() => {
      if (this.loading()) {
        this.hasStartedLoading = true;
      } else if (this.hasStartedLoading) {
        this.hasLoadedOnce.set(true);
      }
    });
  }
  //#endregion

  //#region Lifecycle
  /**
   * Lifecycle hook ngOnInit
   *
   * @description
   * Converts the restored one-based page input into PrimeNG's zero-based
   * starting row offset.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public ngOnInit(): void {
    this.firstPage.set((this.initialPage() - 1) * this.rows);
  }
  //#endregion

  //#region Methods
  /**
   * Method onLazyLoad
   *
   * @description
   * Handles PrimeNG lazy-load events and emits normalized request options.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {TableLazyLoadEvent} event PrimeNG lazy-load event.
   *
   * @returns {void}
   */
  public onLazyLoad(event: TableLazyLoadEvent): void {
    const first: number = event.first ?? 0;
    const rowsPerPage: number = event.rows ?? this.rows;
    const page: number = Math.floor(first / rowsPerPage) + 1;
    const previousEvent: TableLazyLoadEvent | null = this.lastLazyEvent();
    const shouldClearSelection: boolean =
      this.initialized && this.hasLazyEventChanged(previousEvent, event);
    const params: Record<string, string | number | boolean> = {};
    const search: string = this.searchControl.value.trim();

    this.firstPage.set(first);
    this.lastLazyEvent.set(event);

    if (shouldClearSelection) {
      this.onClearSelection();
    }

    if (search) params['search'] = search;
    Object.assign(params, buildTableFilterParams(event.filters, FACILITY_FILTER_MAPPING));
    this.appendSortParams(params, event);

    this.load.emit({
      page,
      itemsPerPage: rowsPerPage,
      params,
    });

    if (this.initialized) {
      this.pageChange.emit(page);
    }
    this.initialized = true;
  }

  /**
   * Method onRefresh
   *
   * @description
   * Reloads the first page with the current filters.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onRefresh(): void {
    this.reload();
  }

  /**
   * Method onClearFilters
   *
   * @description
   * Clears the free-text search and every column filter, then reloads the
   * first page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onClearFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.resetColumnFilters();
  }

  /**
   * Method onFilterToggle
   *
   * @description
   * Opens or closes {@link filterPopover} anchored to the "Filters" toolbar
   * button.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event Click event emitted by the "Filters" button.
   *
   * @returns {void}
   */
  protected onFilterToggle(event: Event): void {
    this.filterPopover().toggle(event);
  }

  /**
   * Method onApplyColumnFilters
   *
   * @description
   * Forwards the popover's draft {@link statusControl}, {@link typeControl},
   * and {@link codeControl} values to the table's native `filter()` API.
   * `Table.filter()` debounces internally (`filterDelay`), so the three
   * calls below collapse into a single `onLazyLoad` request. Closes the
   * popover once applied.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onApplyColumnFilters(): void {
    const table: Table = this.table();
    const code: string = this.codeControl.value.trim();

    table.filter(this.statusControl.value, 'status', 'equals');
    table.filter(this.typeControl.value, 'type', 'equals');
    table.filter(code || null, 'code', 'equals');

    this.activeFilterCount.set(
      (this.statusControl.value ? 1 : 0) + (this.typeControl.value ? 1 : 0) + (code ? 1 : 0),
    );
    this.filterPopover().hide();
  }

  /**
   * Method onResetColumnFilters
   *
   * @description
   * Clears the draft filter controls, resets every native column filter, and
   * closes the popover.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onResetColumnFilters(): void {
    this.resetColumnFilters();
    this.filterPopover().hide();
  }

  /**
   * Method onClearSelection
   *
   * @description
   * Clears the current checkbox selection without reloading the table.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onClearSelection(): void {
    this.selectedFacilities.set([]);
  }

  /**
   * Method onBulkArchive
   *
   * @description
   * Emits selected facilities when the user triggers the bulk archive action.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onBulkArchive(): void {
    const selectedFacilities: FacilityOutput[] = this.selectedFacilities();

    if (selectedFacilities.length === 0 || !this.canManageFacilities()) {
      return;
    }

    this.bulkArchive.emit(selectedFacilities);
  }

  /**
   * Method onRowMenuToggle
   *
   * @description
   * Stores the targeted facility and toggles the shared row menu.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MouseEvent} event Click event emitted by the row action button.
   * @param {FacilityOutput} facility Facility targeted by the menu.
   *
   * @returns {void}
   */
  protected onRowMenuToggle(event: MouseEvent, facility: FacilityOutput): void {
    this.selectedFacility.set(facility);
    this.rowMenu().toggle(event);
  }

  /**
   * Method getStatusOption
   *
   * @description
   * Resolves the visual badge option matching a facility status.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {FacilityStatus} status API facility status.
   *
   * @returns {FacilityStatusOption} Matching status badge option.
   */
  protected getStatusOption(status: FacilityStatus): FacilityStatusOption {
    return (
      this.statusOptions.find(
        (option: FacilityStatusOption): boolean => option.value === status,
      ) ?? {
        label: this.toDisplayLabel(status),
        value: status,
        icon: PrimeIcons.CIRCLE,
        severity: 'secondary',
      }
    );
  }

  /**
   * Method getTypeIcon
   *
   * @description
   * Resolves the PrimeIcon matching a facility type.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {FacilityType} type Facility type.
   *
   * @returns {string} PrimeIcon class.
   */
  protected getTypeIcon(type: FacilityType): string {
    return this.facilityTypeIcons[type] ?? PrimeIcons.MAP_MARKER;
  }

  /**
   * Method getChildrenLabel
   *
   * @description
   * Formats the hierarchy children indicator.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {FacilityOutput} facility Facility rendered by the table.
   *
   * @returns {string} Children indicator label.
   */
  protected getChildrenLabel(facility: FacilityOutput): string {
    return facility.hasChildren
      ? $localize`:@@facility.hasChildren:Has children`
      : $localize`:@@facility.leaf:Leaf`;
  }

  /**
   * Method reload
   *
   * @description
   * Replays the last lazy-load event on the first page.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {void}
   */
  private reload(): void {
    this.onClearSelection();
    this.firstPage.set(0);

    const event: TableLazyLoadEvent = this.lastLazyEvent() ?? {
      first: 0,
      rows: this.rows,
    };

    this.onLazyLoad({
      ...event,
      first: 0,
      rows: event.rows ?? this.rows,
    });
  }

  /**
   * Method resetColumnFilters
   *
   * @description
   * Clears the draft {@link statusControl}, {@link typeControl}, and
   * {@link codeControl} values and resets every native column filter via
   * per-field `Table.filter()` calls (which trigger a fresh lazy load without
   * disturbing the active sort, unlike `Table.clear()`). The row selection is
   * cleared by {@link onLazyLoad}'s own filter-change guard, not here.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {void}
   */
  private resetColumnFilters(): void {
    const table: Table = this.table();

    this.statusControl.setValue(null, { emitEvent: false });
    this.typeControl.setValue(null, { emitEvent: false });
    this.codeControl.setValue('', { emitEvent: false });
    table.filter(null, 'status', 'equals');
    table.filter(null, 'type', 'equals');
    table.filter(null, 'code', 'equals');
    this.activeFilterCount.set(0);
  }

  /**
   * Method appendSortParams
   *
   * @description
   * Adds PrimeNG sort metadata to Hydra request parameters.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {Record<string, string | number | boolean>} params Request parameter object.
   * @param {TableLazyLoadEvent} event PrimeNG lazy-load event.
   *
   * @returns {void}
   */
  private appendSortParams(
    params: Record<string, string | number | boolean>,
    event: TableLazyLoadEvent,
  ): void {
    const sortField: string | null | undefined = this.getSortField(event);

    if (!sortField || !event.sortOrder) {
      return;
    }

    params[`order[${sortField}]`] = event.sortOrder === 1 ? 'asc' : 'desc';
  }

  /**
   * Method hasLazyEventChanged
   *
   * @description
   * Checks whether a lazy-load event targets a different table dataset.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {TableLazyLoadEvent | null} previousEvent Previous lazy-load event.
   * @param {TableLazyLoadEvent} event Current lazy-load event.
   *
   * @returns {boolean} Whether the table dataset changed.
   */
  private hasLazyEventChanged(
    previousEvent: TableLazyLoadEvent | null,
    event: TableLazyLoadEvent,
  ): boolean {
    if (!previousEvent) {
      return false;
    }

    return (
      (previousEvent.first ?? 0) !== (event.first ?? 0) ||
      (previousEvent.rows ?? this.rows) !== (event.rows ?? this.rows) ||
      previousEvent.sortOrder !== event.sortOrder ||
      this.getSortField(previousEvent) !== this.getSortField(event) ||
      JSON.stringify(previousEvent.filters ?? null) !== JSON.stringify(event.filters ?? null)
    );
  }

  /**
   * Method getSortField
   *
   * @description
   * Extracts PrimeNG's active sort field from a lazy-load event.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {TableLazyLoadEvent} event PrimeNG lazy-load event.
   *
   * @returns {string | null | undefined} Active sort field.
   */
  private getSortField(event: TableLazyLoadEvent): string | null | undefined {
    return Array.isArray(event.sortField) ? event.sortField[0] : event.sortField;
  }

  /**
   * Method toDisplayLabel
   *
   * @description
   * Converts API enum-like values into title-cased labels.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string | null | undefined} value Raw enum-like value.
   *
   * @returns {string} Human-readable label.
   */
  private toDisplayLabel(value: string | null | undefined): string {
    if (!value) return '';

    return value
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((token: string) => token.charAt(0).toUpperCase() + token.slice(1))
      .join(' ');
  }
  //#endregion
}
