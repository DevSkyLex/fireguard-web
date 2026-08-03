/**
 * Interface OrganizationAttentionCounts
 *
 * @description
 * Exact intervention counts backing the dashboard attention panel. Each field is
 * a `totalItems` read from a `itemsPerPage=1` collection request, so the numbers
 * are organization-wide rather than derived from a page of results.
 *
 * @since 1.0.0
 */
export interface OrganizationAttentionCounts {
  //#region Properties
  /**
   * Property awaitingReview
   *
   * @description
   * Interventions in `submitted`, waiting for a reviewer to publish them or send
   * them back.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly awaitingReview: number;

  /**
   * Property changesRequested
   *
   * @description
   * Interventions a reviewer returned with a required note.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly changesRequested: number;

  /**
   * Property overdue
   *
   * @description
   * Interventions past their due date and still workable — the sum of the
   * `planned` and `in_progress` overdue counts. Terminal statuses are excluded by
   * construction: the collection filter takes a single status, so each workable
   * status is counted separately and summed here.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly overdue: number;
  //#endregion
}
