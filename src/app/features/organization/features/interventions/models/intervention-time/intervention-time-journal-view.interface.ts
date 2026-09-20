import type { InterventionTimeDraft } from './intervention-time-draft.interface';
import type { InterventionTimeEntryView } from './intervention-time-entry-view.interface';

/**
 * Interface InterventionTimeJournalView
 * @interface InterventionTimeJournalView
 *
 * @description
 * Authorized server journal overlaid with local intentions without modifying the snapshot.
 *
 * @since 1.0.0
 */
export interface InterventionTimeJournalView {
  /**
   * Property entries
   * @readonly
   *
   * @description
   * Rows including pending, conflicted or failed local edits.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {readonly InterventionTimeEntryView[]}
   */
  readonly entries: readonly InterventionTimeEntryView[];

  /**
   * Property draft
   * @readonly
   *
   * @description
   * Unsubmitted text retained on this device.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InterventionTimeDraft | null}
   */
  readonly draft: InterventionTimeDraft | null;

  /**
   * Property offline
   * @readonly
   *
   * @description
   * Whether the server could not be consulted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly offline: boolean;

  /**
   * Property historyUnavailable
   * @readonly
   *
   * @description
   * No authorized journal has been cached yet.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly historyUnavailable: boolean;
}
