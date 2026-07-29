import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';

/**
 * Constant messagingSyncEvents
 * @const messagingSyncEvents
 *
 * @description
 * What the replay engine tells the rest of the app.
 *
 * `replayed` exists because the outbox and the thread hold the same fact from
 * two angles: the queue knows the message left, the thread knows which row was
 * showing as unsent. Without this the row would stay marked failed until the
 * member reloaded.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const messagingSyncEvents = eventGroup({
  source: 'Messaging Sync',
  events: {
    /** One conversation's queued sends that reached the server. */
    replayed: type<{ readonly conversationId: string; readonly clientIds: readonly string[] }>(),
    /** Operations that will not be retried without the member asking. */
    gaveUp: type<{ readonly conversationId: string; readonly clientIds: readonly string[] }>(),
  },
});
