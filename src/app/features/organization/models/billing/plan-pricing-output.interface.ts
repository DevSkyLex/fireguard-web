import type { HydraItem } from '@core/api/models';

/**
 * Interface PlanPricingOutput
 * @interface PlanPricingOutput
 *
 * @description
 * Display pricing for a payable plan, joined by the UI with the plan catalog
 * (limits, name) on `planKey`. Amounts are integers in the currency's smallest
 * unit (e.g. cents); a null amount means the cadence is not offered.
 */
export interface PlanPricingOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly planKey: string;
  /** @type {string} */
  readonly currency: string;
  /** @type {(number | null | undefined)} */
  readonly monthlyAmount?: number | null;
  /** @type {(number | null | undefined)} */
  readonly yearlyAmount?: number | null;
  //#endregion
}
