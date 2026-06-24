import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';
import type { OrganizationOutput } from '@features/organization/models';

/**
 * Constant organizationSettingsStoreEvents
 * @const organizationSettingsStoreEvents
 *
 * @description
 * Events dispatched by the {@link OrganizationSettingsStore} when the active
 * organization is mutated (settings saved or logo uploaded). Sibling stores —
 * notably the list-driven {@link OrganizationStore} — listen to refresh their
 * cached copy so every surface reflects the change instead of serving a stale
 * cached logo.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const organizationSettingsStoreEvents = eventGroup({
  source: 'Organization Settings Store',
  events: {
    /** Cross-store sync: the active organization changed (settings or logo). */
    organizationUpdated: type<OrganizationOutput>(),
    /** Dispatched when the settings are saved. */
    saveSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when saving the settings fails. */
    saveFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when the logo is uploaded. */
    logoUploadSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when uploading the logo fails. */
    logoUploadFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when the organization is deleted. */
    deleteSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when deleting the organization fails. */
    deleteFailed: type<StoreFailureEventPayload>(),
  },
});
