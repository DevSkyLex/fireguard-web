import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MenuItem, PrimeIcons } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TableModule, type TableLazyLoadEvent, type TablePassThroughOptions } from 'primeng/table';
import {
  type InterventionListOptions,
  type InterventionOutput,
  type InterventionStatus,
  type InterventionType,
} from '@features/organization/features/interventions/models';
import { EmptyState, Tag } from '@shared/components';
import { InterventionTag } from '../../components/intervention-tag';
import type { InterventionStatusOption } from './models';
import { INTERVENTION_STATUS_OPTIONS } from './options';
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
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-table',
  imports: [
    AvatarModule,
    ButtonModule,
    CardModule,
    DatePipe,
    EmptyState,
    InterventionTag,
    ReactiveFormsModule,
    SelectModule,
    SkeletonModule,
    SplitButtonModule,
    TableModule,
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
   * only the refresh control, the status filter keeping its own clear affordance.
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
   * Emits a intervention selected for detail navigation.
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
   * Property cardPt
   * @readonly
   *
   * @description
   * PrimeNG card pass-through classes used for full-height table layout.
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
   * PrimeNG table pass-through classes aligned with organization tables.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {TablePassThroughOptions}
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
   * Last lazy-load event, replayed (with its sort) when the filter changes.
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
   * Workflow status filter forwarded as the `status` query parameter.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {FormControl<InterventionStatus | null>}
   */
  protected readonly statusControl: FormControl<InterventionStatus | null> =
    new FormControl<InterventionStatus | null>(null);

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

    this.firstPage.set(first);
    this.lastEvent.set(event);

    this.load.emit({
      page,
      itemsPerPage: rowsPerPage,
      ...(this.statusControl.value ? { status: this.statusControl.value } : {}),
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
   * Method onStatusChange
   * @method onStatusChange
   *
   * @description
   * Reloads the first page when the status filter changes.
   *
   * @access protected
   * @since 1.1.0
   *
   * @return {void}
   */
  protected onStatusChange(): void {
    this.reload();
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
   * Method onClearFilters
   * @method onClearFilters
   *
   * @description
   * Clears the status filter and reloads the first page.
   *
   * @access protected
   * @since 1.1.0
   *
   * @return {void}
   */
  protected onClearFilters(): void {
    this.statusControl.setValue(null, { emitEvent: false });
    this.reload();
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
   * Method reload
   * @method reload
   *
   * @description
   * Replays the last lazy-load event on the first page, preserving the active
   * sort and status filter.
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
