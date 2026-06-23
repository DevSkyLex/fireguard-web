import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant activeFacilityStoreEvents
 * @const activeFacilityStoreEvents
 *
 * @description
 * Event group for the {@link ActiveFacilityStore}. These events are dispatched
 * when root-level operations (e.g. resolving the selected facility) fail.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const activeFacilityStoreEvents = eventGroup({
  source: 'Active Facility Store',
  events: {
    /**
     * Event getFailed
     *
     * @description
     * Dispatched when fetching the selected facility fails.
     */
    getFailed: type<StoreFailureEventPayload>(),
  },
});
