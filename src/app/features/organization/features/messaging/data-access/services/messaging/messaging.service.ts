import { Injectable } from '@angular/core';
import { catchError, type Observable } from 'rxjs';
import { HydraApiService, type RequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type { MercureSubscriptionOutput } from '@core/mercure';
import type {
  ChannelOutput,
  ChannelParticipant,
  ConversationActivityBucket,
  ConversationLinkOutput,
  ConversationOutput,
  CreateChannelInput,
  CreateDirectConversationInput,
  MessageAttachment,
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
   * Lists the RECORD-BOUND conversations the current member can see.
   *
   * Channels and direct conversations are **never** returned here — the
   * backend excludes both by design. Channels come from {@link listChannels};
   * direct conversations have no list endpoint at all (see FEATURE.md).
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The active organization identifier. The
   * endpoint is unscoped in its PATH but the backend REQUIRES the
   * organization as an IRI filter (400 without it) — a member can belong to
   * several workspaces and the list must never mix them.
   * @param {RequestOptions} [options] - Optional pagination and filters.
   *
   * @return {Observable<HydraCollection<ConversationOutput>>} The conversation collection.
   */
  public listConversations(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<ConversationOutput>> {
    return this.getCollection<ConversationOutput>('/api/conversations', {
      ...options,
      params: {
        ...options?.params,
        organization: `/api/organizations/${organizationId}`,
      },
    });
  }

  /**
   * Method listChannels
   * @method listChannels
   *
   * @description
   * Lists the channels the acting member participates in.
   *
   * This is the ONLY endpoint that returns channels: `/api/conversations`
   * deliberately excludes `channel` and `direct` conversations (a privacy
   * invariant on the backend), so the sidebar's channel sections are fed from
   * here and nowhere else.
   *
   * @access public
   * @since 5.1.0
   *
   * @param {string} organizationId - The active organization; sent as an IRI,
   * the endpoint being unscoped in its path (400 without it).
   * @param {RequestOptions} [options] - Optional pagination and `isArchived`.
   *
   * @return {Observable<HydraCollection<ChannelOutput>>} The channel collection.
   */
  public listChannels(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<ChannelOutput>> {
    return this.getCollection<ChannelOutput>('/api/channels', {
      ...options,
      params: {
        ...options?.params,
        organization: `/api/organizations/${organizationId}`,
      },
    });
  }

  /**
   * Method listDirectConversations
   * @method listDirectConversations
   *
   * @description
   * Lists the direct conversations the acting member takes part in.
   *
   * Counterpart of {@link listChannels}: `/api/conversations` excludes direct
   * threads by the same privacy invariant, so the sidebar's Direct messages
   * section is fed from here and nowhere else. Rows already come back in the
   * `ConversationOutput` shape — unlike channels, no adapter is needed — and
   * carry `counterpartMember` so the row can be labelled.
   *
   * @access public
   * @since 5.2.0
   *
   * @param {string} organizationId - The active organization; sent as an IRI,
   * the endpoint being unscoped in its path (400 without it).
   * @param {RequestOptions} [options] - Optional pagination and `isArchived`.
   *
   * @return {Observable<HydraCollection<ConversationOutput>>} The direct-conversation collection.
   */
  public listDirectConversations(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<ConversationOutput>> {
    return this.getCollection<ConversationOutput>('/api/direct-conversations', {
      ...options,
      params: {
        ...options?.params,
        organization: `/api/organizations/${organizationId}`,
      },
    });
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
   * Method createChannel
   * @method createChannel
   *
   * @description
   * Opens a new channel in the workspace. The creator joins it, so the channel
   * shows up in their own list on the next read.
   *
   * @access public
   * @since 5.0.0
   *
   * @param {string} organizationId - The owning organization; sent as an IRI,
   * the endpoint being unscoped in its path.
   * @param {string} name - Channel name; the backend rejects under 2 or over
   * 80 characters.
   *
   * @return {Observable<ChannelOutput>} The created channel — a `ChannelOutput`,
   * **not** a `ConversationOutput`: the shapes differ, so reload the inventory
   * instead of folding this into the conversation list.
   */
  public createChannel(organizationId: string, name: string): Observable<ChannelOutput> {
    return this.post<CreateChannelInput, ChannelOutput>('/api/channels', {
      organization: `/api/organizations/${organizationId}`,
      name,
    });
  }

  /**
   * Method openDirectConversation
   * @method openDirectConversation
   *
   * @description
   * Get-or-create: addressing the same member twice returns the existing
   * conversation instead of a duplicate, so callers may treat it as "open".
   *
   * @access public
   * @since 5.0.0
   *
   * @param {string} organizationId - The owning organization.
   * @param {string} memberId - The addressed **organization member** id, not a
   * user id.
   *
   * @return {Observable<ConversationOutput>} The existing or freshly created conversation.
   */
  public openDirectConversation(
    organizationId: string,
    memberId: string,
  ): Observable<ConversationOutput> {
    return this.post<CreateDirectConversationInput, ConversationOutput>(
      '/api/direct-conversations',
      { organization: `/api/organizations/${organizationId}`, memberId },
    );
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
   * @param {SendMessageInput} input - The message body; mentions are parsed
   * server-side out of it.
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
   * Method listAttachments
   * @method listAttachments
   *
   * @description
   * Lists a conversation's attachments, so the thread can show file metadata
   * against the messages that carry them.
   *
   * @access public
   * @since 4.0.0
   *
   * @param {string} conversationId - The conversation.
   *
   * @return {Observable<HydraCollection<MessageAttachment>>} The attachments.
   */
  public listAttachments(conversationId: string): Observable<HydraCollection<MessageAttachment>> {
    return this.getCollection<MessageAttachment>(
      `/api/conversations/${conversationId}/attachments`,
    );
  }

  /**
   * Method listPinnedMessages
   * @method listPinnedMessages
   *
   * @description
   * The conversation's pinned messages, most recently pinned first — the
   * details panel's Pins tab. Distinct from the per-message `pinnedAt` marker
   * the thread already renders: a pin made before the loaded window would
   * otherwise be unreachable.
   *
   * @access public
   * @since 4.1.0
   *
   * @param {string} conversationId - The conversation.
   *
   * @return {Observable<HydraCollection<MessageOutput>>} The pinned messages.
   */
  public listPinnedMessages(conversationId: string): Observable<HydraCollection<MessageOutput>> {
    return this.getCollection<MessageOutput>(
      `/api/conversations/${conversationId}/pinned-messages`,
    );
  }

  /**
   * Method listConversationLinks
   * @method listConversationLinks
   *
   * @description
   * The URLs shared in a conversation, most recently posted first — the
   * details panel's Links tab. Extracted server-side from the message bodies,
   * so this covers the whole thread, not just the page of history a client
   * happens to hold.
   *
   * @access public
   * @since 6.0.0
   *
   * @param {string} conversationId - The conversation.
   * @param {number} [page] - 1-based page to read; the endpoint pages by 30.
   *
   * @return {Observable<HydraCollection<ConversationLinkOutput>>} The links page.
   */
  public listConversationLinks(
    conversationId: string,
    page: number = 1,
  ): Observable<HydraCollection<ConversationLinkOutput>> {
    return this.getCollection<ConversationLinkOutput>(
      `/api/conversations/${conversationId}/links`,
      { params: { page: String(page) } },
    );
  }

  /**
   * Method getConversationActivity
   * @method getConversationActivity
   *
   * @description
   * Daily message counts for the conversation, oldest first and ending today
   * (UTC). The backend zero-fills, so the answer always holds exactly
   * `buckets` rows — the heatmap never has to reconstruct missing days.
   *
   * Not paginated: the list is small and fixed-size by construction.
   *
   * @access public
   * @since 6.0.0
   *
   * @param {string} conversationId - The conversation.
   * @param {number} [buckets] - Trailing days to return; capped at 366 by the backend.
   *
   * @return {Observable<HydraCollection<ConversationActivityBucket>>} The buckets.
   */
  public getConversationActivity(
    conversationId: string,
    buckets: number = 26,
  ): Observable<HydraCollection<ConversationActivityBucket>> {
    return this.getCollection<ConversationActivityBucket>(
      `/api/conversations/${conversationId}/activity`,
      { params: { buckets: String(buckets) } },
    );
  }

  /**
   * Method listParticipants
   * @method listParticipants
   *
   * @description
   * A channel's participants. Channel-only by design: a direct conversation
   * has no participant collection on the API, so callers must not ask for one.
   *
   * The rows carry `memberId` and nothing else identifying — names and avatars
   * are resolved through the organization member directory.
   *
   * @access public
   * @since 4.1.0
   *
   * @param {string} channelId - The channel (a channel id IS a conversation id).
   *
   * @return {Observable<HydraCollection<ChannelParticipant>>} The participants.
   */
  public listParticipants(channelId: string): Observable<HydraCollection<ChannelParticipant>> {
    return this.getCollection<ChannelParticipant>(`/api/channels/${channelId}/participants`);
  }

  /**
   * Method uploadAttachment
   * @method uploadAttachment
   *
   * @description
   * Uploads a file to a message.
   *
   * Goes through `http` directly with the JSON content-type dropped, so the
   * browser sets the multipart boundary — the same escape hatch the avatar
   * upload uses. `HydraApiService.post` would force `application/ld+json` and
   * break the upload.
   *
   * @access public
   * @since 4.0.0
   *
   * @param {string} messageId - The message to attach to.
   * @param {File} file - The file to upload.
   *
   * @return {Observable<MessageAttachment>} The stored attachment.
   */
  public uploadAttachment(messageId: string, file: File): Observable<MessageAttachment> {
    const body = new FormData();
    body.set('file', file, file.name);

    return this.http
      .post<MessageAttachment>(this.buildUrl(`/api/messages/${messageId}/attachments`), body, {
        headers: this.defaultHeaders.delete('Content-Type'),
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
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
   * Method listReplies
   * @method listReplies
   *
   * @description
   * Lists the replies hanging off one message.
   *
   * @access public
   * @since 4.0.0
   *
   * @param {string} messageId - The parent message.
   *
   * @return {Observable<HydraCollection<MessageOutput>>} The replies.
   */
  public listReplies(messageId: string): Observable<HydraCollection<MessageOutput>> {
    return this.getCollection<MessageOutput>(`/api/messages/${messageId}/replies`);
  }

  /**
   * Method reply
   * @method reply
   *
   * @description
   * Posts a reply to a message.
   *
   * @access public
   * @since 4.0.0
   *
   * @param {string} messageId - The parent message.
   * @param {SendMessageInput} input - The reply body.
   *
   * @return {Observable<MessageOutput>} The created reply.
   */
  public reply(messageId: string, input: SendMessageInput): Observable<MessageOutput> {
    return this.post<SendMessageInput, MessageOutput>(`/api/messages/${messageId}/replies`, input);
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
  /**
   * Method editMessage
   * @method editMessage
   *
   * @description
   * Rewrites a message's body. The backend accepts this from the **author
   * only** — anyone else gets a 403, whatever their permissions.
   *
   * @access public
   * @since 5.0.0
   *
   * @param {string} messageId - The message to rewrite.
   * @param {string} body - The new body; 40 000 characters at most.
   *
   * @return {Observable<MessageOutput>} The updated message, carrying `editedAt`.
   */
  public editMessage(messageId: string, body: string): Observable<MessageOutput> {
    return this.patch<{ body: string }, MessageOutput>(`/api/messages/${messageId}`, { body });
  }

  /**
   * Method deleteMessage
   * @method deleteMessage
   *
   * @description
   * Soft-deletes a message: the row survives with `isDeleted`, so replies and
   * reactions keep their anchor. Allowed to the author, or to a member holding
   * `messaging.manage`.
   *
   * @access public
   * @since 5.0.0
   *
   * @param {string} messageId - The message to delete.
   *
   * @return {Observable<void>} Completion.
   */
  public deleteMessage(messageId: string): Observable<void> {
    return this.delete(`/api/messages/${messageId}`);
  }

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
   * @param {string} organizationId - The organization the member is present in;
   * required by the backend as an IRI (422 without it).
   *
   * @return {Observable<PresenceOutput>} The refreshed presence.
   */
  public pingPresence(organizationId: string): Observable<PresenceOutput> {
    return this.post<{ organization: string }, PresenceOutput>('/api/presence/ping', {
      organization: `/api/organizations/${organizationId}`,
    });
  }

  /**
   * Method markRead
   * @method markRead
   *
   * @description
   * Clears a conversation's unread count for the current member.
   *
   * PATCH, not POST: the backend declares the operation as a `Patch`, so a POST
   * answered 405 and the badge silently came back on every reload.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} conversationId - The conversation to mark read.
   *
   * @return {Observable<ConversationOutput>} The updated conversation.
   */
  public markRead(conversationId: string): Observable<ConversationOutput> {
    return this.patch<Record<string, never>, ConversationOutput>(
      `/api/conversations/${conversationId}/read`,
      {},
    );
  }

  /**
   * Method setFavorite
   * @method setFavorite
   *
   * @description
   * Favorites or unfavorites a conversation for the current member. Sidebar
   * ordering only — the backend never consults it for access, and both
   * directions are idempotent.
   *
   * @access public
   * @since 3.1.0
   *
   * @param {string} conversationId - The conversation to (un)favorite.
   * @param {boolean} favorite - Target state.
   *
   * @return {Observable<ConversationOutput | void>} The updated conversation, or nothing when unfavoriting.
   */
  public setFavorite(
    conversationId: string,
    favorite: boolean,
  ): Observable<ConversationOutput | void> {
    return favorite
      ? this.post<Record<string, never>, ConversationOutput>(
          `/api/conversations/${conversationId}/favorite`,
          {},
        )
      : this.delete(`/api/conversations/${conversationId}/favorite`);
  }

  /**
   * Method listSavedMessages
   * @method listSavedMessages
   *
   * @description
   * The current member's saved messages across the whole organization, most
   * recently saved first. The backend requires the organization as an IRI
   * filter and pages by 30.
   *
   * @access public
   * @since 3.1.0
   *
   * @param {string} organizationId - The active organization identifier.
   * @param {number} page - 1-based page to read.
   *
   * @return {Observable<HydraCollection<MessageOutput>>} The saved messages page.
   */
  public listSavedMessages(
    organizationId: string,
    page: number = 1,
  ): Observable<HydraCollection<MessageOutput>> {
    return this.getCollection<MessageOutput>('/api/saved-messages', {
      params: { organization: `/api/organizations/${organizationId}`, page: String(page) },
    });
  }
  //#endregion
}
