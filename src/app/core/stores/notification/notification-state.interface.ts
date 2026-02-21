import type { NotificationFilter, NotificationOutput, NotificationTypeOutput } from '@core/models/notification';
import type { CollectionOperation, Operation } from '@core/stores/operations';

export interface NotificationStoreState {
  readonly notifications: ReadonlyArray<NotificationOutput>;
  readonly totalNotifications: number;
  readonly listOperation: CollectionOperation<NotificationOutput, unknown>;
  readonly markAsReadOperation: Operation<NotificationOutput, unknown>;
  readonly mercureConnected: boolean;
  readonly types: ReadonlyArray<NotificationTypeOutput>;
  readonly typesLoaded: boolean;
  readonly activeFilter: NotificationFilter | null;
}
