import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  model,
  output,
  Signal,
  signal,
  viewChild,
  type ModelSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { SplitButtonModule } from 'primeng/splitbutton';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule, Table, type TableLazyLoadEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import type { OrganizationOutput } from '@core/models/organization';
import { MenuItem, PrimeIcons } from 'primeng/api';
import { OrganizationStore } from '@core/stores/organization';

/**
 * Component OrganizationTable
 * @class OrganizationTable
 *
 * @description
 * Smart table component that displays a paginated list of
 * organizations using PrimeNG's lazy-loaded `p-table`.
 *
 * Uses a component-scoped `OrganizationTableStore` (provided via
 * `providers` array) to manage its own local state independently
 * from the global `OrganizationStore` consumed by the switcher.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-table',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterModule,
    AvatarModule,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MenuModule,
    SplitButtonModule,
    SelectModule,
    SkeletonModule,
    TableModule,
    TagModule,
    TitleCasePipe,
    TooltipModule,
  ],
  providers: [OrganizationStore],
  templateUrl: './organization-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationTable {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-level NgRx SignalStore scoped to this component's
   * lifecycle. Manages the table's organization list, total count,
   * and loading state independently from the global OrganizationStore
   * so that table-specific filters never pollute the switcher.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {OrganizationStore}
   */
  protected readonly store: OrganizationStore =
    inject<OrganizationStore>(OrganizationStore);

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Default number of rows per page for the table paginator.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {number}
   */
  protected readonly rows: number = 10;

  /**
   * Property searchControl
   * @readonly
   *
   * @description
   * FormControl for the search input.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {FormControl<string>}
   */
  protected readonly searchControl: FormControl<string> =
    new FormControl<string>('', { nonNullable: true });

  /**
   * Property selectedStatus
   * @readonly
   *
   * @description
   * FormControl for the status dropdown filter.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {FormControl<string | null>}
   */
  protected readonly selectedStatus: FormControl<string | null> =
    new FormControl<string | null>(null);

  /**
   * Property statusOptions
   * @readonly
   *
   * @description
   * Options for the status dropdown filter.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {{ label: string; value: string }[]}
   */
  protected readonly statusOptions: { label: string; value: string }[] = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ];

  /**
   * Property toolbarActions
   * @readonly
   *
   * @description
   * Dropdown items for the toolbar split button.
   * Includes a reactive "Delete selected" entry that reflects
   * the current selection count and is disabled when empty.
   *
   * @access protected
   * @since 1.5.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly toolbarActions: Signal<MenuItem[]> = computed(
    (): MenuItem[] => {
      const count: number = this.selection().length;

      return [
        {
          label: 'Refresh',
          icon: PrimeIcons.REFRESH,
          command: (): void => this.onRefresh(),
        },
        {
          label: 'Export CSV',
          icon: PrimeIcons.DOWNLOAD,
          command: (): void => this.exportCsv(),
        },
        { separator: true },
        {
          label: count > 0 ? `Delete selected (${count})` : 'Delete selected',
          icon: PrimeIcons.TRASH,
          disabled: count === 0,
          command: (): void => this.onDeleteSelected(),
        },
      ];
    },
  );

  /**
   * Property table
   * @readonly
   *
   * @description
   * Reference to the PrimeNG Table component for
   * programmatic CSV export.
   *
   * @access private
   * @since 1.5.0
   *
   * @type {Signal<Table>}
   */
  private readonly table: Signal<Table> =
    viewChild.required<Table>('organizationTable');

  /**
   * Property lastLazyEvent
   *
   * @description
   * Stores the last PrimeNG lazy-load event emitted by `p-table`.
   * Kept at component level (not in the store) because it is a
   * UI-framework concern: the store only knows about generic
   * pagination parameters, not PrimeNG internals.
   * Used by {@link reload} to replay the current page after a
   * search or filter change.
   *
   * @access private
   * @since 2.0.0
   */
  private readonly lastLazyEvent: WritableSignal<TableLazyLoadEvent | null> =
    signal<TableLazyLoadEvent | null>(null);

  /**
   * Property rowMenu
   * @readonly
   *
   * @description
   * Reference to the single shared popup menu used for
   * row context actions.
   *
   * @access private
   * @since 1.6.0
   *
   * @type {Signal<Menu>}
   */
  private readonly rowMenu: Signal<Menu> =
    viewChild.required<Menu>('rowMenu');

  /**
   * Property selectedOrganization
   *
   * @description
   * Tracks the organization currently targeted by the
   * row context menu.
   *
   * @access private
   * @since 1.6.0
   *
   * @type {WritableSignal<OrganizationOutput | null>}
   */
  private readonly selectedOrganization: WritableSignal<OrganizationOutput | null> =
    signal<OrganizationOutput | null>(null);

  /**
   * Property rowMenuItems
   * @readonly
   *
   * @description
   * Computed menu items for the currently selected
   * organization row.
   *
   * @access protected
   * @since 1.6.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly rowMenuItems: Signal<MenuItem[]> = computed(
    (): MenuItem[] => {
      const organization: OrganizationOutput | null =
        this.selectedOrganization();

      if (!organization) return [];

      return [
        {
          label: 'View',
          icon: PrimeIcons.EYE,
          command: (): void => this.view.emit(organization),
        },
        {
          label: 'Edit',
          icon: PrimeIcons.PENCIL,
          command: (): void => this.edit.emit(organization),
        },
        { separator: true },
        {
          label: 'Delete',
          icon: PrimeIcons.TRASH,
          styleClass: 'text-red-500',
          command: (): void => {
            this.store.deleteOne(organization.id);
            this.delete.emit(organization);
          },
        },
      ];
    },
  );

  /**
   * Property selection
   *
   * @description
   * Two-way bound selection model for the table's
   * checkbox selection feature.
   *
   * @access protected
   * @since 1.7.0
   *
   * @type {ModelSignal<OrganizationOutput[]>}
   */
  protected readonly selection: ModelSignal<OrganizationOutput[]> =
    model<OrganizationOutput[]>([]);

  /**
   * Property hasSelection
   * @readonly
   *
   * @description
   * Whether at least one row is currently selected.
   *
   * @access protected
   * @since 1.7.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasSelection: Signal<boolean> = computed(
    (): boolean => this.selection().length > 0,
  );
  //#endregion

  //#region Outputs
  /**
   * Output view
   * @readonly
   *
   * @description
   * Emitted when the user selects "View" from the row menu.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {OutputEmitterRef<OrganizationOutput>}
   */
  public readonly view: OutputEmitterRef<OrganizationOutput> =
    output<OrganizationOutput>();

  /**
   * Output edit
   * @readonly
   *
   * @description
   * Emitted when the user selects "Edit" from the row menu.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {OutputEmitterRef<OrganizationOutput>}
   */
  public readonly edit: OutputEmitterRef<OrganizationOutput> =
    output<OrganizationOutput>();

  /**
   * Output add
   * @readonly
   *
   * @description
   * Emitted when the user clicks the "Add" button in the toolbar.
   *
   * @access public
   * @since 1.4.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly add: OutputEmitterRef<void> = output<void>();

  /**
   * Output delete
   * @readonly
   *
   * @description
   * Emitted when the user confirms deletion of a single organization
   * from the row context menu. The store has already dispatched the
   * delete request at this point.
   *
   * @access public
   * @since 1.8.0
   *
   * @type {OutputEmitterRef<OrganizationOutput>}
   */
  public readonly delete: OutputEmitterRef<OrganizationOutput> =
    output<OrganizationOutput>();

  /**
   * Output deleteMany
   * @readonly
   *
   * @description
   * Emitted when the user confirms bulk deletion via the toolbar.
   * The store has already dispatched the bulk-delete request at this point.
   *
   * @access public
   * @since 1.8.0
   *
   * @type {OutputEmitterRef<OrganizationOutput[]>}
   */
  public readonly deleteMany: OutputEmitterRef<OrganizationOutput[]> =
    output<OrganizationOutput[]>();
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Sets up subscriptions to search and filter changes to trigger
   * table reloads.
   *
   * @access public
   * @since 1.3.0
   */
  public constructor() {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.reload());

    this.selectedStatus.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.reload());
  }
  //#endregion

  //#region Methods
  /**
   * Method onLazyLoad
   * @method onLazyLoad
   *
   * @description
   * Called by p-table when the user changes page or rows-per-page.
   * Translates PrimeNG's offset-based event into the API's
   * 1-indexed page/itemsPerPage model and triggers a store load.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {TableLazyLoadEvent} event - PrimeNG lazy load event.
   *
   * @returns {void}
   */
  public onLazyLoad(event: TableLazyLoadEvent): void {
    this.lastLazyEvent.set(event);

    const first: number = event.first ?? 0;
    const rowsPerPage: number = event.rows ?? this.rows;
    const page: number = Math.floor(first / rowsPerPage) + 1;
    const params: Record<string, string | number | boolean> = {};

    if (event.sortField && typeof event.sortField === 'string')
      params[`order[${event.sortField}]`] = event.sortOrder === 1 ? 'asc' : 'desc';

    const search: string = this.searchControl.value;
    if (search) params['search'] = search;

    const status: string | null = this.selectedStatus.value;
    if (status) params['status'] = status;

    this.store.loadOrganizations({
      page: page,
      itemsPerPage: rowsPerPage,
      params: params,
    });
  }

  /**
   * Method onRefresh
   * @method onRefresh
   *
   * @description
   * Reloads the table with the current page, sort, and filters.
   *
   * @access public
   * @since 1.3.0
   *
   * @returns {void}
   */
  public onRefresh(): void {
    this.reload();
  }

  /**
   * Method exportCsv
   * @method exportCsv
   *
   * @description
   * Triggers a CSV export on the table.
   *
   * @access public
   * @since 1.5.0
   *
   * @returns {void}
   */
  public exportCsv(): void {
    const table: Table | undefined = this.table();
    table.exportCSV();
  }

  /**
   * Method onRowMenuToggle
   * @method onRowMenuToggle
   *
   * @description
   * Sets the selected organization and toggles the
   * shared row context menu.
   *
   * @access public
   * @since 1.6.0
   *
   * @param {MouseEvent} event - The click event from the row button.
   * @param {OrganizationOutput} organization - The organization for this row.
   *
   * @returns {void}
   */
  public onRowMenuToggle(
    event: MouseEvent,
    organization: OrganizationOutput,
  ): void {
    this.selectedOrganization.set(organization);
    this.rowMenu().toggle(event);
  }

  /**
   * Method onDeleteSelected
   * @method onDeleteSelected
   *
   * @description
   * Delegates bulk deletion to the store and clears the selection.
   *
   * @access public
   * @since 1.7.0
   *
   * @returns {void}
   */
  public onDeleteSelected(): void {
    const targets: OrganizationOutput[] = this.selection();
    this.store.deleteMany(targets.map((o) => o.id));
    this.deleteMany.emit(targets);
    this.selection.set([]);
  }

  /**
   * Method reload
   * @method reload
   *
   * @description
   * Replays the last lazy-load event, resetting to page 1.
   * Used internally after search or filter changes.
   *
   * @access private
   * @since 1.3.0
   *
   * @returns {void}
   */
  private reload(): void {
    const event: TableLazyLoadEvent = this.lastLazyEvent() ?? {};
    this.onLazyLoad({ ...event, first: 0, rows: event.rows ?? this.rows });
  }
  //#endregion
}
