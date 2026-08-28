import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';
import type { MessageOutput } from '@features/organization/features/collaboration/models';

/**
 * Constant messageRepliesStoreEvents
 * @const messageRepliesStoreEvents
 *
 * @description
 * Notable {@link MessageRepliesStore} transitions other layers react to — the
 * page bumping the parent row's reply counter, or surfacing a failure.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const messageRepliesStoreEvents = eventGroup({
  source: 'Message Replies Store',
  events: {
    /** A reply was persisted; carries the parent id so the thread can bump its counter. */
    replyPosted: type<{ readonly parentMessageId: string; readonly reply: MessageOutput }>(),
    replyFailed: type<StoreFailureEventPayload>(),
    loadFailed: type<StoreFailureEventPayload>(),
  },
});
