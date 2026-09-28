import type { MercureSubscriptionOutput } from '@core/mercure';

/**
 * Interface PresencePreferenceSubscriptionOutput
 * @interface PresencePreferenceSubscriptionOutput
 * @description Private account topic with its subscriber token expiry as an ISO timestamp.
 * @since 1.0.0
 */
export interface PresencePreferenceSubscriptionOutput extends MercureSubscriptionOutput {
  /**
   * Property expiresAt
   * @readonly
   * @description ISO8601 expiry used to renew subscriber authorization before it lapses.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly expiresAt: string;
}
