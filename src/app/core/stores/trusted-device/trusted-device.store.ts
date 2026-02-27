import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  removeAllEntities,
  removeEntity,
  setAllEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { TrustedDeviceService } from '@core/services/api/trusted-device';
import type { HydraCollection } from '@core/models/api';
import type { TrustDeviceOutput, TrustedDeviceOutput } from '@core/models/trusted-device';
import type { TrustedDeviceState } from './trusted-device-state.interface';
import {
  createErrorOperation,
  createIdleOperation,
  createLoadingOperation,
  createSuccessOperation,
  createOperationErrorFromUnknown,
  toOperationFailureEventPayload,
  type CollectionOperation,
  type Operation,
  type OperationError,
} from '../operations';
import { trustedDeviceStoreEvents } from './trusted-device.events';

/**
 * Constant INITIAL_TRUSTED_DEVICE_STATE
 *
 * @description
 * Initial state for the trusted device store.
 *
 * @since 1.0.0
 *
 * @type {TrustedDeviceState}
 */
const INITIAL_TRUSTED_DEVICE_STATE: TrustedDeviceState = {
  pendingTrustDevice: false,
  listOperation: createIdleOperation(),
  trustOperation: createIdleOperation(),
  revokeOperation: createIdleOperation(),
  revokeAllOperation: createIdleOperation(),
} as const;

/**
 * Store TrustedDeviceStore
 * @const TrustedDeviceStore
 *
 * @description
 * NGRX SignalStore for trusted device management.
 * Handles trusting devices, listing trusted devices, and revoking trust.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const trustedDeviceStore = inject(TrustedDeviceStore);
 *
 * // Trust current device
 * trustedDeviceStore.trustDevice();
 *
 * // Load all trusted devices
 * trustedDeviceStore.loadDevices();
 *
 * // Revoke a device
 * trustedDeviceStore.revokeDevice('device-uuid');
 * ```
 */
