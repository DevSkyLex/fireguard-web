import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/state/request-state';

export const usersStoreEvents = eventGroup({
  source: 'Users Store',
  events: {
    listFailed: type<StoreFailureEventPayload>(),
    createFailed: type<StoreFailureEventPayload>(),
    updateFailed: type<StoreFailureEventPayload>(),
    deleteFailed: type<StoreFailureEventPayload>(),
    statusesFailed: type<StoreFailureEventPayload>(),
  },
});
