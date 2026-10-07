/**
 * Interface MaintenanceFinancialIdentity
 * @interface MaintenanceFinancialIdentity
 *
 * @description
 * Minimal authorized financial scope identity without contacts or ordinary resource details.
 */
export interface MaintenanceFinancialIdentity {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Organization-scoped stable identity used only in server queries.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Minimal display name authorized by the financial directory.
   *
   * @access public
   *
   * @type {string}
   */
  readonly name: string;
}

/**
 * Interface MaintenanceFinancialEquipmentIdentity
 * @interface MaintenanceFinancialEquipmentIdentity
 *
 * @description
 * Minimal equipment identity; missing historical names remain explicitly absent.
 */
export interface MaintenanceFinancialEquipmentIdentity {
  /**
   * Property site
   * @readonly
   *
   * @description
   * Equipment-specific site context; absence must not inherit another equipment's campaign site.
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
   * Equipment-specific internal customer context, without contacts or cross-organization access.
   *
   * @access public
   *
   * @type {MaintenanceFinancialIdentity | null | undefined}
   */
  readonly customer?: MaintenanceFinancialIdentity | null;

  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable organization-scoped equipment identifier.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Optional historical or currently authorized equipment label.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly name?: string | null;

  /**
   * Property assetReference
   * @readonly
   *
   * @description
   * Optional patrimonial reference supplied by the financial directory.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly assetReference?: string | null;
}

/**
 * Interface MaintenanceReportScopeSelection
 * @interface MaintenanceReportScopeSelection
 *
 * @description
 * Named scope retained by the report page without requesting ordinary resource directories.
 */
export interface MaintenanceReportScopeSelection {
  /**
   * Property site
   * @readonly
   *
   * @description
   * Optional minimal site selected from a server directory page.
   *
   * @access public
   *
   * @type {MaintenanceFinancialIdentity | undefined}
   */
  readonly site?: MaintenanceFinancialIdentity;

  /**
   * Property customer
   * @readonly
   *
   * @description
   * Optional internal customer identity, excluding contacts.
   *
   * @access public
   *
   * @type {MaintenanceFinancialIdentity | undefined}
   */
  readonly customer?: MaintenanceFinancialIdentity;

  /**
   * Property equipment
   * @readonly
   *
   * @description
   * Optional minimal individual equipment selected by the financial reader.
   *
   * @access public
   *
   * @type {MaintenanceFinancialEquipmentIdentity | undefined}
   */
  readonly equipment?: MaintenanceFinancialEquipmentIdentity;
}

/**
 * Type MaintenanceReportScopeKind
 *
 * @description
 * Scope selection to clear explicitly without resetting the report date draft.
 *
 * @type MaintenanceReportScopeKind
 */
export type MaintenanceReportScopeKind = 'site' | 'customer' | 'equipment' | 'all';
