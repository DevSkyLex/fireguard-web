import type { HydraItem } from '@core/api/models';
import type { InterventionTimeEntryVersion } from './intervention-time-entry-version.interface';

/**
 * Interface InterventionTimeEntryVersionsOutput
 * @interface InterventionTimeEntryVersionsOutput
 *
 * @description
 * Authorized immutable revisions in newest-first order with an exclusive continuation cursor.
 */
export interface InterventionTimeEntryVersionsOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Time entry whose revisions are returned.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property versions
   * @readonly
   *
   * @description
   * Bounded immutable revision page, newest first.
   *
   * @access public
   *
   * @type {readonly InterventionTimeEntryVersion[]}
   */
  readonly versions: readonly InterventionTimeEntryVersion[];

  /**
   * Property totalItems
   * @readonly
   *
   * @description
   * Exact complete durable revision count.
   *
   * @access public
   *
   * @type {number}
   */
  readonly totalItems: number;

  /**
   * Property itemsPerPage
   * @readonly
   *
   * @description
   * Maximum revisions returned per cursor page.
   *
   * @access public
   *
   * @type {number}
   */
  readonly itemsPerPage: number;

  /**
   * Property nextBeforeRevision
   * @readonly
   *
   * @description
   * Exclusive cursor for the next earlier page, or null at the oldest revision.
   *
   * @access public
   *
   * @type {number | null}
   */
  readonly nextBeforeRevision: number | null;
}
