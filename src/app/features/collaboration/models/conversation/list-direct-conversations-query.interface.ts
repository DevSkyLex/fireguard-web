/**
 * Interface ListDirectConversationsQuery
 * @interface ListDirectConversationsQuery
 *
 * @description
 * Filters for `GET /api/direct-conversations`, scoped to the acting member's
 * own conversations by an inner join on participation.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ListDirectConversationsQuery {
  readonly organization: string;
  readonly isArchived?: boolean;
  readonly page?: number;
  readonly itemsPerPage?: number;
}
