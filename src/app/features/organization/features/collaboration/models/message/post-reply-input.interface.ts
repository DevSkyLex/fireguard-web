/**
 * Interface PostReplyInput
 * @interface PostReplyInput
 *
 * @description
 * Payload for `POST /api/messages/{id}/replies`. Replies carry no structured
 * references — the endpoint has no such field.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface PostReplyInput {
  readonly body: string;
}
