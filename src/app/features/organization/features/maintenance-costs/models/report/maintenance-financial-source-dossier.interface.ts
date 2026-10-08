/**
 * Interface MaintenanceFinancialSourceDossier
 * @interface MaintenanceFinancialSourceDossier
 *
 * @description
 * Bounded report source names authorize exact navigation from an allocation row without extra
 * reads.
 */
export interface MaintenanceFinancialSourceDossier {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable private financial dossier identifier.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property number
   * @readonly
   *
   * @description
   * Human-readable work reference.
   *
   * @access public
   *
   * @type {string}
   */
  readonly number: number;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Minimal authorized source label.
   *
   * @access public
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Server-owned source state, without operational edit capabilities.
   *
   * @access public
   *
   * @type {string}
   */
  readonly status: string;

  /**
   * Property snapshotState
   * @readonly
   *
   * @description
   * Immutable, live or historical-missing source context.
   *
   * @access public
   *
   * @type {'available' | 'snapshot_missing' | 'live'}
   */
  readonly snapshotState: 'available' | 'snapshot_missing' | 'live';
}
