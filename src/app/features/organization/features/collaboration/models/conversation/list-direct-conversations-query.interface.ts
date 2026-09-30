/**
 * Interface ListDirectConversationsQuery
 * @interface ListDirectConversationsQuery
 *
 * @description
 * Filters for `GET /api/direct-conversations`, scoped to the acting member's
 * own conversations by an inner join on participation.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ListDirectConversationsQuery {
  /**
   * Property organization
   * @readonly
   *
   * @description
   * Provides the organization IRI used to scope this direct-conversation query.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organization: string;

  /**
   * Property isArchived
   * @readonly
   *
   * @description
   * Includes or excludes archived list direct conversations records according to this filter.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly isArchived?: boolean;

  /**
   * Property page
   * @readonly
   *
   * @description
   * Selects the page of list direct conversations results to request.
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
   * Sets the maximum number of list direct conversations records requested on each page.
   *
   * @access public
   *
   * @type {number}
   */
  readonly itemsPerPage?: number;
}