export const TrustedDeviceStore = signalStore(
  { providedIn: 'root' },

  //#region State
  withState<TrustedDeviceState>(INITIAL_TRUSTED_DEVICE_STATE),
  //#endregion

  //#region Entities
  withEntities({ entity: type<TrustedDeviceOutput>(), collection: 'device' }),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /** Alias for deviceEntities — backward-compatible accessor. */
    devices: computed<ReadonlyArray<TrustedDeviceOutput>>(
      () => store.deviceEntities(),
    ),

    /**
     * Computed isListLoading
     *
     * @description
     * Returns true if the devices list is being loaded.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isListLoading: computed<boolean>(() => store.listOperation().status === 'loading'),

    /**
     * Computed isListLoaded
     *
     * @description
     * Returns true if the devices list has been successfully loaded.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isListLoaded: computed<boolean>(() => store.listOperation().status === 'success'),

    /**
     * Computed listError
     *
     * @description
     * Returns the list operation error if any.
     *
     * @since 1.0.0
     *
     * @returns {OperationError<unknown> | null}
     */
    listError: computed<OperationError<unknown> | null>(() => {
      const operation: CollectionOperation<TrustedDeviceOutput, unknown> = store.listOperation();
      return operation.status === 'error' ? operation.error : null;
    }),

    /**
     * Computed isTrusting
     *
     * @description
     * Returns true if a trust operation is in progress.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isTrusting: computed<boolean>(() => store.trustOperation().status === 'loading'),

    /**
     * Computed trustSuccess
     *
     * @description
     * Returns true if the last trust operation was successful.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    trustSuccess: computed<boolean>(() => store.trustOperation().status === 'success'),

    /**
     * Computed trustError
     *
     * @description
     * Returns the trust operation error if any.
     *
     * @since 1.0.0
     *
     * @returns {OperationError<unknown> | null}
     */
    trustError: computed<OperationError<unknown> | null>(() => {
      const operation: Operation<TrustDeviceOutput, unknown> = store.trustOperation();
      return operation.status === 'error' ? operation.error : null;
    }),

    /**
     * Computed isRevoking
     *
     * @description
     * Returns true if a revoke operation is in progress.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isRevoking: computed<boolean>(() => store.revokeOperation().status === 'loading'),

    /**
     * Computed isRevokingAll
     *
     * @description
     * Returns true if a revoke all operation is in progress.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isRevokingAll: computed<boolean>(() => store.revokeAllOperation().status === 'loading'),

    /**
     * Computed deviceCount
     *
     * @description
     * Returns the number of trusted devices.
     *
     * @since 1.0.0
     *
     * @returns {number}
     */
    deviceCount: computed<number>(() => store.deviceEntities().length),

    /**
     * Computed hasDevices
     *
     * @description
     * Returns true if there are any trusted devices.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    hasDevices: computed<boolean>(() => store.deviceEntities().length > 0),
  })),
  //#endregion

  //#region Methods
  withMethods((
    store,
    dispatcher = inject<Dispatcher>(Dispatcher),
    trustedDeviceService = inject(TrustedDeviceService),
  ) => ({
    //#region Reactive Methods
    /**
     * Method loadDevices
     *
     * @description
     * Loads all trusted devices for the current user.
     *
     * @since 1.0.0
     */
    loadDevices: rxMethod<void>(
      pipe(
        tap(() => {
          patchState(store, {
            listOperation: createLoadingOperation(store.listOperation().data),
          });
        }),
        switchMap(() =>
          trustedDeviceService.list().pipe(
            tapResponse({
              next: (response: HydraCollection<TrustedDeviceOutput>) => {
                const devices: readonly TrustedDeviceOutput[] = response.member;
                patchState(store,
                  setAllEntities([...devices], { collection: 'device' }),
                  {
                    listOperation: {
                      ...createSuccessOperation(devices),
                      total: response.totalItems,
                    },
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  listOperation: createErrorOperation(
                    operationError,
                    store.listOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  trustedDeviceStoreEvents.loadFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load trusted devices'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Method trustDevice
     *
     * @description
     * Trusts the current device for MFA bypass.
     * Automatically clears the pending trust device flag.
     *
     * @since 1.0.0
     */
    trustDevice: rxMethod<void>(
      pipe(
        tap(() => {
          // Clear pending flag immediately when trust starts
          patchState(store, {
            pendingTrustDevice: false,
            trustOperation: createLoadingOperation(store.trustOperation().data),
          });
        }),
        switchMap(() =>
          trustedDeviceService.trustDevice().pipe(
            tapResponse({
              next: (response: TrustDeviceOutput) => {
                patchState(store, {
                  trustOperation: createSuccessOperation(response),
                });
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  trustOperation: createErrorOperation(
                    operationError,
                    store.trustOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  trustedDeviceStoreEvents.trustFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to trust device'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Method revokeDevice
     *
     * @description
     * Revokes trust for a specific device.
     *
     * @since 1.0.0
     *
     * @param {string} deviceId - UUID of the device to revoke.
     */
    revokeDevice: rxMethod<string>(
      pipe(
        tap(() => {
          patchState(store, {
            revokeOperation: createLoadingOperation(store.revokeOperation().data),
          });
        }),
        switchMap((deviceId: string) =>
          trustedDeviceService.revoke(deviceId).pipe(
            tapResponse({
              next: () => {
                // Remove the revoked device from the local list
                patchState(store,
                  removeEntity(deviceId, { collection: 'device' }),
                  {
                    revokeOperation: createSuccessOperation(undefined as unknown as void),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  revokeOperation: createErrorOperation(
                    operationError,
                    store.revokeOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  trustedDeviceStoreEvents.revokeFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to revoke device'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Method revokeAllDevices
     *
     * @description
     * Revokes trust for all devices.
     *
     * @since 1.0.0
     */
    revokeAllDevices: rxMethod<void>(
      pipe(
        tap(() => {
          patchState(store, {
            revokeAllOperation: createLoadingOperation(store.revokeAllOperation().data),
          });
        }),
        switchMap(() =>
          trustedDeviceService.revokeAll().pipe(
            tapResponse({
              next: () => {
                patchState(store,
                  removeAllEntities({ collection: 'device' }),
                  {
                    revokeAllOperation: createSuccessOperation(undefined as unknown as void),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  revokeAllOperation: createErrorOperation(
                    operationError,
                    store.revokeAllOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  trustedDeviceStoreEvents.revokeAllFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to revoke all devices'),
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
     * Method reset
     *
     * @description
     * Resets the store to initial state.
     * Should be called on logout.
     *
     * @since 1.0.0
     */
    reset(): void {
      patchState(store,
        removeAllEntities({ collection: 'device' }),
        INITIAL_TRUSTED_DEVICE_STATE,
      );
    },

    /**
     * Method resetTrustOperation
     *
     * @description
     * Resets the trust operation state to idle.
     *
     * @since 1.0.0
     */
    resetTrustOperation(): void {
      patchState(store, {
        trustOperation: createIdleOperation(),
      });
    },

    /**
     * Method resetRevokeOperation
     *
     * @description
     * Resets the revoke operation state to idle.
     *
     * @since 1.0.0
     */
    resetRevokeOperation(): void {
      patchState(store, {
        revokeOperation: createIdleOperation(),
      });
    },

    /**
     * Method setPendingTrustDevice
     *
     * @description
     * Sets the pending trust device flag.
     * Used to defer device trust until after MFA verification completes.
     *
     * @since 1.0.0
     *
     * @param {boolean} value - Whether to trust the device after MFA.
     */
    setPendingTrustDevice(value: boolean): void {
      patchState(store, {
        pendingTrustDevice: value,
      });
    },
    //#endregion
  })),
  //#endregion
);

/**
 * Type TrustedDeviceStoreType
 * @type TrustedDeviceStoreType
 *
 * @description
 * Type alias for the TrustedDeviceStore instance.
 *
 * @since 1.0.0
 */
export type TrustedDeviceStore = InstanceType<typeof TrustedDeviceStore>;
