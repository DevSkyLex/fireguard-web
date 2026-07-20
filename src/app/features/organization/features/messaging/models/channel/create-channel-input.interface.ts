/**
 * What `POST /api/channels` accepts.
 *
 * The organization is sent as an IRI, not a bare id: the endpoint is unscoped
 * in its path and a member can belong to several workspaces.
 *
 * @since 5.0.0
 */
export interface CreateChannelInput {
  /** Organization IRI, e.g. `/api/organizations/{id}`. */
  readonly organization: string;

  /** Channel name; the backend enforces 2 to 80 characters. */
  readonly name: string;
}
