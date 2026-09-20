import type { HydraItem } from '@core/api/models';
import type { InterventionTimeEntry } from './intervention-time-entry.interface';

/**
 * Interface InterventionTimeJournalOutput
 * @interface InterventionTimeJournalOutput
 *
 * @description
 * Authorized time journal; non-managers receive only their own entries.
 *
 * @since 1.0.0
 */
export interface InterventionTimeJournalOutput extends HydraItem {
  /**
   * Property workItemId
   * @readonly
   *
   * @description
   * Journal task.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly workItemId: string;

  /**
   * Property entries
   * @readonly
   *
   * @description
   * Current versions and their audit history.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {readonly InterventionTimeEntry[]}
   */
  readonly entries: readonly InterventionTimeEntry[];
}
