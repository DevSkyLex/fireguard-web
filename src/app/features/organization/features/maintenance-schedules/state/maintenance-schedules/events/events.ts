import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant maintenanceSchedulesStoreEvents
 * @const maintenanceSchedulesStoreEvents
 *
 * @description
 * Events dispatched by {@link MaintenanceSchedulesStore}. `campaignFailed` is
 * deliberately absent: every campaign failure — including the 422 no-match
 * case the backend documents as the expected outcome of an over-narrow scope
 * — is rendered inline in the campaign dialog from `campaignError`, never as
 * a generic toast (`ARCHITECTURE.md` API contract).
 *
 * @since 1.0.0
 */
export const maintenanceSchedulesStoreEvents = eventGroup({
  source: 'Maintenance Schedules Store',
  events: {
    listFailed: type<StoreFailureEventPayload>(),
    overrideFailed: type<StoreFailureEventPayload>(),
    campaignSucceeded: type<FeedbackEventPayload>(),
  },
});
