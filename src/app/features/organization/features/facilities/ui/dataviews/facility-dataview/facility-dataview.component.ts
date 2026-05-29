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
  signal,
  viewChild,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
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
import type {
  FacilityOutput,
  FacilityStatus,
} from '@features/organization/features/facilities/models';
import { FACILITY_DATAVIEW_LAYOUT_OPTIONS, FACILITY_TYPE_ICONS } from './options';

/**
 * Component FacilityDataview
 * @class FacilityDataview
 *
 * @description
 * Presentational dataview component that displays a paginated, flat list of
 * root facilities using PrimeNG's lazy-loaded `p-dataview`.
 * Supports toggling between list and grid layout.
 *
 * Receives data via `input()` signals and communicates user actions upward
 * via `output()` emitters. All store interactions are delegated to the
 * parent page component.
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
    SkeletonModule,
    SplitButtonModule,
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
   * Root facilities to display for the current page.
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
   * Total number of root facilities (used by the paginator).
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
   * Input empty
   * @readonly
   *
   * @description
   * Whether no root facilities exist for the current organization.
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
   * Initial page to display, typically bound from the `?page=` query param.
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

  //#region Outputs
  /**
   * Output load
   * @readonly
   *
   * @description
   * Emitted whenever the dataview needs to fetch a new page. Carries the
   * resolved `RequestOptions` (page, itemsPerPage, params).
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
   * Emitted when the user navigates to a different page (1-indexed) so the
   * parent can sync the `?page=` query param.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly pageChange: OutputEmitterRef<number> = output<number>();

  /**
   * Output view
   * @readonly
   *
   * @description
   * Emitted when the user selects "View" from a row menu.
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
   * Emitted when the user selects "Edit" from a row menu.
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
   * Emitted when the user requests archival of a facility from a row menu.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<FacilityOutput>}
   */
  public readonly archive: OutputEmitterRef<FacilityOutput> = output<FacilityOutput>();
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
  protected readonly rows: number = 30;

  /**
   * Property firstPage
   *
   * @description
   * Zero-based offset passed to `p-dataview [first]` so the view opens on
   * the correct page. Computed once in `ngOnInit`.
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
   * Tracks whether the first automatic `onLazyLoad` event has already been
   * processed. `pageChange` is emitted only on user navigation.
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
   * Fixed-length array used to render skeleton placeholders while loading.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {undefined[]}
   */
  protected readonly skeletonItems: undefined[] = Array(this.rows);

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
  protected readonly facilityTypeIcons = FACILITY_TYPE_ICONS;

  /**
   * Property layoutControl
   * @readonly
   *
   * @description
   * FormControl driving the list/grid layout select button.
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
   * Current display layout derived from the layout control value.
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
   * Options for the layout toggle button.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ icon: string; value: 'list' | 'grid' }[]}
   */
  protected readonly layoutOptions = FACILITY_DATAVIEW_LAYOUT_OPTIONS;

  /**
   * Property searchControl
   * @readonly
   *
   * @description
   * FormControl driving the free-text search filter.
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
   * Property rowMenu
   * @readonly
   *
   * @description
   * Reference to the single shared popup menu used for row actions.
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
   * Tracks the facility currently targeted by the row context menu.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<FacilityOutput | null>}
   */
  private readonly selectedFacility: WritableSignal<FacilityOutput | null> =
    signal<FacilityOutput | null>(null);

  /**
   * Property lastLazyEvent
   *
   * @description
   * Stores the last PrimeNG lazy-load event so {@link reload} can replay
   * the current page after a search change.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<DataViewLazyLoadEvent | null>}
   */
  private readonly lastLazyEvent: WritableSignal<DataViewLazyLoadEvent | null> =
    signal<DataViewLazyLoadEvent | null>(null);

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
  //#endregion

  //#region Lifecycle
  /**
   * Method ngOnInit
   * @method ngOnInit
   *
   * @description
   * Reads `initialPage()` once after Angular has set the input signals and
   * computes the zero-based paginator offset.
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
   * Wires up search debouncing and disables the search field while a
   * fetch is in-flight.
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
   * Called by `p-dataview` when the page or rows-per-page changes.
   * Translates PrimeNG's offset-based event into the API's 1-indexed
   * page/itemsPerPage model and emits a load request.
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

    const search: string = this.searchControl.value.trim();
    if (search) params['search'] = search;

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
   * Method onRowMenuToggle
   * @method onRowMenuToggle
   *
   * @description
   * Sets the selected facility and toggles the shared row context menu.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {MouseEvent} event - The click event from the row button.
   * @param {FacilityOutput} facility - The targeted facility.
   *
   * @returns {void}
   */
  public onRowMenuToggle(event: MouseEvent, facility: FacilityOutput): void {
    this.selectedFacility.set(facility);
    this.rowMenu().toggle(event);
  }

  /**
   * Method getStatusSeverity
   * @method getStatusSeverity
   *
   * @description
   * Maps a facility status to a PrimeNG tag severity.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {FacilityStatus} status - Facility status.
   *
   * @returns {'success' | 'secondary'}
   */
  protected getStatusSeverity(status: FacilityStatus): 'success' | 'secondary' {
    return status === 'active' ? 'success' : 'secondary';
  }

  /**
   * Method reload
   * @method reload
   *
   * @description
   * Replays the last lazy-load event, resetting to page 1. Used after a
   * search change or an explicit refresh.
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
