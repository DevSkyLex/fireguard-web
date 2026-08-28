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
   * Lowest page fetched so far, or `0` before the first load.
   *
   * The API returns messages oldest-first, so the *last* page holds the newest
   * ones and a thread opens there. Reading history therefore walks page numbers
   * **down** from that page, and this marks how far down it has gone.
   */
  readonly oldestLoadedPage: number;
  /**
   * Highest page fetched so far, or `0` before the first load. This is the
   * newest end of the conversation, and the page a background refresh re-reads.
   */
  readonly newestLoadedPage: number;
  /** `GET /conversations/{id}/messages`. */
  readonly listCallState: CallState;
  /** Posting. */
  readonly postCallState: CallState;
  /** Reactions, pins and saves — light, frequent, and worth keeping apart from posting. */
  readonly interactionCallState: CallState;
  /** Editing a message — its own state so the edit dialog can busy-lock and show its error inline. */
  readonly editCallState: CallState;
  /** Tombstone deletion — its own state so the confirm dialog stays open, busy-locked, until it settles. */
  readonly deleteCallState: CallState;
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
