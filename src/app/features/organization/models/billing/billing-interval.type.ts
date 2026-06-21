/**
 * Type BillingInterval
 *
 * @description
 * Recurring billing cadence of a subscription price. Matches the Stripe price
 * `recurring.interval` values and the backend `BillingInterval` enum.
 */
export type BillingInterval = 'month' | 'year';
