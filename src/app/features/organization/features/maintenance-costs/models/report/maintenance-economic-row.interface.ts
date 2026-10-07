import type { MaintenanceEconomicAmount } from './maintenance-economic-amount.interface';

/**
 * Interface MaintenanceEconomicRow
 * @interface MaintenanceEconomicRow
 *
 * @description
 * One allocation destination; unallocated costs are explicit and each fact is counted once.
 */
export interface MaintenanceEconomicRow {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable allocation identity, absent for the separate unallocated row.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly id?: string | null;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Authorized minimal source label; absent historical identities remain explicit.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly name?: string | null;

  /**
   * Property identityState
   * @readonly
   *
   * @description
   * Server identity availability code retained for presentation normalization.
   *
   * @access public
   *
   * @type {string}
   */
  readonly identityState: 'captured' | 'live' | 'mixed' | 'incomplete' | 'unallocated';

  /**
   * Property allocationComplete
   * @readonly
   *
   * @description
   * Whether every retained fact has a resolved allocation identity.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly allocationComplete: boolean;

  /**
   * Property current
   * @readonly
   *
   * @description
   * Current realized facts, including late corrections.
   *
   * @access public
   *
   * @type {MaintenanceEconomicAmount}
   */
  readonly current: MaintenanceEconomicAmount;

  /**
   * Property frozen
   * @readonly
   *
   * @description
   * Original immutable closure contributions.
   *
   * @access public
   *
   * @type {MaintenanceEconomicAmount}
   */
  readonly frozen: MaintenanceEconomicAmount;

  /**
   * Property planned
   * @readonly
   *
   * @description
   * Resource estimates, or the overall budget when the source dossier has no resource estimate.
   *
   * @access public
   *
   * @type {MaintenanceEconomicAmount}
   */
  readonly planned: MaintenanceEconomicAmount;

  /**
   * Property budget
   * @readonly
   *
   * @description
   * Global budgets allocated only once and never added to resource estimates.
   *
   * @access public
   *
   * @type {MaintenanceEconomicAmount}
   */
  readonly budget: MaintenanceEconomicAmount;

  /**
   * Property variance
   * @readonly
   *
   * @description
   * Exact current-minus-planned difference, omitted when incomplete.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly variance?: string | null;

  /**
   * Property interventionIds
   * @readonly
   *
   * @description
   * Distinct authorized source work identifiers; the directory supplies their minimal names.
   *
   * @access public
   *
   * @type {readonly string[]}
   */
  readonly interventionIds: readonly string[];
}
