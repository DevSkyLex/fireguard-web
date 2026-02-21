import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { OperationFailureEventPayload } from '../operations';

export const onboardingStoreEvents = eventGroup({
  source: 'Onboarding Store',
  events: {
    loadFailed: type<OperationFailureEventPayload>(),
    startFailed: type<OperationFailureEventPayload>(),
    executeStepFailed: type<OperationFailureEventPayload>(),
    skipStepFailed: type<OperationFailureEventPayload>(),
    rollbackFailed: type<OperationFailureEventPayload>(),
  },
});
