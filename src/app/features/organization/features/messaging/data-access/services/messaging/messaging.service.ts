import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService, type RequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type { MercureSubscriptionOutput } from '@core/mercure';
import type {
  ConversationOutput,
  PresenceOutput,
  MessageOutput,
  SendMessageInput,
} from '@features/organization/features/messaging/models';

/**
 * Service MessagingService
 * @class MessagingService
 * @extends {HydraApiService}
 *
 * @description
 * Transport for conversations and their messages.
 *
 * The messaging endpoints are **not** organization-scoped in their path — the
 * backend derives the organization from the session. Do not prefix them with
 * `/organizations/{id}`; that path does not exist.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class MessagingService extends HydraApiService {
  //#region Public Methods
  /**
   * Method listConversations
   * @method listConversations
   *
   * @description
   * Lists the conversations the current member can see — channels and direct
   * conversations together.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {RequestOptions} [options] - Optional pagination and filters.
   *
   * @return {Observable<HydraCollection<ConversationOutput>>} The conversation collection.
   */
  public listConversations(
    options?: RequestOptions,
  ): Observable<HydraCollection<ConversationOutput>> {
    return this.getCollection<ConversationOutput>('/api/conversations', options);
  }

  /**
   * Method getConversation
   * @method getConversation
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} conversationId - The conversation to read.
   *
   * @return {Observable<ConversationOutput>} The conversation.
   */
  public getConversation(conversationId: string): Observable<ConversationOutput> {
    return this.getOne<ConversationOutput>(`/api/conversations/${conversationId}`);
  }

  /**
   * Method listMessages
   * @method listMessages
   *
   * @description
   * Lists a conversation's messages, newest-first as the API orders them.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} conversationId - The conversation to read.
   * @param {RequestOptions} [options] - Optional pagination.
   *
   * @return {Observable<HydraCollection<MessageOutput>>} The message collection.
   */
  public listMessages(
    conversationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<MessageOutput>> {
    return this.getCollection<MessageOutput>(
      `/api/conversations/${conversationId}/messages`,
      options,
    );
  }

  /**
   * Method sendMessage
   * @method sendMessage
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} conversationId - The conversation to post into.
   * @param {SendMessageInput} input - The message body and mentions.
   *
   * @return {Observable<MessageOutput>} The created message.
   */
  public sendMessage(conversationId: string, input: SendMessageInput): Observable<MessageOutput> {
    return this.post<SendMessageInput, MessageOutput>(
      `/api/conversations/${conversationId}/messages`,
      input,
    );
  }

  /**
   * Method getSubscription
   * @method getSubscription
   *
   * @description
   * Issues a short-lived Mercure token and topic for one conversation.
   *
   * The token expires quickly, so callers must re-request it on every
   * reconnection attempt rather than replaying the first one — which is why
   * `resilientMercureStream` takes a factory.
   *
   * @access public
   * @since 2.0.0
   *
   * @param {string} conversationId - The conversation to subscribe to.
   *
   * @return {Observable<MercureSubscriptionOutput>} The topic and token.
   */
  public getSubscription(conversationId: string): Observable<MercureSubscriptionOutput> {
    return this.getOne<MercureSubscriptionOutput>(
      `/api/conversations/${conversationId}/subscription`,
    );
  }

  /**
   * Method addReaction
   * @method addReaction
   *
   * @access public
   * @since 2.0.0
   *
   * @param {string} messageId - The message to react to.
   * @param {string} emoji - The emoji to add.
   *
   * @return {Observable<MessageOutput>} The updated message.
   */
  public addReaction(messageId: string, emoji: string): Observable<MessageOutput> {
    return this.post<{ emoji: string }, MessageOutput>(`/api/messages/${messageId}/reactions`, {
      emoji,
    });
  }

  /**
   * Method removeReaction
   * @method removeReaction
   *
   * @description
   * Removes the current member's reaction. The emoji is path-encoded because
   * it is not URL-safe.
   *
   * @access public
   * @since 2.0.0
   *
   * @param {string} messageId - The reacted message.
   * @param {string} emoji - The emoji to remove.
   *
   * @return {Observable<void>} Completion.
   */
  public removeReaction(messageId: string, emoji: string): Observable<void> {
    return this.delete(`/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
  }

  /**
   * Method setPinned
   * @method setPinned
   *
   * @description
   * Pins or unpins a message for everyone in the conversation.
   *
   * @access public
   * @since 3.0.0
   *
   * @param {string} messageId - The message to pin.
   * @param {boolean} pinned - Target state.
   *
   * @return {Observable<MessageOutput | void>} The updated message, or nothing when unpinning.
   */
  public setPinned(messageId: string, pinned: boolean): Observable<MessageOutput | void> {
    return pinned
      ? this.post<Record<string, never>, MessageOutput>(`/api/messages/${messageId}/pin`, {})
      : this.delete(`/api/messages/${messageId}/pin`);
  }

  /**
   * Method setSaved
   * @method setSaved
   *
   * @description
   * Adds or removes a message from the current member's saved list. Unlike a
   * pin, this is personal and invisible to everyone else.
   *
   * @access public
   * @since 3.0.0
   *
   * @param {string} messageId - The message to save.
   * @param {boolean} saved - Target state.
   *
   * @return {Observable<MessageOutput | void>} The updated message, or nothing when unsaving.
   */
  public setSaved(messageId: string, saved: boolean): Observable<MessageOutput | void> {
    return saved
      ? this.post<Record<string, never>, MessageOutput>(`/api/messages/${messageId}/save`, {})
      : this.delete(`/api/messages/${messageId}/save`);
  }

  /**
   * Method getPresence
   * @method getPresence
   *
   * @description
   * Reads presence for specific members. There is deliberately no "list all
   * online members" mode on the API, so callers must pass the ids they care
   * about — capped at 100 by the backend.
   *
   * @access public
   * @since 3.0.0
   *
   * @param {string} organization - The organization IRI.
   * @param {readonly string[]} memberIds - Members to check.
   *
   * @return {Observable<HydraCollection<PresenceOutput>>} Their presence.
   */
  public getPresence(
    organization: string,
    memberIds: readonly string[],
  ): Observable<HydraCollection<PresenceOutput>> {
    return this.getCollection<PresenceOutput>('/api/presence', {
      params: { organization, memberIds: memberIds.slice(0, 100).join(',') },
    });
  }

  /**
   * Method pingPresence
   * @method pingPresence
   *
   * @description
   * Marks the current member as online. The backend expires presence on its
   * own, so this has to be repeated while the workspace is open.
   *
   * @access public
   * @since 3.0.0
   *
   * @return {Observable<PresenceOutput>} The refreshed presence.
   */
  public pingPresence(): Observable<PresenceOutput> {
    return this.post<Record<string, never>, PresenceOutput>('/api/presence/ping', {});
  }

  /**
   * Method markRead
   * @method markRead
   *
   * @description
   * Clears a conversation's unread count for the current member.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} conversationId - The conversation to mark read.
   *
   * @return {Observable<ConversationOutput>} The updated conversation.
   */
  public markRead(conversationId: string): Observable<ConversationOutput> {
    return this.post<Record<string, never>, ConversationOutput>(
      `/api/conversations/${conversationId}/read`,
      {},
    );
  }
  //#endregion
}
