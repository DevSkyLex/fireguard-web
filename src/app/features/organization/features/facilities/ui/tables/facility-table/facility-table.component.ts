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
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { SkeletonModule } from 'primeng/skeleton';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TableModule, type TableLazyLoadEvent, type TablePassThroughOptions } from 'primeng/table';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import type { RequestOptions } from '@core/services/hydra-api';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  FacilityOutput,
  FacilityStatus,
  FacilityType,
} from '@features/organization/features/facilities/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import type { FacilityStatusOption, FacilityTypeIconMap } from './models';

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
    CardModule,
    DatePipe,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MenuModule,
    ReactiveFormsModule,
    SkeletonModule,
    SplitButtonModule,
    TableModule,
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
   * Property cardPt
   * @readonly
   *
   * @description
   * PrimeNG card pass-through classes used to make the table fill the page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {CardPassThroughOptions}
   */
  protected readonly cardPt: CardPassThroughOptions = {
    root: {
      class: 'h-full flex flex-col border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 shadow-none',
    },
    body: {
      class: 'p-0 flex flex-col flex-1 min-h-0',
    },
  };

  /**
   * Property tablePt
   * @readonly
   *
   * @description
   * PrimeNG table pass-through classes used for full-height table layout.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {TablePassThroughOptions}
   */
  protected readonly tablePt: TablePassThroughOptions = {
    root: {
      class: 'flex min-h-0 flex-1 flex-col',
    },
    tableContainer: {
      class: 'flex-1 min-h-0',
    },
    table: {
      class: 'text-sm',
    },
    header: {
      class: 'border-0 p-0 bg-surface-0 dark:bg-surface-900',
    },
    pcPaginator: {
      root: {
        class: 'mt-auto rounted-t-none rounded-b-2xl bg-surface-0 dark:bg-surface-900 justify-end',
      },
    },
  };

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
  protected readonly rows: number = 30;

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
      label: 'Active',
      value: 'active',
      icon: PrimeIcons.CHECK_CIRCLE,
      color: '#22c55e'
    },
    {
      label: 'Archived',
      value: 'archived',
      icon: PrimeIcons.BOX,
      color: '#64748b'
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
      label: 'Refresh',
      icon: PrimeIcons.REFRESH,
      command: (): void => this.onRefresh(),
    },
    {
      label: 'Clear filters',
      icon: PrimeIcons.FILTER_SLASH,
      command: (): void => this.onClearFilters(),
    },
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
        label: 'View',
        icon: PrimeIcons.EYE,
        command: (): void => this.view.emit(facility),
      },
      ...(this.canManageFacilities()
        ? [
            {
              label: 'Edit',
              icon: PrimeIcons.PENCIL,
              command: (): void => this.edit.emit(facility),
            },
            { separator: true },
            {
              label: facility.status === 'active' ? 'Archive' : 'Archived',
              icon: PrimeIcons.BOX,
              styleClass: 'text-red-500',
              disabled: facility.status === 'archived',
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
   * Registers search subscriptions and disables controls while loading.
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
    const params: Record<string, string | number | boolean> = {};
    const search: string = this.searchControl.value.trim();

    this.firstPage.set(first);
    this.lastLazyEvent.set(event);

    if (search) params['search'] = search;
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
   * Clears all filters and reloads the first page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onClearFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.reload();
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
      this.statusOptions.find((option: FacilityStatusOption): boolean => option.value === status) ?? {
        label: this.toDisplayLabel(status),
        value: status,
        icon: PrimeIcons.CIRCLE,
        color: '#64748b',
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
    return facility.hasChildren ? 'Has children' : 'Leaf';
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
