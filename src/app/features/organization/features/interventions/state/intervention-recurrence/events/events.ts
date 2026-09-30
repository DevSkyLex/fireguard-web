import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant interventionRecurrenceStoreEvents
 *
 * @description
 * Intervention recurrence store events. Every event carries a
 * `FeedbackEventPayload`-shaped payload, picked up by the app-wide feedback
 * listener and rendered as a toast.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @constant interventionRecurrenceStoreEvents
 */
export const interventionRecurrenceStoreEvents = eventGroup({
  source: 'Intervention Recurrence Store',
  events: {
    /**
     * @description
     * Dispatched when fetching the recurrence list fails.
     */
    loadFailed: type<StoreFailureEventPayload>(),

    /**
     * @description
     * Dispatched when a recurrence is created.
     */
    createSucceeded: type<FeedbackEventPayload>(),

    /**
     * @description
     * Dispatched when creating a recurrence fails.
     */
    createFailed: type<StoreFailureEventPayload>(),

    /**
     * @description
     * Dispatched when a recurrence (including its active toggle) is updated.
     */
    updateSucceeded: type<FeedbackEventPayload & { readonly recurrenceId: string }>(),

    /**
     * @description
     * Dispatched when updating a recurrence fails.
     */
    updateFailed: type<StoreFailureEventPayload & { readonly recurrenceId: string }>(),

    /**
     * @description
     * Dispatched when a recurrence is deleted.
     */
    removeSucceeded: type<FeedbackEventPayload & { readonly recurrenceId: string }>(),

    /**
     * @description
     * Dispatched when deleting a recurrence fails.
     */
    removeFailed: type<StoreFailureEventPayload & { readonly recurrenceId: string }>(),
  },
});
