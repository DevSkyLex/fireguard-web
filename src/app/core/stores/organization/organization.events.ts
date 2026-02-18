import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { OperationFailureEventPayload } from '@core/stores/operations';

/**
 * Constant organizationStoreEvents
 * @const organizationStoreEvents
 *
 * @description
 * Store events emitted by organization onboarding operations.
 *
 * @version 1.0.0
 */
export const organizationStoreEvents = eventGroup({
  source: 'Organization Store',
  events: {
    organizationLegalTypeOptionsLoadFailed: type<OperationFailureEventPayload>(),
    facilityTypeOptionsLoadFailed: type<OperationFailureEventPayload>(),
    onboardingStatusLoadFailed: type<OperationFailureEventPayload>(),
    onboardingOrganizationCreateFailed: type<OperationFailureEventPayload>(),
    onboardingLegalProfileUpsertFailed: type<OperationFailureEventPayload>(),
    onboardingFirstFacilityCreateFailed: type<OperationFailureEventPayload>(),
  },
});
