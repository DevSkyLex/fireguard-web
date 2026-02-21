import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { OperationFailureEventPayload } from '../operations';

export const notificationStoreEvents = eventGroup({
  source: 'Notification Store',
  events: {
    loadFailed: type<OperationFailureEventPayload>(),
    markAsReadFailed: type<OperationFailureEventPayload>(),
  },
});
