import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant sessionStoreEvents
 * @const sessionStoreEvents
 *
 * @description
 * Session store events for handling session
 * operation failures.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const sessionStoreEvents = eventGroup({
  source: 'Session Store',
  events: {
    loadFailed: type<StoreFailureEventPayload>(),
    revokeFailed: type<StoreFailureEventPayload>(),
    revokeAllFailed: type<StoreFailureEventPayload>(),
  },
});
