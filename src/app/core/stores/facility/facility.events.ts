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
    listFailed: type<OperationFailureEventPayload>(),
    getFailed: type<OperationFailureEventPayload>(),
    createFailed: type<OperationFailureEventPayload>(),
    updateFailed: type<OperationFailureEventPayload>(),
    archiveFailed: type<OperationFailureEventPayload>(),
    moveFailed: type<OperationFailureEventPayload>(),
    typesFailed: type<OperationFailureEventPayload>(),
  },
});
