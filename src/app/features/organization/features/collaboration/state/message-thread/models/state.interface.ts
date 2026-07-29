import type { CallState } from '@core/request-state';

/**
 * Interface MessageThreadState
 * @interface MessageThreadState
 *
 * @description
 * Auxiliary state for {@link MessageThreadStore}. The messages themselves live
 * in the `withEntities` collection, keyed by their scalar `id`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageThreadState {
  /** Conversation the loaded page belongs to, or `null` before the first load. */
  readonly conversationId: string | null;
  /** Server-reported total. Paging must be driven from this, not the row count. */
  readonly total: number;
  /**
   * Highest page fetched so far. Messages come back oldest-first, so scrolling
   * back through history means asking for the *next* page, not the previous.
   */
  readonly loadedPage: number;
  /** `GET /conversations/{id}/messages`. */
  readonly listCallState: CallState;
  /** Posting and editing. */
  readonly postCallState: CallState;
  /** Reactions, pins and saves — light, frequent, and worth keeping apart from posting. */
  readonly interactionCallState: CallState;
  /**
   * Mercure topic the thread is listening on, or `null` when not connected.
   *
   * Kept so the store can watch that topic's health and catch up after a
   * reconnection — the hub replays nothing.
   */
  readonly realtimeTopic: string | null;
  /**
   * Messages shown optimistically that the server has not confirmed yet.
   *
   * Kept beside the collection rather than as a field on `MessageOutput`: the
   * entity mirrors the wire contract, and "not sent yet" is a fact about this
   * client, not about the message.
   */
  readonly pendingMessageIds: readonly string[];
  /** Optimistic messages whose send failed and that are waiting on the member. */
  readonly failedMessageIds: readonly string[];
}
