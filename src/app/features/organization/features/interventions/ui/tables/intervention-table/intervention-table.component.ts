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
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';
import { Popover, PopoverModule } from 'primeng/popover';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { SplitButtonModule } from 'primeng/splitbutton';
import { Table, TableModule, type TableLazyLoadEvent } from 'primeng/table';
import type { StoreError } from '@core/request-state';
import {
  type InterventionListOptions,
  type InterventionOutput,
  type InterventionStatus,
  type InterventionType,
} from '@features/organization/features/interventions/models';
import { EmptyState, Tag } from '@shared/components';
import { buildTableFilterParams } from '@shared/utils';
import { InterventionTag } from '../../components/intervention-tag';
import { INTERVENTION_FILTER_MAPPING } from './constants';
import type { InterventionStatusOption, InterventionTypeOption } from './models';
import { INTERVENTION_STATUS_OPTIONS, INTERVENTION_TYPE_OPTIONS } from './options';
import { getInterventionTypeIcon } from './utils';

/**
 * Component InterventionTable
 * @class InterventionTable
 *
 * @description
 * Presentational intervention table used by the intervention list route page.
 * Owns only local form and table UI state while delegating loading,
 * navigation and creation orchestration to the parent page through outputs.
 *
 * @version 1.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-table',
  imports: [
    AvatarModule,
    ButtonModule,
    DatePickerModule,
    DatePipe,
    EmptyState,
    InterventionTag,
    MessageModule,
    PopoverModule,
    ReactiveFormsModule,
    SelectModule,
    SkeletonModule,
    SplitButtonModule,
    TableModule,
    CardModule,
    Tag,
  ],
  templateUrl: './intervention-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionTable implements OnInit {
  //#region Inputs
  /**
   * Input interventions
   * @readonly
   *
   * @description
   * Intervention rows currently displayed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionOutput[]>}
   */
  public readonly interventions: InputSignal<readonly InterventionOutput[]> =
    input.required<readonly InterventionOutput[]>();

  /**
   * Input total
   * @readonly
   *
   * @description
   * Total number of interventions for the active organization.
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
   * Whether the intervention list is currently loading.
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
   * Whether the active organization has no interventions.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly empty: InputSignal<boolean> = input.required<boolean>();

  /**
   * Input error
   * @readonly
   *
   * @description
   * Normalized list-load error, or `null` when the last load succeeded. When
   * set, the table renders a dedicated error banner with a retry action instead
   * of the "No interventions yet" empty state.
   *
   * @access public
   * @since 1.5.0
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly error: InputSignal<StoreError | null> = input<StoreError | null>(null);

  /**
   * Input initialPage
   * @readonly
   *
   * @description
   * One-based page restored from the parent route query parameter.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignalWithTransform<number, unknown>}
   */
  public readonly initialPage: InputSignalWithTransform<number, unknown> = input<number, unknown>(
    1,
    { transform: (value: unknown): number => Math.max(1, numberAttribute(value, 1)) },
  );

  /**
   * Input showHeading
   * @readonly
   *
   * @description
   * Whether to render the card heading (title and description). Disabled when the
   * parent page already provides the heading, to avoid a duplicated title.
   *
   * @access public
   * @since 1.3.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly showHeading: InputSignal<boolean> = input<boolean>(true);

  /**
   * Input showCreate
   * @readonly
   *
   * @description
   * Whether to render the in-card creation action. Disabled when the parent page
   * owns a single creation action shared across views; the toolbar then exposes
   * only the refresh control, the filters popover keeping its own clear affordance.
   *
   * @access public
   * @since 1.3.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly showCreate: InputSignal<boolean> = input<boolean>(true);
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
   * @since 1.1.0
   *
   * @type {OutputEmitterRef<InterventionListOptions>}
   */
  public readonly load: OutputEmitterRef<InterventionListOptions> =
    output<InterventionListOptions>();

  /**
   * Output pageChange
   * @readonly
   *
   * @description
   * Emits the one-based page selected by the user.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly pageChange: OutputEmitterRef<number> = output<number>();

  /**
   * Output view
   * @readonly
   *
   * @description
   * Emits an intervention selected for detail navigation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionOutput>}
   */
  public readonly view: OutputEmitterRef<InterventionOutput> = output<InterventionOutput>();

  /**
   * Output createRequested
   * @readonly
   *
   * @description
   * Emits when the user asks to create an intervention, so the parent page can
   * open the guided creation dialog.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly createRequested: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property rows
   * @readonly
   *
   * @description
   * Default number of intervention rows per page.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {number}
   */
  protected readonly rows: number = 12;

  /**
   * Property firstPage
   * @readonly
   *
   * @description
   * Zero-based row offset consumed by PrimeNG for the current page.
   *
   * @access protected
   * @since 1.1.0
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
   * @since 1.1.0
   *
   * @type {boolean}
   */
  private initialized: boolean = false;

  /**
   * Property lastEvent
   * @readonly
   *
   * @description
   * Last lazy-load event, replayed (with its sort) when a filter changes.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {WritableSignal<TableLazyLoadEvent | null>}
   */
  private readonly lastEvent: WritableSignal<TableLazyLoadEvent | null> =
    signal<TableLazyLoadEvent | null>(null);

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
   * @since 1.1.0
   *
   * @type {FormControl<InterventionStatus | null>}
   */
  protected readonly statusControl: FormControl<InterventionStatus | null> =
    new FormControl<InterventionStatus | null>(null);

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
   * @since 1.4.0
   *
   * @type {FormControl<InterventionType | null>}
   */
  protected readonly typeControl: FormControl<InterventionType | null> =
    new FormControl<InterventionType | null>(null);

  /**
   * Property dueAtControl
   * @readonly
   *
   * @description
   * Draft `[from, to]` value of the "Due" date-range column filter, edited
   * inside {@link filterPopover} and only forwarded to the table's native
   * `filter()` API when {@link onApplyColumnFilters} runs.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {FormControl<[Date | null, Date | null] | null>}
   */
  protected readonly dueAtControl: FormControl<[Date | null, Date | null] | null> = new FormControl<
    [Date | null, Date | null] | null
  >(null);

  /**
   * Property statusOptions
   * @readonly
   *
   * @description
   * Status filter options resolved from the intervention tag registry.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {InterventionStatusOption[]}
   */
  protected readonly statusOptions: InterventionStatusOption[] = INTERVENTION_STATUS_OPTIONS;

  /**
   * Property typeOptions
   * @readonly
   *
   * @description
   * Type filter options resolved from the intervention tag registry.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {InterventionTypeOption[]}
   */
  protected readonly typeOptions: InterventionTypeOption[] = INTERVENTION_TYPE_OPTIONS;

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
   * @since 1.4.0
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
   * @since 1.4.0
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
   * @since 1.4.0
   *
   * @type {Signal<Popover>}
   */
  private readonly filterPopover: Signal<Popover> = viewChild.required<Popover>('filterPopover');

  /**
   * Property table
   * @readonly
   *
   * @description
   * Reference to the underlying PrimeNG table, used to apply and reset native
   * column filters from the popover.
   *
   * @access private
   * @since 1.4.0
   *
   * @type {Signal<Table>}
   */
  private readonly table: Signal<Table> = viewChild.required<Table>(Table);

  /**
   * Property skeletonItems
   * @readonly
   *
   * @description
   * Placeholder rows rendered while the list is loading.
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
   * @since 1.4.0
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
   * @since 1.4.0
   *
   * @type {boolean}
   */
  private hasStartedLoading: boolean = false;

  /**
   * Property showSkeleton
   * @readonly
   *
   * @description
   * Whether to render skeleton placeholders in place of {@link interventions}.
   * True only while the first lazy load is in flight; see
   * {@link hasLoadedOnce}.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly showSkeleton: Signal<boolean> = computed(
    (): boolean => this.loading() && !this.hasLoadedOnce(),
  );

  /**
   * Property toolbarActions
   * @readonly
   *
   * @description
   * Split-button menu actions surfaced next to the create action: refresh and
   * filter reset, mirroring the other organization tables.
   *
   * @access protected
   * @since 1.1.0
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
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Tracks the loading→settled edge that marks the first completed lazy load
   * (see {@link hasLoadedOnce}).
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
   * @since 1.1.0
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
   * @method onLazyLoad
   *
   * @description
   * Handles PrimeNG lazy-load events and emits normalized request options.
   * Column filters are translated through {@link INTERVENTION_FILTER_MAPPING}
   * into the API's flat `status`/`type`/`dueAtAfter`/`dueAtBefore` params; the
   * resulting bag is cast into {@link InterventionListOptions} because
   * `buildTableFilterParams` returns a generic string-keyed record while the
   * emitted contract keeps typed literal-union fields.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {TableLazyLoadEvent} event - PrimeNG lazy-load event.
   *
   * @returns {void}
   */
  public onLazyLoad(event: TableLazyLoadEvent): void {
    const first: number = event.first ?? 0;
    const rowsPerPage: number = event.rows ?? this.rows;
    const page: number = Math.floor(first / rowsPerPage) + 1;
    const sortField: string | null | undefined = Array.isArray(event.sortField)
      ? event.sortField[0]
      : event.sortField;
    const filterParams: Partial<InterventionListOptions> = buildTableFilterParams(
      event.filters,
      INTERVENTION_FILTER_MAPPING,
    ) as unknown as Partial<InterventionListOptions>;

    this.firstPage.set(first);
    this.lastEvent.set(event);

    this.load.emit({
      page,
      itemsPerPage: rowsPerPage,
      ...filterParams,
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
   * Method onCreateRequested
   * @method onCreateRequested
   *
   * @description
   * Emits a create request so the parent page opens the guided creation dialog.
   *
   * @access protected
   * @since 1.2.0
   *
   * @return {void}
   */
  protected onCreateRequested(): void {
    this.createRequested.emit();
  }

  /**
   * Method onRefresh
   * @method onRefresh
   *
   * @description
   * Reloads the current page with the latest page size.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected onRefresh(): void {
    this.reload();
  }

  /**
   * Method onRetry
   * @method onRetry
   *
   * @description
   * Re-triggers the failed load from the error banner by replaying the last
   * lazy-load event (preserving its sort and filters), which re-emits `load` for
   * the parent store.
   *
   * @access protected
   * @since 1.5.0
   *
   * @return {void}
   */
  protected onRetry(): void {
    this.reload();
  }

  /**
   * Method onClearFilters
   * @method onClearFilters
   *
   * @description
   * Clears every column filter and reloads the first page.
   *
   * @access protected
   * @since 1.1.0
   *
   * @return {void}
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
   * @since 1.4.0
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
   * and {@link dueAtControl} values to the table's native `filter()` API.
   * `Table.filter()` debounces internally (`filterDelay`), so the three calls
   * below collapse into a single `onLazyLoad` request. Closes the popover
   * once applied.
   *
   * @access protected
   * @since 1.4.0
   *
   * @returns {void}
   */
  protected onApplyColumnFilters(): void {
    const table: Table = this.table();
    const dueAt: [Date | null, Date | null] | null = this.hasDueAtValue()
      ? this.dueAtControl.value
      : null;

    table.filter(this.statusControl.value, 'status', 'equals');
    table.filter(this.typeControl.value, 'type', 'equals');
    table.filter(dueAt, 'dueAt', 'between');

    this.activeFilterCount.set(
      (this.statusControl.value ? 1 : 0) +
        (this.typeControl.value ? 1 : 0) +
        (this.hasDueAtValue() ? 1 : 0),
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
   * @since 1.4.0
   *
   * @returns {void}
   */
  protected onResetColumnFilters(): void {
    this.resetColumnFilters();
    this.filterPopover().hide();
  }

  /**
   * Method getTypeIcon
   * @method getTypeIcon
   *
   * @description
   * Resolves the PrimeIcon class matching an intervention objective type.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {InterventionType} type - Intervention objective type.
   *
   * @return {string} PrimeIcon class string.
   */
  protected getTypeIcon(type: InterventionType): string {
    return getInterventionTypeIcon(type);
  }

  /**
   * Method resetColumnFilters
   *
   * @description
   * Clears the draft {@link statusControl}, {@link typeControl}, and
   * {@link dueAtControl} values and resets every native column filter via
   * per-field `Table.filter()` calls (which trigger a fresh lazy load
   * without disturbing the active sort, unlike `Table.clear()`), then zeroes
   * {@link activeFilterCount}.
   *
   * @access private
   * @since 1.4.0
   *
   * @returns {void}
   */
  private resetColumnFilters(): void {
    const table: Table = this.table();

    this.statusControl.setValue(null, { emitEvent: false });
    this.typeControl.setValue(null, { emitEvent: false });
    this.dueAtControl.setValue(null, { emitEvent: false });
    table.filter(null, 'status', 'equals');
    table.filter(null, 'type', 'equals');
    table.filter(null, 'dueAt', 'between');
    this.activeFilterCount.set(0);
  }

  /**
   * Method hasDueAtValue
   *
   * @description
   * Whether {@link dueAtControl} carries at least one bound date. A range
   * picker's cleared value is `[null, null]`, which is truthy as an array and
   * would otherwise read as an active filter.
   *
   * @access private
   * @since 1.4.0
   *
   * @returns {boolean} Whether either end of the range is set.
   */
  private hasDueAtValue(): boolean {
    const range: [Date | null, Date | null] | null = this.dueAtControl.value;

    return !!range && (range[0] != null || range[1] != null);
  }

  /**
   * Method reload
   * @method reload
   *
   * @description
   * Replays the last lazy-load event on the first page, preserving the active
   * sort and column filters.
   *
   * @access private
   * @since 1.1.0
   *
   * @return {void}
   */
  private reload(): void {
    const event: TableLazyLoadEvent = this.lastEvent() ?? { first: 0, rows: this.rows };

    this.firstPage.set(0);
    this.onLazyLoad({ ...event, first: 0, rows: event.rows ?? this.rows });
  }
  //#endregion
}
