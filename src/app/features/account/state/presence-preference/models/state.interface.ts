import type { CallState } from '@core/request-state';
import type {
  PresencePreferenceOutput,
  PresencePreferenceSubscriptionOutput,
} from '@features/account/models/presence-preference';

/**
 * Interface PresencePreferenceState
 * @interface PresencePreferenceState
 *
 * @description
 * Session-owned canonical preference and independent request outcomes.
 *
 * @since 1.0.0
 */
export interface PresencePreferenceState {
  /**
   * Property preference
   * @readonly
   *
   * @description
   * Last confirmed preference; null until the account's canonical value loads.
   *
   * @access public
   * @since unreleased
   *
   * @type {Pick<PresencePreferenceOutput, 'doNotDisturb' | 'revision' | 'invisible'> | null}
   */
  readonly preference: Pick<
    PresencePreferenceOutput,
    'doNotDisturb' | 'revision' | 'invisible'
  > | null;

  /**
   * Property active
   * @readonly
   *
   * @description
   * Whether the presence preference is active for the current account session.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly active: boolean;

  /**
   * Property loadCallState
   * @readonly
   *
   * @description
   * Outcome of loading the canonical presence preference.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<PresencePreferenceOutput>}
   */
  readonly loadCallState: CallState<PresencePreferenceOutput>;

  /**
   * Property saveCallState
   * @readonly
   *
   * @description
   * Outcome of saving a presence preference change.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<PresencePreferenceOutput>}
   */
  readonly saveCallState: CallState<PresencePreferenceOutput>;

  /**
   * Property subscriptionCallState
   * @readonly
   *
   * @description
   * Outcome of establishing the private preference update subscription.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<PresencePreferenceSubscriptionOutput>}
   */
  readonly subscriptionCallState: CallState<PresencePreferenceSubscriptionOutput>;
}
