import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant facilityMapStoreEvents
 * @const facilityMapStoreEvents
 *
 * @description
 * Facility map store failure events, picked up by the app-wide feedback
 * listener and rendered as a toast.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const facilityMapStoreEvents = eventGroup({
  source: 'Facility Map Store',
  events: {
    /** Dispatched when loading the located facilities fails. */
    mappedFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when loading the unplaced-facility count fails. */
    unplacedFailed: type<StoreFailureEventPayload>(),
  },
});
