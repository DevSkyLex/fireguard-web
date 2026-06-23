import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant interventionStoreEvents
 * @const interventionStoreEvents
 *
 * @description
 * Component-scoped intervention store events dispatched when intervention list or
 * creation operations fail.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const interventionStoreEvents = eventGroup({
  source: 'Intervention Store',
  events: {
    listFailed: type<StoreFailureEventPayload>(),
    createFailed: type<StoreFailureEventPayload>(),
  },
});
