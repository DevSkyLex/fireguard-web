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
  /**
   * Property organization
   * @readonly
   *
   * @description
   * Bare organization UUID (the server also accepts the IRI form).
   *
   * @access public
   *
   * @type {string}
   */
  readonly organization: string;

  /**
   * Property page
   * @readonly
   *
   * @description
   * Selects the page of list saved messages results to request.
   *
   * @access public
   *
   * @type {number}
   */
  readonly page?: number;

  /**
   * Property itemsPerPage
   * @readonly
   *
   * @description
   * Clamped server-side to 1..100.
   *
   * @access public
   *
   * @type {number}
   */
  readonly itemsPerPage?: number;
}
