import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant facilityPlansStoreEvents
 * @const facilityPlansStoreEvents
 *
 * @description
 * Facility plans store events. Failure and success events both carry a
 * FeedbackEventPayload, picked up by the app-wide feedback listener and
 * rendered as a toast.
 *
 * @version 1.4.0
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
    /** Dispatched when fetching the selected plan's image bytes fails. */
    imageLoadFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when fetching the selected plan's overlay fails. */
    overlayLoadFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when saving (drawing/clearing) a zone outline fails. */
    zoneGeometrySaveFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when a zone outline is drawn or cleared. */
    zoneGeometrySaveSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when saving (placing/moving/removing) an equipment pin fails. */
    pinPositionSaveFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when an equipment pin is placed, moved, or removed. */
    pinPositionSaveSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when fetching the `draw-zone` facility candidates fails. */
    zoneCandidatesFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when fetching the `place-pin` equipment candidates fails. */
    facilityEquipmentFailed: type<StoreFailureEventPayload>(),
  },
});
