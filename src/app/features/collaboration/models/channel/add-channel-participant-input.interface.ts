/**
 * Interface AddChannelParticipantInput
 * @interface AddChannelParticipantInput
 *
 * @description
 * Payload for `POST /api/channels/{id}/participants`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AddChannelParticipantInput {
  /** Bare organization-member UUID — not an IRI. */
  readonly memberId: string;
  /** At most 50 characters. */
  readonly role?: string;
}
