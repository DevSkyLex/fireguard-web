import type { MessageReferenceInput } from './message-reference-input.interface';

/**
 * Interface PostMessageInput
 * @interface PostMessageInput
 *
 * @description
 * Payload for `POST /api/conversations/{conversationId}/messages`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface PostMessageInput {
  /** Rich text; sanitized server-side. */
  readonly body: string;
  /** At most five entries. */
  readonly references?: readonly MessageReferenceInput[];
}
