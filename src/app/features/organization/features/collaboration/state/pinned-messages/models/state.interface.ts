import type { CallState } from '@core/request-state';

/**
 * Interface PinnedMessagesState
 * @interface PinnedMessagesState
 *
 * @description
 * Auxiliary state for {@link PinnedMessagesStore}. The pinned messages
 * themselves live in the `withEntities` collection, keyed by their scalar
 * `id`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface PinnedMessagesState {
  /** Conversation the loaded pins belong to, or `null` before the first load. */
  readonly conversationId: string | null;
  /** Server-reported total. */
  readonly total: number;
  /** `GET /conversations/{id}/pinned-messages`. */
  readonly listCallState: CallState;
  /** `DELETE /messages/{id}/pin`. */
  readonly unpinCallState: CallState;
}
