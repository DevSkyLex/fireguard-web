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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MenuItem, PrimeIcons } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { DataViewModule, type DataViewLazyLoadEvent } from 'primeng/dataview';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TagModule } from 'primeng/tag';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import type { RequestOptions } from '@core/services/hydra-api';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { EQUIPMENT_TABLE_LAYOUT_OPTIONS } from './options';
import { toDisplayLabel } from './utils';

/**
 * Component EquipmentTable
 * @class EquipmentTable
 *
 * @description
 * Presentational dataview component that displays a paginated list of
 * equipment using PrimeNG's lazy-loaded `p-dataview`.
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
  selector: 'app-equipment-table',
  imports: [
    AvatarModule,
    ButtonModule,
    DataViewModule,
    DatePipe,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    ReactiveFormsModule,
    SelectButtonModule,
    SkeletonModule,
    SplitButtonModule,
    TagModule,
  ],
  templateUrl: './equipment-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentTable implements OnInit {
  //#region Inputs
  /**
   * Input equipments
   * @readonly
   *
   * @description
   * List of equipment to display.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly EquipmentOutput[]>}
   */
  public readonly equipments: InputSignal<readonly EquipmentOutput[]> =
    input.required<readonly EquipmentOutput[]>();

  /**
   * Input total
   * @readonly
   *
   * @description
   * Total number of equipment items (used by paginator).
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
   * Whether no equipment exists for the current organization.
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

  //#region Outputs
  /**
   * Output load
   * @readonly
   *
   * @description
   * Emitted whenever the dataview needs to fetch a new page.
   * Carries the resolved `RequestOptions` (page, itemsPerPage, params).
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

  /**
   * Output add
   * @readonly
   *
   * @description
   * Emitted when the user clicks the "New equipment" button.
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
   * correct page. Computed once in `ngOnInit` from `initialPage()`.
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
   * Tracks whether the first automatic `onLazyLoad` event has already
   * been processed. `pageChange` is emitted only on user navigation.
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
   * Fixed-length array used to render skeleton placeholders while
   * the store is loading.
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
   * FormControl for the list/grid layout select button.
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
  protected readonly layoutOptions = EQUIPMENT_TABLE_LAYOUT_OPTIONS;

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
   * Used by `reload()` to replay the current page after a search.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<DataViewLazyLoadEvent | null>}
   */
  private readonly lastLazyEvent: WritableSignal<DataViewLazyLoadEvent | null> =
    signal<DataViewLazyLoadEvent | null>(null);
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
   * Sets up reactive UI behavior for searching and loading state.
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
   * 1-indexed page/itemsPerPage model and emits `load`.
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
   * Method getEquipmentTitle
   * @method getEquipmentTitle
   *
   * @description
   * Returns the primary title displayed for one equipment item.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentOutput} equipment - Equipment item to format.
   *
   * @returns {string}
   */
  protected getEquipmentTitle(equipment: EquipmentOutput): string {
    const typeLabel: string = toDisplayLabel(equipment.type);
    const subTypeLabel: string = toDisplayLabel(equipment.subType);

    return subTypeLabel ? `${typeLabel} / ${subTypeLabel}` : typeLabel;
  }

  /**
   * Method getEquipmentReference
   * @method getEquipmentReference
   *
   * @description
   * Returns the best available reference string for one equipment item.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentOutput} equipment - Equipment item to format.
   *
   * @returns {string}
   */
  protected getEquipmentReference(equipment: EquipmentOutput): string {
    const brandModel: string = [equipment.brand, equipment.model].filter(Boolean).join(' ').trim();

    return brandModel || equipment.serialNumber || 'No reference';
  }

  /**
   * Method getEquipmentTypeLabel
   * @method getEquipmentTypeLabel
   *
   * @description
   * Returns the short type label displayed in the item tag.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentOutput} equipment - Equipment item to format.
   *
   * @returns {string}
   */
  protected getEquipmentTypeLabel(equipment: EquipmentOutput): string {
    return toDisplayLabel(equipment.subType ?? equipment.type);
  }

  /**
   * Method getStatusLabel
   * @method getStatusLabel
   *
   * @description
   * Returns a display-friendly label for an equipment status.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentOutput['status']} status - Equipment status.
   *
   * @returns {string}
   */
  protected getStatusLabel(status: EquipmentOutput['status']): string {
    return toDisplayLabel(status);
  }

  /**
   * Method getEquipmentIcon
   * @method getEquipmentIcon
   *
   * @description
   * Returns a PrimeIcon adapted to the equipment type.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentOutput} equipment - Equipment item to inspect.
   *
   * @returns {string}
   */
  protected getEquipmentIcon(equipment: EquipmentOutput): string {
    const label: string = `${equipment.type} ${equipment.subType ?? ''}`.toLowerCase();

    if (label.includes('detector') || label.includes('alarm')) return PrimeIcons.BELL;
    if (label.includes('exting')) return PrimeIcons.SHIELD;
    if (label.includes('hydrant') || label.includes('sprinkler')) return PrimeIcons.BOLT;
    if (label.includes('camera')) return PrimeIcons.VIDEO;

    return PrimeIcons.BOX;
  }

  /**
   * Method getStatusSeverity
   * @method getStatusSeverity
   *
   * @description
   * Maps an equipment status to a PrimeNG tag severity.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentOutput['status']} status - Equipment status.
   *
   * @returns {'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'}
   */
  protected getStatusSeverity(
    status: EquipmentOutput['status'],
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case 'commissioned':
        return 'success';
      case 'in_stock':
        return 'info';
      case 'under_maintenance':
        return 'warn';
      case 'decommissioned':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  /**
   * Method reload
   * @method reload
   *
   * @description
   * Replays the last lazy-load event, resetting to page 1.
   * Used internally after search changes or refresh.
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
