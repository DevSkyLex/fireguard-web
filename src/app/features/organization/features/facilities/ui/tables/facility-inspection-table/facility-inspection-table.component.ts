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
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TableModule, type TableLazyLoadEvent, type TablePassThroughOptions } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import type { RequestOptions } from '@core/services/hydra-api';
import type {
  InspectionOutput,
  InspectionResult,
  InspectionStatus,
} from '@features/organization/features/inspections/models';
import type { InspectionFilterOption } from './models';

/**
 * Component FacilityInspectionTable
 * @class FacilityInspectionTable
 *
 * @description
 * Facility-scoped inspection table with lazy loading, pagination, sorting,
 * result filtering, and status filtering. The component emits request options
 * while the parent facility tab owns the facility ID and store interaction.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-inspection-table',
  imports: [
    ButtonModule,
    CardModule,
    DatePipe,
    ReactiveFormsModule,
    SelectModule,
    SkeletonModule,
    SplitButtonModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './facility-inspection-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityInspectionTable implements OnInit {
  //#region Inputs
  /**
   * Input inspections
   * @readonly
   *
   * @description
   * Inspection rows currently displayed by the table.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InspectionOutput[]>}
   */
  public readonly inspections: InputSignal<readonly InspectionOutput[]> =
    input.required<readonly InspectionOutput[]>();

  /**
   * Input total
   * @readonly
   *
   * @description
   * Total number of facility inspection records matching the current query.
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
   * Whether the table is waiting for inspection data. Disables filters and
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
   * Whether the current query has no facility inspection rows. Used to render
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
   * delegating to the inspection store.
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
   * Requests navigation to the facility-aware inspection creation flow.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly add: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
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
        'h-full flex flex-col border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-950 shadow-none!',
    },
    body: {
      class: 'p-0! flex flex-col flex-1 min-h-0',
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
      class: 'border-0 p-0 bg-surface-0 dark:bg-surface-950',
    },
    pcPaginator: {
      root: {
        class:
          'mt-auto rounded-none border-t border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-950 justify-end',
      },
    },
  };

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
   * Property resultOptions
   * @readonly
   *
   * @description
   * Result filter choices available for facility inspections.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InspectionFilterOption<InspectionResult>[]}
   */
  protected readonly resultOptions: InspectionFilterOption<InspectionResult>[] = [
    { label: 'Pass', value: 'pass' },
    { label: 'Partial', value: 'partial' },
    { label: 'Fail', value: 'fail' },
  ];

  /**
   * Property statusOptions
   * @readonly
   *
   * @description
   * Status filter choices available for facility inspections.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InspectionFilterOption<InspectionStatus>[]}
   */
  protected readonly statusOptions: InspectionFilterOption<InspectionStatus>[] = [
    { label: 'Draft', value: 'draft' },
    { label: 'Submitted', value: 'submitted' },
    { label: 'Closed', value: 'closed' },
  ];

  /**
   * Property resultControl
   * @readonly
   *
   * @description
   * Inspection result filter forwarded as the `result` query parameter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<InspectionResult | null>}
   */
  protected readonly resultControl: FormControl<InspectionResult | null> =
    new FormControl<InspectionResult | null>(null);

  /**
   * Property statusControl
   * @readonly
   *
   * @description
   * Inspection status filter forwarded as the `status` query parameter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<InspectionStatus | null>}
   */
  protected readonly statusControl: FormControl<InspectionStatus | null> =
    new FormControl<InspectionStatus | null>(null);

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
   * Property firstPage
   *
   * @description
   * Zero-based row offset consumed by PrimeNG for the initial page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {number}
   */
  protected firstPage: number = 0;

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
    this.resultControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.reload());
    this.statusControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.reload());

    effect(() => {
      if (this.loading()) {
        this.resultControl.disable({ emitEvent: false });
        this.statusControl.disable({ emitEvent: false });
      } else {
        this.resultControl.enable({ emitEvent: false });
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
    this.firstPage = (this.initialPage() - 1) * this.rows;
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
    this.lastLazyEvent.set(event);

    const first: number = event.first ?? 0;
    const rowsPerPage: number = event.rows ?? this.rows;
    const page: number = Math.floor(first / rowsPerPage) + 1;
    const params: Record<string, string | number | boolean> = {};
    const result: InspectionResult | null = this.resultControl.value;
    const status: InspectionStatus | null = this.statusControl.value;

    if (result) params['result'] = result;
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
    this.resultControl.setValue(null, { emitEvent: false });
    this.statusControl.setValue(null, { emitEvent: false });
    this.reload();
  }

  /**
   * Method getInspectorContextLabel
   *
   * @description
   * Builds the secondary inspector context label from inspector type and
   * optional inspector organization name.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionOutput} inspection Inspection row rendered by the table.
   *
   * @returns {string} Inspector context label.
   */
  protected getInspectorContextLabel(inspection: InspectionOutput): string {
    const inspectorType: string = this.toDisplayLabel(inspection.inspectorType);

    return inspection.inspectorOrganizationName
      ? `${inspectorType} - ${inspection.inspectorOrganizationName}`
      : `${inspectorType} inspector`;
  }

  /**
   * Method getResultLabel
   *
   * @description
   * Converts an inspection result value into a display label.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionResult} result API inspection result.
   *
   * @returns {string} Human-readable result label.
   */
  protected getResultLabel(result: InspectionResult): string {
    return this.toDisplayLabel(result);
  }

  /**
   * Method getStatusLabel
   *
   * @description
   * Converts an inspection status value into a display label.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionStatus} status API inspection status.
   *
   * @returns {string} Human-readable status label.
   */
  protected getStatusLabel(status: InspectionStatus): string {
    return this.toDisplayLabel(status);
  }

  /**
   * Method getFindingsLabel
   *
   * @description
   * Formats the findings count with singular/plural text.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number} count Non-conformity count associated with the inspection.
   *
   * @returns {string} Human-readable findings label.
   */
  protected getFindingsLabel(count: number): string {
    return `${count} finding${count > 1 ? 's' : ''}`;
  }

  /**
   * Method getResultSeverity
   *
   * @description
   * Maps an inspection result to a PrimeNG tag severity.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionResult} result API inspection result.
   *
   * @returns {'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'} PrimeNG tag severity.
   */
  protected getResultSeverity(
    result: InspectionResult,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (result) {
      case 'pass':
        return 'success';
      case 'fail':
        return 'danger';
      case 'partial':
        return 'warn';
      default:
        return 'secondary';
    }
  }

  /**
   * Method getStatusSeverity
   *
   * @description
   * Maps an inspection status to a PrimeNG tag severity.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionStatus} status API inspection status.
   *
   * @returns {'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'} PrimeNG tag severity.
   */
  protected getStatusSeverity(
    status: InspectionStatus,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case 'draft':
        return 'info';
      case 'submitted':
        return 'warn';
      case 'closed':
        return 'secondary';
      default:
        return 'secondary';
    }
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
   * @param {Record<string, string | number | boolean>} params Request parameter object to enrich.
   * @param {TableLazyLoadEvent} event PrimeNG lazy-load event containing sort metadata.
   *
   * @returns {void}
   */
  private appendSortParams(
    params: Record<string, string | number | boolean>,
    event: TableLazyLoadEvent,
  ): void {
    const sortField: string | null | undefined = Array.isArray(event.sortField)
      ? event.sortField[0]
      : event.sortField;

    if (!sortField || !event.sortOrder) {
      return;
    }

    params[`order[${sortField}]`] = event.sortOrder === 1 ? 'asc' : 'desc';
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
