import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant facilityStoreEvents
 * @const facilityStoreEvents
 *
 * @description
 * Facility store events. Failure and success events both carry a
 * `FeedbackEventPayload`, picked up by the app-wide feedback listener and
 * rendered as a toast.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const facilityStoreEvents = eventGroup({
  source: 'Facility Store',
  events: {
    /** Dispatched when fetching the facility list fails. */
    listFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when creating a facility fails (non-quota errors only). */
    createFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when a facility is created. */
    createSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when updating a facility fails. */
    updateFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when a facility is updated. */
    updateSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when archiving a facility fails. */
    archiveFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when a facility is archived. */
    archiveSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when restoring a facility fails. */
    restoreFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when a facility is restored. */
    restoreSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when moving a facility fails. */
    moveFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when a facility is moved. */
    moveSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when loading facility types fails. */
    typesFailed: type<StoreFailureEventPayload>(),
  },
});
