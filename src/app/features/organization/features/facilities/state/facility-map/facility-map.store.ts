import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  isCallError,
  isCallPending,
  isCallSuccess,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { facilityMapStoreEvents } from './events';
import type { FacilityMapState } from './models';

//#region Initial State
/**
 * Constant INITIAL_FACILITY_MAP_STATE
 * @const INITIAL_FACILITY_MAP_STATE
 *
 * @description
 * Initial state for the FacilityMapStore: no facilities loaded yet, no
 * unplaced count known.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
const INITIAL_FACILITY_MAP_STATE: FacilityMapState = {
  mappedCallState: idleCallState(),
  unplacedCallState: idleCallState(),
} as const;
//#endregion

/**
 * Store FacilityMapStore
 * @const FacilityMapStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the facilities map surface
 * (`facilities/map`): every facility with both coordinates set
 * (`hasCoordinates: true`), plus the count of facilities still missing one
 * (`hasCoordinates: false`, read from `totalItems` off a single-item page —
 * `FEATURE.md` "Unplaced facilities affordance"). `FacilityStore`'s
 * roots-only, entity-keyed shape does not fit this flat, location-scoped
 * read, so this sits beside it as its own slice (`ARCHITECTURE.md` §10.11).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const FacilityMapStore = signalStore(
  withState<FacilityMapState>(INITIAL_FACILITY_MAP_STATE),

  withComputed((store) => ({
    /** Every located facility loaded for the map. */
    mappedFacilities: computed<readonly FacilityOutput[]>(() => {
      const state = store.mappedCallState();
      return isCallSuccess(state) ? state.data : [];
    }),

    /** True while the located-facilities request is in flight. */
    isLoadingMapped: computed<boolean>(() => isCallPending(store.mappedCallState())),

    /** True when the located-facilities request failed. */
    hasMappedError: computed<boolean>(() => isCallError(store.mappedCallState())),

    /** How many facilities in the organization have no coordinates yet. */
    unplacedCount: computed<number>(() => {
      const state = store.unplacedCallState();
      return isCallSuccess(state) ? state.data : 0;
    }),
  })),

  withMethods(
    (
      store,
      facilityService: FacilityService = inject<FacilityService>(FacilityService),
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
    ) => ({
      /**
       * Method loadMapped
       * @method loadMapped
       *
       * @description
       * Loads every facility with both coordinates set, consuming the full
       * server-paginated collection via `FacilityService.listAll`. Cancels
       * any in-flight request via `switchMap`.
       *
       * @since 1.0.0
       *
       * @type {RxMethod<{ organizationId: string }>}
       */
      loadMapped: rxMethod<{ organizationId: string }>(
        pipe(
          tap((): void => {
            patchState(store, {
              mappedCallState: pendingCallState(store.mappedCallState().data ?? []),
            });
          }),
          switchMap(({ organizationId }) =>
            facilityService.listAll(organizationId, { hasCoordinates: true }).pipe(
              tapResponse({
                next: (facilities: readonly FacilityOutput[]): void => {
                  patchState(store, { mappedCallState: successCallState(facilities) });
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, {
                    mappedCallState: errorCallState(storeError, store.mappedCallState().data ?? []),
                  });
                  dispatcher.dispatch(
                    facilityMapStoreEvents.mappedFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load facilities'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method loadUnplacedCount
       * @method loadUnplacedCount
       *
       * @description
       * Reads the count of facilities missing a coordinate off a single-item
       * page's `totalItems`, avoiding a second full fetch. Cancels any
       * in-flight request via `switchMap`.
       *
       * @since 1.0.0
       *
       * @type {RxMethod<{ organizationId: string }>}
       */
      loadUnplacedCount: rxMethod<{ organizationId: string }>(
        pipe(
          tap((): void => {
            patchState(store, {
              unplacedCallState: pendingCallState(store.unplacedCallState().data ?? 0),
            });
          }),
          switchMap(({ organizationId }) =>
            facilityService.list(organizationId, { hasCoordinates: false, itemsPerPage: 1 }).pipe(
              tapResponse({
                next: (collection: HydraCollection<FacilityOutput>): void => {
                  patchState(store, {
                    unplacedCallState: successCallState(collection.totalItems),
                  });
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, {
                    unplacedCallState: errorCallState(
                      storeError,
                      store.unplacedCallState().data ?? 0,
                    ),
                  });
                  dispatcher.dispatch(
                    facilityMapStoreEvents.unplacedFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        'Failed to load the unplaced facility count',
                      ),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),
    }),
  ),
);

/**
 * Type FacilityMapStore
 * @type FacilityMapStore
 *
 * @description
 * Instance type of the {@link FacilityMapStore} signal store.
 *
 * @version 1.0.0
 */
export type FacilityMapStore = InstanceType<typeof FacilityMapStore>;
