import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  ConversationOutput,
  GetOrCreateConversationInput,
  GetOrCreateDirectConversationInput,
  ListConversationsQuery,
  ListDirectConversationsQuery,
  MarkConversationReadInput,
  MessagingSubscriptionOutput,
} from '@features/organization/features/collaboration/models';

/**
 * Service ConversationService
 * @class ConversationService
 * @extends {HydraApiService}
 *
 * @description
 * Transport boundary for conversations: subject threads, direct
 * conversations, read markers, favorites and the Mercure subscription token.
 * The API also exposes archive, activity buckets, attachments and links, but
 * no UI consumes them — their transport methods were pruned rather than left
 * dead (2026-08-20).
 *
 * `GET /api/conversations` never returns channels or direct conversations —
 * both have their own lists — so callers assembling a full sidebar must query
 * all three.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class ConversationService extends HydraApiService {
  //#region Properties
  /**
   * Property endpoint
   * @readonly
   *
   * @description
   * Conversation collection endpoint.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private readonly endpoint: string = '/api/conversations';
  //#endregion

  //#region Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Lists an organization's subject threads.
   *
   * Presence-based filters are only sent when set: `buildParams` drops
   * `undefined`, and passing a falsy empty value would narrow the result
   * instead of widening it.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {ListConversationsQuery} query - Scope, filters and paging.
   *
   * @returns {Observable<HydraCollection<ConversationOutput>>} The matching conversations.
   */
  public list(query: ListConversationsQuery): Observable<HydraCollection<ConversationOutput>> {
    return this.getCollection<ConversationOutput>(this.endpoint, {
      page: query.page,
      itemsPerPage: query.itemsPerPage,
      params: {
        organization: query.organization,
        ...(query.subjectType === undefined ? {} : { subjectType: query.subjectType }),
        ...(query.subjectId === undefined ? {} : { subjectId: query.subjectId }),
        ...(query.isArchived === undefined ? {} : { isArchived: query.isArchived }),
        ...(query.unreadOnly === undefined ? {} : { unreadOnly: query.unreadOnly }),
      },
    });
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Reads one conversation. This is the only read that resolves
   * `subjectLabel`, and along with the list the only one reporting a real
   * `unreadCount`.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} conversationId - Bare conversation UUID.
   *
   * @returns {Observable<ConversationOutput>} The conversation.
   */
  public get(conversationId: string): Observable<ConversationOutput> {
    return this.getOne<ConversationOutput>(`${this.endpoint}/${conversationId}`);
  }

  /**
   * Method openSubjectThread
   * @method openSubjectThread
   *
   * @description
   * Opens the thread attached to a record, creating it on first use.
   *
   * Idempotent, and answers `201` in both cases — the status does not tell you
   * whether anything was created.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {GetOrCreateConversationInput} input - Organization, subject type and subject.
   *
   * @returns {Observable<ConversationOutput>} The existing or created thread.
   */
  public openSubjectThread(input: GetOrCreateConversationInput): Observable<ConversationOutput> {
    return this.post<GetOrCreateConversationInput, ConversationOutput>(this.endpoint, input);
  }

  /**
   * Method markRead
   * @method markRead
   *
   * @description
   * Moves the acting member's read marker.
   *
   * The response is the snapshot from *before* the write, so its `unreadCount`
   * is stale by construction — patch the local row to zero instead of merging.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} conversationId - Bare conversation UUID.
   * @param {MarkConversationReadInput} [input] - Optional last-read message.
   *
   * @returns {Observable<ConversationOutput>} The pre-write snapshot.
   */
  public markRead(
    conversationId: string,
    input?: MarkConversationReadInput,
  ): Observable<ConversationOutput> {
    return this.patch<MarkConversationReadInput, ConversationOutput>(
      `${this.endpoint}/${conversationId}/read`,
      input ?? {},
    );
  }

  /**
   * Method favorite
   * @method favorite
   *
   * @description
   * Favorites a conversation or channel. Idempotent, `200`, no request body.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} conversationId - Bare conversation UUID.
   *
   * @returns {Observable<ConversationOutput>} The conversation, `isFavorite` true but `unreadCount` fabricated.
   */
  public favorite(conversationId: string): Observable<ConversationOutput> {
    return this.postAction<ConversationOutput>(`${this.endpoint}/${conversationId}/favorite`);
  }

  /**
   * Method unfavorite
   * @method unfavorite
   *
   * @description
   * Removes the acting member's favorite. Idempotent, `204`, forgiving of an
   * already-absent favorite.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} conversationId - Bare conversation UUID.
   *
   * @returns {Observable<void>} Completion.
   */
  public unfavorite(conversationId: string): Observable<void> {
    return this.delete(`${this.endpoint}/${conversationId}/favorite`);
  }

  /**
   * Method getSubscription
   * @method getSubscription
   *
   * @description
   * Mints a Mercure subscriber token scoped to this one conversation's private
   * topic.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} conversationId - Bare conversation UUID.
   *
   * @returns {Observable<MessagingSubscriptionOutput>} Topic and token.
   */
  public getSubscription(conversationId: string): Observable<MessagingSubscriptionOutput> {
    return this.getOne<MessagingSubscriptionOutput>(
      `${this.endpoint}/${conversationId}/subscription`,
    );
  }

  /**
   * Method openDirectConversation
   * @method openDirectConversation
   *
   * @description
   * Opens the 1-to-1 conversation with another member, creating it on first
   * use. Answers `200`, not `201`, in both cases.
   *
   * The response carries no `counterpartMember`, so a caller maintaining a
   * list must reload it rather than insert this row — it would render
   * unlabeled.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {GetOrCreateDirectConversationInput} input - Organization and target member.
   *
   * @returns {Observable<ConversationOutput>} The existing or created conversation.
   */
  public openDirectConversation(
    input: GetOrCreateDirectConversationInput,
  ): Observable<ConversationOutput> {
    return this.post<GetOrCreateDirectConversationInput, ConversationOutput>(
      '/api/direct-conversations',
      input,
    );
  }

  /**
   * Method listDirectConversations
   * @method listDirectConversations
   *
   * @description
   * Lists the acting member's direct conversations, most recently active
   * first. The only source of `counterpartMember`.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {ListDirectConversationsQuery} query - Scope, filter and paging.
   *
   * @returns {Observable<HydraCollection<ConversationOutput>>} The member's direct conversations.
   */
  public listDirectConversations(
    query: ListDirectConversationsQuery,
  ): Observable<HydraCollection<ConversationOutput>> {
    return this.getCollection<ConversationOutput>('/api/direct-conversations', {
      page: query.page,
      itemsPerPage: query.itemsPerPage,
      params: {
        organization: query.organization,
        ...(query.isArchived === undefined ? {} : { isArchived: query.isArchived }),
      },
    });
  }
  //#endregion
}
