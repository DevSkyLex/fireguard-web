import type { InterventionTimeEntryVersion } from './intervention-time-entry-version.interface';

/**
 * Interface InterventionTimeEntry
 * @interface InterventionTimeEntry
 *
 * @description
 * A versioned journal entry, independent of operational publication.
 *
 * @since 1.0.0
 */
export interface InterventionTimeEntry {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable client/server entry identifier.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property workItemId
   * @readonly
   *
   * @description
   * Task worked on.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly workItemId: string;

  /**
   * Property memberId
   * @readonly
   *
   * @description
   * Member who performed the work.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly memberId: string;

  /**
   * Property workedOn
   * @readonly
   *
   * @description
   * Organization-local work date.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly workedOn: string;

  /**
   * Property minutes
   * @readonly
   *
   * @description
   * Actual minutes, not deducted from remaining effort.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly minutes: number;

  /**
   * Property note
   * @readonly
   *
   * @description
   * Optional note.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly note?: string | null;

  /**
   * Property revision
   * @readonly
   *
   * @description
   * Journal concurrency revision.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly revision: number;

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Cancellation retains all versions.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly cancelled: boolean;

  /**
   * Property createdBy
   * @readonly
   *
   * @description
   * Original author.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly createdBy: string;

  /**
   * Property updatedBy
   * @readonly
   *
   * @description
   * Last correcting author.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly updatedBy: string;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Creation timestamp.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * Latest correction timestamp.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly updatedAt: string;

  /**
   * Property versions
   * @readonly
   *
   * @description
   * Immutable corrections including cancellation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {readonly InterventionTimeEntryVersion[]}
   */
  readonly versions: readonly InterventionTimeEntryVersion[];
}
