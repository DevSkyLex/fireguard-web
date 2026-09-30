/**
 * Interface ComplianceSummaryTotals
 * @interface ComplianceSummaryTotals
 *
 * @description
 * The `totals` map of `ComplianceSummaryOutput`: equipment due-status
 * breakdown and open non-conformity counts by severity.
 * `trackedEquipmentCount` (up-to-date + due-soon + overdue) is the
 * denominator `complianceRate` is derived from; `complianceRate` is `null`
 * when `trackedEquipmentCount` is `0` (undefined, never `0%`).
 */
export interface ComplianceSummaryTotals {
  //#region Properties
  /**
   * Property totalEquipmentCount
   * @readonly
   *
   * @description
   * All equipment included in the organization-level summary.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly totalEquipmentCount: number;

  /**
   * Property activeEquipmentCount
   * @readonly
   *
   * @description
   * Equipment currently active in the organization.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly activeEquipmentCount: number;

  /**
   * Property unevaluatedEquipmentCount
   * @readonly
   *
   * @description
   * Active equipment missing a confirmed server evaluation.
   *
   * @access public
   * @since unreleased
   *
   * @type {number | undefined}
   */
  readonly unevaluatedEquipmentCount?: number;

  /**
   * Property upToDateEquipmentCount
   * @readonly
   *
   * @description
   * Tracked equipment whose compliance requirements are current.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly upToDateEquipmentCount: number;

  /**
   * Property dueSoonEquipmentCount
   * @readonly
   *
   * @description
   * Tracked equipment with a required action in the due-soon window.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly dueSoonEquipmentCount: number;

  /**
   * Property overdueEquipmentCount
   * @readonly
   *
   * @description
   * Tracked equipment with an overdue required action.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly overdueEquipmentCount: number;

  /**
   * Property unscheduledEquipmentCount
   * @readonly
   *
   * @description
   * Equipment without a scheduled compliance action.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly unscheduledEquipmentCount: number;

  /**
   * Property trackedEquipmentCount
   * @readonly
   *
   * @description
   * Equipment included in the compliance-rate denominator.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly trackedEquipmentCount: number;

  /**
   * Property complianceRate
   * @readonly
   *
   * @description
   * Compliance percentage, or null when no equipment is tracked.
   *
   * @access public
   * @since unreleased
   *
   * @type {number | null}
   */
  readonly complianceRate: number | null;

  /**
   * Property openLowNonConformityCount
   * @readonly
   *
   * @description
   * Open low-severity findings across the organization.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly openLowNonConformityCount: number;

  /**
   * Property openMediumNonConformityCount
   * @readonly
   *
   * @description
   * Open medium-severity findings across the organization.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly openMediumNonConformityCount: number;

  /**
   * Property openHighNonConformityCount
   * @readonly
   *
   * @description
   * Open high-severity findings across the organization.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly openHighNonConformityCount: number;

  /**
   * Property openCriticalNonConformityCount
   * @readonly
   *
   * @description
   * Open critical-severity findings across the organization.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly openCriticalNonConformityCount: number;
  //#endregion
}
