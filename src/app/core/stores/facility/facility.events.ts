import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { OperationFailureEventPayload } from '../operations';

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
    listFailed: type<OperationFailureEventPayload>(),
    /** Dispatched when creating a facility fails. */
    createFailed: type<OperationFailureEventPayload>(),
    /** Dispatched when updating a facility fails. */
    updateFailed: type<OperationFailureEventPayload>(),
    /** Dispatched when archiving a facility fails. */
    archiveFailed: type<OperationFailureEventPayload>(),
    /** Dispatched when moving a facility fails. */
    moveFailed: type<OperationFailureEventPayload>(),
    /** Dispatched when loading facility types fails. */
    typesFailed: type<OperationFailureEventPayload>(),
  },
});
