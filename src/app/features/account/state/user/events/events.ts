import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant userStoreEvents
 * @const userStoreEvents
 *
 * @description
 * User store events for handling user profile
 * operation failures.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const userStoreEvents = eventGroup({
  source: 'User Store',
  events: {
    loadFailed: type<StoreFailureEventPayload>(),
  },
});
