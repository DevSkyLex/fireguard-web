/**
 * Interface ConversationActivityQuery
 * @interface ConversationActivityQuery
 *
 * @description
 * Filter for `GET /api/conversations/{conversationId}/activity`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ConversationActivityQuery {
  /** Number of daily buckets, 1–366. Defaults to 26 server-side. */
  readonly buckets?: number;
}
