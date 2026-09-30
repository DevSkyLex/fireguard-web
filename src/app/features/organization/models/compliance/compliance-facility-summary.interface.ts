/**
 * Interface ComplianceFacilitySummary
 * @interface ComplianceFacilitySummary
 *
 * @description
 * One row of `ComplianceSummaryOutput.facilities` — the organization rollup
 * holds one row per organization facility, the single-facility detail holds
 * exactly one.
 */
export interface ComplianceFacilitySummary {
  //#region Properties
  /**
   * Property facilityId
   * @readonly
   *
   * @description
   * Identifier of the facility represented by this compliance row.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly facilityId: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Facility name shown in the organization compliance rollup.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property type
   * @readonly
   *
   * @description
   * Facility type used to group the compliance summary.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly type: string;

  /**
   * Property parentFacilityId
   * @readonly
   *
   * @description
   * Parent facility identifier, or null for a top-level facility.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly parentFacilityId: string | null;

  /**
   * Property path
   * @readonly
   *
   * @description
   * Display path from the organization root to this facility.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly path: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Current facility status returned with the compliance summary.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly status: string;

  /**
   * Property totalEquipmentCount
   * @readonly
   *
   * @description
   * All equipment assigned to the facility, regardless of activity.
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
   * Equipment currently active at this facility.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly activeEquipmentCount: number;

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
   * Tracked equipment whose next required action falls in the due-soon window.
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
   * Tracked equipment whose required action is overdue.
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
   * Open low-severity findings at this facility.
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
   * Open medium-severity findings at this facility.
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
   * Open high-severity findings at this facility.
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
   * Open critical-severity findings at this facility.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly openCriticalNonConformityCount: number;

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
   * Property dataEvaluatedAt
   * @readonly
   *
   * @description
   * Oldest successful evaluation for this facility.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null | undefined}
   */
  readonly dataEvaluatedAt?: string | null;

  /**
   * Property lastInspectionAt
   * @readonly
   *
   * @description
   * Timestamp of the most recent inspection, or null when none is recorded.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly lastInspectionAt: string | null;
  //#endregion
}
