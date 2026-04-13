import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/state/request-state';

/**
 * Constant trustedDeviceStoreEvents
 * @const trustedDeviceStoreEvents
 *
 * @description
 * Event group for the component-scoped trusted-device store. Emitted when
 * list or revoke operations fail so that global side-effects (toasts,
 * logging, etc.) can react.
 *
 * For the trust-device failure event, see
 * {@link activeTrustedDeviceStoreEvents}.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const trustedDeviceStoreEvents = eventGroup({
  source: 'Trusted Device Store',
  events: {
    /**
     * Event loadFailed
     *
     * @description
     * Dispatched when the device-list API call fails.
     */
    loadFailed: type<StoreFailureEventPayload>(),

    /**
     * Event revokeFailed
     *
     * @description
     * Dispatched when a single-device revoke API call fails.
     */
    revokeFailed: type<StoreFailureEventPayload>(),

    /**
     * Event revokeAllFailed
     *
     * @description
     * Dispatched when the revoke-all-devices API call fails.
     */
    revokeAllFailed: type<StoreFailureEventPayload>(),
  },
});
