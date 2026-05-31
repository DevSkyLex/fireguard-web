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
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import {
  DataViewModule,
  type DataViewLazyLoadEvent,
  type DataViewPassThroughOptions,
} from 'primeng/dataview';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TagModule } from 'primeng/tag';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import type { RequestOptions } from '@core/services/hydra-api';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { INSPECTION_TABLE_LAYOUT_OPTIONS } from './options';
import { toDisplayLabel } from './utils';

/**
 * Component InspectionTable
 * @class InspectionTable
 *
 * @description
 * Presentational dataview component that displays a paginated list of
 * inspections using PrimeNG's lazy-loaded `p-dataview`.
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
  selector: 'app-inspection-table',
  imports: [
    AvatarModule,
    ButtonModule,
    CardModule,
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
   * List of inspections to display.
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
   * Total number of inspections (used by paginator).
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
   * Whether no inspections exist for the current organization.
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
   * Emitted when the user clicks the "New inspection" button.
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
   * Pass-through options giving the wrapping card a bordered, flat panel
   * appearance consistent with the facilities dataview.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {CardPassThroughOptions}
   */
  protected readonly cardPt: CardPassThroughOptions = {
    root: {
      class:
        'h-full flex flex-col border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-950 shadow-none!',
    },
    body: {
      class: 'p-0! flex flex-col flex-1',
    },
    footer: {
      class:
        'border-t border-surface-200 dark:border-surface-800 bg-surface-50/10 dark:bg-surface-900/10 rounded-b-md',
    },
  };

  /**
   * Property dataviewPt
   * @readonly
   *
   * @description
   * Pass-through options for consistent dataview styling and proper paginator
   * alignment within the card.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {DataViewPassThroughOptions}
   */
  protected readonly dataviewPt: DataViewPassThroughOptions = {
    root: {
      class: 'flex flex-col flex-1 min-h-0 bg-surface-0 dark:bg-surface-950',
    },
    content: {
      class: 'flex-1 min-h-0 overflow-auto bg-surface-0 dark:bg-surface-950',
    },
    pcPaginator: {
      root: {
        class: 'rounded-none justify-end bg-surface-0 dark:bg-surface-950',
      },
    },
  };

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
  protected readonly layoutOptions = INSPECTION_TABLE_LAYOUT_OPTIONS;

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
   * Method getInspectionTitle
   * @method getInspectionTitle
   *
   * @description
   * Returns the primary title displayed for one inspection item.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionOutput} inspection - Inspection item to format.
   *
   * @returns {string}
   */
  protected getInspectionTitle(inspection: InspectionOutput): string {
    return inspection.inspectorName;
  }

  /**
   * Method getInspectorContextLabel
   * @method getInspectorContextLabel
   *
   * @description
   * Returns a short description for the inspection author context.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionOutput} inspection - Inspection item to format.
   *
   * @returns {string}
   */
  protected getInspectorContextLabel(inspection: InspectionOutput): string {
    const inspectorType: string = toDisplayLabel(inspection.inspectorType);

    return inspection.inspectorOrganizationName
      ? `${inspectorType} • ${inspection.inspectorOrganizationName}`
      : `${inspectorType} inspector`;
  }

  /**
   * Method getInspectionResultLabel
   * @method getInspectionResultLabel
   *
   * @description
   * Returns the display label for one inspection result.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionOutput['result']} result - Inspection result.
   *
   * @returns {string}
   */
  protected getInspectionResultLabel(result: InspectionOutput['result']): string {
    return toDisplayLabel(result);
  }

  /**
   * Method getInspectionStatusLabel
   * @method getInspectionStatusLabel
   *
   * @description
   * Returns the display label for one inspection status.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionOutput['status']} status - Inspection status.
   *
   * @returns {string}
   */
  protected getInspectionStatusLabel(status: InspectionOutput['status']): string {
    return toDisplayLabel(status);
  }

  /**
   * Method getFindingsLabel
   * @method getFindingsLabel
   *
   * @description
   * Returns a short label for the non-conformity count.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number} count - Non-conformity count.
   *
   * @returns {string}
   */
  protected getFindingsLabel(count: number): string {
    return `${count} finding${count > 1 ? 's' : ''}`;
  }

  /**
   * Method getInspectionIcon
   * @method getInspectionIcon
   *
   * @description
   * Returns a PrimeIcon adapted to the inspection result.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionOutput['result']} result - Inspection result.
   *
   * @returns {string}
   */
  protected getInspectionIcon(result: InspectionOutput['result']): string {
    switch (result) {
      case 'pass':
        return PrimeIcons.CHECK_CIRCLE;
      case 'fail':
        return PrimeIcons.TIMES_CIRCLE;
      case 'partial':
        return PrimeIcons.MINUS_CIRCLE;
      default:
        return PrimeIcons.CLIPBOARD;
    }
  }

  /**
   * Method getResultSeverity
   * @method getResultSeverity
   *
   * @description
   * Maps an inspection result to a PrimeNG tag severity.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionOutput['result']} result - Inspection result.
   *
   * @returns {'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'}
   */
  protected getResultSeverity(
    result: InspectionOutput['result'],
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
   * @method getStatusSeverity
   *
   * @description
   * Maps an inspection status to a PrimeNG tag severity.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionOutput['status']} status - Inspection status.
   *
   * @returns {'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'}
   */
  protected getStatusSeverity(
    status: InspectionOutput['status'],
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
