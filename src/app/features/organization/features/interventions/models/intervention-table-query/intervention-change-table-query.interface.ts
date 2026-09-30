import type { InterventionChangeStatus } from '../intervention-change/intervention-change-status.type';

/**
 * Interface InterventionChangeTableQuery
 * @interface InterventionChangeTableQuery
 *
 * @description
 * Controlled criteria for the Changes history table.
 *
 * @since 6.2.0
 */
export interface InterventionChangeTableQuery {
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
   * Property status
   * @readonly
   *
   * @description
   * Reports the current lifecycle status of this intervention change table.
   *
   * @access public
   *
   * @type {InterventionChangeStatus | null}
   */
  readonly status: InterventionChangeStatus | null;
}
