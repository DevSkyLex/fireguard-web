import type { MessageReferenceInput } from './message-reference-input.interface';

/**
 * Interface EditMessageInput
 * @interface EditMessageInput
 *
 * @description
 * Merge payload for `PATCH /api/messages/{id}`, author-only.
 *
 * `body` is always required, even when only the references change. For
 * `references`, omitting the key keeps the existing list while an empty array
 * clears it — the two are not interchangeable.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface EditMessageInput {
  readonly body: string;
  /** Omit to keep the current references; pass `[]` to clear them. */
  readonly references?: readonly MessageReferenceInput[];
}
