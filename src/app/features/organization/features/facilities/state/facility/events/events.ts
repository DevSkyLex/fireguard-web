import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/state/request-state';

/**
 * Constant facilityStoreEvents
 * @const facilityStoreEvents
 *
 * @description
 * Facility store events for handling operation failures.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const facilityStoreEvents = eventGroup({
  source: 'Facility Store',
  events: {
    /** Dispatched when fetching the facility list fails. */
    listFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when creating a facility fails. */
    createFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when updating a facility fails. */
    updateFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when archiving a facility fails. */
    archiveFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when restoring a facility fails. */
    restoreFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when moving a facility fails. */
    moveFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when loading facility types fails. */
    typesFailed: type<StoreFailureEventPayload>(),
  },
});
