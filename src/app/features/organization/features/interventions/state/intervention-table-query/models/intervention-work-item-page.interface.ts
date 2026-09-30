import type { InterventionWorkItemOutput } from '@features/organization/features/interventions/models';

/**
 * Interface InterventionWorkItemPage
 * @interface InterventionWorkItemPage
 *
 * @description
 * One evaluated page with its matching total and pagination, retained together during refreshes.
 *
 * @since 6.2.0
 */
export interface InterventionWorkItemPage {
  /**
   * Property items
   * @readonly
   *
   * @description
   * Contains the work items returned on this page.
   *
   * @access public
   *
   * @type {readonly InterventionWorkItemOutput[]}
   */
  readonly items: readonly InterventionWorkItemOutput[];

  /**
   * Property total
   * @readonly
   *
   * @description
   * Reports the total number of records matching this query.
   *
   * @access public
   *
   * @type {number}
   */
  readonly total: number;

  /**
   * Property page
   * @readonly
   *
   * @description
   * Selects the page of intervention work item page results to request.
   *
   * @access public
   *
   * @type {number}
   */
  readonly page: number;

  /**
   * Property itemsPerPage
   * @readonly
   *
   * @description
   * Sets the maximum number of intervention work item page records requested on each page.
   *
   * @access public
   *
   * @type {number}
   */
  readonly itemsPerPage: number;
}
