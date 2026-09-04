import type { PlanQuotaOutput } from '@features/organization/models';

/**
 * Interface OrganizationPlanRow
 *
 * @description
 * A catalog plan joined with its cadence-specific price, inherited tier,
 * merchandising state and current-plan marker, ready for the card grid.
 *
 * @since 1.0.0
 */
export interface OrganizationPlanRow {
  /**
   * Property id
   *
   * @description Stable plan identifier used by plan-change commands.
   * @type {string}
   */
  readonly id: string;

  /**
   * Property key
   *
   * @description Stable catalog key used to correlate pricing and subscription data.
   * @type {string}
   */
  readonly key: string;

  /**
   * Property name
   *
   * @description Human-readable plan name displayed on the card.
   * @type {string}
   */
  readonly name: string;

  /**
   * Property description
   *
   * @description Optional plan positioning text supplied by the catalog.
   * @type {string | null}
   */
  readonly description: string | null;

  /**
   * Property priceLabel
   *
   * @description Localized price for the currently selected billing cadence.
   * @type {string}
   */
  readonly priceLabel: string;

  /**
   * Property inheritedPlanName
   *
   * @description Previous catalog tier whose benefits are included by this plan.
   * @type {string | null}
   */
  readonly inheritedPlanName: string | null;

  /**
   * Property quotas
   *
   * @description Resource allowances exposed for this plan by the catalog.
   * @type {ReadonlyArray<PlanQuotaOutput>}
   */
  readonly quotas: ReadonlyArray<PlanQuotaOutput>;

  /**
   * Property isCurrent
   *
   * @description Whether this card represents the organization's active plan.
   * @type {boolean}
   */
  readonly isCurrent: boolean;

  /**
   * Property isPopular
   *
   * @description Whether this tier receives the catalog's prominent recommendation treatment.
   * @type {boolean}
   */
  readonly isPopular: boolean;
}
