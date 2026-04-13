import { DatePipe, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  numberAttribute,
  OnInit,
  output,
  Signal,
  signal,
  viewChild,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MenuItem, PrimeIcons } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { DataViewModule, type DataViewLazyLoadEvent } from 'primeng/dataview';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import type { RequestOptions } from '@core/services/hydra-api';
import type { FacilityOutput } from '@features/organization/features/facilities/models';

/**
 * Component FacilityDataview
 * @class FacilityDataview
 *
 * @description
 * Presentational dataview component that displays a paginated list of
 * facilities using PrimeNG's lazy-loaded `p-dataview`.
 * Supports toggling between list and grid layout.
 *
 * Receives data via `input()` signals and communicates user actions
 * upward via `output()` emitters. All store interactions are delegated
 * to the parent page component.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-dataview',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterModule,
    AvatarModule,
    ButtonModule,
    DataViewModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MenuModule,
    SelectButtonModule,
    SplitButtonModule,
    SkeletonModule,
    TagModule,
    TitleCasePipe,
    TooltipModule,
  ],
  templateUrl: './facility-dataview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityDataview implements OnInit {
  //#region Inputs
  /**
   * Input facilities
   * @readonly
   *
   * @description
   * List of facilities to display.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly FacilityOutput[]>}
   */
  public readonly facilities: InputSignal<readonly FacilityOutput[]> =
    input.required<readonly FacilityOutput[]>();

  /**
   * Input total
   * @readonly
   *
   * @description
   * Total number of facilities (used by paginator).
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
   * Whether a list fetch is currently in-flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input.required<boolean>();

  /**
   * Input initialPage
   * @readonly
   *
   * @description
   * Initial page number to display when the dataview is first rendered.
   * Typically bound from the `?page=` query param via the parent page.
   * Defaults to 1.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignalWithTransform<number, unknown>}
   */
  public readonly initialPage: InputSignalWithTransform<number, unknown> = input<number, unknown>(
    1,
    { transform: (v: unknown): number => Math.max(1, numberAttribute(v, 1)) },
  );
  //#endregion

  //#region Properties
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
   * Property firstPage
   *
   * @description
   * Zero-based offset passed to `p-dataview [first]` to open on the
   * correct page. Computed once in `ngOnInit` from `initialPage()` so
   * that subsequent query-param changes never reactively reset the
   * paginator position.
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
   * Tracks whether the first `onLazyLoad` event (fired automatically by
   * PrimeNG on init) has already been processed. `pageChange` is only
   * emitted for subsequent, user-initiated page navigations.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {boolean}
   */
  private initialized: boolean = false;

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
  protected readonly layoutControl: FormControl<'list' | 'grid'> = new FormControl<'list' | 'grid'>(
    'list',
    { nonNullable: true },
  );

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
  protected readonly layout: Signal<'list' | 'grid'> = toSignal(this.layoutControl.valueChanges, {
    initialValue: 'list',
  });

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
  protected readonly searchControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

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
  protected readonly toolbarActions: Signal<MenuItem[]> = computed((): MenuItem[] => [
    {
      label: 'Refresh',
      icon: PrimeIcons.REFRESH,
      command: (): void => this.onRefresh(),
    },
  ]);

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
  private readonly rowMenu: Signal<Menu> = viewChild.required<Menu>('rowMenu');

  /**
   * Property selectedFacility
   *
   * @description
   * Tracks the facility currently targeted by the
   * context menu.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<FacilityOutput | null>}
   */
  private readonly selectedFacility: WritableSignal<FacilityOutput | null> =
    signal<FacilityOutput | null>(null);

  /**
   * Property rowMenuItems
   * @readonly
   *
   * @description
   * Computed menu items for the currently selected facility.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly rowMenuItems: Signal<MenuItem[]> = computed((): MenuItem[] => {
    const facility: FacilityOutput | null = this.selectedFacility();

    if (!facility) return [];

    return [
      {
        label: 'View',
        icon: PrimeIcons.EYE,
        command: (): void => this.view.emit(facility),
      },
      {
        label: 'Edit',
        icon: PrimeIcons.PENCIL,
        command: (): void => this.edit.emit(facility),
      },
      { separator: true },
      {
        label: facility.status === 'active' ? 'Archive' : 'Archived',
        icon: PrimeIcons.BOX,
        styleClass: 'text-red-500',
        disabled: facility.status === 'archived',
        command: (): void => this.archive.emit(facility),
      },
    ];
  });

  /**
   * Property facilityTypeIcons
   * @readonly
   *
   * @description
   * Maps facility types to PrimeNG icons for visual display.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Record<string, string>}
   */
  protected readonly facilityTypeIcons: Record<string, string> = {
    site: 'pi pi-globe',
    building: 'pi pi-building',
    floor: 'pi pi-th-large',
    zone: 'pi pi-map',
    area: 'pi pi-map-marker',
  };
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
   * @type {OutputEmitterRef<FacilityOutput>}
   */
  public readonly view: OutputEmitterRef<FacilityOutput> = output<FacilityOutput>();

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
   * @type {OutputEmitterRef<FacilityOutput>}
   */
  public readonly edit: OutputEmitterRef<FacilityOutput> = output<FacilityOutput>();

  /**
   * Output add
   * @readonly
   *
   * @description
   * Emitted when the user clicks the "New facility" button.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly add: OutputEmitterRef<void> = output<void>();

  /**
   * Output archive
   * @readonly
   *
   * @description
   * Emitted when the user requests archival of a facility
   * from the item context menu. The parent page handles the store call.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<FacilityOutput>}
   */
  public readonly archive: OutputEmitterRef<FacilityOutput> = output<FacilityOutput>();

  /**
   * Output load
   * @readonly
   *
   * @description
   * Emitted whenever the dataview needs to fetch a new page.
   * Carries the resolved `RequestOptions` (page, itemsPerPage, params).
   * The parent page is responsible for forwarding this to the store.
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
   * Emitted when the user navigates to a different page.
   * Carries the 1-indexed page number so the parent can sync
   * the `?page=` query param in the URL.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly pageChange: OutputEmitterRef<number> = output<number>();
  //#endregion

  //#region Lifecycle
  /**
   * Method ngOnInit
   * @method ngOnInit
   *
   * @description
   * Reads `initialPage()` once after Angular has set all input signals
   * and stores the result as a plain number.
   *
   * @since 1.0.0
   *
   * @returns {void}
   */
  public ngOnInit(): void {
    this.firstPage = (this.initialPage() - 1) * this.rows;
  }
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Sets up subscriptions to search changes to trigger
   * dataview reloads.
   *
   * @access public
   * @since 1.0.0
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

    this.load.emit({
      page: page,
      itemsPerPage: rowsPerPage,
      params: params,
    });

    // Skip pageChange on the very first onLazyLoad (PrimeNG init event).
    if (this.initialized) {
      this.pageChange.emit(page);
    }
    this.initialized = true;
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
   * Sets the selected facility and toggles the shared context menu.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {MouseEvent} event - The click event from the item button.
   * @param {FacilityOutput} facility - The targeted facility.
   *
   * @returns {void}
   */
  public onItemMenuToggle(event: MouseEvent, facility: FacilityOutput): void {
    this.selectedFacility.set(facility);

    const menu: Menu = this.rowMenu();
    menu.toggle(event);
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
    const event: DataViewLazyLoadEvent = this.lastLazyEvent() ?? {
      first: 0,
      rows: this.rows,
      sortField: '',
      sortOrder: 1,
    };

    this.onLazyLoad({
      ...event,
      first: 0,
      rows: event.rows ?? this.rows,
    });
  }
  //#endregion
}
