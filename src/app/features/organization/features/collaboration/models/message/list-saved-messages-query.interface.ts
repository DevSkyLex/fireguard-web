/**
 * Interface ListSavedMessagesQuery
 * @interface ListSavedMessagesQuery
 *
 * @description
 * `GET /api/saved-messages` query: the acting member's private bookmarks
 * across one whole organization. The `organization` filter is required —
 * without it the endpoint answers `400`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ListSavedMessagesQuery {
  /** Bare organization UUID (the server also accepts the IRI form). */
  readonly organization: string;
  readonly page?: number;
  /** Clamped server-side to 1..100. */
  readonly itemsPerPage?: number;
}
