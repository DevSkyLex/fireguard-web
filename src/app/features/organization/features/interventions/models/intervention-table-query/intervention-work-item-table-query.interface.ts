import type { InterventionWorkItemStatus } from '../intervention-work-item/intervention-work-item-status.type';

/**
 * Interface InterventionWorkItemTableQuery
 * @interface InterventionWorkItemTableQuery
 *
 * @description
 * Controlled server-side search, status, ordering and pagination for the Work table.
 *
 * @since 6.2.0
 */
export interface InterventionWorkItemTableQuery {
  /**
   * Property search
   * @readonly
   *
   * @description
   * Contains the text used to filter the linked-resource list.
   *
   * @access public
   *
   * @type {string}
   */
  readonly search: string;

  /**
   * Property statuses
   * @readonly
   *
   * @description
   * Selects the statuses variant used to interpret this intervention work item table.
   *
   * @access public
   *
   * @type {readonly InterventionWorkItemStatus[] | null}
   */
  readonly statuses: readonly InterventionWorkItemStatus[] | null;

  /**
   * Property page
   * @readonly
   *
   * @description
   * Selects the page of intervention work item table results to request.
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
   * Sets the maximum number of intervention work item table records requested on each page.
   *
   * @access public
   *
   * @type {number}
   */
  readonly itemsPerPage?: number;

  /**
   * Property prioritizeAssignee
   * @readonly
   *
   * @description
   * Filters the work-item list to the selected assignee.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly prioritizeAssignee?: string | null;
}
