import type { ConversationSubjectType } from './conversation-subject-type.type';

/**
 * Interface ListConversationsQuery
 * @interface ListConversationsQuery
 *
 * @description
 * Filters for `GET /api/conversations`.
 *
 * This endpoint never returns channels or direct conversations — those have
 * their own lists.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ListConversationsQuery {
  /** Organization IRI or bare UUID. Required. */
  readonly organization: string;
  readonly subjectType?: ConversationSubjectType;
  /** Bare subject id — this filter is not IRI-parsed and an IRI silently matches nothing. */
  readonly subjectId?: string;
  /** Presence-based: omit for archived and unarchived alike. */
  readonly isArchived?: boolean;
  readonly unreadOnly?: boolean;
  readonly page?: number;
  /** Clamped server-side to 1–100 despite what the OpenAPI document advertises. */
  readonly itemsPerPage?: number;
}
