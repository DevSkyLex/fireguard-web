import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/state/request-state';

/**
 * Constant activeTrustedDeviceStoreEvents
 * @const activeTrustedDeviceStoreEvents
 *
 * @description
 * Event group for the root-level active trusted-device store. Emitted when
 * the trust-device API call fails so that global side-effects (toasts,
 * logging, etc.) can react.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const activeTrustedDeviceStoreEvents = eventGroup({
  source: 'Active Trusted Device Store',
  events: {
    /**
     * Event trustFailed
     *
     * @description
     * Dispatched when the trust-device API call fails.
     */
    trustFailed: type<StoreFailureEventPayload>(),
  },
});
