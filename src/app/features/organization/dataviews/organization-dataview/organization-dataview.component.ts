import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  Signal,
  signal,
  viewChild,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DataViewModule, type DataViewLazyLoadEvent } from 'primeng/dataview';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SplitButtonModule } from 'primeng/splitbutton';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import type { OrganizationOutput } from '@core/models/organization';
import { MenuItem, PrimeIcons } from 'primeng/api';
import { OrganizationStore } from '@core/stores/organization';

/**
 * Component OrganizationDataview
 * @class OrganizationDataview
 *
 * @description
 * Smart dataview component that displays a paginated list of
 * organizations using PrimeNG's lazy-loaded `p-dataview`.
 * Supports toggling between list and grid layout.
 *
 * Uses a component-scoped `OrganizationStore` (provided via
 * `providers` array) to manage its own local state independently
 * from the global `OrganizationStore` consumed by the switcher.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dataview',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterModule,
    AvatarModule,
    ButtonModule,
    CardModule,
    DataViewModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MenuModule,
    SelectButtonModule,
    SplitButtonModule,
    SelectModule,
    SkeletonModule,
    TagModule,
    TitleCasePipe,
    TooltipModule,
  ],
  providers: [OrganizationStore],
  templateUrl: './organization-dataview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDataview {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-level NgRx SignalStore scoped to this component's
   * lifecycle. Manages the dataview's organization list, total count,
   * and loading state independently from the global OrganizationStore
   * so that filters never pollute the switcher.
   *
   * @access protected
   * @since 1.0.0
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
   * Default number of rows per page for the dataview paginator.
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
   * Fixed-length array used to render skeleton placeholders
   * while the store is loading. Length matches `rows`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {undefined[]}
   */
  protected readonly skeletonItems: undefined[] = Array(this.rows);

  /**
   * Property layoutControl
   * @readonly
   *
   * @description
   * FormControl for the layout select button.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<'list' | 'grid'>}
   */
  protected readonly layoutControl: FormControl<'list' | 'grid'> =
    new FormControl<'list' | 'grid'>('list', { nonNullable: true });

  /**
   * Property layout
   * @readonly
   *
   * @description
   * Current display layout derived from the layoutControl value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<'list' | 'grid'>}
   */
  protected readonly layout: Signal<'list' | 'grid'> = toSignal(
    this.layoutControl.valueChanges,
    { initialValue: 'list' },
  );

  /**
   * Property layoutOptions
   * @readonly
   *
   * @description
   * Options for the layout select button.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ icon: string; value: 'list' | 'grid' }[]}
   */
  protected readonly layoutOptions: { icon: string; value: 'list' | 'grid' }[] = [
    { icon: PrimeIcons.LIST, value: 'list' },
    { icon: PrimeIcons.TH_LARGE, value: 'grid' },
  ];

  /**
   * Property searchControl
   * @readonly
   *
   * @description
   * FormControl for the search input.
   *
   * @access protected
   * @since 1.0.0
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
   * @since 1.0.0
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
   * @since 1.0.0
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
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly toolbarActions: Signal<MenuItem[]> = computed(
    (): MenuItem[] => [
      {
        label: 'Refresh',
        icon: PrimeIcons.REFRESH,
        command: (): void => this.onRefresh(),
      },
    ],
  );

  /**
   * Property lastLazyEvent
   *
   * @description
   * Stores the last PrimeNG lazy-load event emitted by `p-dataview`.
   * Used by {@link reload} to replay the current page after a
   * search or filter change.
   *
   * @access private
   * @since 1.0.0
   */
  private readonly lastLazyEvent: WritableSignal<DataViewLazyLoadEvent | null> =
    signal<DataViewLazyLoadEvent | null>(null);

  /**
   * Property rowMenu
   * @readonly
   *
   * @description
   * Reference to the single shared popup menu used for
   * item context actions.
   *
   * @access private
   * @since 1.0.0
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
   * context menu.
   *
   * @access private
   * @since 1.0.0
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
   * Computed menu items for the currently selected organization.
   *
   * @access protected
   * @since 1.0.0
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
  //#endregion

  //#region Outputs
  /**
   * Output view
   * @readonly
   *
   * @description
   * Emitted when the user selects "View" from the item menu.
   *
   * @access public
   * @since 1.0.0
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
   * Emitted when the user selects "Edit" from the item menu.
   *
   * @access public
   * @since 1.0.0
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
   * Emitted when the user clicks the "New organization" button.
   *
   * @access public
   * @since 1.0.0
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
   * from the item context menu. The store has already dispatched the
   * delete request at this point.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<OrganizationOutput>}
   */
  public readonly delete: OutputEmitterRef<OrganizationOutput> =
    output<OrganizationOutput>();
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Sets up subscriptions to search and filter changes to trigger
   * dataview reloads.
   *
   * @access public
   * @since 1.0.0
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
   * Called by p-dataview when the user changes page or rows-per-page.
   * Translates PrimeNG's offset-based event into the API's
   * 1-indexed page/itemsPerPage model and triggers a store load.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {DataViewLazyLoadEvent} event - PrimeNG dataview lazy load event.
   *
   * @returns {void}
   */
  public onLazyLoad(event: DataViewLazyLoadEvent): void {
    this.lastLazyEvent.set(event);

    const first: number = event.first ?? 0;
    const rowsPerPage: number = event.rows ?? this.rows;
    const page: number = Math.floor(first / rowsPerPage) + 1;
    const params: Record<string, string | number | boolean> = {};

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
   * Reloads the dataview with the current page and filters.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public onRefresh(): void {
    this.reload();
  }

  /**
   * Method onItemMenuToggle
   * @method onItemMenuToggle
   *
   * @description
   * Sets the selected organization and toggles the shared context menu.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {MouseEvent} event - The click event from the item button.
   * @param {OrganizationOutput} organization - The targeted organization.
   *
   * @returns {void}
   */
  public onItemMenuToggle(
    event: MouseEvent,
    organization: OrganizationOutput,
  ): void {
    this.selectedOrganization.set(organization);
    this.rowMenu().toggle(event);
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
   * @since 1.0.0
   *
   * @returns {void}
   */
  private reload(): void {
    const event: DataViewLazyLoadEvent = this.lastLazyEvent() ?? { first: 0, rows: this.rows, sortField: '', sortOrder: 1 };
    this.onLazyLoad({ ...event, first: 0, rows: event.rows ?? this.rows });
  }
  //#endregion
}
