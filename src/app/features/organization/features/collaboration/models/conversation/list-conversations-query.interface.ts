import type { ConversationSubjectType } from './conversation-subject-type.type';

/**
 * Interface ListConversationsQuery
 * @interface ListConversationsQuery
 *
 * @description
 * Filters for `GET /api/conversations`.
 * This endpoint never returns channels or direct conversations — those have
 * their own lists.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ListConversationsQuery {
  /**
   * Property organization
   * @readonly
   *
   * @description
   * Organization IRI or bare UUID. Required.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organization: string;

  /**
   * Property subjectType
   * @readonly
   *
   * @description
   * Identifies the subject category for this list conversations.
   *
   * @access public
   *
   * @type {ConversationSubjectType}
   */
  readonly subjectType?: ConversationSubjectType;

  /**
   * Property subjectId
   * @readonly
   *
   * @description
   * Bare subject id — this filter is not IRI-parsed and an IRI silently matches nothing.
   *
   * @access public
   *
   * @type {string}
   */
  readonly subjectId?: string;

  /**
   * Property isArchived
   * @readonly
   *
   * @description
   * Presence-based: omit for archived and unarchived alike.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly isArchived?: boolean;

  /**
   * Property unreadOnly
   * @readonly
   *
   * @description
   * Limits the result to conversations with unread messages when true.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly unreadOnly?: boolean;

  /**
   * Property page
   * @readonly
   *
   * @description
   * Selects the page of list conversations results to request.
   *
   * @access public
   *
   * @type {number}
   */
  readonly page?: number;

  /**
   * Property itemsPerPage
   * @readonly
   *
   * @description
   * Clamped server-side to 1–100 despite what the OpenAPI document advertises.
   *
   * @access public
   *
   * @type {number}
   */
  readonly itemsPerPage?: number;
}
