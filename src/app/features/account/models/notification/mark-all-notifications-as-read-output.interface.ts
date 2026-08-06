import type { HydraItem } from '@core/api/models';

/**
 * Interface MarkAllNotificationsAsReadOutput
 * @interface MarkAllNotificationsAsReadOutput
 *
 * @description
 * Result of marking every unread notification as read. `count` is how many were
 * actually changed, which is `0` on a repeat call — the endpoint is idempotent.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MarkAllNotificationsAsReadOutput extends HydraItem {
  /** How many notifications this call marked as read. */
  readonly count: number;
}
