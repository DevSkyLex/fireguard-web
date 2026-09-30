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
  /**
   * Property currentOrganizationId
   * @readonly
   *
   * @description
   * Organization whose billing state is currently loaded.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly currentOrganizationId: string | null;

  /**
   * Property checkoutExpectation
   * @readonly
   *
   * @description
   * Requested Checkout target retained while the API subscription is reconciled.
   *
   * @access public
   * @since unreleased
   *
   * @type {BillingCheckoutExpectation | null}
   */
  readonly checkoutExpectation: BillingCheckoutExpectation | null;

  /**
   * Property reconciliationCallState
   * @readonly
   *
   * @description
   * Outcome of checking whether the Checkout result reached the subscription.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<boolean>}
   */
  readonly reconciliationCallState: CallState<boolean>;

  /**
   * Property subscriptionCallState
   * @readonly
   *
   * @description
   * Outcome of loading the active organization subscription.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {CallState<OrganizationSubscriptionOutput>}
   */
  readonly subscriptionCallState: CallState<OrganizationSubscriptionOutput>;

  /**
   * Property pricingCallState
   * @readonly
   *
   * @description
   * Outcome of loading available plan pricing.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {CallState<ReadonlyArray<PlanPricingOutput>>}
   */
  readonly pricingCallState: CallState<ReadonlyArray<PlanPricingOutput>>;

  /**
   * Property invoicesCallState
   * @readonly
   *
   * @description
   * Outcome of loading the current organization invoices.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {CallState<ReadonlyArray<InvoiceOutput>>}
   */
  readonly invoicesCallState: CallState<ReadonlyArray<InvoiceOutput>>;

  /**
   * Property checkoutCallState
   * @readonly
   *
   * @description
   * Outcome of starting a hosted Checkout session.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {CallState<CheckoutSessionOutput>}
   */
  readonly checkoutCallState: CallState<CheckoutSessionOutput>;

  /**
   * Property portalCallState
   * @readonly
   *
   * @description
   * Outcome of creating a hosted billing portal session.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {CallState<PortalSessionOutput>}
   */
  readonly portalCallState: CallState<PortalSessionOutput>;

  /**
   * Property cancelCallState
   * @readonly
   *
   * @description
   * Outcome of scheduling subscription cancellation.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {CallState<OrganizationSubscriptionOutput>}
   */
  readonly cancelCallState: CallState<OrganizationSubscriptionOutput>;

  /**
   * Property resumeCallState
   * @readonly
   *
   * @description
   * Outcome of resuming a subscription scheduled to cancel.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {CallState<OrganizationSubscriptionOutput>}
   */
  readonly resumeCallState: CallState<OrganizationSubscriptionOutput>;
}

/**
 * Interface BillingCheckoutExpectation
 * @interface BillingCheckoutExpectation
 *
 * @description
 * Desired Checkout state to compare with the API; it never grants access locally.
 *
 * @since 1.0.0
 */
export interface BillingCheckoutExpectation {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization whose expected Checkout result is being reconciled.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property planKey
   * @readonly
   *
   * @description
   * Expected plan identifier, or null when no plan change is requested.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly planKey: string | null;

  /**
   * Property interval
   * @readonly
   *
   * @description
   * Expected billing interval, or null when unspecified.
   *
   * @access public
   * @since unreleased
   *
   * @type {BillingInterval | null}
   */
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
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization selected for the hosted Checkout session.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property planKey
   * @readonly
   *
   * @description
   * Plan selected for the hosted Checkout session.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string}
   */
  readonly planKey: string;

  /**
   * Property interval
   * @readonly
   *
   * @description
   * Billing interval selected for the hosted Checkout session.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {BillingInterval}
   */
  readonly interval: BillingInterval;
}
