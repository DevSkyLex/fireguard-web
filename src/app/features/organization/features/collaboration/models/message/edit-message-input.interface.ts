import type { MessageReferenceInput } from './message-reference-input.interface';

/**
 * Interface EditMessageInput
 * @interface EditMessageInput
 *
 * @description
 * `PATCH /api/messages/{id}` request body. Only the author may edit; the
 * server refuses anyone else with a `403` regardless of what the UI showed.
 *
 * `references` omitted leaves the existing references untouched; a non-`null`
 * value — including an empty list — replaces the whole set, mirroring how
 * `body` is always fully replaced rather than patched.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface EditMessageInput {
  /** The replacement body, sanitized server-side before persistence. */
  readonly body: string;
  /** Full replacement reference set, or omitted to leave references alone. */
  readonly references?: readonly MessageReferenceInput[];
}
