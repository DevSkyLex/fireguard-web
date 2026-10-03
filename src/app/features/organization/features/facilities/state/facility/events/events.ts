import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant facilityStoreEvents
 *
 * @description
 * Facility store events. Failure and success events both carry a
 * `FeedbackEventPayload`, picked up by the app-wide feedback listener and
 * rendered as a toast.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @const facilityStoreEvents
 */
export const facilityStoreEvents = eventGroup({
  source: 'Facility Store',
  events: {
    /**
     * @description
     * Dispatched when fetching the facility list fails.
     */
    listFailed: type<StoreFailureEventPayload>(),
    /**
     * @description
     * Dispatched when creating a facility fails (non-quota errors only).
     */
    createFailed: type<StoreFailureEventPayload>(),
    /**
     * @description
     * Dispatched when a facility is created.
     */
    createSucceeded: type<FeedbackEventPayload>(),
    /**
     * @description
     * Dispatched when updating a facility fails.
     */
    updateFailed: type<StoreFailureEventPayload>(),
    /**
     * @description
     * Dispatched when a facility is updated.
     */
    updateSucceeded: type<FeedbackEventPayload>(),
    /**
     * @description
     * Dispatched when archiving a facility fails.
     */
    archiveFailed: type<StoreFailureEventPayload>(),
    /**
     * @description
     * Dispatched when a facility is archived.
     */
    archiveSucceeded: type<FeedbackEventPayload>(),
    /**
     * @description
     * Dispatched when restoring a facility fails.
     */
    restoreFailed: type<StoreFailureEventPayload>(),
    /**
     * @description
     * Dispatched when a facility is restored.
     */
    restoreSucceeded: type<FeedbackEventPayload>(),
    /**
     * @description
     * Dispatched when deleting a facility fails.
     */
    deleteFailed: type<StoreFailureEventPayload>(),
    /**
     * @description
     * Dispatched when a facility is deleted.
     */
    deleteSucceeded: type<FeedbackEventPayload>(),
    /**
     * @description
     * Dispatched when moving a facility fails.
     */
    moveFailed: type<StoreFailureEventPayload>(),
    /**
     * @description
     * Dispatched when a facility is moved.
     */
    moveSucceeded: type<FeedbackEventPayload>(),
  },
});
