import type { HydraItem } from '@core/api/models';
/**
 * Interface RecoveryCodesStatusOutput
 * @interface RecoveryCodesStatusOutput
 *
 * @description
 * Public recovery availability; never contains code values.
 */
export interface RecoveryCodesStatusOutput extends HydraItem {
  /**
   * Property remainingCount
   *
   * @description
   * Number of unused recovery proofs remaining.
   */
  readonly remainingCount: number;
  /**
   * Property generatedAt
   *
   * @description
   * Timestamp of the current recovery set, or null before generation.
   */
  readonly generatedAt?: string | null;
}
/**
 * Interface GenerateRecoveryCodesOutput
 * @interface GenerateRecoveryCodesOutput
 *
 * @description
 * Returned once after a current TOTP proof; must remain in runtime memory.
 */
export interface GenerateRecoveryCodesOutput extends HydraItem {
  /**
   * Property codes
   *
   * @description
   * Transient values displayed once in the current page.
   */
  readonly codes: readonly string[];
  /**
   * Property generatedAt
   *
   * @description
   * Timestamp of the current recovery set, or null before generation.
   */
  readonly generatedAt: string;
}
