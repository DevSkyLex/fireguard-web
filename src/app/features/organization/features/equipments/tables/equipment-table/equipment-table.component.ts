import {
  ChangeDetectionStrategy,
  Component,
  input,
  numberAttribute,
  OnInit,
  output,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
} from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import type { EquipmentOutput } from '@core/models/equipment';
import type { RequestOptions } from '@core/services/api';

/**
 * Component EquipmentTable
 * @class EquipmentTable
 *
 * @description
 * Presentational table component that displays a paginated list of
 * equipment using PrimeNG's lazy-loaded `p-table`.
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
  imports: [ButtonModule, DatePipe, SkeletonModule, TableModule, TagModule, TitleCasePipe],
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
  public readonly total: InputSignal<number> =
    input.required<number>();

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
  public readonly loading: InputSignal<boolean> =
    input.required<boolean>();

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
  public readonly empty: InputSignal<boolean> =
    input.required<boolean>();

  /**
   * Input initialPage
   * @readonly
   *
   * @description
   * Initial page number to display when the table is first rendered.
   * Typically bound from the `?page=` query param via the parent page.
   * Defaults to 1.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignalWithTransform<number, unknown>}
   */
  public readonly initialPage: InputSignalWithTransform<number, unknown> =
    input<number, unknown>(1, { transform: (v: unknown): number => Math.max(1, numberAttribute(v, 1)) });
  //#endregion

  //#region Outputs
  /**
   * Output load
   * @readonly
   *
   * @description
   * Emitted whenever the table needs to fetch a new page.
   * Carries the resolved `RequestOptions` (page, itemsPerPage).
   * The parent page is responsible for forwarding this to the store.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<RequestOptions>}
   */
  public readonly load: OutputEmitterRef<RequestOptions> =
    output<RequestOptions>();

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
  public readonly pageChange: OutputEmitterRef<number> =
    output<number>();

  /**
   * Output add
   * @readonly
   *
   * @description
   * Emitted when the user clicks the "New Equipment" button.
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
   * Number of rows per page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {number}
   */
  protected readonly rows: number = 20;

  /**
   * Property firstPage
   *
   * @description
   * Zero-based offset passed to `p-table [first]` to open on the
   * correct page. Set once in `ngOnInit` from `initialPage()`.
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
   * Tracks whether the first `onLazyLoad` event has been processed.
   * `pageChange` is only emitted for subsequent user-initiated navigations.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {boolean}
   */
  private initialized: boolean = false;

  /**
   * Property skeletonRows
   * @readonly
   *
   * @description
   * Fixed-length array used to render skeleton rows while loading.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {undefined[]}
   */
  protected readonly skeletonRows: undefined[] = Array(this.rows).fill(undefined);
  //#endregion

  //#region Lifecycle
  /**
   * Method ngOnInit
   * @method ngOnInit
   *
   * @description
   * Initializes `firstPage` from `initialPage()` input.
   *
   * @since 1.0.0
   *
   * @returns {void}
   */
  public ngOnInit(): void {
    this.firstPage = (this.initialPage() - 1) * this.rows;
  }
  //#endregion

  //#region Methods
  /**
   * Method onLazyLoad
   * @method onLazyLoad
   *
   * @description
   * Called by p-table when the user changes page.
   * Translates PrimeNG's offset-based event into the API's
   * 1-indexed page/itemsPerPage model and emits `load`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {TableLazyLoadEvent} event - PrimeNG table lazy load event.
   *
   * @returns {void}
   */
  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const first: number = event.first ?? 0;
    const page: number = Math.floor(first / this.rows) + 1;

    this.load.emit({ page, itemsPerPage: this.rows });

    if (this.initialized) {
      this.pageChange.emit(page);
    }
    this.initialized = true;
  }

  /**
   * Method getStatusSeverity
   * @method getStatusSeverity
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentOutput['status']} status - Equipment status.
   *
   * @returns {'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'} PrimeNG tag severity.
   */
  protected getStatusSeverity(status: EquipmentOutput['status']): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case 'commissioned': return 'success';
      case 'in_stock': return 'info';
      case 'under_maintenance': return 'warn';
      case 'decommissioned': return 'danger';
      default: return 'secondary';
    }
  }
  //#endregion
}
