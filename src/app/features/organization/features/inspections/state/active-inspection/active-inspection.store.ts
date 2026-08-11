import { inject } from '@angular/core';
import { computed } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { activeInspectionStoreEvents } from './events';
import type { ActiveInspectionState } from './models';

//#region Initial State
/**
 * Constant INITIAL_ACTIVE_INSPECTION_STATE
 * @const INITIAL_ACTIVE_INSPECTION_STATE
 *
 * @description
 * Initial state for the ActiveInspectionStore, representing an idle
 * state with no selected inspection and no ongoing operations.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
const INITIAL_ACTIVE_INSPECTION_STATE: ActiveInspectionState = {
  selectedInspection: null,
  getCallState: idleCallState(),
} as const;
//#endregion

/**
 * Store ActiveInspectionStore
 * @const ActiveInspectionStore
 *
 * @description
 * Root-level NgRx SignalStore that tracks only the **currently active /
 * selected inspection** and its associated loading state.
 *
 * This store is intentionally minimal — its single responsibility is
 * answering "which inspection are we looking at right now?". All list
 * management and CRUD live in the component-scoped {@link InspectionStore}.
 *
 * Provided at the root level (`providedIn: 'root'`) so that any service or
 * component can read `selectedInspection` without providing anything.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ActiveInspectionStore = signalStore(
  { providedIn: 'root' },

  //#region Features
  /**
   * Feature withState
   *
   * @description
   * Adds the ActiveInspectionState to the store, initialized with
   * INITIAL_ACTIVE_INSPECTION_STATE.
   *
   * @since 1.0.0
   *
   * @returns {ActiveInspectionState} The initial state for the active inspection store.
   */
  withState<ActiveInspectionState>(INITIAL_ACTIVE_INSPECTION_STATE),

  /**
   * Feature withComputed
   *
   * @description
   * Adds computed properties to the store for common
   * derived state related to the active inspection.
   *
   * @since 1.0.0
   *
   * @param {SignalStore} store - The store instance to which the computed properties will be added.
   *
   * @returns {object} An object containing the computed properties to add to the store.
   */
  withComputed((store) => ({
    /**
     * Property isLoadingInspection
     *
     * @description
     * True while the inspection is being resolved / fetched.
     *
     * @since 1.0.0
     *
     * @type {boolean}
     */
    isLoadingInspection: computed<boolean>(() => store.getCallState().status === 'pending'),

    /**
     * Property getError
     *
     * @description
     * Error from the get operation, if any.
     *
     * @since 1.0.0
     *
     * @type {StoreError | null}
     */
    getError: computed<StoreError | null>(() => store.getCallState().error),
  })),

  /**
   * Feature withMethods
   *
   * @description
   * Adds methods to the store for managing the active inspection state.
   *
   * @since 1.0.0
   *
   * @param {SignalStore} store - The store instance to which the methods will be added.
   * @param {Dispatcher} dispatcher - The NgRx Signals event dispatcher.
   * @param {InspectionService} inspectionService - The service used to fetch inspection data from the API.
   *
   * @returns {object} An object containing the methods to add to the store.
   */
  withMethods(
    (
      store,
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
      inspectionService: InspectionService = inject<InspectionService>(InspectionService),
    ) => ({
      /**
       * Method setInspection
       * @method setInspection
       *
       * @description
       * Directly sets the selected inspection (e.g., when an update or
       * lifecycle write confirms the record's new state).
       *
       * @since 1.0.0
       *
       * @param {InspectionOutput} inspection - Inspection to mark as active.
       *
       * @returns {void} No return value.
       */
      setInspection(inspection: InspectionOutput): void {
        patchState(store, {
          selectedInspection: inspection,
          getCallState: successCallState(inspection),
        });
      },

      /**
       * Method resolveInspection
       * @method resolveInspection
       *
       * @description
       * Seeds the active inspection from the route ids without blocking:
       * the fetch runs fire-and-forget (`switchMap` cancels a superseded one)
       * while `getCallState` reports progress, so the detail page can paint
       * its skeleton immediately. Switching to a different inspection clears
       * the previous record first; re-resolving the same id keeps it on
       * screen. On failure the store dispatches `getFailed` (global toast)
       * and leaves the redirect decision to the page.
       *
       * @since 1.0.0
       *
       * @param {{ organizationId: string; inspectionId: string }} params - Organization and inspection identifiers.
       *
       * @returns {void} No return value — progress is observable through `getCallState`.
       */
      resolveInspection: rxMethod<{
        readonly organizationId: string;
        readonly inspectionId: string;
      }>(
        pipe(
          tap(({ inspectionId }): void => {
            const current: InspectionOutput | null = store.selectedInspection();

            patchState(store, {
              selectedInspection: current && current.id === inspectionId ? current : null,
              getCallState: pendingCallState(),
            });
          }),
          switchMap(({ organizationId, inspectionId }) =>
            inspectionService.get(organizationId, inspectionId).pipe(
              tapResponse({
                next: (inspection: InspectionOutput): void => {
                  patchState(store, {
                    selectedInspection: inspection,
                    getCallState: successCallState(inspection),
                  });
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { getCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    activeInspectionStoreEvents.getFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load inspection'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method clearSelectedInspection
       * @method clearSelectedInspection
       *
       * @description
       * Clears the active inspection selection.
       *
       * @since 1.0.0
       *
       * @return {void} No return value.
       */
      clearSelectedInspection(): void {
        patchState(store, { selectedInspection: null });
      },

      /**
       * Method clear
       * @method clear
       *
       * @description
       * Resets the entire active-inspection state to idle.
       * Should be called on logout.
       *
       * @since 1.0.0
       *
       * @returns {void} No return value.
       */
      clear(): void {
        patchState(store, INITIAL_ACTIVE_INSPECTION_STATE);
      },
    }),
  ),
  //#endregion
);

/**
 * Type ActiveInspectionStore
 * @type ActiveInspectionStore
 *
 * @description
 * Instance type of the {@link ActiveInspectionStore} signal store.
 *
 * @version 1.0.0
 */
export type ActiveInspectionStore = InstanceType<typeof ActiveInspectionStore>;
