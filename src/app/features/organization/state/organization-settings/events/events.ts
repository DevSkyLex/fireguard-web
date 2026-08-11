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
    /** Dispatched when the logo is removed. */
    logoRemoveSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when removing the logo fails. */
    logoRemoveFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when the organization is archived. */
    deleteSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when archiving the organization fails. */
    deleteFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when ownership is handed to another member. */
    transferOwnershipSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when the ownership transfer is refused. */
    transferOwnershipFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when the organization is suspended or restored. */
    statusChangeSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when suspending or restoring the organization fails. */
    statusChangeFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when the acting member leaves the organization. */
    leaveSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when leaving is refused — owner, or last administrator. */
    leaveFailed: type<StoreFailureEventPayload>(),
  },
});
