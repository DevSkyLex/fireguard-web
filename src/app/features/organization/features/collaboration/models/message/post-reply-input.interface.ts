/**
 * Interface PostReplyInput
 * @interface PostReplyInput
 *
 * @description
 * `POST /api/messages/{id}/replies` request body. `{id}` is the **parent**
 * message; threading is single-level, so replying to a reply is refused by
 * the server.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface PostReplyInput {
  /** The reply body, sanitized server-side before persistence. */
  readonly body: string;
}
