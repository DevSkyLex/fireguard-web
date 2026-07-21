import { DatePipe, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  LOCALE_ID,
  PLATFORM_ID,
  type InputSignal,
  type OnInit,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import type { TableLazyLoadEvent } from 'primeng/table';
import type { RequestOptions } from '@core/api';
import type { SessionOutput } from '@features/auth/models';
import { EmptyState } from '@shared/components';

/** One minute in milliseconds — the floor below which activity reads as "just now". */
const MINUTE_MS: number = 60_000;

/**
 * Units tried largest-first when phrasing an elapsed duration, so three days
 * reads as "3 days ago" rather than "72 hours ago".
 */
const RELATIVE_UNITS: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * MINUTE_MS],
  ['month', 30 * 24 * 60 * MINUTE_MS],
  ['day', 24 * 60 * MINUTE_MS],
  ['hour', 60 * MINUTE_MS],
  ['minute', MINUTE_MS],
];

/**
 * Component SessionTable
 * @class SessionTable
 *
 * @description
 * Presentational divider-list component that displays the caller's active
 * account sessions. It owns the single-page load request and its
 * reconciliation after a revocation while delegating data loading and
 * revocation actions to the parent panel through output emitters.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-session-table',
  imports: [ButtonModule, DatePipe, EmptyState, SkeletonModule],
  templateUrl: './session-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionTable implements OnInit {
  //#region Environment
  /**
   * Property isBrowser
   * @readonly
   *
   * @description
   * Whether the component runs in the browser, gating the relative-time label
   * that must not be rendered during SSR.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {boolean}
   */
  private readonly isBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Active locale used to phrase relative durations.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {string}
   */
  private readonly locale: string = inject(LOCALE_ID);
  //#endregion

  //#region Inputs
  /**
   * Input sessions
   * @readonly
   *
   * @description
   * Active session rows currently displayed by the list.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly SessionOutput[]>}
   */
  public readonly sessions: InputSignal<readonly SessionOutput[]> =
    input.required<readonly SessionOutput[]>();

  /**
   * Input total
   * @readonly
   *
   * @description
   * Total number of active sessions across all pages.
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
   * Whether the active session list is currently loading.
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
   * Whether the active session collection is empty.
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
   * Whether the revoke-all-other-sessions operation is pending.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly revokingAll: InputSignal<boolean> = input.required<boolean>();

  /**
   * Input hasOtherSessions
   * @readonly
   *
   * @description
   * Whether at least one revocable session other than the current one exists.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasOtherSessions: InputSignal<boolean> = input.required<boolean>();
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
   * Output details
   * @readonly
   *
   * @description
   * Emits the session selected for detail display.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<SessionOutput>}
   */
  public readonly details: OutputEmitterRef<SessionOutput> = output<SessionOutput>();

  /**
   * Output revoke
   * @readonly
   *
   * @description
   * Emits the session selected for revocation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<SessionOutput>}
   */
  public readonly revoke: OutputEmitterRef<SessionOutput> = output<SessionOutput>();

  /**
   * Output revokeAll
   * @readonly
   *
   * @description
   * Requests revocation of every active session except the current one.
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
   * Number of active sessions requested per load. The list has no visible
   * paginator, so this is set generously high for the realistic size of an
   * account's session list.
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
    { length: 6 },
    (_, index: number) => ({ id: `session-skeleton-${index}` }),
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

  /**
   * Property lastReconciliationKey
   *
   * @description
   * Guards the empty-page reconciliation against repeated reloads when the
   * backend request fails and the loaded page remains empty.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string | null}
   */
  private lastReconciliationKey: string | null = null;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Reloads the session list when a revocation leaves the currently loaded
   * page empty relative to the server-reported total.
   */
  public constructor() {
    effect(() => {
      const total: number = this.total();
      const first: number = this.firstPage();
      const missingLoadedPage: boolean =
        total > 0 && !this.loading() && this.sessions().length === 0;
      const pageOutsideTotal: boolean = first > 0 && first >= total;

      if (!missingLoadedPage && !pageOutsideTotal) {
        if (!this.loading()) {
          this.lastReconciliationKey = null;
        }
        return;
      }

      const event: TableLazyLoadEvent = this.lastLazyEvent() ?? {
        first: 0,
        rows: this.rows,
      };
      const rowsPerPage: number = event.rows ?? this.rows;
      const lastPage: number = Math.max(1, Math.ceil(total / rowsPerPage));
      const reconciliationKey: string = `${first}:${total}:${this.sessions().length}`;

      if (this.lastReconciliationKey === reconciliationKey) {
        return;
      }

      this.lastReconciliationKey = reconciliationKey;
      this.reload(lastPage);
    });
  }
  //#endregion

  //#region Lifecycle
  /**
   * Requests the first (and only) page of sessions. The list has no
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
   * Method deviceIcon
   *
   * @description
   * Icon standing for the session's device family. The backend sends a free
   * string, so the match is on a lowercased substring and falls back to the
   * desktop glyph rather than showing nothing.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {string | null | undefined} deviceType Device family reported for the session.
   *
   * @returns {string} PrimeIcons class for the device.
   */
  protected deviceIcon(deviceType: string | null | undefined): string {
    const value: string = (deviceType ?? '').toLowerCase();

    if (value.includes('mobile') || value.includes('phone')) return 'pi pi-mobile';
    if (value.includes('tablet')) return 'pi pi-tablet';

    return 'pi pi-desktop';
  }

  /**
   * Method lastActivityLabel
   *
   * @description
   * Relative age of the session's last activity ("2 hours ago"), which is how
   * this column is read — the question is whether a session is stale, not the
   * exact minute. Returns null on the server so SSR emits the absolute date
   * instead: a relative label rendered at request time would not match the one
   * hydration recomputes, and the mismatch is a real hydration error.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {string | null | undefined} isoDate Last-activity timestamp.
   *
   * @returns {string | null} Relative label, or null when it cannot be built.
   */
  protected lastActivityLabel(isoDate: string | null | undefined): string | null {
    if (!isoDate || !this.isBrowser) return null;

    const elapsedMs: number = Date.now() - new Date(isoDate).getTime();

    if (Number.isNaN(elapsedMs)) return null;
    if (elapsedMs < MINUTE_MS) return $localize`:@@common.justNow:Just now`;

    const formatter: Intl.RelativeTimeFormat = new Intl.RelativeTimeFormat(this.locale, {
      numeric: 'auto',
    });

    for (const [unit, unitMs] of RELATIVE_UNITS) {
      if (elapsedMs >= unitMs) return formatter.format(-Math.floor(elapsedMs / unitMs), unit);
    }

    return formatter.format(-Math.floor(elapsedMs / MINUTE_MS), 'minute');
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
