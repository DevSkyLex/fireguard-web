import type { HydraItem } from '@core/api/models';

/**
 * Interface InboxUnreadCountOutput
 * @interface InboxUnreadCountOutput
 *
 * @description
 * The unified inbox's unread item count, summed across every source the
 * backend has registered. Today that is the reader's own notifications;
 * Messaging mentions and direct messages join later without the shape moving.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InboxUnreadCountOutput extends HydraItem {
  /** How many unread items the reader has across every inbox source. */
  readonly unreadCount: number;
}
