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
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type { ActiveEquipmentState } from './models';
import { activeEquipmentStoreEvents } from './events';

//#region Initial State
/**
 * Constant INITIAL_ACTIVE_EQUIPMENT_STATE
 * @const INITIAL_ACTIVE_EQUIPMENT_STATE
 *
 * @description
 * Initial state for the ActiveEquipmentStore, representing an idle
 * state with no selected equipment and no ongoing operations.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
const INITIAL_ACTIVE_EQUIPMENT_STATE: ActiveEquipmentState = {
  selectedEquipment: null,
  getCallState: idleCallState(),
} as const;
//#endregion

/**
 * Store ActiveEquipmentStore
 * @const ActiveEquipmentStore
 *
 * @description
 * Root-level NgRx SignalStore that tracks only the **currently active /
 * selected equipment** and its associated loading state.
 *
 * This store is intentionally minimal — its single responsibility is
 * answering "which equipment are we looking at right now?". All list
 * management, CRUD, lifecycle operations, attachments and tags live in
 * the component-scoped {@link EquipmentStore}.
 *
 * Provided at the root level (`providedIn: 'root'`) so that any service or
 * component can read `selectedEquipment` without providing anything.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ActiveEquipmentStore = signalStore(
  { providedIn: 'root' },

  //#region Features
  /**
   * Feature withState
   *
   * @description
   * Adds the ActiveEquipmentState to the store, initialized with
   * INITIAL_ACTIVE_EQUIPMENT_STATE.
   *
   * @since 1.0.0
   *
   * @returns {ActiveEquipmentState} The initial state for the active equipment store.
   */
  withState<ActiveEquipmentState>(INITIAL_ACTIVE_EQUIPMENT_STATE),

  /**
   * Feature withComputed
   *
   * @description
   * Adds computed properties to the store for common
   * derived state related to the active equipment.
   *
   * @since 1.0.0
   *
   * @param {SignalStore} store - The store instance to which the computed properties will be added.
   *
   * @returns {object} An object containing the computed properties to add to the store.
   */
  withComputed((store) => ({
    /**
     * Property isLoadingEquipment
     *
     * @description
     * True while the equipment is being resolved / fetched.
     *
     * @since 1.0.0
     *
     * @type {boolean} True if the get operation is currently loading, false otherwise.
     */
    isLoadingEquipment: computed<boolean>(() => store.getCallState().status === 'pending'),

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
   * Adds methods to the store for managing the active equipment state, including
   * setting the active equipment, resolving it by ID,
   * and clearing the selection.
   *
   * @since 1.0.0
   *
   * @param {SignalStore} store - The store instance to which the methods will be added.
   * @param {Dispatcher} dispatcher - The NgRx Signals event dispatcher, used to dispatch events on errors.
   * @param {EquipmentService} equipmentService - The service used to fetch equipment data from the API.
   *
   * @returns {object} An object containing the methods to add to the store.
   */
  withMethods(
    (
      store,
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
      equipmentService: EquipmentService = inject<EquipmentService>(EquipmentService),
    ) => ({
      /**
       * Method setEquipment
       * @method setEquipment
       *
       * @description
       * Directly sets the selected equipment (e.g., resolved from route data
       * by DashboardLayout after the resolver runs).
       *
       * @since 1.0.0
       *
       * @param {EquipmentOutput} equipment - Equipment to mark as active.
       *
       * @returns {void} No return value.
       */
      setEquipment(equipment: EquipmentOutput): void {
        patchState(store, {
          selectedEquipment: equipment,
          getCallState: successCallState(equipment),
        });
      },

      /**
       * Method resolveEquipment
       * @method resolveEquipment
       *
       * @description
       * Fetches a single equipment by organization ID and equipment ID and marks
       * it as the active one. Returns an Observable so Angular route resolvers
       * can await the result.
       *
       * @since 1.0.0
       *
       * @param {string} organizationId - Organization identifier.
       * @param {string} equipmentId - Equipment identifier.
       *
       * @returns {Observable<EquipmentOutput>} Observable that emits the resolved
       * equipment or an error if it fails.
       */
      resolveEquipment(organizationId: string, equipmentId: string): Observable<EquipmentOutput> {
        patchState(store, { getCallState: pendingCallState() });

        return equipmentService.get(organizationId, equipmentId).pipe(
          tap({
            next: (equipment: EquipmentOutput): void => {
              patchState(store, {
                selectedEquipment: equipment,
                getCallState: successCallState(equipment),
              });
            },
            error: (error: unknown): void => {
              const storeError: StoreError = toStoreError(error);
              patchState(store, { getCallState: errorCallState(storeError) });
              dispatcher.dispatch(
                activeEquipmentStoreEvents.getFailed(
                  toStoreFailureEventPayload(storeError, 'Failed to load equipment'),
                ),
              );
            },
          }),
        );
      },

      /**
       * Method clearSelectedEquipment
       * @method clearSelectedEquipment
       *
       * @description
       * Clears the active equipment selection.
       *
       * @since 1.0.0
       *
       * @return {void} No return value.
       */
      clearSelectedEquipment(): void {
        patchState(store, { selectedEquipment: null });
      },

      /**
       * Method clear
       * @method clear
       *
       * @description
       * Resets the entire active-equipment state to idle.
       * Should be called on logout.
       *
       * @since 1.0.0
       *
       * @returns {void} No return value.
       */
      clear(): void {
        patchState(store, INITIAL_ACTIVE_EQUIPMENT_STATE);
      },
    }),
  ),
  //#endregion
);

/**
 * Type ActiveEquipmentStore
 * @type ActiveEquipmentStore
 *
 * @description
 * Instance type of the {@link ActiveEquipmentStore} signal store.
 *
 * @version 1.0.0
 */
export type ActiveEquipmentStore = InstanceType<typeof ActiveEquipmentStore>;
