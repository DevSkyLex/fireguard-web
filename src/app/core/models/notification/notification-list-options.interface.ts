import type { PaginationOptions } from '@core/models/api';
import type { NotificationFilter } from './notification-filter.interface';

export type NotificationListOptions = NotificationFilter & PaginationOptions & {
  readonly unreadOnly?: boolean;
  readonly limit?: number;
};
