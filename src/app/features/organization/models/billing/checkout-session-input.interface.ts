import type { BillingInterval } from './billing-interval.type';

/**
 * Interface CheckoutSessionInput
 * @interface CheckoutSessionInput
 *
 * @description
 * Payload sent to start a hosted Stripe Checkout session for a paid plan.
 */
export interface CheckoutSessionInput {
  //#region Properties
  /** @type {string} */
  readonly planKey: string;
  /** @type {BillingInterval} */
  readonly interval: BillingInterval;
  //#endregion
}
