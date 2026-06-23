import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant notificationStoreEvents
 * @const notificationStoreEvents
 *
 * @description
 * Event group for the notification store. Emitted when list or
 * mark-as-read operations fail so that global side-effects (toasts,
 * logging, etc.) can react.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const notificationStoreEvents = eventGroup({
  source: 'Notification Store',
  events: {
    /**
     * Event loadFailed
     *
     * @description
     * Dispatched when the notification list API call fails.
     */
    loadFailed: type<StoreFailureEventPayload>(),

    /**
     * Event markAsReadFailed
     *
     * @description
     * Dispatched when the mark-as-read API call fails.
     */
    markAsReadFailed: type<StoreFailureEventPayload>(),
  },
});
