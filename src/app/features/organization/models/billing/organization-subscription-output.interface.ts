import type { HydraItem } from '@core/models/api';
import type { BillingInterval } from './billing-interval.type';
import type { SubscriptionStatus } from './subscription-status.type';

/**
 * Interface OrganizationSubscriptionOutput
 * @interface OrganizationSubscriptionOutput
 *
 * @description
 * Current Stripe subscription state of an organization, returned by the billing
 * API and used to render the subscription panel (status badge, renewal date,
 * scheduled cancellation).
 */
export interface OrganizationSubscriptionOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly organizationId: string;
  /** @type {boolean} */
  readonly hasSubscription: boolean;
  /** @type {boolean} */
  readonly active: boolean;
  /** @type {(SubscriptionStatus | null | undefined)} */
  readonly status?: SubscriptionStatus | null;
  /** @type {(string | null | undefined)} */
  readonly planKey?: string | null;
  /** @type {(BillingInterval | null | undefined)} */
  readonly interval?: BillingInterval | null;
  /** @type {(string | null | undefined)} */
  readonly currentPeriodEnd?: string | null;
  /** @type {boolean} */
  readonly cancelAtPeriodEnd: boolean;
  //#endregion
}
