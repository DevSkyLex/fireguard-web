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
import { Popover, PopoverModule } from 'primeng/popover';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { SplitButtonModule } from 'primeng/splitbutton';
import { Table, TableModule, type TableLazyLoadEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import type { RequestOptions } from '@core/api';
import { buildTableFilterParams } from '@core/api';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  EquipmentOutput,
  EquipmentStatus,
} from '@features/organization/features/equipments/models';
import {
  equipmentTagOptions,
  resolveEquipmentTag,
} from '@features/organization/features/equipments/models';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments/options';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { EmptyState } from '@shared/empty-state';
import { TABLE_CARD_SHELL_PT, TABLE_CARD_SHELL_STYLE_CLASS } from '@shared/table-card-shell';
import { type TagDescriptor, type TagOption } from '@shared/tag';
import { EQUIPMENT_FILTER_MAPPING } from './constants';

/**
 * Component EquipmentTable
 * @class EquipmentTable
 *
 * @description
 * Presentational table component that displays a paginated, lazy-loaded list
 * of organization equipment. It owns local search, column filters (status,
 * type, sub-type, brand, model), pagination, sorting, selection, and row
 * action menu state while delegating data loading and mutations to the
 * parent page through output emitters.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-table',
  imports: [
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
    CardModule,
    TooltipModule,
    TagModule,
  ],
  templateUrl: './equipment-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentTable implements OnInit {
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
   * Total number of equipment records matching the current query.
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
   * Whether the equipment list is currently loading.
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
   * Whether the current query has no equipment rows.
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
   * Whether equipment creation is blocked because the organization has reached
   * its plan limit for equipment. Disables the "New equipment" actions.
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
   * Tooltip explaining why creation is blocked, shown when `createDisabled` is set.
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
   * Output add
   * @readonly
   *
   * @description
   * Requests navigation to equipment creation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly add: OutputEmitterRef<void> = output<void>();

  /**
   * Requests navigation to the equipment detail page.
   */
  public readonly view: OutputEmitterRef<EquipmentOutput> = output<EquipmentOutput>();

  /**
   * Output edit
   * @readonly
   *
   * @description
   * Emits the equipment selected from the row action menu for editing.
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
   * Property cardStyleClass
   * @readonly
   *
   * @description
   * Shared `styleClass` for the bordered, full-height card shell wrapping the
   * table, identical across every feature entity table.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly cardStyleClass: string = TABLE_CARD_SHELL_STYLE_CLASS;

  /**
   * Property cardPt
   * @readonly
   *
   * @description
   * Shared pass-through options for the table's card shell (body, content,
   * header), identical across every feature entity table.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {CardPassThroughOptions}
   */
  protected readonly cardPt: CardPassThroughOptions = TABLE_CARD_SHELL_PT;

  /**
   * Property organizationPermissionService
   * @readonly
   *
   * @description
   * Organization-scoped permission helper used to gate equipment mutations.
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
   * Default number of equipment rows per page.
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
   * Whether to render skeleton placeholders in place of {@link equipments}.
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
   * Property statusOptions
   * @readonly
   *
   * @description
   * Visual options used to render and filter equipment statuses, resolved from
   * the shared equipment tag registry.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {TagOption[]}
   */
  protected readonly statusOptions: TagOption[] = equipmentTagOptions('status');

  /**
   * Property typeOptions
   * @readonly
   *
   * @description
   * Localized equipment type choices for the type filter select, shared with
   * the create/edit form. Constrains the filter to valid `EquipmentType`
   * values instead of free text.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ReadonlyArray<{ readonly label: string; readonly value: string }>}
   */
  protected readonly typeOptions: { readonly label: string; readonly value: string }[] = [
    ...EQUIPMENT_TYPE_OPTIONS,
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
   * @type {FormControl<EquipmentStatus | null>}
   */
  protected readonly statusControl: FormControl<EquipmentStatus | null> =
    new FormControl<EquipmentStatus | null>(null);

  /**
   * Property typeControl
   * @readonly
   *
   * @description
   * Draft value of the "Type" column filter, edited inside
   * {@link filterPopover} and only forwarded to the table's native
   * `filter()` API when {@link onApplyColumnFilters} runs. Free text because
   * `EquipmentOutput.type` is an arbitrary string, not a fixed union.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<string | null>}
   */
  protected readonly typeControl: FormControl<string | null> = new FormControl<string | null>(null);

  /**
   * Property subTypeControl
   * @readonly
   *
   * @description
   * Draft value of the "Sub-type" column filter, edited inside
   * {@link filterPopover} and only forwarded to the table's native
   * `filter()` API when {@link onApplyColumnFilters} runs. Free text because
   * `EquipmentOutput.subType` is an arbitrary string, not a fixed union.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<string | null>}
   */
  protected readonly subTypeControl: FormControl<string | null> = new FormControl<string | null>(
    null,
  );

  /**
   * Property brandControl
   * @readonly
   *
   * @description
   * Draft value of the "Brand" column filter, edited inside
   * {@link filterPopover} and only forwarded to the table's native
   * `filter()` API when {@link onApplyColumnFilters} runs.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<string | null>}
   */
  protected readonly brandControl: FormControl<string | null> = new FormControl<string | null>(
    null,
  );

  /**
   * Property modelControl
   * @readonly
   *
   * @description
   * Draft value of the "Model" column filter, edited inside
   * {@link filterPopover} and only forwarded to the table's native
   * `filter()` API when {@link onApplyColumnFilters} runs.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<string | null>}
   */
  protected readonly modelControl: FormControl<string | null> = new FormControl<string | null>(
    null,
  );

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
   * Property selectedEquipments
   * @readonly
   *
   * @description
   * Equipment rows selected through the checkbox column.
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
   * Split-button actions for refresh, filter reset, and permitted bulk actions.
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
   * Whether the member can create, edit, or change equipment lifecycle state.
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
   * Property table
   * @readonly
   *
   * @description
   * Reference to the underlying PrimeNG table, used to apply and reset native
   * column filters from {@link filterPopover}.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<Table>}
   */
  private readonly table: Signal<Table> = viewChild.required<Table>(Table);

  /**
   * Property selectedEquipment
   * @readonly
   *
   * @description
   * Equipment row currently targeted by the action menu.
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
   * Row action menu items, hidden unless the member has write permission.
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
   * Registers filter subscriptions, disables controls while loading, and
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
    Object.assign(params, buildTableFilterParams(event.filters, EQUIPMENT_FILTER_MAPPING));
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
   * {@link subTypeControl}, {@link brandControl}, and {@link modelControl}
   * values to the table's native `filter()` API. `Table.filter()` debounces
   * internally (`filterDelay`), so the five calls below collapse into a
   * single `onLazyLoad` request. Closes the popover once applied.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onApplyColumnFilters(): void {
    const table: Table = this.table();
    const status: EquipmentStatus | null = this.statusControl.value;
    const type: string | null = this.typeControl.value?.trim() || null;
    const subType: string | null = this.subTypeControl.value?.trim() || null;
    const brand: string | null = this.brandControl.value?.trim() || null;
    const model: string | null = this.modelControl.value?.trim() || null;

    table.filter(status, 'status', 'equals');
    table.filter(type, 'type', 'equals');
    table.filter(subType, 'subType', 'equals');
    table.filter(brand, 'brand', 'equals');
    table.filter(model, 'model', 'equals');

    this.activeFilterCount.set(
      (status ? 1 : 0) + (type ? 1 : 0) + (subType ? 1 : 0) + (brand ? 1 : 0) + (model ? 1 : 0),
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
    return [equipment.brand, equipment.model].filter(Boolean).join(' ').trim() || 'No reference';
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
   * @returns {TagDescriptor} Matching status descriptor.
   */
  protected getStatusOption(status: EquipmentStatus): TagDescriptor {
    return resolveEquipmentTag('status', status);
  }

  /**
   * Method resetColumnFilters
   *
   * @description
   * Clears the draft {@link statusControl}, {@link typeControl},
   * {@link subTypeControl}, {@link brandControl}, and {@link modelControl}
   * values and resets every native column filter via per-field
   * `Table.filter()` calls (which trigger a fresh lazy load without
   * disturbing the active sort, unlike `Table.clear()`), then zeroes
   * {@link activeFilterCount}. The row selection is cleared by
   * {@link onLazyLoad}'s own filter-change guard, not here.
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
    this.subTypeControl.setValue(null, { emitEvent: false });
    this.brandControl.setValue(null, { emitEvent: false });
    this.modelControl.setValue(null, { emitEvent: false });
    table.filter(null, 'status', 'equals');
    table.filter(null, 'type', 'equals');
    table.filter(null, 'subType', 'equals');
    table.filter(null, 'brand', 'equals');
    table.filter(null, 'model', 'equals');
    this.activeFilterCount.set(0);
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
      this.getSortField(previousEvent) !== this.getSortField(event) ||
      JSON.stringify(previousEvent.filters ?? null) !== JSON.stringify(event.filters ?? null)
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
