import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

export const auditStoreEvents = eventGroup({
  source: 'Audit Store',
  events: {
    listFailed: type<StoreFailureEventPayload>(),
  },
});
