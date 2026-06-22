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
import { ButtonModule } from 'primeng/button';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TableModule, type TableLazyLoadEvent, type TablePassThroughOptions } from 'primeng/table';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import type { RequestOptions } from '@core/services/hydra-api';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  EquipmentOutput,
  EquipmentStatus,
} from '@features/organization/features/equipments/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { EmptyState, Tag } from '@shared/components';
import type { EquipmentStatusOption } from './models';

/**
 * Component FacilityEquipmentTable
 * @class FacilityEquipmentTable
 *
 * @description
 * Facility-scoped equipment table with lazy loading, pagination, sorting,
 * and local filter controls. The component only emits table query options;
 * the parent facility tab owns the actual facility ID injection and store load.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-equipment-table',
  imports: [
    ButtonModule,
    CardModule,
    DatePipe,
    EmptyState,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MenuModule,
    ReactiveFormsModule,
    SelectModule,
    SkeletonModule,
    SplitButtonModule,
    TableModule,
    Tag,
  ],
  templateUrl: './facility-equipment-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityEquipmentTable implements OnInit {
  //#region Inputs
  /**
   * Input equipments
   * @readonly
   *
   * @description
   * Equipment rows currently displayed by the table.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly EquipmentOutput[]>}
   */
  public readonly equipments: InputSignal<readonly EquipmentOutput[]> =
    input.required<readonly EquipmentOutput[]>();

  /**
   * Input total
   * @readonly
   *
   * @description
   * Total number of facility equipment records matching the current query.
   * Used by PrimeNG pagination to compute available pages.
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
   * Whether the table is waiting for equipment data. Disables filters and
   * displays skeleton rows while the parent tab loads the page.
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
   * Whether the current query has no facility equipment rows. Used to render
   * the empty-state template instead of stale row data.
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
   * One-based page restored by the parent tab when the facility detail view
   * keeps the current table state. Values lower than 1 are normalized to 1.
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
   * Emits lazy-load options built from pagination, sorting, and filters.
   * The parent tab enriches these options with the active facility ID before
   * delegating to the equipment store.
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
   * Emits the one-based page selected by the user after PrimeNG has completed
   * the first lazy-load cycle.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly pageChange: OutputEmitterRef<number> = output<number>();

  /**
   * Output add
   * @readonly
   *
   * @description
   * Requests navigation to the facility-aware equipment creation flow.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly add: OutputEmitterRef<void> = output<void>();

  /**
   * Emits the equipment selected for detail navigation.
   */
  public readonly view: OutputEmitterRef<EquipmentOutput> = output<EquipmentOutput>();

  /**
   * Output edit
   * @readonly
   *
   * @description
   * Emits the equipment selected from the row action menu when the user
   * requests an edit flow. The parent decides how to route or open the editor.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<EquipmentOutput>}
   */
  public readonly edit: OutputEmitterRef<EquipmentOutput> = output<EquipmentOutput>();

  //#endregion

  //#region Properties
  /**
   * Property organizationPermissionService
   * @readonly
   *
   * @description
   * Organization-scoped permission helper used to decide whether equipment
   * row actions can be displayed.
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
   * PrimeNG card pass-through classes used to make the table fill the tab.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {CardPassThroughOptions}
   */
  protected readonly cardPt: CardPassThroughOptions = {
    root: {
      class:
        'h-full flex flex-col border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 shadow-none',
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
   * PrimeNG table pass-through classes used for full-height table layout and
   * paginator alignment.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<TablePassThroughOptions>}
   */
  protected readonly tablePt: Signal<TablePassThroughOptions> = computed(
    (): TablePassThroughOptions => ({
      root: {
        class: 'flex min-h-0 flex-1 flex-col',
      },
      tableContainer: {
        class: 'flex-1 min-h-0 rounded-b-xl overflow-hidden',
      },
      table: {
        class: 'text-sm',
      },
      header: {
        class: 'border-0 p-0 bg-surface-0 dark:bg-surface-900',
      },
      pcPaginator: {
        root: {
          class:
            'mt-auto rounded-t-none rounded-b-2xl bg-surface-0 dark:bg-surface-900 justify-end' +
            (this.total() === 0 ? ' hidden' : ''),
        },
      },
    }),
  );

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Default row count per lazy-loaded page.
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
   * Placeholder collection used by PrimeNG skeleton rows while loading.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {undefined[]}
   */
  protected readonly skeletonItems: undefined[] = Array(this.rows);

  /**
   * Property statusOptions
   * @readonly
   *
   * @description
   * Status filter choices available for facility equipment.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {EquipmentStatusOption[]}
   */
  protected readonly statusOptions: EquipmentStatusOption[] = [
    {
      label: $localize`:@@equipmentStatus.inStock:In Stock`,
      value: 'in_stock',
      icon: PrimeIcons.BOX,
      severity: 'secondary',
    },
    {
      label: $localize`:@@equipmentStatus.operational:Operational`,
      value: 'operational',
      icon: PrimeIcons.CHECK_CIRCLE,
      severity: 'success',
    },
    {
      label: $localize`:@@equipmentStatus.maintenance:Maintenance`,
      value: 'under_maintenance',
      icon: PrimeIcons.WRENCH,
      severity: 'warn',
    },
    {
      label: $localize`:@@equipmentStatus.decommissioned:Decommissioned`,
      value: 'decommissioned',
      icon: PrimeIcons.BAN,
      severity: 'danger',
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
   * Equipment status filter forwarded as the `status` query parameter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<EquipmentStatus | null>}
   */
  protected readonly statusControl: FormControl<EquipmentStatus | null> =
    new FormControl<EquipmentStatus | null>(null);

  /**
   * Property selectedEquipments
   * @readonly
   *
   * @description
   * Equipment rows currently selected through the table checkbox column.
   * Stored as a signal so toolbar bulk actions can react to selection changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<EquipmentOutput[]>}
   */
  protected readonly selectedEquipments: WritableSignal<EquipmentOutput[]> = signal<
    EquipmentOutput[]
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
    ...(this.selectedEquipments().length > 0
      ? [
          {
            label: $localize`:@@common.clearSelection:Clear selection`,
            icon: PrimeIcons.TIMES,
            command: (): void => this.onClearSelection(),
          },
        ]
      : []),
  ]);

  /**
   * Property canManageEquipment
   * @readonly
   *
   * @description
   * Whether the authenticated organization member can access equipment row
   * mutation actions such as edit and delete.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canManageEquipment: Signal<boolean> = computed((): boolean =>
    this.organizationPermissionService.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_WRITE),
  );

  /**
   * Property actionMenu
   * @readonly
   *
   * @description
   * Shared popup menu used by equipment rows for contextual actions.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<Menu>}
   */
  private readonly actionMenu: Signal<Menu> = viewChild.required<Menu>('actionMenu');

  /**
   * Property selectedEquipment
   * @readonly
   *
   * @description
   * Equipment row currently targeted by the shared action menu.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<EquipmentOutput | null>}
   */
  private readonly selectedEquipment: WritableSignal<EquipmentOutput | null> =
    signal<EquipmentOutput | null>(null);

  /**
   * Property actionMenuItems
   * @readonly
   *
   * @description
   * Menu items shown for the currently selected equipment row. Items are
   * hidden unless the member has the equipment write permission.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly actionMenuItems: Signal<MenuItem[]> = computed((): MenuItem[] => {
    const equipment: EquipmentOutput | null = this.selectedEquipment();

    if (!equipment) {
      return [];
    }

    return [
      {
        label: $localize`:@@common.view:View`,
        icon: PrimeIcons.EYE,
        command: (): void => this.view.emit(equipment),
      },
      ...(this.canManageEquipment()
        ? [
            {
              label: $localize`:@@common.edit:Edit`,
              icon: PrimeIcons.PENCIL,
              command: (): void => this.edit.emit(equipment),
            },
          ]
        : []),
    ];
  });

  /**
   * Property firstPage
   *
   * @description
   * Zero-based row offset consumed by PrimeNG for the initial page.
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
   * Tracks whether PrimeNG has already emitted the initial lazy-load event.
   * Prevents the initial load from being reported as a user page change.
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
   * Last table lazy-load event reused when filters trigger a reload.
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
   * Registers filter subscriptions and disables controls while loading.
   */
  public constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.reload());

    this.statusControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.reload());

    effect(() => {
      if (this.loading()) {
        this.searchControl.disable({ emitEvent: false });
        this.statusControl.disable({ emitEvent: false });
      } else {
        this.searchControl.enable({ emitEvent: false });
        this.statusControl.enable({ emitEvent: false });
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
   * Handles PrimeNG lazy-load events and emits the normalized request options
   * expected by the parent facility tab.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {TableLazyLoadEvent} event PrimeNG lazy-load event containing paging and sorting data.
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
    const status: EquipmentStatus | null = this.statusControl.value;

    this.firstPage.set(first);
    this.lastLazyEvent.set(event);

    if (shouldClearSelection) {
      this.onClearSelection();
    }

    if (search) params['search'] = search;
    if (status) params['status'] = status;
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
    this.statusControl.setValue(null, { emitEvent: false });
    this.reload();
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
    this.selectedEquipments.set([]);
  }

  /**
   * Method onActionMenuToggle
   *
   * @description
   * Stores the targeted equipment row and toggles the shared action menu.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MouseEvent} event Click event emitted by the row action button.
   * @param {EquipmentOutput} equipment Equipment row targeted by the menu.
   *
   * @returns {void}
   */
  protected onActionMenuToggle(event: MouseEvent, equipment: EquipmentOutput): void {
    this.selectedEquipment.set(equipment);
    this.actionMenu().toggle(event);
  }

  /**
   * Method getEquipmentTitle
   *
   * @description
   * Builds the main equipment label from type and subtype.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentOutput} equipment Equipment row rendered by the table.
   *
   * @returns {string} Display title for the equipment row.
   */
  protected getEquipmentTitle(equipment: EquipmentOutput): string {
    const typeLabel: string = this.toDisplayLabel(equipment.type);
    const subTypeLabel: string = this.toDisplayLabel(equipment.subType);

    return subTypeLabel ? `${typeLabel} / ${subTypeLabel}` : typeLabel;
  }

  /**
   * Method getReference
   *
   * @description
   * Builds a compact brand/model reference label.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentOutput} equipment Equipment row rendered by the table.
   *
   * @returns {string} Equipment reference label or fallback text.
   */
  protected getReference(equipment: EquipmentOutput): string {
    return (
      [equipment.brand, equipment.model].filter(Boolean).join(' ').trim() ||
      $localize`:@@facility.equipTable.noReference:No reference`
    );
  }

  /**
   * Method getStatusOption
   *
   * @description
   * Resolves the visual badge option matching an equipment status.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentStatus} status API equipment status.
   *
   * @returns {EquipmentStatusOption} Matching status badge option.
   */
  protected getStatusOption(status: EquipmentStatus): EquipmentStatusOption {
    return (
      this.statusOptions.find(
        (option: EquipmentStatusOption): boolean => option.value === status,
      ) ?? {
        label: this.toDisplayLabel(status),
        value: status,
        icon: PrimeIcons.CIRCLE,
        severity: 'secondary',
      }
    );
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
      this.getSortField(previousEvent) !== this.getSortField(event)
    );
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
   * @param {Record<string, string | number | boolean>} params Request parameter object to enrich.
   * @param {TableLazyLoadEvent} event PrimeNG lazy-load event containing sort metadata.
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
   * @param {string | null | undefined} value Raw enum-like API value.
   *
   * @returns {string} Human-readable title-cased label.
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
