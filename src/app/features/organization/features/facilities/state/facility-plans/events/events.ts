import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant facilityPlansStoreEvents
 *
 * @description
 * Facility plans store events. Failure and success events both carry a
 * FeedbackEventPayload, picked up by the app-wide feedback listener and
 * rendered as a toast.
 *
 * @version 1.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @const facilityPlansStoreEvents
 */
export const facilityPlansStoreEvents = eventGroup({
  source: 'Facility Plans Store',
  events: {
    /**
     * @description
     * Dispatched when fetching the plan list fails.
     */
    listFailed: type<StoreFailureEventPayload>(),
    /**
     * @description
     * Reports a successful calibration write.
     */
    calibrationSaved: type<FeedbackEventPayload>(),
    /**
     * @description
     * Dispatched when a floor plan upload fails.
     */
    uploadFailed: type<StoreFailureEventPayload>(),
    /**
     * @description
     * Dispatched when a floor plan is uploaded.
     */
    uploadSucceeded: type<FeedbackEventPayload>(),
    /**
     * @description
     * Dispatched when setting a plan as primary fails.
     */
    setPrimaryFailed: type<StoreFailureEventPayload>(),
    /**
     * @description
     * Dispatched when a plan is set as primary.
     */
    setPrimarySucceeded: type<FeedbackEventPayload>(),
    /**
     * @description
     * Dispatched when deleting a plan fails.
     */
    deleteFailed: type<StoreFailureEventPayload>(),
    /**
     * @description
     * Dispatched when a plan is deleted.
     */
    deleteSucceeded: type<FeedbackEventPayload>(),
    /**
     * @description
     * Dispatched when fetching the selected plan's image bytes fails.
     */
    imageLoadFailed: type<StoreFailureEventPayload>(),
    /**
     * @description
     * Dispatched when fetching the selected plan's overlay fails.
     */
    overlayLoadFailed: type<StoreFailureEventPayload>(),
    /**
     * @description
     * Dispatched when saving (drawing/clearing) a zone outline fails.
     */
    zoneGeometrySaveFailed: type<StoreFailureEventPayload>(),
    /**
     * @description
     * Dispatched when a zone outline is drawn or cleared.
     */
    zoneGeometrySaveSucceeded: type<FeedbackEventPayload>(),
    /**
     * @description
     * Dispatched when saving (placing/moving/removing) an equipment pin fails.
     */
    pinPositionSaveFailed: type<StoreFailureEventPayload>(),
    /**
     * @description
     * Dispatched when an equipment pin is placed, moved, or removed.
     */
    pinPositionSaveSucceeded: type<FeedbackEventPayload>(),
    /**
     * @description
     * Dispatched when fetching the `draw-zone` facility candidates fails.
     */
    zoneCandidatesFailed: type<StoreFailureEventPayload>(),
    /**
     * @description
     * Dispatched when fetching the `place-pin` equipment candidates fails.
     */
    facilityEquipmentFailed: type<StoreFailureEventPayload>(),
  },
});
