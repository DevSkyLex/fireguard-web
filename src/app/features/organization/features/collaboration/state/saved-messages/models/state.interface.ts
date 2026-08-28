import type { CallState } from '@core/request-state';
import type { ConversationOutput } from '@features/organization/features/collaboration/models';

/**
 * Interface SavedMessagesState
 * @interface SavedMessagesState
 *
 * @description
 * Auxiliary state for {@link SavedMessagesStore}. The saved messages
 * themselves live in the `withEntities` collection, keyed by their scalar
 * `id`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SavedMessagesState {
  /** Organization the loaded bookmarks belong to, or `null` before the first load. */
  readonly organizationId: string | null;
  /** Highest page fetched so far, or `0` before the first load. */
  readonly loadedPage: number;
  /** Server-reported total. Paging must be driven from this, not the row count. */
  readonly total: number;
  /**
   * The conversations the loaded bookmarks point into, keyed by bare
   * conversation id.
   *
   * Resolved separately because a `MessageOutput` names its conversation only
   * as an IRI, and whether that conversation is a channel decides which route
   * an item links to. A conversation that could not be read is simply absent —
   * its items still render, linked as a direct conversation.
   */
  readonly conversationsById: Readonly<Record<string, ConversationOutput>>;
  /** `GET /saved-messages`. */
  readonly listCallState: CallState;
  /** `DELETE /messages/{id}/save`. */
  readonly unsaveCallState: CallState;
}
