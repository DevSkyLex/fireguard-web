import type { MaintenanceCostItem } from './maintenance-cost-item.interface';

/**
 * Interface MaintenanceCostProjection
 * @interface MaintenanceCostProjection
 *
 * @description
 * A server-calculated total keeps incomplete valuation distinct from known zero.
 */
export interface MaintenanceCostProjection {
  /**
   * Property total
   * @readonly
   *
   * @description
   * Complete exact total, absent when any contribution is unknown.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly total?: string | null;

  /**
   * Property knownTotal
   * @readonly
   *
   * @description
   * Exact sum of the known contributions.
   *
   * @access public
   *
   * @type {string}
   */
  readonly knownTotal: string;

  /**
   * Property complete
   * @readonly
   *
   * @description
   * Whether every contribution has a known valuation.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly complete: boolean;

  /**
   * Property items
   * @readonly
   *
   * @description
   * Immutable current contribution rows.
   *
   * @access public
   *
   * @type {readonly MaintenanceCostItem[]}
   */
  readonly items: readonly MaintenanceCostItem[];
}
