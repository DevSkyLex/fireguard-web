import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
  type InputSignal,
  type OnInit,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import type { TableLazyLoadEvent } from 'primeng/table';
import type { RequestOptions } from '@core/api';
import type { TrustedDeviceOutput } from '@features/auth/models';
import { EmptyState } from '@shared/components';

/**
 * Component TrustedDeviceTable
 * @class TrustedDeviceTable
 *
 * @description
 * Presentational divider-list component that displays the caller's trusted
 * devices. It owns the single-page load request and its reconciliation after
 * a revocation while delegating data loading and revocation actions to the
 * parent panel through output emitters.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-trusted-device-table',
  imports: [ButtonModule, DatePipe, EmptyState, SkeletonModule],
  templateUrl: './trusted-device-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustedDeviceTable implements OnInit {
  //#region Inputs
  /**
   * Input devices
   * @readonly
   *
   * @description
   * Trusted device rows currently displayed by the list.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly TrustedDeviceOutput[]>}
   */
  public readonly devices: InputSignal<readonly TrustedDeviceOutput[]> =
    input.required<readonly TrustedDeviceOutput[]>();

  /**
   * Input total
   * @readonly
   *
   * @description
   * Total number of trusted devices across all pages.
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
   * Whether the trusted device list is currently loading.
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
   * Whether the trusted device collection is empty.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly empty: InputSignal<boolean> = input.required<boolean>();

  /**
   * Input revokingAll
   * @readonly
   *
   * @description
   * Whether the revoke-all-trusted-devices operation is pending.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly revokingAll: InputSignal<boolean> = input.required<boolean>();

  /**
   * Input hasDevices
   * @readonly
   *
   * @description
   * Whether at least one trusted device exists.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasDevices: InputSignal<boolean> = input.required<boolean>();
  //#endregion

  //#region Outputs
  /**
   * Output load
   * @readonly
   *
   * @description
   * Emits normalized load request options for the parent store.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<RequestOptions>}
   */
  public readonly load: OutputEmitterRef<RequestOptions> = output<RequestOptions>();

  /**
   * Output revoke
   * @readonly
   *
   * @description
   * Emits the trusted device selected for revocation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<TrustedDeviceOutput>}
   */
  public readonly revoke: OutputEmitterRef<TrustedDeviceOutput> = output<TrustedDeviceOutput>();

  /**
   * Output revokeAll
   * @readonly
   *
   * @description
   * Requests revocation of every trusted device.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly revokeAll: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property rows
   * @readonly
   *
   * @description
   * Number of trusted devices requested per load. The list has no visible
   * paginator, so this is set generously high for the realistic size of an
   * account's trusted-device list.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {number}
   */
  protected readonly rows: number = 50;

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
   * @type {{ id: string }[]}
   */
  protected readonly skeletonItems: { readonly id: string }[] = Array.from(
    { length: 4 },
    (_, index: number) => ({ id: `trusted-device-skeleton-${index}` }),
  );

  /**
   * Property firstPage
   * @readonly
   *
   * @description
   * Zero-based row offset of the last requested load.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<number>}
   */
  protected readonly firstPage: WritableSignal<number> = signal<number>(0);

  /**
   * Property lastLazyEvent
   * @readonly
   *
   * @description
   * Last load event reused when the list reloads after a revocation.
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
   * Reloads the trusted device list when a revocation leaves the currently
   * loaded page empty relative to the server-reported total.
   */
  public constructor() {
    effect(() => {
      const total: number = this.total();
      const first: number = this.firstPage();

      if (first === 0 || first < total) {
        return;
      }

      const event: TableLazyLoadEvent = this.lastLazyEvent() ?? {
        first: 0,
        rows: this.rows,
      };
      const rowsPerPage: number = event.rows ?? this.rows;
      const lastPage: number = Math.max(1, Math.ceil(total / rowsPerPage));

      this.reload(lastPage);
    });
  }
  //#endregion

  //#region Lifecycle
  /**
   * Requests the first (and only) page of trusted devices. The list has no
   * paginator, so this replaces the implicit first load a lazy `p-table`
   * used to trigger.
   *
   * @since 2.0.0
   */
  public ngOnInit(): void {
    this.onLazyLoad({ first: 0, rows: this.rows });
  }
  //#endregion

  //#region Methods
  /**
   * Method onLazyLoad
   *
   * @description
   * Normalizes a load event into request options emitted for the parent
   * store.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {TableLazyLoadEvent} event Load event describing the requested page.
   *
   * @returns {void}
   */
  public onLazyLoad(event: TableLazyLoadEvent): void {
    const first: number = event.first ?? 0;
    const rowsPerPage: number = event.rows ?? this.rows;

    this.firstPage.set(first);
    this.lastLazyEvent.set(event);
    this.load.emit({
      page: Math.floor(first / rowsPerPage) + 1,
      itemsPerPage: rowsPerPage,
    });
  }

  /**
   * Method reload
   *
   * @description
   * Replays the last load event on the requested page.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {number} page One-based page to reload.
   *
   * @returns {void}
   */
  public reload(page: number): void {
    const event: TableLazyLoadEvent = this.lastLazyEvent() ?? {
      first: 0,
      rows: this.rows,
    };
    const rowsPerPage: number = event.rows ?? this.rows;
    const first: number = (Math.max(1, page) - 1) * rowsPerPage;

    this.onLazyLoad({
      ...event,
      first,
      rows: rowsPerPage,
    });
  }
  //#endregion
}
