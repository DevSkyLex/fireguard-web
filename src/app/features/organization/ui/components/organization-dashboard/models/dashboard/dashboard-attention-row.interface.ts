import type { TagSeverity } from '@shared/tag-severity';

/**
 * Interface DashboardAttentionRow
 *
 * @description
 * One line of the dashboard attention panel: a named piece of work waiting on the
 * operator, its size, and how it reads. Built by the dashboard component from the
 * intervention counts and the backend alert feed, then rendered as a presentational
 * row.
 *
 * @since 1.0.0
 */
export interface DashboardAttentionRow {
  //#region Properties
  /**
   * Property id
   *
   * @description
   * Stable row key, also the token the panel emits on selection so the parent can
   * resolve the destination.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property label
   *
   * @description
   * Localized sentence naming the work, e.g. "Awaiting your review".
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property count
   *
   * @description
   * How many items the row covers. Rows reaching zero are dropped before render.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly count: number;

  /**
   * Property severity
   *
   * @description
   * Shared severity token driving the row's icon colour. Always paired with the
   * label and icon so state is never carried by colour alone.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {TagSeverity}
   */
  readonly severity: TagSeverity;

  /**
   * Property icon
   *
   * @description
   * PrimeIcons class for the row, e.g. `pi-clock`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly icon: string;

  /**
   * Property navigable
   *
   * @description
   * Whether the row resolves to a destination. A non-navigable row renders as
   * plain text rather than a button.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly navigable: boolean;
  //#endregion
}
