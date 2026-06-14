import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/state/request-state';

/**
 * Constant missionStoreEvents
 * @const missionStoreEvents
 *
 * @description
 * Component-scoped mission store events dispatched when mission list or
 * creation operations fail.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const missionStoreEvents = eventGroup({
  source: 'Mission Store',
  events: {
    listFailed: type<StoreFailureEventPayload>(),
    createFailed: type<StoreFailureEventPayload>(),
  },
});
