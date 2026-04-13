import type { PaginationOptions } from '@core/models/api';
import type { NotificationFilter } from './notification-filter.interface';

/**
 * Type NotificationListOptions
 *
 * @description
 * Complete query options supported by the
 * notifications listing endpoint.
 */
export type NotificationListOptions = NotificationFilter &
  PaginationOptions & {
    /**
     * Property unreadOnly
     * @readonly
     *
     * @description
     * Whether to restrict the collection to unread
     * notifications only.
     *
     * @type {boolean}
     */
    readonly unreadOnly?: boolean;

    /**
     * Property limit
     * @readonly
     *
     * @description
     * Maximum number of notifications to return.
     *
     * @type {number}
     */
    readonly limit?: number;
  };
