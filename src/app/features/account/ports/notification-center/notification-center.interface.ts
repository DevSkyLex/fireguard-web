import type { Signal } from '@angular/core';

/**
 * NotificationCenterPort
 * @interface NotificationCenterPort
 *
 * @description
 * Feature-owned contract published by the account feature for shell
 * consumers that need notification bootstrap state and unread badges.
 * Rich notification interactions remain internal to account UI/widgets.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface NotificationCenterPort {
  readonly unreadCount: Signal<number>;
  readonly hasUnread: Signal<boolean>;

  load(): void;
  connectMercure(): void;
}
