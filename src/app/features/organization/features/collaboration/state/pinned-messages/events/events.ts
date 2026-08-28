import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant pinnedMessagesStoreEvents
 * @const pinnedMessagesStoreEvents
 *
 * @description
 * Notable {@link PinnedMessagesStore} transitions other layers react to — the
 * page syncing an unpin into the open thread, or surfacing a failure.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const pinnedMessagesStoreEvents = eventGroup({
  source: 'Pinned Messages Store',
  events: {
    /** A pin was withdrawn; carries the message id so the open thread can clear its own copy. */
    unpinned: type<string>(),
    loadFailed: type<StoreFailureEventPayload>(),
    unpinFailed: type<StoreFailureEventPayload>(),
  },
});
