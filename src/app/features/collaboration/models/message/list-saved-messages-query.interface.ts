/**
 * Interface ListSavedMessagesQuery
 * @interface ListSavedMessagesQuery
 *
 * @description
 * Filters for `GET /api/saved-messages`, the acting member's bookmarks across
 * the whole organization.
 *
 * Unlike the other collections, `organization` must be the **IRI** form here;
 * a bare UUID is not accepted.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ListSavedMessagesQuery {
  /** Organization IRI — the bare UUID form is rejected by this endpoint. */
  readonly organization: string;
  readonly page?: number;
  /** Clamped server-side to 1–100. */
  readonly itemsPerPage?: number;
}
