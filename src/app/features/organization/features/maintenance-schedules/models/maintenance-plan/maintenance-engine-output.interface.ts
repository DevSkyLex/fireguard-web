/**
 * Interface MaintenanceEngineOutput
 * @interface MaintenanceEngineOutput
 *
 * @description
 * Organization's single active scheduling authority and migration preparation state.
 */
export interface MaintenanceEngineOutput {
  /**
   * Property mode
   * @readonly
   *
   * @description
   * Sole authority currently allowed to generate work.
   *
   * @since unreleased
   *
   * @type {'legacy' | 'plans'}
   */
  readonly mode: 'legacy' | 'plans';
  /**
   * Property preparedCount
   * @readonly
   *
   * @description
   * Number of historical plans prepared server-side.
   *
   * @since unreleased
   *
   * @type {number}
   */
  readonly preparedCount: number;
  /**
   * Property conflicts
   * @readonly
   *
   * @description
   * Server-owned migration conflicts, if any.
   *
   * @since unreleased
   *
   * @type {readonly string[]}
   */
  readonly conflicts?: readonly string[];
}
