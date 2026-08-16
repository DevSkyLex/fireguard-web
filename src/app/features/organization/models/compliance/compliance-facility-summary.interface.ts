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
  readonly facilityId: string;
  readonly name: string;
  readonly type: string;
  readonly parentFacilityId: string | null;
  readonly path: string;
  readonly status: string;
  readonly totalEquipmentCount: number;
  readonly activeEquipmentCount: number;
  readonly upToDateEquipmentCount: number;
  readonly dueSoonEquipmentCount: number;
  readonly overdueEquipmentCount: number;
  readonly unscheduledEquipmentCount: number;
  readonly trackedEquipmentCount: number;
  readonly complianceRate: number | null;
  readonly openLowNonConformityCount: number;
  readonly openMediumNonConformityCount: number;
  readonly openHighNonConformityCount: number;
  readonly openCriticalNonConformityCount: number;
  readonly lastInspectionAt: string | null;
  //#endregion
}
