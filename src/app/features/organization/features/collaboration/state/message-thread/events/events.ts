import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';
import type { MessageOutput } from '@features/organization/features/collaboration/models';

/**
 * Constant messageThreadStoreEvents
 * @const messageThreadStoreEvents
 *
 * @description
 * Notable {@link MessageThreadStore} transitions other layers react to —
 * scrolling to a freshly posted message, toasting a failure.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const messageThreadStoreEvents = eventGroup({
  source: 'Message Thread Store',
  events: {
    posted: type<MessageOutput>(),
    postFailed: type<StoreFailureEventPayload>(),
    loadFailed: type<StoreFailureEventPayload>(),
    interactionFailed: type<StoreFailureEventPayload>(),
    /** A message edit was persisted; the page closes its edit dialog on this. */
    edited: type<MessageOutput>(),
    editFailed: type<StoreFailureEventPayload>(),
    /** A message was tombstoned; carries its id so the page closes its confirm. */
    deleted: type<string>(),
    deleteFailed: type<StoreFailureEventPayload>(),
    /** A conversation was marked read; carries its bare id so sidebar lists can clear the badge. */
    conversationRead: type<string>(),
  },
});
