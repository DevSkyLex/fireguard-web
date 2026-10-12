import { computed, inject, DestroyRef, effect, untracked } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  removeAllEntities,
  removeEntity,
  setAllEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import type { PaginationOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import { WriteOperationService } from '@core/request-state';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { TrustedDeviceService } from '@features/auth/data-access';
import type { TrustedDeviceOutput } from '@features/auth/models';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { trustedDeviceStoreEvents } from './events';
import type { TrustedDeviceState } from './models';

//#region Initial State
/**
 * Constant INITIAL_TRUSTED_DEVICE_STATE
 *
 * @description
 * Initial state for the TrustedDeviceStore. Entity state (`deviceEntities`,
 * `deviceEntityMap`, `deviceIds`) is initialised by `withEntities`.
 * This constant only seeds the auxiliary state managed in `TrustedDeviceState`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @const INITIAL_TRUSTED_DEVICE_STATE
 */
const INITIAL_TRUSTED_DEVICE_STATE: TrustedDeviceState = {
  totalDevices: 0,
  listCallState: idleCallState(),
  revokeCallState: idleCallState(),
  revokeAllCallState: idleCallState(),
} as const;
//#endregion

/**
 * Constant TrustedDeviceStore
 *
 * @description
 * Component-scoped NgRx SignalStore for trusted-device list management.
 * Handles loading, viewing, and revoking trusted devices. Designed to be
 * provided at **component level** (no `providedIn: 'root'`), so each
 * consumer gets an independent instance tied to its own lifecycle.
 *
 * Entity state is managed by `withEntities<TrustedDeviceOutput>({ collection:
 * 'device' })`, which provides O(1) lookups via `deviceEntityMap` and keeps
 * insertions/deletions efficient via normalized storage.
 *
 * For the `pendingTrustDevice` flag and trust-device API call, use the
 * root-level {@link ActiveTrustedDeviceStore} instead.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @const TrustedDeviceStore
 *
 * @example
 * ```typescript
 * @Component({ providers: [TrustedDeviceStore] })
 * export class TrustedDevicePage {
 *   readonly store = inject<TrustedDeviceStore>(TrustedDeviceStore);
 * }
 * ```
 */
export const TrustedDeviceStore = signalStore(
  //#region State
  withState<TrustedDeviceState>(INITIAL_TRUSTED_DEVICE_STATE),
  //#endregion

  //#region Entities
  /**
   * @description
   * Feature withEntities
   * Adds NgRx entity state and entity-adapter updater functions for
   * `TrustedDeviceOutput` objects keyed by their `id` field. Provides:
   * - `deviceEntities` — ordered array of all cached entities
   * - `deviceEntityMap` — `{ [id]: TrustedDeviceOutput }` lookup map
   * - `deviceIds` — ordered array of entity IDs
   *
   * @since 1.0.0
   */
  withEntities({ entity: type<TrustedDeviceOutput>(), collection: 'device' }),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * @description
     * Alias for deviceEntities — backward-compatible accessor.
     */
    devices: computed<ReadonlyArray<TrustedDeviceOutput>>(() => store.deviceEntities()),

    /**
     * @description
     * Computed isRevoking
     * Returns true if a single-device revoke operation is in-flight.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isRevoking: computed<boolean>(() => store.revokeCallState().status === 'pending'),

    /**
     * @description
     * Computed isRevokingAll
     * Returns true if the revoke-all operation is in-flight.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isRevokingAll: computed<boolean>(() => store.revokeAllCallState().status === 'pending'),

    /**
     * @description
     * Computed deviceCount
     * Returns the number of trusted devices in the local entity collection.
     *
     * @since 1.0.0
     *
     * @returns {number}
     */
    deviceCount: computed<number>(() => store.deviceEntities().length),

    /**
     * @description
     * Computed hasDevices
     * Quick check whether any trusted devices exist across all pages. Drives
     * the visibility of "Revoke all" controls.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    hasDevices: computed<boolean>(() => store.totalDevices() > 0),
  })),
  //#endregion

  //#region Methods
  withMethods(
    (
      store,
      dispatcher = inject<Dispatcher>(Dispatcher),
      trustedDeviceService = inject<TrustedDeviceService>(TrustedDeviceService),
      writeTracker = inject(WriteOperationService).createTracker(),
      intentSession = inject(AUTH_SESSION_PORT),
      _intentTrackingLifecycle = (() => {
        const reference = inject(DestroyRef);
        reference.onDestroy(() => writeTracker.clear());
        let observedRevision = intentSession.sessionRevision();
        effect(() => {
          const revision = intentSession.sessionRevision();
          if (revision !== observedRevision) {
            observedRevision = revision;
            untracked(() => writeTracker.clear());
          }
        });
        return undefined;
      })(),
    ) => {
      //#region Shared Reactive Pipelines
      /**
       * @description
       * Reactive pipeline loadFn
       * Shared `rxMethod` pipeline for loading trusted devices. Uses
       * `switchMap` so that rapid successive calls cancel the previous
       * in-flight request. Exposed publicly as both `load` (generic) and
       * `loadDevices` (explicit).
       *
       * @since 2.0.0
       */
      const loadFn = rxMethod<PaginationOptions | void>(
        pipe(
          tap(() => {
            patchState(store, { listCallState: pendingCallState() });
          }),
          switchMap((options) =>
            trustedDeviceService.list(options ?? undefined).pipe(
              tapResponse({
                next: (response: HydraCollection<TrustedDeviceOutput>) => {
                  patchState(
                    store,
                    setAllEntities([...response.member], { collection: 'device' }),
                    {
                      totalDevices: response.totalItems,
                      listCallState: successCallState(null),
                    },
                  );
                },
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { listCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    trustedDeviceStoreEvents.loadFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load trusted devices'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      );
      //#endregion

      return {
        //#region Reactive Methods
        /**
         * @see loadFn — generic alias.
         */
        load: loadFn,
        /**
         * @see loadFn — explicit alias.
         */
        loadDevices: loadFn,

        /**
         * Method revokeDevice
         *
         * @description
         * Revokes trust for a specific device by ID. Uses `switchMap` for
         * consistency. On success the revoked device is removed from
         * the local entity collection.
         *
         * @since 1.0.0
         *
         * @param {string} deviceId - UUID of the device to revoke.
         */
        revokeDevice: rxMethod<string>(
          pipe(
            tap(() => {
              patchState(store, { revokeCallState: pendingCallState() });
            }),
            switchMap((deviceId: string) =>
              trustedDeviceService
                .revoke(
                  deviceId,
                  writeTracker.options(
                    'trustedDeviceService.revoke',
                    [deviceId],
                    intentSession.sessionRevision(),
                  ),
                )
                .pipe(
                  tap({
                    next: (result): void => {
                      const outcome: unknown = result;
                      if (
                        outcome &&
                        typeof outcome === 'object' &&
                        'success' in outcome &&
                        outcome.success === false
                      )
                        return;
                      writeTracker.complete('trustedDeviceService.revoke');
                    },
                  }),
                  tapResponse({
                    next: () => {
                      patchState(store, removeEntity(deviceId, { collection: 'device' }), {
                        totalDevices: Math.max(0, store.totalDevices() - 1),
                        revokeCallState: successCallState(null),
                      });
                    },
                    error: (error: unknown) => {
                      const storeError: StoreError = toStoreError(error);
                      patchState(store, { revokeCallState: errorCallState(storeError) });
                      dispatcher.dispatch(
                        trustedDeviceStoreEvents.revokeFailed(
                          toStoreFailureEventPayload(storeError, 'Failed to revoke device'),
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
         * Revokes trust for all devices at once. On success the local entity
         * collection is cleared completely.
         *
         * @since 1.0.0
         */
        revokeAllDevices: rxMethod<void>(
          pipe(
            tap(() => {
              patchState(store, { revokeAllCallState: pendingCallState() });
            }),
            switchMap(() =>
              trustedDeviceService
                .revokeAll(
                  writeTracker.options(
                    'trustedDeviceService.revokeAll',
                    [],
                    intentSession.sessionRevision(),
                  ),
                )
                .pipe(
                  tap({
                    next: (result): void => {
                      const outcome: unknown = result;
                      if (
                        outcome &&
                        typeof outcome === 'object' &&
                        'success' in outcome &&
                        outcome.success === false
                      )
                        return;
                      writeTracker.complete('trustedDeviceService.revokeAll');
                    },
                  }),
                  tapResponse({
                    next: () => {
                      patchState(store, removeAllEntities({ collection: 'device' }), {
                        totalDevices: 0,
                        revokeAllCallState: successCallState(null),
                      });
                    },
                    error: (error: unknown) => {
                      const storeError: StoreError = toStoreError(error);
                      patchState(store, { revokeAllCallState: errorCallState(storeError) });
                      dispatcher.dispatch(
                        trustedDeviceStoreEvents.revokeAllFailed(
                          toStoreFailureEventPayload(storeError, 'Failed to revoke all devices'),
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
         * Method clear
         *
         * @description
         * Resets the store to its initial state and removes all entities.
         * Should be called on logout or when the component is destroyed.
         *
         * @since 1.0.0
         */
        clear(): void {
          patchState(
            store,
            removeAllEntities({ collection: 'device' }),
            INITIAL_TRUSTED_DEVICE_STATE,
          );
        },

        /**
         * Method resetRevokeOperation
         *
         * @description
         * Resets the revoke operation state to idle. Useful for clearing
         * feedback messages after the user has acknowledged them.
         *
         * @since 1.0.0
         */
        resetRevokeOperation(): void {
          patchState(store, { revokeCallState: idleCallState() });
        },

        /**
         * Method resetRevokeAllOperation
         *
         * @description
         * Resets the revoke-all call state to idle.
         *
         * @since 1.0.0
         */
        resetRevokeAllOperation(): void {
          patchState(store, { revokeAllCallState: idleCallState() });
        },
        //#endregion
      };
    },
  ),
  //#endregion
);

/**
 * Type TrustedDeviceStore
 *
 * @description
 * Type alias for the TrustedDeviceStore instance.
 *
 * @since 1.0.0
 *
 * @type TrustedDeviceStoreType
 */
export type TrustedDeviceStore = InstanceType<typeof TrustedDeviceStore>;
