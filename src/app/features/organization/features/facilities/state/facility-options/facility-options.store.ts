import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID } from '@angular/core';
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
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type {
  FacilityOption,
  FacilityOutput,
} from '@features/organization/features/facilities/models';
import {
  resolveFacilityMapCenter,
  toFacilityOption,
} from '@features/organization/features/facilities/utils';
import type { MapCoordinates } from '@shared/map';
import { facilityOptionsStoreEvents } from './events';
import type { FacilityOptionsState } from './models';

//#region Initial State
/**
 * Constant INITIAL_FACILITY_OPTIONS_STATE
 * @description No facilities loaded, load idle.
 * @since 1.0.0
 */
const INITIAL_FACILITY_OPTIONS_STATE: FacilityOptionsState = {
  facilities: [],
  loadCallState: idleCallState(),
};
//#endregion

/**
 * Constant FACILITY_OPTIONS_PAGE_SIZE
 * @description
 * How many facilities a picker may offer. Bounds the response while covering
 * typical organization sizes — the same cap the create and detail pages used
 * inline before this store existed.
 * @since 1.0.0
 * @type {number}
 */
const FACILITY_OPTIONS_PAGE_SIZE: number = 200;

/**
 * Store FacilityOptionsStore
 * @const FacilityOptionsStore
 * @description
 * Component-scoped NgRx SignalStore that loads the organization's facilities
 * once for a picker — parent of a new facility, site of an equipment,
 * target of a move — and derives the `FacilityOption` list every facility
 * picker renders (name, localized type, ancestor path). It exists because
 * `FacilityStore`'s list holds one paginated page of roots and cannot double
 * as a complete option source. Secondary UI data: `ensureLoaded` is browser
 * only, never SSR.
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const FacilityOptionsStore = signalStore(
  withState<FacilityOptionsState>(INITIAL_FACILITY_OPTIONS_STATE),
  withComputed((store) => ({
    /** The facilities as picker options, in API order. */
    options: computed<readonly FacilityOption[]>(() => store.facilities().map(toFacilityOption)),

    /** Where a map picker should open, averaged from the located facilities. */
    mapCenter: computed<MapCoordinates | undefined>(() =>
      resolveFacilityMapCenter(null, store.facilities()),
    ),

    /** True while the facilities are loading. */
    loading: computed<boolean>(() => isCallPending(store.loadCallState())),

    /** Normalized error of the last load when it failed, otherwise `null`. */
    loadError: computed<StoreError | null>(() => {
      const state = store.loadCallState();

      return isCallError(state) ? state.error : null;
    }),
  })),
  withMethods(
    (
      store,
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
      facilityService: FacilityService = inject<FacilityService>(FacilityService),
      platformId: object = inject(PLATFORM_ID),
    ) => {
      const load = rxMethod<string>(
        pipe(
          tap((): void => {
            patchState(store, { loadCallState: pendingCallState() });
          }),
          switchMap((organizationId: string) =>
            facilityService.list(organizationId, { itemsPerPage: FACILITY_OPTIONS_PAGE_SIZE }).pipe(
              tapResponse({
                next: (response: HydraCollection<FacilityOutput>): void => {
                  patchState(store, {
                    facilities: response.member,
                    loadCallState: successCallState(null),
                  });
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { facilities: [], loadCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    facilityOptionsStoreEvents.loadFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load facility options'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      );

      return {
        /**
         * Method load
         * @method load
         * @description Fetches the organization's facilities, cancelling any in-flight request.
         * @access public
         * @since 1.0.0
         * @type {RxMethod<string>}
         */
        load,

        /**
         * Method ensureLoaded
         * @method ensureLoaded
         * @description
         * Loads once, in the browser only — the options are secondary UI data
         * a server render must not fetch — and never twice while a load is
         * pending or already succeeded.
         * @access public
         * @since 1.0.0
         * @param {string} organizationId - Organization owning the facilities.
         * @returns {void}
         */
        ensureLoaded(organizationId: string): void {
          if (!isPlatformBrowser(platformId)) return;

          const status = store.loadCallState().status;
          if (status === 'pending' || status === 'success') return;

          load(organizationId);
        },
      };
    },
  ),
);

/**
 * Type FacilityOptionsStore
 * @type FacilityOptionsStore
 * @description Instance type of the {@link FacilityOptionsStore} signal store.
 * @since 1.0.0
 */
export type FacilityOptionsStore = InstanceType<typeof FacilityOptionsStore>;
