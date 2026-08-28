import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraCollection, RequestOptions } from '@core/api/models';
import type {
  AddReactionInput,
  EditMessageInput,
  ListSavedMessagesQuery,
  MessageOutput,
  PostMessageInput,
  PostReplyInput,
} from '@features/organization/features/collaboration/models';

/**
 * Service MessageService
 * @class MessageService
 * @extends {HydraApiService}
 *
 * @description
 * Transport boundary for messages: posting, reactions, editing, tombstone
 * deletion, threaded replies, pins and saved bookmarks.
 *
 * There is no `GET /api/messages/{id}`: to refresh a single message you must
 * re-list its page, its replies, or the conversation's pins.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class MessageService extends HydraApiService {
  //#region Properties
  /**
   * Property messageEndpoint
   * @readonly
   *
   * @description
   * Item endpoint for message-scoped routes.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private readonly messageEndpoint: string = '/api/messages';

  /**
   * Property conversationEndpoint
   * @readonly
   *
   * @description
   * Conversation endpoint for message collections.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private readonly conversationEndpoint: string = '/api/conversations';
  //#endregion

  //#region Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Lists a conversation's messages, oldest first.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} conversationId - Bare conversation UUID.
   * @param {RequestOptions} [options] - Paging; `itemsPerPage` is clamped to 1–100.
   *
   * @returns {Observable<HydraCollection<MessageOutput>>} One page of messages.
   */
  public list(
    conversationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<MessageOutput>> {
    return this.getCollection<MessageOutput>(
      `${this.conversationEndpoint}/${conversationId}/messages`,
      options,
    );
  }

  /**
   * Method postMessage
   * @method postMessage
   *
   * @description
   * Posts a message. The response is complete and safe to merge whole.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} conversationId - Bare conversation UUID.
   * @param {PostMessageInput} input - Body and optional references.
   *
   * @returns {Observable<MessageOutput>} The created message.
   */
  public postMessage(conversationId: string, input: PostMessageInput): Observable<MessageOutput> {
    return this.post<PostMessageInput, MessageOutput>(
      `${this.conversationEndpoint}/${conversationId}/messages`,
      input,
    );
  }

  /**
   * Method postMessageWithClientId
   * @method postMessageWithClientId
   *
   * @description
   * Posts a message under an id the client chose, making the write safe to
   * replay.
   *
   * This is what an offline outbox must use. `postMessage` mints the id
   * server-side, so a queued send whose response was lost would create a second
   * message on retry with nothing able to detect it; here the retry conflicts
   * instead. A `409` carrying `/problems/client-resource-already-exists` means
   * the message is already stored — treat it as success, not as a failure.
   *
   * `If-None-Match: *` is required by the endpoint and states create-only
   * intent, so this can never be mistaken for an edit.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} conversationId - Bare conversation UUID.
   * @param {string} clientId - Client-minted message UUID; becomes the message id.
   * @param {PostMessageInput} input - Body and optional references.
   *
   * @returns {Observable<MessageOutput>} The created message.
   */
  public postMessageWithClientId(
    conversationId: string,
    clientId: string,
    input: PostMessageInput,
  ): Observable<MessageOutput> {
    return this.put<PostMessageInput, MessageOutput>(
      `${this.conversationEndpoint}/${conversationId}/messages/${clientId}`,
      input,
      { headers: { 'If-None-Match': '*' } },
    );
  }

  /**
   * Method addReaction
   * @method addReaction
   *
   * @description
   * Reacts with an emoji. Idempotent, `200`.
   *
   * The response rebuilds the message without its real reply count or
   * references, so it always reports `replyCount: 0` and `references: []`.
   * Merge only `reactions` from it.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} messageId - Bare message UUID.
   * @param {AddReactionInput} input - Emoji to add.
   *
   * @returns {Observable<MessageOutput>} A partially fabricated message — see above.
   */
  public addReaction(messageId: string, input: AddReactionInput): Observable<MessageOutput> {
    return this.post<AddReactionInput, MessageOutput>(
      `${this.messageEndpoint}/${messageId}/reactions`,
      input,
    );
  }

  /**
   * Method removeReaction
   * @method removeReaction
   *
   * @description
   * Removes the acting member's own reaction. Idempotent, `204`, never errors
   * even if it was never there.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} messageId - Bare message UUID.
   * @param {string} emoji - Emoji to remove; encoded into the path.
   *
   * @returns {Observable<void>} Completion.
   */
  public removeReaction(messageId: string, emoji: string): Observable<void> {
    return this.delete(
      `${this.messageEndpoint}/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    );
  }

  /**
   * Method editMessage
   * @method editMessage
   *
   * @description
   * Replaces a message's body. Author only — the server answers `403` for
   * anyone else. The response is complete and safe to merge whole; only the
   * reaction and save responses fabricate fields.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} messageId - Bare message UUID.
   * @param {EditMessageInput} input - Replacement body and optional references.
   *
   * @returns {Observable<MessageOutput>} The edited message.
   */
  public editMessage(messageId: string, input: EditMessageInput): Observable<MessageOutput> {
    return this.patch<EditMessageInput, MessageOutput>(
      `${this.messageEndpoint}/${messageId}`,
      input,
    );
  }

  /**
   * Method deleteMessage
   * @method deleteMessage
   *
   * @description
   * Tombstones a message — the row survives server-side with its body
   * redacted at the API boundary, so readers see "deleted", never a hole.
   * Allowed to the author or a holder of `organization.messaging.manage`.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} messageId - Bare message UUID.
   *
   * @returns {Observable<void>} Completion, `204`.
   */
  public deleteMessage(messageId: string): Observable<void> {
    return this.delete(`${this.messageEndpoint}/${messageId}`);
  }

  /**
   * Method pinMessage
   * @method pinMessage
   *
   * @description
   * Pins a message in its conversation, visible to every reader. Requires
   * write access to the conversation. `200` with the pinned message.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} messageId - Bare message UUID.
   *
   * @returns {Observable<MessageOutput>} The message, now carrying `pinnedAt`/`pinnedBy`.
   */
  public pinMessage(messageId: string): Observable<MessageOutput> {
    return this.postAction<MessageOutput>(`${this.messageEndpoint}/${messageId}/pin`);
  }

  /**
   * Method unpinMessage
   * @method unpinMessage
   *
   * @description
   * Unpins a message. Allowed to the pinning member or a manager; unpinning a
   * message that is not pinned is a no-op that never errors. `204`.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} messageId - Bare message UUID.
   *
   * @returns {Observable<void>} Completion.
   */
  public unpinMessage(messageId: string): Observable<void> {
    return this.delete(`${this.messageEndpoint}/${messageId}/pin`);
  }

  /**
   * Method listPinned
   * @method listPinned
   *
   * @description
   * Lists a conversation's pinned messages.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} conversationId - Bare conversation UUID.
   * @param {RequestOptions} [options] - Paging; `itemsPerPage` is clamped to 1–100.
   *
   * @returns {Observable<HydraCollection<MessageOutput>>} One page of pinned messages.
   */
  public listPinned(
    conversationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<MessageOutput>> {
    return this.getCollection<MessageOutput>(
      `${this.conversationEndpoint}/${conversationId}/pinned-messages`,
      options,
    );
  }

  /**
   * Method saveMessage
   * @method saveMessage
   *
   * @description
   * Bookmarks a message for the acting member. Private — never a property of
   * the conversation. `200`.
   *
   * The response rebuilds the message without its real reply count or
   * references, reporting `replyCount: 0` and `references: []`. Merge only
   * `isSaved` from it.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} messageId - Bare message UUID.
   *
   * @returns {Observable<MessageOutput>} A partially fabricated message — see above.
   */
  public saveMessage(messageId: string): Observable<MessageOutput> {
    return this.postAction<MessageOutput>(`${this.messageEndpoint}/${messageId}/save`);
  }

  /**
   * Method unsaveMessage
   * @method unsaveMessage
   *
   * @description
   * Withdraws the acting member's bookmark. Idempotent, `204`.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} messageId - Bare message UUID.
   *
   * @returns {Observable<void>} Completion.
   */
  public unsaveMessage(messageId: string): Observable<void> {
    return this.delete(`${this.messageEndpoint}/${messageId}/save`);
  }

  /**
   * Method listSaved
   * @method listSaved
   *
   * @description
   * Lists the acting member's saved messages across one organization — the
   * required `organization` filter is what scopes them.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {ListSavedMessagesQuery} query - Organization scope and paging.
   *
   * @returns {Observable<HydraCollection<MessageOutput>>} One page of saved messages.
   */
  public listSaved(query: ListSavedMessagesQuery): Observable<HydraCollection<MessageOutput>> {
    return this.getCollection<MessageOutput>('/api/saved-messages', {
      page: query.page,
      itemsPerPage: query.itemsPerPage,
      params: { organization: query.organization },
    });
  }

  /**
   * Method postReply
   * @method postReply
   *
   * @description
   * Posts a threaded reply under a parent message. Threading is single-level:
   * replying to a reply is refused by the server. Requires the same write
   * access as posting in the conversation.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} parentMessageId - Bare UUID of the **root** message.
   * @param {PostReplyInput} input - Reply body.
   *
   * @returns {Observable<MessageOutput>} The created reply.
   */
  public postReply(parentMessageId: string, input: PostReplyInput): Observable<MessageOutput> {
    return this.post<PostReplyInput, MessageOutput>(
      `${this.messageEndpoint}/${parentMessageId}/replies`,
      input,
    );
  }

  /**
   * Method listReplies
   * @method listReplies
   *
   * @description
   * Lists a message's threaded replies, oldest first. The conversation's own
   * message list excludes replies, so this is the only way to read them.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} parentMessageId - Bare UUID of the root message.
   * @param {RequestOptions} [options] - Paging; `itemsPerPage` is clamped to 1–100.
   *
   * @returns {Observable<HydraCollection<MessageOutput>>} One page of replies.
   */
  public listReplies(
    parentMessageId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<MessageOutput>> {
    return this.getCollection<MessageOutput>(
      `${this.messageEndpoint}/${parentMessageId}/replies`,
      options,
    );
  }

  //#endregion
}
