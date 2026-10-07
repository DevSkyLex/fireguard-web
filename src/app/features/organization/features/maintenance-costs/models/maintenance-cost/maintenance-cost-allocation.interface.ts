import type {
  MaintenanceFinancialEquipmentIdentity,
  MaintenanceFinancialIdentity,
} from '../financial-directory/maintenance-financial-identity.interface';

/**
 * Interface MaintenanceCostAllocation
 * @interface MaintenanceCostAllocation
 *
 * @description
 * Private source identity retained independently of live park names; historical absent fields
 * remain explicit.
 */
export interface MaintenanceCostAllocation {
  /**
   * Property identityState
   * @readonly
   *
   * @description
   * Server provenance and completeness code for the contribution's allocation.
   *
   * @access public
   *
   * @type {string}
   */
  readonly identityState: string;

  /**
   * Property equipment
   * @readonly
   *
   * @description
   * Optional minimum equipment identity captured for this financial contribution.
   *
   * @access public
   *
   * @type {Pick<MaintenanceFinancialEquipmentIdentity, 'id' | 'name' | 'assetReference'>
   *   | null
   *   | undefined}
   */
  readonly equipment?: Pick<
    MaintenanceFinancialEquipmentIdentity,
    'id' | 'name' | 'assetReference'
  > | null;

  /**
   * Property site
   * @readonly
   *
   * @description
   * Optional source site identity, without ordinary documents or additional contact data.
   *
   * @access public
   *
   * @type {MaintenanceFinancialIdentity | null | undefined}
   */
  readonly site?: MaintenanceFinancialIdentity | null;

  /**
   * Property customer
   * @readonly
   *
   * @description
   * Optional internal customer identity; operators and historical contributions may have none.
   *
   * @access public
   *
   * @type {MaintenanceFinancialIdentity | null | undefined}
   */
  readonly customer?: MaintenanceFinancialIdentity | null;
}
