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
import { ChecklistService } from '@features/organization/features/checklists/data-access';
import type { ChecklistOutput } from '@features/organization/features/checklists/models';
import type { ActiveChecklistState } from './models';
import { activeChecklistStoreEvents } from './events';

//#region Initial State
/**
 * Constant INITIAL_ACTIVE_CHECKLIST_STATE
 * @const INITIAL_ACTIVE_CHECKLIST_STATE
 *
 * @description
 * Initial state for the ActiveChecklistStore, representing an idle
 * state with no selected checklist and no ongoing operations.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
const INITIAL_ACTIVE_CHECKLIST_STATE: ActiveChecklistState = {
  selectedChecklist: null,
  getCallState: idleCallState(),
} as const;
//#endregion

/**
 * Store ActiveChecklistStore
 * @const ActiveChecklistStore
 *
 * @description
 * Root-level NgRx SignalStore that tracks only the **currently active /
 * selected checklist** and its associated loading state.
 *
 * This store is intentionally minimal — its single responsibility is
 * answering "which checklist are we looking at right now?". All list
 * management and CRUD live in the component-scoped {@link ChecklistStore}.
 *
 * Provided at the root level (`providedIn: 'root'`) so that any service or
 * component can read `selectedChecklist` without providing anything.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ActiveChecklistStore = signalStore(
  { providedIn: 'root' },

  //#region Features
  /**
   * Feature withState
   *
   * @description
   * Adds the ActiveChecklistState to the store, initialized with
   * INITIAL_ACTIVE_CHECKLIST_STATE.
   *
   * @since 1.0.0
   *
   * @returns {ActiveChecklistState} The initial state for the active checklist store.
   */
  withState<ActiveChecklistState>(INITIAL_ACTIVE_CHECKLIST_STATE),

  /**
   * Feature withComputed
   *
   * @description
   * Adds computed properties to the store for common
   * derived state related to the active checklist.
   *
   * @since 1.0.0
   *
   * @param {SignalStore} store - The store instance to which the computed properties will be added.
   *
   * @returns {object} An object containing the computed properties to add to the store.
   */
  withComputed((store) => ({
    /**
     * Property isLoadingChecklist
     *
     * @description
     * True while the checklist is being resolved / fetched.
     *
     * @since 1.0.0
     *
     * @type {boolean} True if the get operation is currently loading, false otherwise.
     */
    isLoadingChecklist: computed<boolean>(() => store.getCallState().status === 'pending'),

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
   * Adds methods to the store for managing the active checklist state, including
   * setting the active checklist, resolving it by ID,
   * and clearing the selection.
   *
   * @since 1.0.0
   *
   * @param {SignalStore} store - The store instance to which the methods will be added.
   * @param {Dispatcher} dispatcher - The NgRx Signals event dispatcher, used to dispatch events on errors.
   * @param {ChecklistService} checklistService - The service used to fetch checklist data from the API.
   *
   * @returns {object} An object containing the methods to add to the store.
   */
  withMethods(
    (
      store,
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
      checklistService: ChecklistService = inject<ChecklistService>(ChecklistService),
    ) => ({
      /**
       * Method setChecklist
       * @method setChecklist
       *
       * @description
       * Directly sets the selected checklist (e.g., resolved from route data
       * by DashboardLayout after the resolver runs).
       *
       * @since 1.0.0
       *
       * @param {ChecklistOutput} checklist - Checklist to mark as active.
       *
       * @returns {void} No return value.
       */
      setChecklist(checklist: ChecklistOutput): void {
        patchState(store, {
          selectedChecklist: checklist,
          getCallState: successCallState(checklist),
        });
      },

      /**
       * Method resolveChecklist
       * @method resolveChecklist
       *
       * @description
       * Fetches a single checklist by organization ID and checklist ID and marks
       * it as the active one. Returns an Observable so Angular route resolvers
       * can await the result.
       *
       * @since 1.0.0
       *
       * @param {string} organizationId - Organization identifier.
       * @param {string} checklistId - Checklist identifier.
       *
       * @returns {Observable<ChecklistOutput>} Observable that emits the resolved
       * checklist or an error if it fails.
       */
      resolveChecklist(organizationId: string, checklistId: string): Observable<ChecklistOutput> {
        patchState(store, { getCallState: pendingCallState() });

        return checklistService.get(organizationId, checklistId).pipe(
          tap({
            next: (checklist: ChecklistOutput): void => {
              patchState(store, {
                selectedChecklist: checklist,
                getCallState: successCallState(checklist),
              });
            },
            error: (error: unknown): void => {
              const storeError: StoreError = toStoreError(error);
              patchState(store, { getCallState: errorCallState(storeError) });
              dispatcher.dispatch(
                activeChecklistStoreEvents.getFailed(
                  toStoreFailureEventPayload(storeError, 'Failed to load checklist'),
                ),
              );
            },
          }),
        );
      },

      /**
       * Method clearSelectedChecklist
       * @method clearSelectedChecklist
       *
       * @description
       * Clears the active checklist selection. Called by
       * {@link ChecklistStore} after a successful archive when the
       * archived checklist was the currently active one.
       *
       * @since 1.0.0
       *
       * @return {void} No return value.
       */
      clearSelectedChecklist(): void {
        patchState(store, { selectedChecklist: null });
      },

      /**
       * Method clear
       * @method clear
       *
       * @description
       * Resets the entire active-checklist state to idle.
       * Should be called on logout.
       *
       * @since 1.0.0
       *
       * @returns {void} No return value.
       */
      clear(): void {
        patchState(store, INITIAL_ACTIVE_CHECKLIST_STATE);
      },
    }),
  ),
  //#endregion
);

/**
 * Type ActiveChecklistStore
 * @type ActiveChecklistStore
 *
 * @description
 * Instance type of the {@link ActiveChecklistStore} signal store.
 *
 * @version 1.0.0
 */
export type ActiveChecklistStore = InstanceType<typeof ActiveChecklistStore>;
