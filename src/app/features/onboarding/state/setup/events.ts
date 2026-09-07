import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload } from '@core/request-state';
import type { OnboardingOutput, OnboardingSetupStep } from '@features/onboarding/models';

/**
 * Events onboardingSetupEvents
 * @const onboardingSetupEvents
 * @description Publishes one batch failure and requests progression only after all durable writes succeed.
 * @since 1.1.0
 */
export const onboardingSetupEvents = eventGroup({
  source: 'Onboarding Setup',
  events: {
    snapshotUpdated: type<OnboardingOutput>(),
    failed: type<FeedbackEventPayload>(),
    completed: type<{ readonly stepKey: OnboardingSetupStep }>(),
  },
});
