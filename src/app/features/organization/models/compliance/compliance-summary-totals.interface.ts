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
  //#endregion
}
