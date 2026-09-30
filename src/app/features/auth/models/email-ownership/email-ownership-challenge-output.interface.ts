import type { HydraItem } from '@core/api/models';

/**
 * Interface EmailOwnershipChallengeOutput
 * @interface EmailOwnershipChallengeOutput
 *
 * @description
 * User-bound OTP challenge; never persisted or serialized for hydration.
 *
 * @since 1.0.0
 */
export interface EmailOwnershipChallengeOutput extends HydraItem {
  /**
   * Property challengeToken
   *
   * @description
   * Short-lived proof token kept in the active flow and never serialized for hydration.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  challengeToken: string;

  /**
   * Property canResendIn
   *
   * @description
   * Server-provided delay in seconds before another proof message can be requested.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  canResendIn: number;
}
