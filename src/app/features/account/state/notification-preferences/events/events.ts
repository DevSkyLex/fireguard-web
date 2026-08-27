import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant accountNotificationPreferencesStoreEvents
 * @const accountNotificationPreferencesStoreEvents
 *
 * @description
 * Failure outcomes of the notification preferences screen, dispatched purely
 * so the app-wide feedback listener can raise a toast. There are no success
 * events: a toggled switch settling into its new position says it better
 * than a toast on every flip would.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const accountNotificationPreferencesStoreEvents = eventGroup({
  source: 'Account Notification Preferences Store',
  events: {
    /**
     * Event loadFailed
     *
     * @description
     * Dispatched when loading the customized preference set fails.
     */
    loadFailed: type<StoreFailureEventPayload>(),

    /**
     * Event saveFailed
     *
     * @description
     * Dispatched when the preferences upsert fails.
     */
    saveFailed: type<StoreFailureEventPayload>(),
  },
});
