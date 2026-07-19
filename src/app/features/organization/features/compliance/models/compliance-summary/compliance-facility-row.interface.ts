/**
 * One facility's compliance line in the register.
 *
 * `complianceRate` is `null` — not `0` — when the facility tracks no scheduled
 * equipment at all. The backend is explicit that the two are different facts:
 * "undefined, NOT 0%".
 *
 * @since 1.0.0
 */
export interface ComplianceFacilityRow {
  readonly facilityId: string;
  readonly name: string;
  readonly type: string;
  readonly parentFacilityId: string | null;
  /** Human-readable ancestry, e.g. `Northgate Plant / Assembly Hall`. */
  readonly path: string;
  readonly status: string;
  readonly totalEquipmentCount: number;
  readonly activeEquipmentCount: number;
  readonly upToDateEquipmentCount: number;
  readonly dueSoonEquipmentCount: number;
  readonly overdueEquipmentCount: number;
  readonly unscheduledEquipmentCount: number;
  /** Denominator of `complianceRate`: up-to-date + due-soon + overdue. */
  readonly trackedEquipmentCount: number;
  readonly complianceRate: number | null;
  readonly openLowNonConformityCount: number;
  readonly openMediumNonConformityCount: number;
  readonly openHighNonConformityCount: number;
  readonly openCriticalNonConformityCount: number;
  readonly lastInspectionAt: string | null;
}
