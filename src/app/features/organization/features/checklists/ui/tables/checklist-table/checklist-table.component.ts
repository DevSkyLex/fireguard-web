import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
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
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MenuItem, PrimeIcons } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import { Popover, PopoverModule } from 'primeng/popover';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { SplitButtonModule } from 'primeng/splitbutton';
import { Table, TableModule, type TableLazyLoadEvent } from 'primeng/table';
import type {
  ChecklistListOptions,
  ChecklistOutput,
  ChecklistStatus,
} from '@features/organization/features/checklists/models';
import { EmptyState, TableShell, Tag, tablePt, type TagOption } from '@shared/components';
import type { TableFilterParamValue } from '@shared/models';
import { buildTableFilterParams } from '@shared/utils';
import { CHECKLIST_FILTER_MAPPING } from './constants';

/**
 * Component ChecklistTable
 * @class ChecklistTable
 *
 * @description
 * Presentational table component that displays a paginated, lazy-loaded list
 * of organization checklist templates. It owns the status column filter,
 * pagination, sorting, and row action menu state while delegating data
 * loading and mutations to the parent page through output emitters.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-checklist-table',
  imports: [
    ButtonModule,
    DatePipe,
    EmptyState,
    MenuModule,
    PopoverModule,
    ReactiveFormsModule,
    SelectModule,
    SkeletonModule,
    SplitButtonModule,
    TableModule,
    TableShell,
    Tag,
  ],
  templateUrl: './checklist-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistTable implements OnInit {
  //#region Inputs
  /**
   * Input checklists
   * @readonly
   *
   * @description
   * Checklist rows currently displayed by the table.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly ChecklistOutput[]>}
   */
  public readonly checklists: InputSignal<readonly ChecklistOutput[]> =
    input.required<readonly ChecklistOutput[]>();

  /**
   * Input total
   * @readonly
   *
   * @description
   * Total number of checklist records matching the current query.
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
   * Whether the checklist list is currently loading.
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
   * Whether the current query has no checklist rows.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly empty: InputSignal<boolean> = input.required<boolean>();

  /**
   * Input canManage
   * @readonly
   *
   * @description
   * Whether the active member can create and archive checklists.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canManage: InputSignal<boolean> = input<boolean>(false);

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
   * Emits normalized checklist list options for the parent store.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<ChecklistListOptions>}
   */
  public readonly load: OutputEmitterRef<ChecklistListOptions> = output<ChecklistListOptions>();

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
   * Requests navigation to checklist creation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly add: OutputEmitterRef<void> = output<void>();

  /**
   * Output view
   * @readonly
   *
   * @description
   * Emits the checklist selected for detail display.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<ChecklistOutput>}
   */
  public readonly view: OutputEmitterRef<ChecklistOutput> = output<ChecklistOutput>();

  /**
   * Output archive
   * @readonly
   *
   * @description
   * Emits the checklist selected from the row action menu for archival.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<ChecklistOutput>}
   */
  public readonly archive: OutputEmitterRef<ChecklistOutput> = output<ChecklistOutput>();
  //#endregion

  //#region Properties
  /**
   * Property tablePt
   * @readonly
   *
   * @description
   * Re-exposes the shared {@link tablePt} pass-through factory as an instance
   * member so the template can call it directly (Angular templates cannot
   * invoke a bare module-level import).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {typeof tablePt}
   */
  protected readonly tablePt: typeof tablePt = tablePt;

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Default number of checklist rows per page.
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
   * @since 1.1.0
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
   * @since 1.1.0
   *
   * @type {boolean}
   */
  private hasStartedLoading: boolean = false;

  /**
   * Property showSkeleton
   * @readonly
   *
   * @description
   * Whether to render skeleton placeholders in place of {@link checklists}.
   * True only while the first lazy load is in flight; see
   * {@link hasLoadedOnce}.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly showSkeleton: Signal<boolean> = computed(
    (): boolean => this.loading() && !this.hasLoadedOnce(),
  );

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
   * @type {FormControl<ChecklistStatus | null>}
   */
  protected readonly statusControl: FormControl<ChecklistStatus | null> =
    new FormControl<ChecklistStatus | null>(null);

  /**
   * Property statusOptions
   * @readonly
   *
   * @description
   * Visual options used to render and filter checklist statuses.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {TagOption<ChecklistStatus>[]}
   */
  protected readonly statusOptions: TagOption<ChecklistStatus>[] = [
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
   * Property activeFilterCount
   * @readonly
   *
   * @description
   * Number of column filters currently applied to the table (set on
   * {@link onApplyColumnFilters}, cleared on {@link onResetColumnFilters}).
   * Drives {@link filterBadge}.
   *
   * @access private
   * @since 1.1.0
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
   * @since 1.1.0
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
   * @since 1.1.0
   *
   * @type {Signal<Popover>}
   */
  private readonly filterPopover: Signal<Popover> = viewChild.required<Popover>('filterPopover');

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
  ]);

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
    const checklist: ChecklistOutput | null = this.selectedChecklist();

    if (!checklist) {
      return [];
    }

    return [
      {
        label: $localize`:@@common.view:View`,
        icon: PrimeIcons.EYE,
        command: (): void => this.view.emit(checklist),
      },
      ...(this.canManage() && checklist.status === 'active'
        ? [
            {
              label: $localize`:@@common.archive:Archive`,
              icon: PrimeIcons.BOX,
              command: (): void => this.archive.emit(checklist),
            },
          ]
        : []),
    ];
  });

  /**
   * Property actionMenu
   * @readonly
   *
   * @description
   * Shared popup menu used by checklist rows for contextual actions.
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
   * Reference to the underlying PrimeNG table, used to apply and reset
   * native column filters.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {Signal<Table>}
   */
  private readonly table: Signal<Table> = viewChild.required<Table>(Table);

  /**
   * Property selectedChecklist
   * @readonly
   *
   * @description
   * Checklist row currently targeted by the action menu.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<ChecklistOutput | null>}
   */
  private readonly selectedChecklist: WritableSignal<ChecklistOutput | null> =
    signal<ChecklistOutput | null>(null);

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
   * Tracks the loading→settled edge that marks the first completed lazy
   * load (see {@link hasLoadedOnce}).
   */
  public constructor() {
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
   * Handles PrimeNG lazy-load events and emits normalized checklist list
   * options.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {TableLazyLoadEvent} event PrimeNG lazy-load event.
   *
   * @returns {void}
   */
  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const first: number = event.first ?? 0;
    const rowsPerPage: number = event.rows ?? this.rows;
    const page: number = Math.floor(first / rowsPerPage) + 1;
    const sortField: string | null | undefined = this.getSortField(event);
    const filterParams: Record<string, TableFilterParamValue> = buildTableFilterParams(
      event.filters,
      CHECKLIST_FILTER_MAPPING,
    );

    this.firstPage.set(first);
    this.lastLazyEvent.set(event);

    this.load.emit({
      page,
      itemsPerPage: rowsPerPage,
      ...(filterParams['status'] ? { status: filterParams['status'] as ChecklistStatus } : {}),
      ...(sortField && event.sortOrder
        ? { order: { [sortField]: event.sortOrder === 1 ? 'asc' : 'desc' } }
        : {}),
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
   * Clears every column filter and reloads the first page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onClearFilters(): void {
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
   * @since 1.1.0
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
   * Forwards the popover's draft {@link statusControl} value to the table's
   * native `filter()` API. Closes the popover once applied.
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected onApplyColumnFilters(): void {
    this.table().filter(this.statusControl.value, 'status', 'equals');
    this.activeFilterCount.set(this.statusControl.value ? 1 : 0);
    this.filterPopover().hide();
  }

  /**
   * Method onResetColumnFilters
   *
   * @description
   * Clears the draft filter control, resets every native column filter, and
   * closes the popover.
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected onResetColumnFilters(): void {
    this.resetColumnFilters();
    this.filterPopover().hide();
  }

  /**
   * Method onActionMenuToggle
   *
   * @description
   * Stores the targeted checklist row and toggles the shared action menu.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MouseEvent} event Click event emitted by the row action button.
   * @param {ChecklistOutput} checklist Checklist row targeted by the menu.
   *
   * @returns {void}
   */
  protected onActionMenuToggle(event: MouseEvent, checklist: ChecklistOutput): void {
    this.selectedChecklist.set(checklist);
    this.actionMenu().toggle(event);
  }

  /**
   * Method resetColumnFilters
   *
   * @description
   * Clears the draft {@link statusControl} value and resets the native
   * column filter via `Table.filter()` (which triggers a fresh lazy load
   * without disturbing the active sort, unlike `Table.clear()`), then zeroes
   * {@link activeFilterCount}.
   *
   * @access private
   * @since 1.1.0
   *
   * @returns {void}
   */
  private resetColumnFilters(): void {
    this.statusControl.setValue(null, { emitEvent: false });
    this.table().filter(null, 'status', 'equals');
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
  //#endregion
}
