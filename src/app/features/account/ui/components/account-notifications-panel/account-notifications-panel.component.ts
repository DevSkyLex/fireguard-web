import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import type { RequestOptions } from '@core/api';
import type { NotificationOutput } from '@features/account/models';
import { NotificationStore } from '@features/account/state';
import { NotificationTable } from '../../tables';

/**
 * Component AccountNotificationsPanel
 * @class AccountNotificationsPanel
 *
 * @description
 * Notifications section of the account page. Connects the presentational
 * {@link NotificationTable} to the account-owned notification store and
 * lets the user mark individual notifications as read. Rendered inside the
 * "Notifications" tab of {@link AccountPage}.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-notifications-panel',
  imports: [ButtonModule, MessageModule, NotificationTable],
  providers: [NotificationStore],
  templateUrl: './account-notifications-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountNotificationsPanel {
  //#region Properties
  /**
   * Property notificationStore
   * @readonly
   *
   * @description
   * Component-scoped notification store used by the paginated account table.
   * Its local collection is isolated from the root store that backs the global
   * notification bell and unread badge.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {NotificationStore}
   */
  protected readonly notificationStore: NotificationStore =
    inject<NotificationStore>(NotificationStore);

  /**
   * Property rootNotificationStore
   * @readonly
   *
   * @description
   * Root notification center store used by global badges, the bell and the
   * Mercure subscription.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {NotificationStore}
   */
  private readonly rootNotificationStore: NotificationStore =
    inject<NotificationStore>(NotificationStore, { skipSelf: true, optional: true }) ??
    this.notificationStore;

  /**
   * Property lastLoadOptions
   *
   * @description
   * Last table request replayed after a list-loading error.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {RequestOptions}
   */
  private lastLoadOptions: RequestOptions = { page: 1, itemsPerPage: 10 };
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Synchronizes read-state changes between the isolated paginated store and
   * the root notification center. A new Mercure notification refreshes the
   * first table page after it has already been loaded.
   */
  public constructor() {
    effect(() => {
      const updated: NotificationOutput | null = this.notificationStore.markAsReadCallState().data;

      if (this.notificationStore.markAsReadCallState().status !== 'success' || !updated) {
        return;
      }

      untracked(() => this.rootNotificationStore.synchronizeNotification(updated));
    });

    effect(() => {
      const updated: NotificationOutput | null =
        this.rootNotificationStore.markAsReadCallState().data;

      if (this.rootNotificationStore.markAsReadCallState().status !== 'success' || !updated) {
        return;
      }

      untracked(() => this.notificationStore.synchronizeNotification(updated));
    });

    effect(() => {
      const rootTotal: number = this.rootNotificationStore.totalNotifications();
      const localTotal: number = this.notificationStore.totalNotifications();
      const currentPage: number = this.notificationStore.currentPage();
      const listStatus: string = this.notificationStore.listCallState().status;

      if (listStatus !== 'success' || currentPage !== 1 || rootTotal <= localTotal) {
        return;
      }

      untracked(() =>
        this.notificationStore.loadPage({
          page: 1,
          limit: this.notificationStore.itemsPerPage(),
        }),
      );
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onMarkAsRead
   *
   * @description
   * Marks a single notification as read.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {NotificationOutput} notification - Notification to mark as read.
   *
   * @returns {void}
   */
  public onMarkAsRead(notification: NotificationOutput): void {
    this.notificationStore.markAsRead(notification.id);
  }

  /**
   * Method onLoad
   *
   * @description
   * Loads the notification page requested by the lazy table.
   *
   * @access public
   * @since 1.2.0
   *
   * @param {RequestOptions} options - Normalized request options from the table.
   *
   * @returns {void}
   */
  public onLoad(options: RequestOptions): void {
    this.lastLoadOptions = options;
    this.notificationStore.loadPage({
      page: options.page ?? 1,
      limit: options.itemsPerPage,
    });
  }

  /**
   * Method retry
   *
   * @description
   * Replays the failed table request without changing its page or page size.
   *
   * @access protected
   * @since 1.2.0
   *
   * @returns {void}
   */
  protected retry(): void {
    this.onLoad(this.lastLoadOptions);
  }
  //#endregion
}
