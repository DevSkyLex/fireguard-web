import type { AccountNotificationsTabId } from '../models';

/**
 * Constant ACCOUNT_NOTIFICATIONS_TAB_IDS
 * @const ACCOUNT_NOTIFICATIONS_TAB_IDS
 *
 * @description
 * Every recognized `?tab=` value, in the order the tab list renders them. The
 * first is the fallback for a missing or unknown parameter.
 *
 * @since 1.2.0
 *
 * @type {ReadonlyArray<AccountNotificationsTabId>}
 */
export const ACCOUNT_NOTIFICATIONS_TAB_IDS: ReadonlyArray<AccountNotificationsTabId> = [
  'inbox',
  'preferences',
];
