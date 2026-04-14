import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { Popover, PopoverModule, type PopoverPassThroughOptions } from 'primeng/popover';
import type { NotificationFilter } from '@features/account/models';
import { NotificationStore } from '@features/account/state';
import {
  NotificationBellFilter,
  NotificationBellFooter,
  NotificationBellHeader,
  NotificationBellList,
  NotificationBellTrigger,
} from './components';

/**
 * Component NotificationBell
 * @class NotificationBell
 *
 * @description
 * Bell-button + popover panel showing the latest notifications
 * for the authenticated user. Handles filtering, mark-as-read
 * interactions and lazy-loads on first open.
 *
 * Can be placed anywhere in the shell (header, toolbar, etc.)
 * because it is fully self-contained and layout-agnostic.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-notification-bell',
  imports: [
    PopoverModule,
    NotificationBellTrigger,
    NotificationBellHeader,
    NotificationBellFilter,
    NotificationBellList,
    NotificationBellFooter,
  ],
  templateUrl: './notification-bell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBell {
  //#region Properties
  /**
   * Property notificationStore
   * @readonly
   *
   * @description
   * Signal store providing the current notification list, unread count,
   * loading state and actions.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {NotificationStore}
   */
  protected readonly notificationStore: NotificationStore =
    inject<NotificationStore>(NotificationStore);

  /**
   * Property popover
   * @readonly
   *
   * @description
   * Reference to the PrimeNG Popover instance, used to control
   * its visibility and access internal methods.
   *
   * Must be a signal to be accessible in template event handlers.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<Popover>}
   */
  protected readonly popover: Signal<Popover> = viewChild.required<Popover>('popover');

  /**
   * Property popoverPt
   * @readonly
   *
   * @description
   * Pass-through options for the popover panel, used to apply custom
   * styling such as padding and overflow handling.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {PopoverPassThroughOptions}
   */
  protected readonly popoverPt: PopoverPassThroughOptions = {
    root: { class: 'no-arrow' },
    content: { class: 'p-0 overflow-hidden' },
  };

  /**
   * Property selectedFilter
   * @readonly
   *
   * @description
   * Currently selected notification filter, used to keep the filter state
   * in sync between the filter component and the store.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<NotificationFilter | null>}
   */
  protected readonly selectedFilter: WritableSignal<NotificationFilter | null> =
    signal<NotificationFilter | null>(null);
  //#endregion

  //#region Methods
  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Toggles the popover visibility. If the popover is being opened and there
   * are no notifications loaded, it triggers a load with a default limit to
   * fetch the latest notifications.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MouseEvent} event - The click event from the bell button, used to position the popover.
   *
   * @return {void} - No return value.
   */
  protected toggle(event: MouseEvent): void {
    const popover: Popover = this.popover();
    const loading: boolean = this.notificationStore.isLoading();
    const empty: boolean = this.notificationStore.notifications().length === 0;

    if (!loading && empty) {
      this.notificationStore.load({ limit: 20 });
    }

    popover.toggle(event);
  }

  /**
   * Method applyFilter
   * @method applyFilter
   *
   * @description
   * Applies a notification filter selected in the filter component.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {NotificationFilter | null} value - The filter value emitted by the filter component, or null to clear filters.
   *
   * @return {void} - No return value.
   */
  protected applyFilter(value: NotificationFilter | null): void {
    this.selectedFilter.set(value);
    this.notificationStore.setFilter(value);
    this.notificationStore.load({ limit: 20, ...value });
  }

  /**
   * Method markAsRead
   * @method markAsRead
   *
   * @description
   * Marks a notification as read by its identifier. Called when the user clicks
   * the mark-as-read dot on a notification item, or the "Mark
   * all as read" button in the footer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} id - The identifier of the notification to mark as read.
   *
   * @return {void} - No return value.
   */
  protected markAsRead(id: string): void {
    this.notificationStore.markAsRead(id);
  }

  /**
   * Method loadMore
   * @method loadMore
   *
   * @description
   * Loads the next page of notifications (infinite scroll).
   *
   * @access protected
   * @since 1.1.0
   *
   * @return {void} - No return value.
   */
  protected loadMore(): void {
    this.notificationStore.loadMore();
  }

  /**
   * Method markAllAsRead
   * @method markAllAsRead
   *
   * @description
   * Marks all notifications as read. Called when the user clicks the "Mark
   * all as read" button in the footer. It filters the current notification list
   * to only include unread notifications, then calls markAsRead for each of them.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void} - No return value.
   */
  protected markAllAsRead(): void {
    this.notificationStore
      .notifications()
      .filter((n) => !n.isRead)
      .forEach((n) => this.notificationStore.markAsRead(n.id));
  }
  //#endregion
}
