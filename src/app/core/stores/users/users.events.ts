import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { OperationFailureEventPayload } from '../operations';

export const usersStoreEvents = eventGroup({
  source: 'Users Store',
  events: {
    listFailed: type<OperationFailureEventPayload>(),
    createFailed: type<OperationFailureEventPayload>(),
    updateFailed: type<OperationFailureEventPayload>(),
    deleteFailed: type<OperationFailureEventPayload>(),
    statusesFailed: type<OperationFailureEventPayload>(),
  },
});
