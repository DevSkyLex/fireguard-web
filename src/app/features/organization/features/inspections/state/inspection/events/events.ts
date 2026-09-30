import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant inspectionStoreEvents
 *
 * @description
 * Groups the inspection store events consumed by inspection feature state.
 *
 * @access public
 *
 * @type {unknown}
 */
export const inspectionStoreEvents = eventGroup({
  source: 'Inspection Store',
  events: {
    /**
     * @description
     * Dispatched when fetching the inspection list fails.
     */
    listFailed: type<StoreFailureEventPayload>(),

    /**
     * @description
     * Dispatched when creating an inspection fails (non-quota errors only).
     */
    createFailed: type<StoreFailureEventPayload>(),

    /**
     * @description
     * Dispatched when an inspection is created.
     */
    createSucceeded: type<FeedbackEventPayload>(),

    /**
     * @description
     * Dispatched when updating an inspection fails.
     */
    updateFailed: type<StoreFailureEventPayload>(),

    /**
     * @description
     * Dispatched when cancelling an inspection fails.
     */
    cancelFailed: type<StoreFailureEventPayload>(),

    /**
     * @description
     * Dispatched when an inspection is cancelled.
     */
    cancelSucceeded: type<FeedbackEventPayload>(),

    /**
     * @description
     * Dispatched when submitting an inspection fails.
     */
    submitFailed: type<StoreFailureEventPayload>(),

    /**
     * @description
     * Dispatched when closing an inspection fails.
     */
    closeFailed: type<StoreFailureEventPayload>(),

    /**
     * @description
     * Dispatched when loading non-conformities fails.
     */
    nonConformitiesListFailed: type<StoreFailureEventPayload>(),

    /**
     * @description
     * Dispatched when loading one non-conformity fails.
     */
    nonConformityGetFailed: type<StoreFailureEventPayload>(),

    /**
     * @description
     * Dispatched when adding a non-conformity fails.
     */
    addNonConformityFailed: type<StoreFailureEventPayload>(),

    /**
     * @description
     * Dispatched when updating non-conformity status fails.
     */
    updateNonConformityStatusFailed: type<StoreFailureEventPayload>(),
  },
});
