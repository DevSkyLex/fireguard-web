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
import { Menu, MenuModule } from 'primeng/menu';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TableModule, type TableLazyLoadEvent, type TablePassThroughOptions } from 'primeng/table';
import type { RequestOptions } from '@core/services/hydra-api';
import { pickAvatarUrl } from '@core/utils';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  InspectionOutput,
  InspectionResult,
  InspectionStatus,
} from '@features/organization/features/inspections/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { EmptyState, Tag } from '@shared/components';
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
    AvatarModule,
    ButtonModule,
    CardModule,
    DatePipe,
    EmptyState,
    MenuModule,
    ReactiveFormsModule,
    SelectModule,
    SkeletonModule,
    SplitButtonModule,
    TableModule,
    Tag,
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

  /**
   * Emits the inspection selected for detail navigation.
   */
  public readonly view: OutputEmitterRef<InspectionOutput> = output<InspectionOutput>();

  /**
   * Output edit
   * @readonly
   *
   * @description
   * Emits the inspection selected from the row action menu when the user
   * requests an edit flow. The parent decides how to route or open the editor.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InspectionOutput>}
   */
  public readonly edit: OutputEmitterRef<InspectionOutput> = output<InspectionOutput>();

  /** Emits the draft inspection selected for cancellation. */
  public readonly cancel: OutputEmitterRef<InspectionOutput> = output<InspectionOutput>();
  //#endregion

  //#region Properties
  /**
   * Property organizationPermissionService
   * @readonly
   *
   * @description
   * Organization-scoped permission helper used to decide whether inspection
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
    {
      label: 'Pass',
      value: 'pass',
      icon: PrimeIcons.CHECK_CIRCLE,
      severity: 'success',
    },
    {
      label: 'Partial',
      value: 'partial',
      icon: PrimeIcons.EXCLAMATION_CIRCLE,
      severity: 'warn',
    },
    {
      label: 'Fail',
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
   * Status filter choices available for facility inspections.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InspectionFilterOption<InspectionStatus>[]}
   */
  protected readonly statusOptions: InspectionFilterOption<InspectionStatus>[] = [
    {
      label: 'Draft',
      value: 'draft',
      icon: PrimeIcons.FILE_EDIT,
      severity: 'info',
    },
    {
      label: 'Submitted',
      value: 'submitted',
      icon: PrimeIcons.SEND,
      severity: 'warn',
    },
    {
      label: 'Closed',
      value: 'closed',
      icon: PrimeIcons.LOCK,
      severity: 'secondary',
    },
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
   * Property canManageInspections
   * @readonly
   *
   * @description
   * Whether the authenticated organization member can access inspection row
   * mutation actions such as edit and cancel.
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
   * Inspection row currently targeted by the shared action menu.
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
   * Menu items shown for the currently selected inspection row. Items are
   * hidden unless the member has the inspection write permission.
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
        label: 'View',
        icon: PrimeIcons.EYE,
        command: (): void => this.view.emit(inspection),
      },
      ...(this.canManageInspections() && inspection.status === 'draft'
        ? [
            {
              label: 'Edit',
              icon: PrimeIcons.PENCIL,
              command: (): void => this.edit.emit(inspection),
            },
            {
              label: 'Cancel',
              icon: PrimeIcons.TIMES,
              styleClass: 'text-red-500',
              command: (): void => this.cancel.emit(inspection),
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
    const params: Record<string, string | number | boolean> = {};
    const result: InspectionResult | null = this.resultControl.value;
    const status: InspectionStatus | null = this.statusControl.value;

    this.firstPage.set(first);
    this.lastLazyEvent.set(event);

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
    const inspectorType: string = this.toDisplayLabel(inspection.inspector?.type);

    return inspection.inspector?.organizationName
      ? `${inspectorType} - ${inspection.inspector.organizationName}`
      : `${inspectorType || 'Unknown'} inspector`;
  }

  /**
   * Method getInspectorDisplayName
   *
   * @description
   * Returns the display name of the embedded inspector summary.
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
   * Builds initials used by the inspector avatar when no image URL is
   * available.
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
   * @returns {InspectionFilterOption<InspectionResult>} Matching result badge option.
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
   * @returns {InspectionFilterOption<InspectionStatus>} Matching status badge option.
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
