import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant sessionStoreEvents
 * @const sessionStoreEvents
 *
 * @description
 * Session store events.
 *
 * Revocation announces success as well as failure: it is destructive and its
 * only visible effect is a row disappearing, which is indistinguishable from a
 * list that simply refreshed. Failures alone left the successful case mute.
 *
 * @version 1.1.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const sessionStoreEvents = eventGroup({
  source: 'Session Store',
  events: {
    loadFailed: type<StoreFailureEventPayload>(),
    revokeFailed: type<StoreFailureEventPayload>(),
    revokeAllFailed: type<StoreFailureEventPayload>(),
    revokeSucceeded: type<void>(),
    revokeAllSucceeded: type<void>(),
  },
});
