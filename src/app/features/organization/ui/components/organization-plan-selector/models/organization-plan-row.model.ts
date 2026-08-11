import type { PlanQuotaOutput } from '@features/organization/models';

/**
 * Interface OrganizationPlanRow
 *
 * @description
 * A catalog plan joined with its formatted monthly price and current-plan
 * marker, ready for the card grid.
 *
 * @since 1.0.0
 */
export interface OrganizationPlanRow {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly description: string | null;
  readonly priceLabel: string;
  readonly quotas: ReadonlyArray<PlanQuotaOutput>;
  readonly isCurrent: boolean;
}
