import type { HydraItem } from '@core/api/models';
import type { ComplianceFacilitySummary } from './compliance-facility-summary.interface';
import type { ComplianceStatus } from './compliance-status.type';
import type { ComplianceSummaryTotals } from './compliance-summary-totals.interface';

/**
 * Interface ComplianceSummaryOutput
 * @interface ComplianceSummaryOutput
 *
 * @description
 * Shared output shape for both the organization rollup
 * (`GET /organizations/{organizationId}/compliance`, `facilities` holds
 * every organization facility) and the single-facility detail
 * (`GET /organizations/{organizationId}/facilities/{facilityId}/compliance`,
 * `facilities` holds exactly one entry and `organizationStatus`/`totals`
 * reflect that single facility). A live read — `generatedAt` is the
 * data-as-of timestamp, never a historical reconstruction.
 */
export interface ComplianceSummaryOutput extends HydraItem {
  //#region Properties
  /** The organization this summary belongs to. */
  readonly organizationId: string;

  /** Set only when this output represents a single-facility detail. */
  readonly facilityId?: string | null;

  /** ISO 8601 datetime the register snapshot was generated at. */
  readonly generatedAt: string;

  /** The graded compliance verdict for the scope this summary covers. */
  readonly organizationStatus: ComplianceStatus;

  /** Equipment due-status breakdown and open non-conformity counts. */
  readonly totals: ComplianceSummaryTotals;

  /** Per-facility rows — every organization facility, or exactly one. */
  readonly facilities: ReadonlyArray<ComplianceFacilitySummary>;
  //#endregion
}
