import type { HydraItem } from '@core/api/models';
/**
 * Interface EmailOwnershipChallengeOutput
 * @interface EmailOwnershipChallengeOutput
 * @description User-bound OTP challenge; never persisted or serialized for hydration.
 * @since 1.0.0
 */
export interface EmailOwnershipChallengeOutput extends HydraItem {
  challengeToken: string;
  canResendIn: number;
}
