import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant facilityPlansStoreEvents
 * @const facilityPlansStoreEvents
 *
 * @description
 * Facility plans store events. Failure and success events both carry a
 * `FeedbackEventPayload`, picked up by the app-wide feedback listener and
 * rendered as a toast.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const facilityPlansStoreEvents = eventGroup({
  source: 'Facility Plans Store',
  events: {
    /** Dispatched when fetching the plan list fails. */
    listFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when a floor plan upload fails. */
    uploadFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when a floor plan is uploaded. */
    uploadSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when setting a plan as primary fails. */
    setPrimaryFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when a plan is set as primary. */
    setPrimarySucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when deleting a plan fails. */
    deleteFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when a plan is deleted. */
    deleteSucceeded: type<FeedbackEventPayload>(),
  },
});
