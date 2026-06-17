import { DatePipe, TitleCasePipe } from '@angular/common';
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
import { TagModule } from 'primeng/tag';
import type { RequestOptions } from '@core/services/hydra-api';
import type { NotificationOutput } from '@features/account/models';
import { EmptyState } from '@shared/components';
import type { NotificationCategoryColor } from './models';

/**
 * Component NotificationTable
 * @class NotificationTable
 *
 * @description
 * Presentational table component that displays a paginated, lazy-loaded list
 * of account notifications. It owns pagination, notification appearance, and
 * row action menu state while delegating data loading and mutations to the
 * parent panel through output emitters.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-notification-table',
  imports: [
    AvatarModule,
    ButtonModule,
    CardModule,
    DatePipe,
    EmptyState,
    MenuModule,
    SkeletonModule,
    TableModule,
    TagModule,
    TitleCasePipe,
  ],
  templateUrl: './notification-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationTable {
  //#region Inputs
  /**
   * Input notifications
   * @readonly
   *
   * @description
   * Notification rows currently displayed by the table.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly NotificationOutput[]>}
   */
  public readonly notifications: InputSignal<readonly NotificationOutput[]> =
    input.required<readonly NotificationOutput[]>();

  /**
   * Input total
   * @readonly
   *
   * @description
   * Total number of notifications across all pages.
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
   * Whether the notification list is currently loading.
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
   * Whether the notification collection is empty.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly empty: InputSignal<boolean> = input.required<boolean>();

  /**
   * Input unreadCount
   * @readonly
   *
   * @description
   * Number of unread notifications in the current table collection.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly unreadCount: InputSignal<number> = input.required<number>();
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
   * Output markAsRead
   * @readonly
   *
   * @description
   * Emits the unread notification selected to be marked as read.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<NotificationOutput>}
   */
  public readonly markAsRead: OutputEmitterRef<NotificationOutput> = output<NotificationOutput>();
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
   * Default number of notification rows per page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {number}
   */
  protected readonly rows: number = 12;

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
  protected readonly rowsPerPageOptions: number[] = [12, 24, 48];

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
   * Property typeIcons
   * @readonly
   *
   * @description
   * PrimeIcon mapping keyed by notification type.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Readonly<Record<string, string>>}
   */
  private readonly typeIcons: Readonly<Record<string, string>> = {
    'user.created': 'pi-user-plus',
    'user.updated': 'pi-user-edit',
    'user.deleted': 'pi-user-minus',
    'user.invited': 'pi-user-plus',
    login: 'pi-sign-in',
    'login.failed': 'pi-lock',
    'password.reset': 'pi-key',
    security: 'pi-shield',
    'organization.created': 'pi-building',
    'organization.updated': 'pi-building',
    'organization.deleted': 'pi-trash',
    'member.added': 'pi-users',
    'member.removed': 'pi-users',
    maintenance: 'pi-wrench',
    update: 'pi-sync',
    upgrade: 'pi-arrow-circle-up',
    alert: 'pi-exclamation-triangle',
    error: 'pi-times-circle',
  };

  /**
   * Property categoryIcons
   * @readonly
   *
   * @description
   * Fallback PrimeIcon mapping keyed by notification category.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Readonly<Record<string, string>>}
   */
  private readonly categoryIcons: Readonly<Record<string, string>> = {
    organization: 'pi-sitemap',
    system: 'pi-cog',
    security: 'pi-shield',
    user: 'pi-user',
  };

  /**
   * Property categoryColors
   * @readonly
   *
   * @description
   * Tailwind background and text color classes keyed by notification category.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Readonly<Record<string, NotificationCategoryColor>>}
   */
  private readonly categoryColors: Readonly<Record<string, NotificationCategoryColor>> = {
    organization: {
      background: 'bg-indigo-100 dark:bg-indigo-950',
      text: 'text-indigo-600 dark:text-indigo-400',
    },
    system: {
      background: 'bg-amber-100 dark:bg-amber-950',
      text: 'text-amber-600 dark:text-amber-400',
    },
    security: {
      background: 'bg-red-100 dark:bg-red-950',
      text: 'text-red-600 dark:text-red-400',
    },
    user: {
      background: 'bg-sky-100 dark:bg-sky-950',
      text: 'text-sky-600 dark:text-sky-400',
    },
  };

  /**
   * Property actionMenu
   * @readonly
   *
   * @description
   * Shared popup menu used by notification rows for contextual actions.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<Menu>}
   */
  private readonly actionMenu: Signal<Menu> = viewChild.required<Menu>('actionMenu');

  /**
   * Property selectedNotification
   * @readonly
   *
   * @description
   * Notification row currently targeted by the action menu.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<NotificationOutput | null>}
   */
  private readonly selectedNotification: WritableSignal<NotificationOutput | null> =
    signal<NotificationOutput | null>(null);

  /**
   * Property actionMenuItems
   * @readonly
   *
   * @description
   * Contextual row actions for the selected notification.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly actionMenuItems: Signal<MenuItem[]> = computed((): MenuItem[] => {
    const notification: NotificationOutput | null = this.selectedNotification();

    if (!notification || notification.isRead) {
      return [];
    }

    return [
      {
        label: 'Mark as read',
        icon: PrimeIcons.CHECK,
        command: (): void => this.markAsRead.emit(notification),
      },
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
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Keeps the paginator on an existing page when the server-reported total
   * becomes smaller than the current page offset.
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
   * Stores the targeted notification and toggles the shared action menu.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MouseEvent} event Click event emitted by the row action button.
   * @param {NotificationOutput} notification Notification row targeted by the menu.
   *
   * @returns {void}
   */
  protected onActionMenuToggle(event: MouseEvent, notification: NotificationOutput): void {
    this.selectedNotification.set(notification);
    this.actionMenu().toggle(event);
  }

  /**
   * Method iconFor
   *
   * @description
   * Resolves the PrimeIcon class matching a notification type or category.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {NotificationOutput} notification Notification rendered by the table.
   *
   * @returns {string} PrimeIcon class without the common `pi` prefix.
   */
  protected iconFor(notification: NotificationOutput): string {
    return (
      this.typeIcons[notification.type] ?? this.categoryIcons[notification.category] ?? 'pi-bell'
    );
  }

  /**
   * Method iconClassesFor
   *
   * @description
   * Resolves the Tailwind background and text classes matching a notification category.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {NotificationOutput} notification Notification rendered by the table.
   *
   * @returns {string} Space-separated Tailwind classes.
   */
  protected iconClassesFor(notification: NotificationOutput): string {
    const colors: NotificationCategoryColor | undefined =
      this.categoryColors[notification.category];

    return `${colors?.background ?? 'bg-surface-100 dark:bg-surface-800'} ${
      colors?.text ?? 'text-surface-500'
    }`;
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
