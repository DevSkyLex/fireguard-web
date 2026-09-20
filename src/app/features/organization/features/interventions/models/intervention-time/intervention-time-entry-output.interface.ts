import type { HydraItem } from '@core/api/models';
import type { InterventionTimeEntry } from './intervention-time-entry.interface';

/**
 * Interface InterventionTimeEntryOutput
 * @interface InterventionTimeEntryOutput
 *
 * @description
 * Result of an idempotent journal mutation.
 *
 * @since 1.0.0
 */
export interface InterventionTimeEntryOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable entry identifier.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property entry
   * @readonly
   *
   * @description
   * Current journal entry including history.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InterventionTimeEntry}
   */
  readonly entry: InterventionTimeEntry;
}
