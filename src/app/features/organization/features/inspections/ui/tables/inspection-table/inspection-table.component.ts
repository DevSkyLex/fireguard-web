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
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TableModule, type TableLazyLoadEvent, type TablePassThroughOptions } from 'primeng/table';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import type { RequestOptions } from '@core/services/hydra-api';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  InspectionOutput,
  InspectionResult,
  InspectionStatus,
} from '@features/organization/features/inspections/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import type { InspectionFilterOption } from './models';

/**
 * Component InspectionTable
 * @class InspectionTable
 *
 * @description
 * Presentational table component that displays a paginated, lazy-loaded list
 * of organization inspections. It owns local search, result/status filters,
 * pagination, sorting, selection, and row action menu state while delegating
 * data loading and mutations to the parent page through output emitters.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-table',
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
    SelectModule,
    SkeletonModule,
    SplitButtonModule,
    TableModule,
  ],
  templateUrl: './inspection-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionTable implements OnInit {
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
   * Total number of inspection records matching the current query.
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
   * Whether the inspection list is currently loading.
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
   * Whether the current query has no inspection rows.
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
   * Output add
   * @readonly
   *
   * @description
   * Requests navigation to inspection creation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly add: OutputEmitterRef<void> = output<void>();

  /**
   * Output edit
   * @readonly
   *
   * @description
   * Emits the inspection selected from the row action menu for editing.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InspectionOutput>}
   */
  public readonly edit: OutputEmitterRef<InspectionOutput> = output<InspectionOutput>();

  /**
   * Output delete
   * @readonly
   *
   * @description
   * Emits the inspection selected from the row action menu for deletion.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InspectionOutput>}
   */
  public readonly delete: OutputEmitterRef<InspectionOutput> = output<InspectionOutput>();

  /**
   * Output bulkDelete
   * @readonly
   *
   * @description
   * Emits the selected inspection rows when the bulk delete action is used.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<readonly InspectionOutput[]>}
   */
  public readonly bulkDelete: OutputEmitterRef<readonly InspectionOutput[]> =
    output<readonly InspectionOutput[]>();
  //#endregion

  //#region Properties
  /**
   * Property organizationPermissionService
   * @readonly
   *
   * @description
   * Organization-scoped permission helper used to gate inspection mutations.
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
        class: 'mt-auto rounded-t-none rounded-b-2xl bg-surface-0 dark:bg-surface-900 justify-end',
      },
    },
  };

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Default number of inspection rows per page.
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
   * Property resultOptions
   * @readonly
   *
   * @description
   * Visual options used to render and filter inspection results.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InspectionFilterOption<InspectionResult>[]}
   */
  protected readonly resultOptions: InspectionFilterOption<InspectionResult>[] = [
    { label: 'Pass', value: 'pass', icon: PrimeIcons.CHECK_CIRCLE, color: '#22c55e' },
    { label: 'Partial', value: 'partial', icon: PrimeIcons.EXCLAMATION_CIRCLE, color: '#f59e0b' },
    { label: 'Fail', value: 'fail', icon: PrimeIcons.TIMES_CIRCLE, color: '#ef4444' },
  ];

  /**
   * Property statusOptions
   * @readonly
   *
   * @description
   * Visual options used to render and filter inspection statuses.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InspectionFilterOption<InspectionStatus>[]}
   */
  protected readonly statusOptions: InspectionFilterOption<InspectionStatus>[] = [
    { label: 'Draft', value: 'draft', icon: PrimeIcons.FILE_EDIT, color: '#3b82f6' },
    { label: 'Submitted', value: 'submitted', icon: PrimeIcons.SEND, color: '#f59e0b' },
    { label: 'Closed', value: 'closed', icon: PrimeIcons.LOCK, color: '#64748b' },
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
   * Property selectedInspections
   * @readonly
   *
   * @description
   * Inspection rows selected through the checkbox column.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<InspectionOutput[]>}
   */
  protected readonly selectedInspections: WritableSignal<InspectionOutput[]> =
    signal<InspectionOutput[]>([]);

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
      label: 'Refresh',
      icon: PrimeIcons.REFRESH,
      command: (): void => this.onRefresh(),
    },
    {
      label: 'Clear filters',
      icon: PrimeIcons.FILTER_SLASH,
      command: (): void => this.onClearFilters(),
    },
    ...(this.selectedInspections().length > 0
      ? [
          {
            label: 'Clear selection',
            icon: PrimeIcons.TIMES,
            command: (): void => this.onClearSelection(),
          },
        ]
      : []),
    ...(this.canManageInspections()
      ? [
          { separator: true },
          {
            label: `Delete selected (${this.selectedInspections().length})`,
            icon: PrimeIcons.TRASH,
            disabled: this.selectedInspections().length === 0,
            styleClass: 'text-red-500',
            command: (): void => this.onBulkDelete(),
          },
        ]
      : []),
  ]);

  /**
   * Property canManageInspections
   * @readonly
   *
   * @description
   * Whether the member can create, edit, or delete inspections.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canManageInspections: Signal<boolean> = computed((): boolean =>
    this.organizationPermissionService.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_WRITE),
  );

  /**
   * Property actionMenu
   * @readonly
   *
   * @description
   * Shared popup menu used by inspection rows for contextual actions.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<Menu>}
   */
  private readonly actionMenu: Signal<Menu> = viewChild.required<Menu>('actionMenu');

  /**
   * Property selectedInspection
   * @readonly
   *
   * @description
   * Inspection row currently targeted by the action menu.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<InspectionOutput | null>}
   */
  private readonly selectedInspection: WritableSignal<InspectionOutput | null> =
    signal<InspectionOutput | null>(null);

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
    const inspection: InspectionOutput | null = this.selectedInspection();

    if (!inspection || !this.canManageInspections()) {
      return [];
    }

    return [
      {
        label: 'Edit',
        icon: PrimeIcons.PENCIL,
        command: (): void => this.edit.emit(inspection),
      },
      {
        label: 'Delete',
        icon: PrimeIcons.TRASH,
        styleClass: 'text-red-500',
        command: (): void => this.delete.emit(inspection),
      },
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
   * Registers filter subscriptions and disables controls while loading.
   */
  public constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.reload());

    this.resultControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.reload());
    this.statusControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.reload());

    effect(() => {
      if (this.loading()) {
        this.searchControl.disable({ emitEvent: false });
        this.resultControl.disable({ emitEvent: false });
        this.statusControl.disable({ emitEvent: false });
      } else {
        this.searchControl.enable({ emitEvent: false });
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
    const result: InspectionResult | null = this.resultControl.value;
    const status: InspectionStatus | null = this.statusControl.value;

    this.firstPage.set(first);
    this.lastLazyEvent.set(event);

    if (shouldClearSelection) {
      this.onClearSelection();
    }

    if (search) params['search'] = search;
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
    this.searchControl.setValue('', { emitEvent: false });
    this.resultControl.setValue(null, { emitEvent: false });
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
    this.selectedInspections.set([]);
  }

  /**
   * Method onBulkDelete
   *
   * @description
   * Emits selected inspection rows when the bulk delete action is triggered.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onBulkDelete(): void {
    const selectedInspections: InspectionOutput[] = this.selectedInspections();

    if (selectedInspections.length === 0 || !this.canManageInspections()) {
      return;
    }

    this.bulkDelete.emit(selectedInspections);
  }

  /**
   * Method onActionMenuToggle
   *
   * @description
   * Stores the targeted inspection row and toggles the shared action menu.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MouseEvent} event Click event emitted by the row action button.
   * @param {InspectionOutput} inspection Inspection row targeted by the menu.
   *
   * @returns {void}
   */
  protected onActionMenuToggle(event: MouseEvent, inspection: InspectionOutput): void {
    this.selectedInspection.set(inspection);
    this.actionMenu().toggle(event);
  }

  /**
   * Method getInspectorDisplayName
   *
   * @description
   * Returns the embedded inspector display name from first and last name with
   * the API display name as fallback.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionOutput} inspection Inspection row rendered by the table.
   *
   * @returns {string} Inspector display name or fallback text.
   */
  protected getInspectorDisplayName(inspection: InspectionOutput): string {
    return (
      [inspection.inspector?.firstName, inspection.inspector?.lastName].filter(Boolean).join(' ') ||
      inspection.inspector?.displayName ||
      'Unknown inspector'
    );
  }

  /**
   * Method getInspectorTypeLabel
   *
   * @description
   * Converts the embedded inspector type into a compact display label.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionOutput} inspection Inspection row rendered by the table.
   *
   * @returns {string} Inspector type label or fallback text.
   */
  protected getInspectorTypeLabel(inspection: InspectionOutput): string {
    return this.toDisplayLabel(inspection.inspector?.type) || 'Unknown';
  }

  /**
   * Method getInspectorInitials
   *
   * @description
   * Builds initials used by the inspector avatar when no image URL exists.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionOutput} inspection Inspection row rendered by the table.
   *
   * @returns {string} One or two uppercase initials.
   */
  protected getInspectorInitials(inspection: InspectionOutput): string {
    const firstName: string = inspection.inspector?.firstName ?? '';
    const lastName: string = inspection.inspector?.lastName ?? '';
    const initials: string = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

    return initials || this.getInspectorDisplayName(inspection).charAt(0).toUpperCase() || '?';
  }

  /**
   * Method getResultOption
   *
   * @description
   * Resolves the visual badge option matching an inspection result.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionResult} result API inspection result.
   *
   * @returns {InspectionFilterOption<InspectionResult>} Matching result option.
   */
  protected getResultOption(result: InspectionResult): InspectionFilterOption<InspectionResult> {
    return (
      this.resultOptions.find(
        (option: InspectionFilterOption<InspectionResult>): boolean => option.value === result,
      ) ?? {
        label: this.toDisplayLabel(result),
        value: result,
        icon: PrimeIcons.CIRCLE,
        color: '#64748b',
      }
    );
  }

  /**
   * Method getStatusOption
   *
   * @description
   * Resolves the visual badge option matching an inspection status.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionStatus} status API inspection status.
   *
   * @returns {InspectionFilterOption<InspectionStatus>} Matching status option.
   */
  protected getStatusOption(status: InspectionStatus): InspectionFilterOption<InspectionStatus> {
    return (
      this.statusOptions.find(
        (option: InspectionFilterOption<InspectionStatus>): boolean => option.value === status,
      ) ?? {
        label: this.toDisplayLabel(status),
        value: status,
        icon: PrimeIcons.CIRCLE,
        color: '#64748b',
      }
    );
  }

  /**
   * Method getFindingsLabel
   *
   * @description
   * Formats the non-conformity count with singular/plural text.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number} count Non-conformity count.
   *
   * @returns {string} Human-readable findings label.
   */
  protected getFindingsLabel(count: number): string {
    return `${count} finding${count > 1 ? 's' : ''}`;
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
