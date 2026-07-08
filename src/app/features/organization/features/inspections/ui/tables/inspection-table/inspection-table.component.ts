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
import { DatePickerModule } from 'primeng/datepicker';
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
import { pickAvatarUrl } from '@core/api/utils';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  InspectionOutput,
  InspectionResult,
  InspectionStatus,
} from '@features/organization/features/inspections/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { EmptyState, TableShell, Tag } from '@shared/components';
import { buildTableFilterParams } from '@shared/utils';
import { INSPECTION_FILTER_MAPPING } from './constants';
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
    DatePickerModule,
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

  /**
   * Input createDisabled
   * @readonly
   *
   * @description
   * Whether inspection creation is blocked because the organization has reached
   * its plan limit for inspections. Disables the "New inspection" actions.
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
   * Requests navigation to inspection creation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly add: OutputEmitterRef<void> = output<void>();

  /**
   * Requests navigation to the inspection detail page.
   */
  public readonly view: OutputEmitterRef<InspectionOutput> = output<InspectionOutput>();

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

  /** Emits the inspection selected from the row action menu for cancellation. */
  public readonly cancel: OutputEmitterRef<InspectionOutput> = output<InspectionOutput>();
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
   * Whether to render skeleton placeholders in place of {@link inspections}.
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
    {
      label: $localize`:@@inspectionResult.pass:Pass`,
      value: 'pass',
      icon: PrimeIcons.CHECK_CIRCLE,
      severity: 'success',
    },
    {
      label: $localize`:@@inspectionResult.partial:Partial`,
      value: 'partial',
      icon: PrimeIcons.EXCLAMATION_CIRCLE,
      severity: 'warn',
    },
    {
      label: $localize`:@@inspectionResult.fail:Fail`,
      value: 'fail',
      icon: PrimeIcons.TIMES_CIRCLE,
      severity: 'danger',
    },
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
    {
      label: $localize`:@@inspectionStatus.draft:Draft`,
      value: 'draft',
      icon: PrimeIcons.FILE_EDIT,
      severity: 'info',
    },
    {
      label: $localize`:@@inspectionStatus.submitted:Submitted`,
      value: 'submitted',
      icon: PrimeIcons.SEND,
      severity: 'warn',
    },
    {
      label: $localize`:@@inspectionStatus.closed:Closed`,
      value: 'closed',
      icon: PrimeIcons.LOCK,
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
   * Property resultControl
   * @readonly
   *
   * @description
   * Draft value of the "Result" column filter, edited inside
   * {@link filterPopover} and only forwarded to the table's native
   * `filter()` API when {@link onApplyColumnFilters} runs.
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
   * Draft value of the "Status" column filter, edited inside
   * {@link filterPopover} and only forwarded to the table's native
   * `filter()` API when {@link onApplyColumnFilters} runs.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<InspectionStatus | null>}
   */
  protected readonly statusControl: FormControl<InspectionStatus | null> =
    new FormControl<InspectionStatus | null>(null);

  /**
   * Property performedAtControl
   * @readonly
   *
   * @description
   * Draft `[from, to]` value of the "Performed" date-range column filter,
   * edited inside {@link filterPopover} and only forwarded to the table's
   * native `filter()` API when {@link onApplyColumnFilters} runs.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<[Date | null, Date | null] | null>}
   */
  protected readonly performedAtControl: FormControl<[Date | null, Date | null] | null> =
    new FormControl<[Date | null, Date | null] | null>(null);

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
   * Property canManageInspections
   * @readonly
   *
   * @description
   * Whether the member can create, edit, or cancel inspections.
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
   * Property table
   * @readonly
   *
   * @description
   * Reference to the underlying PrimeNG table, used to reset native column
   * filters when the user clears all filters.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<Table>}
   */
  private readonly table: Signal<Table> = viewChild.required<Table>(Table);

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

    if (!inspection) {
      return [];
    }

    return [
      {
        label: $localize`:@@common.view:View`,
        icon: PrimeIcons.EYE,
        command: (): void => this.view.emit(inspection),
      },
      ...(this.canManageInspections() && inspection.status === 'draft'
        ? [
            {
              label: $localize`:@@common.edit:Edit`,
              icon: PrimeIcons.PENCIL,
              command: (): void => this.edit.emit(inspection),
            },
            {
              label: $localize`:@@common.cancel:Cancel`,
              icon: PrimeIcons.TIMES_CIRCLE,
              styleClass: 'text-red-500',
              command: (): void => this.cancel.emit(inspection),
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
    const params: Record<string, string | number | boolean> = {};
    const search: string = this.searchControl.value.trim();

    this.firstPage.set(first);
    this.lastLazyEvent.set(event);

    if (search) params['search'] = search;
    Object.assign(params, buildTableFilterParams(event.filters, INSPECTION_FILTER_MAPPING));
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
   * Forwards the popover's draft {@link resultControl}, {@link statusControl},
   * and {@link performedAtControl} values to the table's native `filter()`
   * API. `Table.filter()` debounces internally (`filterDelay`), so the three
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
    const performedAt: [Date | null, Date | null] | null = this.hasPerformedAtValue()
      ? this.performedAtControl.value
      : null;

    table.filter(this.resultControl.value, 'result', 'equals');
    table.filter(this.statusControl.value, 'status', 'equals');
    table.filter(performedAt, 'performedAt', 'between');

    this.activeFilterCount.set(
      (this.resultControl.value ? 1 : 0) +
        (this.statusControl.value ? 1 : 0) +
        (this.hasPerformedAtValue() ? 1 : 0),
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
      $localize`:@@inspection.unknownInspector:Unknown inspector`
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
    return (
      this.toDisplayLabel(inspection.inspector?.type) || $localize`:@@inspection.unknown:Unknown`
    );
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
   * Method getInspectorAvatarUrl
   *
   * @description
   * Resolves the inspector avatar URL using the 64px variant when
   * available, falling back to the legacy single avatar URL.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionOutput} inspection Inspection row rendered by the table.
   *
   * @returns {string | null} Avatar URL suited for the table avatar size.
   */
  protected getInspectorAvatarUrl(inspection: InspectionOutput): string | null {
    return pickAvatarUrl(inspection.inspector?.avatarUrls, '64', inspection.inspector?.avatarUrl);
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
        severity: 'secondary',
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
        severity: 'secondary',
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
    return count > 1
      ? $localize`:@@inspection.findingsPlural:${count}:count: findings`
      : $localize`:@@inspection.findingsOne:${count}:count: finding`;
  }

  /**
   * Method resetColumnFilters
   *
   * @description
   * Clears the draft {@link resultControl}, {@link statusControl}, and
   * {@link performedAtControl} values and resets every native column filter
   * via per-field `Table.filter()` calls (which trigger a fresh lazy load
   * without disturbing the active sort, unlike `Table.clear()`), then zeroes
   * {@link activeFilterCount}.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {void}
   */
  private resetColumnFilters(): void {
    const table: Table = this.table();

    this.resultControl.setValue(null, { emitEvent: false });
    this.statusControl.setValue(null, { emitEvent: false });
    this.performedAtControl.setValue(null, { emitEvent: false });
    table.filter(null, 'result', 'equals');
    table.filter(null, 'status', 'equals');
    table.filter(null, 'performedAt', 'between');
    this.activeFilterCount.set(0);
  }

  /**
   * Method hasPerformedAtValue
   *
   * @description
   * Whether {@link performedAtControl} carries at least one bound date. A
   * range picker's cleared value is `[null, null]`, which is truthy as an
   * array and would otherwise read as an active filter.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {boolean} Whether either end of the range is set.
   */
  private hasPerformedAtValue(): boolean {
    const range: [Date | null, Date | null] | null = this.performedAtControl.value;

    return !!range && (range[0] != null || range[1] != null);
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
