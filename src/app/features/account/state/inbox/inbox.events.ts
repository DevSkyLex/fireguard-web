import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant inboxStoreEvents
 * @description Acknowledgement outcomes for cross-layer feedback and cache coordination.
 * @since 1.0.0
 */
export const inboxStoreEvents = eventGroup({
  source: 'Inbox Store',
  events: {
    readSucceeded: type<string>(),
    readFailed: type<StoreFailureEventPayload>(),
  },
});
