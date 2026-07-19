import type { HydraItem } from '@core/api/models';
import type { ComplianceFacilityRow } from './compliance-facility-row.interface';

/**
 * Organization-wide compliance totals.
 *
 * Loose on purpose: the backend types this as `array<string, int|float|null>`,
 * so every counter is read through the adapter rather than trusted positionally.
 *
 * @since 1.0.0
 */
export type ComplianceTotals = Readonly<Record<string, number | null>>;

/**
 * The compliance register: organization rollup plus a per-facility breakdown.
 *
 * @since 1.0.0
 */
export interface ComplianceSummaryOutput extends HydraItem {
  readonly organizationStatus: string;
  readonly totals: ComplianceTotals;
  readonly facilities: readonly ComplianceFacilityRow[];
}
