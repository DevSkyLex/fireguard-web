import type { MercureSubscriptionOutput } from '@core/mercure';

/**
 * Interface PresenceSubscriptionOutput
 * @interface PresenceSubscriptionOutput
 * @description Private organization topic credentials with an authoritative renewal deadline.
 * @since 1.0.0
 */
export interface PresenceSubscriptionOutput extends MercureSubscriptionOutput {
  /**
   * Property expiresAt
   * @readonly
   * @description ISO timestamp at which the subscriber token expires.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly expiresAt: string;
}
