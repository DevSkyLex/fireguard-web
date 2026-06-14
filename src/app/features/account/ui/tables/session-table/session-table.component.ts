import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MenuItem, PrimeIcons } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { Menu, MenuModule } from 'primeng/menu';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule, type TableLazyLoadEvent, type TablePassThroughOptions } from 'primeng/table';
import type { RequestOptions } from '@core/services/hydra-api';
import type { SessionOutput } from '@features/auth/models';
import { EmptyState } from '@shared/components';

/**
 * Component SessionTable
 * @class SessionTable
 *
 * @description
 * Presentational table component that displays a paginated, lazy-loaded list
 * of active account sessions. It owns pagination and row action menu state
 * while delegating data loading and revocation actions to the parent panel
 * through output emitters.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-session-table',
  imports: [
    AvatarModule,
    ButtonModule,
    CardModule,
    DatePipe,
    EmptyState,
    MenuModule,
    SkeletonModule,
    TableModule,
  ],
  templateUrl: './session-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionTable {
  //#region Inputs
  /**
   * Input sessions
   * @readonly
   *
   * @description
   * Active session rows currently displayed by the table.
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
   * Emits normalized lazy-load request options for the parent store.
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
   * Property cardPt
   * @readonly
   *
   * @description
   * PrimeNG card pass-through classes used to make the table fill its host.
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
   * PrimeNG table pass-through classes used for full-height table layout.
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
   * Default number of active session rows per page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {number}
   */
  protected readonly rows: number = 10;

  /**
   * Property rowsPerPageOptions
   * @readonly
   *
   * @description
   * Page-size choices offered by the paginator.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {number[]}
   */
  protected readonly rowsPerPageOptions: number[] = [10, 20, 50];

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
   * @type {undefined[]}
   */
  protected readonly skeletonItems: undefined[] = Array(this.rows);

  /**
   * Property actionMenu
   * @readonly
   *
   * @description
   * Shared popup menu used by session rows for contextual actions.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<Menu>}
   */
  private readonly actionMenu: Signal<Menu> = viewChild.required<Menu>('actionMenu');

  /**
   * Property selectedSession
   * @readonly
   *
   * @description
   * Session row currently targeted by the action menu.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<SessionOutput | null>}
   */
  private readonly selectedSession: WritableSignal<SessionOutput | null> =
    signal<SessionOutput | null>(null);

  /**
   * Property actionMenuItems
   * @readonly
   *
   * @description
   * Contextual row actions for the selected session.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly actionMenuItems: Signal<MenuItem[]> = computed((): MenuItem[] => {
    const session: SessionOutput | null = this.selectedSession();

    if (!session) {
      return [];
    }

    return [
      {
        label: 'View details',
        icon: PrimeIcons.EYE,
        command: (): void => this.details.emit(session),
      },
      ...(session.isCurrent
        ? []
        : [
            {
              label: 'Revoke',
              icon: PrimeIcons.TIMES_CIRCLE,
              styleClass: 'text-red-500',
              command: (): void => this.revoke.emit(session),
            },
          ]),
    ];
  });

  /**
   * Property firstPage
   * @readonly
   *
   * @description
   * Zero-based row offset consumed by PrimeNG for the current page.
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
   * Last lazy-load event reused when the user refreshes the table.
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
   * Keeps the paginator on an existing page when a mutation reduces the
   * server-reported total below the current page offset.
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

  //#region Methods
  /**
   * Method onLazyLoad
   *
   * @description
   * Handles PrimeNG lazy-load events and emits normalized request options.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {TableLazyLoadEvent} event PrimeNG lazy-load event.
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
   * Method onRefresh
   *
   * @description
   * Reloads the first page while preserving the selected page size.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onRefresh(): void {
    this.reload(1);
  }

  /**
   * Method onActionMenuToggle
   *
   * @description
   * Stores the targeted session and toggles the shared action menu.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MouseEvent} event Click event emitted by the row action button.
   * @param {SessionOutput} session Session row targeted by the menu.
   *
   * @returns {void}
   */
  protected onActionMenuToggle(event: MouseEvent, session: SessionOutput): void {
    this.selectedSession.set(session);
    this.actionMenu().toggle(event);
  }

  /**
   * Method reload
   *
   * @description
   * Replays the last lazy-load event on the requested page.
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
