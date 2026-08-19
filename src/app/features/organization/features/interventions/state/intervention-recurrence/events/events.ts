import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant interventionRecurrenceStoreEvents
 * @const interventionRecurrenceStoreEvents
 *
 * @description
 * Intervention recurrence store events. Every event carries a
 * `FeedbackEventPayload`-shaped payload, picked up by the app-wide feedback
 * listener and rendered as a toast.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const interventionRecurrenceStoreEvents = eventGroup({
  source: 'Intervention Recurrence Store',
  events: {
    /** Dispatched when fetching the recurrence list fails. */
    loadFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when a recurrence is created. */
    createSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when creating a recurrence fails. */
    createFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when a recurrence (including its active toggle) is updated. */
    updateSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when updating a recurrence fails. */
    updateFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when a recurrence is deleted. */
    removeSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when deleting a recurrence fails. */
    removeFailed: type<StoreFailureEventPayload>(),
  },
});
