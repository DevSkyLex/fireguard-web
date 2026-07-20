/**
 * What `POST /api/direct-conversations` accepts.
 *
 * The endpoint is get-or-create: addressing the same member twice returns the
 * existing conversation rather than a duplicate.
 *
 * @since 5.0.0
 */
export interface CreateDirectConversationInput {
  /** Organization IRI, e.g. `/api/organizations/{id}`. */
  readonly organization: string;

  /** The addressed member's UUID — an organization member id, not a user id. */
  readonly memberId: string;
}
