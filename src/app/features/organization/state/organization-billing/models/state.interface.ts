import type { CallState } from '@core/request-state';
import type {
  BillingInterval,
  CheckoutSessionOutput,
  InvoiceOutput,
  OrganizationSubscriptionOutput,
  PlanPricingOutput,
  PortalSessionOutput,
} from '@features/organization/models';

/**
 * Interface OrganizationBillingState
 * @interface OrganizationBillingState
 *
 * @description
 * State for the organization billing workflow: the current subscription, the
 * plan pricing catalog, the recent invoices, and call states for starting hosted
 * Checkout and Billing Portal sessions and for canceling/resuming the
 * subscription.
 */
export interface OrganizationBillingState {
  readonly currentOrganizationId: string | null;
  readonly checkoutExpectation: BillingCheckoutExpectation | null;
  readonly reconciliationCallState: CallState<boolean>;
  readonly subscriptionCallState: CallState<OrganizationSubscriptionOutput>;
  readonly pricingCallState: CallState<ReadonlyArray<PlanPricingOutput>>;
  readonly invoicesCallState: CallState<ReadonlyArray<InvoiceOutput>>;
  readonly checkoutCallState: CallState<CheckoutSessionOutput>;
  readonly portalCallState: CallState<PortalSessionOutput>;
  readonly cancelCallState: CallState<OrganizationSubscriptionOutput>;
  readonly resumeCallState: CallState<OrganizationSubscriptionOutput>;
}

/**
 * Interface BillingCheckoutExpectation
 * @interface BillingCheckoutExpectation
 * @description Desired Checkout state to compare with the API; it never grants access locally.
 * @since 1.0.0
 */
export interface BillingCheckoutExpectation {
  readonly organizationId: string;
  readonly planKey: string | null;
  readonly interval: BillingInterval | null;
}

/**
 * Interface BillingCheckoutParams
 * @interface BillingCheckoutParams
 *
 * @description
 * Parameters of the start-checkout action.
 */
export interface BillingCheckoutParams {
  readonly organizationId: string;
  readonly planKey: string;
  readonly interval: BillingInterval;
}
