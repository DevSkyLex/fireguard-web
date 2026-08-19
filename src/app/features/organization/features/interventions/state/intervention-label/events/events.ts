import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant interventionLabelStoreEvents
 * @const interventionLabelStoreEvents
 *
 * @description
 * Intervention label catalog store events. Every event carries a
 * `FeedbackEventPayload`-shaped payload, picked up by the app-wide feedback
 * listener and rendered as a toast, so the manage dialog needs no toast
 * wiring of its own.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const interventionLabelStoreEvents = eventGroup({
  source: 'Intervention Label Store',
  events: {
    /** Dispatched when fetching the label catalog fails. */
    loadFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when a label is created. */
    createSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when creating a label fails. */
    createFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when a label is renamed or recolored. */
    updateSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when updating a label fails. */
    updateFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when a label is deleted. */
    removeSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when deleting a label fails. */
    removeFailed: type<StoreFailureEventPayload>(),
  },
});
