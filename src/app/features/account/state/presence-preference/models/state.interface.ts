import type { CallState } from '@core/request-state';
import type {
  PresencePreferenceOutput,
  PresencePreferenceSubscriptionOutput,
} from '@features/account/models/presence-preference';

/**
 * Interface PresencePreferenceState
 * @interface PresencePreferenceState
 * @description Session-owned canonical preference and independent request outcomes.
 * @since 1.0.0
 */
export interface PresencePreferenceState {
  readonly preference: Pick<
    PresencePreferenceOutput,
    'doNotDisturb' | 'revision' | 'invisible'
  > | null;
  readonly active: boolean;
  readonly loadCallState: CallState<PresencePreferenceOutput>;
  readonly saveCallState: CallState<PresencePreferenceOutput>;
  readonly subscriptionCallState: CallState<PresencePreferenceSubscriptionOutput>;
}
