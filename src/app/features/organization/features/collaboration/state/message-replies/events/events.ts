import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant messageRepliesStoreEvents
 * @const messageRepliesStoreEvents
 *
 * @description
 * Notable {@link MessageRepliesStore} transitions other layers react to.
 *
 * `posted` exists because a reply changes a message the *thread* store owns:
 * the parent's `replyCount` goes up, and the parent may well have scrolled out
 * of the page a refetch would return. The count is corrected where the parent
 * lives rather than guessed here.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const messageRepliesStoreEvents = eventGroup({
  source: 'Message Replies Store',
  events: {
    /** A reply was posted; carries the root message's bare id. */
    posted: type<string>(),
    postFailed: type<StoreFailureEventPayload>(),
    loadFailed: type<StoreFailureEventPayload>(),
  },
});
