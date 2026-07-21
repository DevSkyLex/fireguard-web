import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant calendarEventsStoreEvents
 * @const calendarEventsStoreEvents
 *
 * @description
 * Calendar events store events. Both carry a `FeedbackEventPayload`, picked
 * up by the app-wide feedback listener and rendered as a toast.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const calendarEventsStoreEvents = eventGroup({
  source: 'Calendar Events Store',
  events: {
    /** Dispatched when creating a calendar event fails. */
    createFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when a calendar event is created. */
    createSucceeded: type<FeedbackEventPayload>(),
  },
});
