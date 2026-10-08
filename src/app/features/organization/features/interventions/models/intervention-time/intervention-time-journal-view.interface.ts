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

  /**
   * Property page
   * @readonly
   *
   * @description
   * Requested journal page, including an unavailable offline page.
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
   * Bounded journal page size.
   *
   * @access public
   *
   * @type {number}
   */
  readonly itemsPerPage: number;

  /**
   * Property totalItems
   * @readonly
   *
   * @description
   * Saved entry count across pages; null when no authorized page metadata is available.
   *
   * @access public
   *
   * @type {number | null}
   */
  readonly totalItems: number | null;

  /**
   * Property nextPage
   * @readonly
   *
   * @description
   * Known next journal page, or null when unavailable or complete.
   *
   * @access public
   *
   * @type {number | null}
   */
  readonly nextPage: number | null;
}
