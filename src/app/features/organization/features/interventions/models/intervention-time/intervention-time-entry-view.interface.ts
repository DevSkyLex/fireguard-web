import type { InterventionTimeEntry } from './intervention-time-entry.interface';

/**
 * Interface InterventionTimeEntryView
 * @interface InterventionTimeEntryView
 *
 * @description
 * Current entry plus explicit local synchronization uncertainty.
 *
 * @since 1.0.0
 */
export interface InterventionTimeEntryView extends InterventionTimeEntry {
  /**
   * Property syncStatus
   * @readonly
   *
   * @description
   * Local operation state, absent for authoritative entries.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {'pending' | 'conflict' | 'failed'}
   */
  readonly syncStatus?: 'pending' | 'conflict' | 'failed';
}
