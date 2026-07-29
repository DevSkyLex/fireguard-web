/**
 * Interface GetOrCreateDirectConversationInput
 * @interface GetOrCreateDirectConversationInput
 *
 * @description
 * Payload for `POST /api/direct-conversations`. Idempotent, and answers `200`
 * rather than `201` whether or not anything was created.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface GetOrCreateDirectConversationInput {
  /** Organization IRI or bare UUID. */
  readonly organization: string;
  /** Bare organization-member UUID of the other participant — not an IRI. */
  readonly memberId: string;
}
