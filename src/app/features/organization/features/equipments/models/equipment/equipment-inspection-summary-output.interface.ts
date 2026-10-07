import type { HydraItem } from '@core/api/models';

/**
 * Interface EquipmentInspectionSummaryOutput
 * @interface EquipmentInspectionSummaryOutput
 *
 * @description
 * Inspection-owned evidence and unresolved anomaly counts for one authorized equipment.
 */
export interface EquipmentInspectionSummaryOutput extends HydraItem {
  /**
   * Property equipmentId
   *
   * @description
   * Equipment covered by this exact summary.
   */
  readonly equipmentId: string;

  /**
   * Property openAnomalies
   *
   * @description
   * Server-confirmed unresolved anomalies; absent authorization is never a zero.
   */
  readonly openAnomalies: number;

  /**
   * Property bySeverity
   *
   * @description
   * Unresolved anomaly counts split by their declared severity.
   */
  readonly bySeverity: Readonly<Record<'low' | 'medium' | 'high' | 'critical', number>>;

  /**
   * Property lastInspectionId
   *
   * @description
   * Most recent inspection whose published evidence can be opened.
   */
  readonly lastInspectionId?: string | null;

  /**
   * Property lastInspectionPerformedAt
   *
   * @description
   * Actual performance date of the last published inspection.
   */
  readonly lastInspectionPerformedAt?: string | null;

  /**
   * Property lastInspectionResult
   *
   * @description
   * Published result, independent of the declared operational status.
   */
  readonly lastInspectionResult?: 'pass' | 'fail' | 'partial' | null;
}
