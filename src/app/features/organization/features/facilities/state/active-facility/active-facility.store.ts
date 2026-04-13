import { inject } from '@angular/core';
import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { Observable, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/state/request-state';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import type { ActiveFacilityState } from './active-facility-state.interface';
import { activeFacilityStoreEvents } from './active-facility.events';

//#region Initial State
/**
 * Constant INITIAL_ACTIVE_FACILITY_STATE
 * @const INITIAL_ACTIVE_FACILITY_STATE
 *
 * @description
 * Initial state for the ActiveFacilityStore, representing an idle
 * state with no selected facility and no ongoing operations.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
const INITIAL_ACTIVE_FACILITY_STATE: ActiveFacilityState = {
  selectedFacility: null,
  getCallState: idleCallState(),
} as const;
//#endregion

/**
 * Store ActiveFacilityStore
 * @const ActiveFacilityStore
 *
 * @description
 * Root-level NgRx SignalStore that tracks only the **currently active /
 * selected facility** and its associated loading state.
 *
 * This store is intentionally minimal — its single responsibility is
 * answering "which facility are we looking at right now?". All list
 * management and CRUD live in the component-scoped {@link FacilityStore}.
 *
 * Provided at the root level (`providedIn: 'root'`) so that any service or
 * component can read `selectedFacility` without providing anything.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ActiveFacilityStore = signalStore(
  { providedIn: 'root' },

  //#region Features
  /**
   * Feature withState
   *
   * @description
   * Adds the ActiveFacilityState to the store, initialized with
   * INITIAL_ACTIVE_FACILITY_STATE.
   *
   * @since 1.0.0
   *
   * @returns {ActiveFacilityState} The initial state for the active facility store.
   */
  withState<ActiveFacilityState>(INITIAL_ACTIVE_FACILITY_STATE),

  /**
   * Feature withComputed
   *
   * @description
   * Adds computed properties to the store for common
   * derived state related to the active facility.
   *
   * @since 1.0.0
   *
   * @param {SignalStore} store - The store instance to which the computed properties will be added.
   *
   * @returns {object} An object containing the computed properties to add to the store.
   */
  withComputed((store) => ({
    /**
     * Property isLoadingFacility
     *
     * @description
     * True while the facility is being resolved / fetched.
     *
     * @since 1.0.0
     *
     * @type {boolean} True if the get operation is currently loading, false otherwise.
     */
    isLoadingFacility: computed<boolean>(() => store.getCallState().status === 'pending'),

    /**
     * Property getError
     *
     * @description
     * Error from the get operation, if any. Null if the operation is idle
     * or loading, or if it succeeded.
     *
     * @since 1.0.0
     *
     * @type {StoreError | null} The error object if the get operation is in error, or null otherwise.
     */
    getError: computed<StoreError | null>(() => store.getCallState().error),
  })),

  /**
   * Feature withMethods
   *
   * @description
   * Adds methods to the store for managing the active facility state, including
   * setting the active facility, resolving it by ID,
   * and clearing the selection.
   *
   * @since 1.0.0
   *
   * @param {SignalStore} store - The store instance to which the methods will be added.
   * @param {Dispatcher} dispatcher - The NgRx Signals event dispatcher, used to dispatch events on errors.
   * @param {FacilityService} facilityService - The service used to fetch facility data from the API.
   *
   * @returns {object} An object containing the methods to add to the store.
   */
  withMethods(
    (
      store,
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
      facilityService: FacilityService = inject<FacilityService>(FacilityService),
    ) => ({
      /**
       * Method setFacility
       * @method setFacility
       *
       * @description
       * Directly sets the selected facility (e.g., resolved from route data
       * by DashboardLayout after the resolver runs).
       *
       * @since 1.0.0
       *
       * @param {FacilityOutput} facility - Facility to mark as active.
       *
       * @returns {void} No return value.
       */
      setFacility(facility: FacilityOutput): void {
        patchState(store, {
          selectedFacility: facility,
          getCallState: successCallState(facility),
        });
      },

      /**
       * Method resolveFacility
       * @method resolveFacility
       *
       * @description
       * Fetches a single facility by organization ID and facility ID and marks
       * it as the active one. Returns an Observable so Angular route resolvers
       * can await the result.
       *
       * @since 1.0.0
       *
       * @param {string} organizationId - Organization identifier.
       * @param {string} facilityId - Facility identifier.
       *
       * @returns {Observable<FacilityOutput>} Observable that emits the resolved
       * facility or an error if it fails.
       */
      resolveFacility(organizationId: string, facilityId: string): Observable<FacilityOutput> {
        patchState(store, { getCallState: pendingCallState() });

        return facilityService.get(organizationId, facilityId).pipe(
          tap({
            next: (facility: FacilityOutput): void => {
              patchState(store, {
                selectedFacility: facility,
                getCallState: successCallState(facility),
              });
            },
            error: (error: unknown): void => {
              const storeError: StoreError = toStoreError(error);
              patchState(store, { getCallState: errorCallState(storeError) });
              dispatcher.dispatch(
                activeFacilityStoreEvents.getFailed(
                  toStoreFailureEventPayload(storeError, 'Failed to load facility'),
                ),
              );
            },
          }),
        );
      },

      /**
       * Method clearSelectedFacility
       * @method clearSelectedFacility
       *
       * @description
       * Clears the active facility selection.
       *
       * @since 1.0.0
       *
       * @return {void} No return value.
       */
      clearSelectedFacility(): void {
        patchState(store, { selectedFacility: null });
      },

      /**
       * Method clear
       * @method clear
       *
       * @description
       * Resets the entire active-facility state to idle.
       * Should be called on logout.
       *
       * @since 1.0.0
       *
       * @returns {void} No return value.
       */
      clear(): void {
        patchState(store, INITIAL_ACTIVE_FACILITY_STATE);
      },
    }),
  ),
  //#endregion
);

/**
 * Type ActiveFacilityStore
 * @type ActiveFacilityStore
 *
 * @description
 * Instance type of the {@link ActiveFacilityStore} signal store.
 *
 * @version 1.0.0
 */
export type ActiveFacilityStore = InstanceType<typeof ActiveFacilityStore>;
