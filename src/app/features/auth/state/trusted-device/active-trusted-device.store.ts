import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/state/request-state';
import { TrustedDeviceService } from '@features/auth/data-access';
import type { TrustDeviceOutput } from '@features/auth/models';
import type { ActiveTrustedDeviceState } from './active-trusted-device-state.interface';
import { activeTrustedDeviceStoreEvents } from './active-trusted-device.events';

//#region Initial State
/**
 * Constant INITIAL_ACTIVE_TRUSTED_DEVICE_STATE
 * @const INITIAL_ACTIVE_TRUSTED_DEVICE_STATE
 *
 * @description
 * Initial state for the ActiveTrustedDeviceStore. Seeds the pending flag
 * and trust operation tracker.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
const INITIAL_ACTIVE_TRUSTED_DEVICE_STATE: ActiveTrustedDeviceState = {
  pendingTrustDevice: false,
  trustCallState: idleCallState(),
} as const;
//#endregion

/**
 * Store ActiveTrustedDeviceStore
 * @const ActiveTrustedDeviceStore
 *
 * @description
 * Root-level NgRx SignalStore for the device-trust flow. Manages the
 * `pendingTrustDevice` flag that is set by the MFA verification page
 * (when the user checks "Trust this device") and consumed by the auth
 * store after successful MFA verification.
 *
 * The trust-device API call itself is also handled here because it is
 * triggered from the auth store (a root-level concern), not from a
 * specific list page.
 *
 * For listing and revoking trusted devices use the component-scoped
 * {@link TrustedDeviceStore} instead.
 *
 * @example
 * ```typescript
 * // In MFA verification page
 * activeTrustedDeviceStore.setPendingTrustDevice(true);
 *
 * // In auth store after MFA success
 * if (activeTrustedDeviceStore.pendingTrustDevice()) {
 *   activeTrustedDeviceStore.trustDevice();
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ActiveTrustedDeviceStore = signalStore(
  { providedIn: 'root' },

  //#region State
  withState<ActiveTrustedDeviceState>(INITIAL_ACTIVE_TRUSTED_DEVICE_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed isTrusting
     *
     * @description
     * Returns true while the trust-device API call is in-flight.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isTrusting: computed<boolean>(() => store.trustCallState().status === 'pending'),

    /**
     * Computed trustSuccess
     *
     * @description
     * Returns true if the last trust-device call succeeded.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    trustSuccess: computed<boolean>(() => store.trustCallState().status === 'success'),

    /**
     * Computed trustError
     *
     * @description
     * Returns the trust call state error, or `null` if idle/pending/success.
     *
     * @since 1.0.0
     *
     * @returns {StoreError | null}
     */
    trustError: computed<StoreError | null>(() => store.trustCallState().error),
  })),
  //#endregion

  //#region Methods
  withMethods(
    (
      store,
      dispatcher = inject<Dispatcher>(Dispatcher),
      trustedDeviceService = inject(TrustedDeviceService),
    ) => ({
      //#region Reactive Methods
      /**
       * Method trustDevice
       *
       * @description
       * Trusts the current device for MFA bypass. Automatically clears the
       * `pendingTrustDevice` flag when the API call starts, regardless of
       * outcome, to prevent accidental re-trust on retry.
       *
       * @since 1.0.0
       */
      trustDevice: rxMethod<void>(
        pipe(
          tap(() => {
            patchState(store, {
              pendingTrustDevice: false,
              trustCallState: pendingCallState(),
            });
          }),
          switchMap(() =>
            trustedDeviceService.trustDevice().pipe(
              tapResponse({
                next: (response: TrustDeviceOutput) => {
                  patchState(store, { trustCallState: successCallState(response) });
                },
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { trustCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    activeTrustedDeviceStoreEvents.trustFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to trust device'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),
      //#endregion

      //#region Synchronous Methods
      /**
       * Method setPendingTrustDevice
       *
       * @description
       * Sets the pending trust device flag. Called by the MFA verification
       * page when the user checks "Trust this device".
       *
       * @since 1.0.0
       *
       * @param {boolean} value - Whether to trust the device after MFA.
       */
      setPendingTrustDevice(value: boolean): void {
        patchState(store, { pendingTrustDevice: value });
      },

      /**
       * Method resetTrustOperation
       *
       * @description
       * Resets the trust operation state to idle. Useful for clearing
       * feedback messages.
       *
       * @since 1.0.0
       */
      resetTrustOperation(): void {
        patchState(store, { trustCallState: idleCallState() });
      },

      /**
       * Method clear
       *
       * @description
       * Resets the store to its initial state. Should be called on logout.
       *
       * @since 1.0.0
       */
      clear(): void {
        patchState(store, INITIAL_ACTIVE_TRUSTED_DEVICE_STATE);
      },
      //#endregion
    }),
  ),
  //#endregion
);

/**
 * Type ActiveTrustedDeviceStoreType
 * @type ActiveTrustedDeviceStoreType
 *
 * @description
 * Type alias for the ActiveTrustedDeviceStore instance.
 *
 * @since 1.0.0
 */
export type ActiveTrustedDeviceStore = InstanceType<typeof ActiveTrustedDeviceStore>;
