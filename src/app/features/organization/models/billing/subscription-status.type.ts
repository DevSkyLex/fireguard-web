/**
 * Type SubscriptionStatus
 *
 * @description
 * Lifecycle status of a Stripe subscription, mirroring the backend
 * `SubscriptionStatus` enum. Values match the exact strings the API returns.
 */
export type SubscriptionStatus =
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused';
