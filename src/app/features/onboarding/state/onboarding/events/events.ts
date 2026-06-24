import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

//#region Onboarding Store Events
/**
 * Events onboardingStoreEvents
 * @const onboardingStoreEvents
 *
 * @description
 * Event group for the `OnboardingStore`. Every event carries an
 * `OperationFailureEventPayload` with contextual error information.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const onboardingStoreEvents = eventGroup({
  source: 'Onboarding Store',
  events: {
    /** Emitted when the onboarding GET request fails. */
    loadFailed: type<StoreFailureEventPayload>(),

    /** Emitted when starting the onboarding workflow fails. */
    startFailed: type<StoreFailureEventPayload>(),

    /** Emitted when executing an onboarding step fails. */
    executeStepFailed: type<StoreFailureEventPayload>(),

    /** Emitted when skipping an onboarding step fails. */
    skipStepFailed: type<StoreFailureEventPayload>(),

    /** Emitted when rolling back the last step fails. */
    rollbackFailed: type<StoreFailureEventPayload>(),

    /** Emitted when dismissing the activation flow fails. */
    dismissFailed: type<StoreFailureEventPayload>(),

    /** Emitted when resuming the activation flow fails. */
    resumeFailed: type<StoreFailureEventPayload>(),
  },
});
//#endregion
