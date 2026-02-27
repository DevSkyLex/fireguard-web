import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PopoverModule, PopoverPassThroughOptions } from 'primeng/popover';
import { Popover } from 'primeng/popover';
import { NotificationStore } from '@core/stores/notification';
import type { NotificationFilter } from '@core/models/notification';
import { DashboardLayoutNotificationsHeader } from './dashboard-layout-notifications-header/dashboard-layout-notifications-header.component';
import { DashboardLayoutNotificationsFilter } from './dashboard-layout-notifications-filter/dashboard-layout-notifications-filter.component';
import { DashboardLayoutNotificationsList } from './dashboard-layout-notifications-list/dashboard-layout-notifications-list.component';
import { DashboardLayoutNotificationsFooter } from './dashboard-layout-notifications-footer/dashboard-layout-notifications-footer.component';
import { OverlayBadgeModule } from 'primeng/overlaybadge';

@Component({
  selector: 'app-dashboard-layout-notifications',
  imports: [
    ButtonModule,
    PopoverModule,
    DashboardLayoutNotificationsHeader,
    DashboardLayoutNotificationsFilter,
    DashboardLayoutNotificationsList,
    DashboardLayoutNotificationsFooter,
    OverlayBadgeModule,
  ],
  templateUrl: './dashboard-layout-notifications.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutNotifications {
  //#region Properties
  protected readonly notificationStore: NotificationStore =
    inject<NotificationStore>(NotificationStore);

  protected readonly popover: Signal<Popover | undefined> =
    viewChild<Popover>('notifPopover');

  protected readonly popoverPt: PopoverPassThroughOptions = {
    content: {
      class: 'p-0',
    },
  };

  protected readonly selectedFilterValue: WritableSignal<NotificationFilter | null> =
    signal<NotificationFilter | null>(null);

  //#endregion

  //#region Methods
  protected toggle(event: MouseEvent): void {
    const popover: Popover | undefined = this.popover();
    const loading: boolean = this.notificationStore.isLoading();
    const notifications = this.notificationStore.notifications();

    if (!loading && notifications.length === 0) {
      this.notificationStore.load({ limit: 20 });
    }

    if (popover) popover.toggle(event);
  }

  protected applyFilter(value: NotificationFilter | null): void {
    this.selectedFilterValue.set(value);
    this.notificationStore.setFilter(value);
    this.notificationStore.load({ limit: 20, ...(value ?? {}) });
  }

  protected markAsRead(id: string): void {
    this.notificationStore.markAsRead(id);
  }

  protected loadMore(): void {
    this.notificationStore.loadMore();
  }

  protected markAllAsRead(): void {
    this.notificationStore
      .notifications()
      .filter((n) => !n.isRead)
      .forEach((n) => this.notificationStore.markAsRead(n.id));
  }
  //#endregion
}
