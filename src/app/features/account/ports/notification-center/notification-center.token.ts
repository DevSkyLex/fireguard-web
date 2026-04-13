import { InjectionToken } from '@angular/core';
import type { NotificationCenterPort } from './notification-center.interface';

/**
 * Constant NOTIFICATION_CENTER_PORT
 * @const NOTIFICATION_CENTER_PORT
 *
 * @description
 * Injection token for the account-owned NotificationCenterPort.
 * Bound by `features/account/providers/`.
 * Consumed by layouts and approved external consumers.
 *
 * @type {InjectionToken<NotificationCenterPort>}
 */
export const NOTIFICATION_CENTER_PORT: InjectionToken<NotificationCenterPort> =
  new InjectionToken<NotificationCenterPort>('NOTIFICATION_CENTER_PORT');
