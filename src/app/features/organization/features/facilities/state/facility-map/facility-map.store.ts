import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  isCallError,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
  type StoreError,
} from '@core/request-state';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import type { FacilityMapState } from './models';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Initial {@link FacilityMapState}: no facilities loaded, idle call state.
 */
const INITIAL_STATE: FacilityMapState = {
  facilities: [],
  loadCallState: idleCallState(),
};

/**
 * Determines whether a facility carries plottable coordinates.
 *
 * @param {FacilityOutput} facility - Facility to test.
 * @returns {boolean} Whether both latitude and longitude are set.
 */
function isLocated(facility: FacilityOutput): boolean {
  return typeof facility.latitude === 'number' && typeof facility.longitude === 'number';
}

/**
 * Store FacilityMapStore
 * @class FacilityMapStore
 *
 * @description
 * Component-scoped NgRx Signals store backing the facilities map page. It loads
 * every facility for the active organization (browser-only, via
 * {@link FacilityService.listAll}) and partitions them into those with
 * coordinates (`mappable`, plotted as pins) and those without (`unlocated`,
 * surfaced in a side list). It performs no work during SSR — the page triggers
 * the load in the browser.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const FacilityMapStore = signalStore(
  withState<FacilityMapState>(INITIAL_STATE),
  withComputed((store) => ({
    /** Whether the facilities load is in flight. */
    isLoading: computed<boolean>(() => isCallPending(store.loadCallState())),

    /** Normalized load error, or null when the load has not failed. */
    error: computed<StoreError | null>(() => {
      const state = store.loadCallState();
      return isCallError(state) ? state.error : null;
    }),

    /** Facilities that carry coordinates and can be plotted as pins. */
    mappable: computed<readonly FacilityOutput[]>(() =>
      store.facilities().filter((facility: FacilityOutput): boolean => isLocated(facility)),
    ),

    /** Facilities missing coordinates, surfaced as an "not on the map" list. */
    unlocated: computed<readonly FacilityOutput[]>(() =>
      store.facilities().filter((facility: FacilityOutput): boolean => !isLocated(facility)),
    ),
  })),
  withMethods((store, service = inject(FacilityService)) => ({
    /**
     * Loads every facility for the given organization and stores the result.
     *
     * @param {string} organizationId - Active organization id.
     */
    load: rxMethod<string>(
      pipe(
        tap(() =>
          patchState(store, {
            loadCallState: pendingCallState(store.loadCallState().data ?? []),
          }),
        ),
        switchMap((organizationId: string) =>
          service.listAll(organizationId).pipe(
            tapResponse({
              next: (facilities: readonly FacilityOutput[]) =>
                patchState(store, { facilities, loadCallState: successCallState(facilities) }),
              error: (err: unknown) =>
                patchState(store, {
                  loadCallState: errorCallState(toStoreError(err), store.facilities()),
                }),
            }),
          ),
        ),
      ),
    ),
  })),
);

/**
 * Type FacilityMapStore
 *
 * @description
 * Instance type of the {@link FacilityMapStore} for typed injection and testing.
 */
export type FacilityMapStore = InstanceType<typeof FacilityMapStore>;
