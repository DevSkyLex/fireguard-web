import { computed, inject } from '@angular/core';
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
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { activeInterventionStoreEvents } from './events';
import type { ActiveInterventionState } from './models';

//#region Initial State
/**
 * Constant INITIAL_ACTIVE_INTERVENTION_STATE
 * @const INITIAL_ACTIVE_INTERVENTION_STATE
 *
 * @description
 * Initial state for the root-provided ActiveInterventionStore: no selected
 * intervention and an idle fetch state.
 *
 * @since 1.0.0
 *
 * @type {ActiveInterventionState}
 */
const INITIAL_ACTIVE_INTERVENTION_STATE: ActiveInterventionState = {
  selectedIntervention: null,
  getCallState: idleCallState(),
} as const;
//#endregion

/**
 * Store ActiveInterventionStore
 * @const ActiveInterventionStore
 *
 * @description
 * Root-provided NgRx SignalStore tracking the currently viewed intervention so
 * route resolvers can populate the breadcrumb, page title and header banner
 * before the detail route activates. Mirrors the other `active-*` stores; the
 * component-scoped {@link InterventionWorkspaceStore} still owns the full
 * workspace (work items, changes, issues) and its offline handling.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ActiveInterventionStore = signalStore(
  { providedIn: 'root' },

  withState<ActiveInterventionState>(INITIAL_ACTIVE_INTERVENTION_STATE),

  withComputed((store) => ({
    /**
     * Computed isLoadingIntervention.
     *
     * @description
     * True while the selected intervention is being fetched.
     */
    isLoadingIntervention: computed<boolean>(() => store.getCallState().status === 'pending'),

    /**
     * Computed getError.
     *
     * @description
     * Normalized error from the last failed fetch, or null.
     */
    getError: computed<StoreError | null>(() => store.getCallState().error),
  })),

  withMethods(
    (
      store,
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
      interventionService: InterventionService = inject<InterventionService>(InterventionService),
    ) => ({
      /**
       * Method setIntervention
       * @method setIntervention
       *
       * @description
       * Stores an already-loaded intervention as the active one (e.g. seeded by
       * a sibling store) without an extra fetch.
       *
       * @access public
       * @since 1.0.0
       *
       * @param {InterventionOutput} intervention - Intervention to mark active.
       *
       * @returns {void}
       */
      setIntervention(intervention: InterventionOutput): void {
        patchState(store, {
          selectedIntervention: intervention,
          getCallState: successCallState(intervention),
        });
      },

      /**
       * Method resolveIntervention
       * @method resolveIntervention
       *
       * @description
       * Fetches the intervention matching the route id and stores it as the
       * active one. Returns the observable so resolvers can await it.
       *
       * @access public
       * @since 1.0.0
       *
       * @param {string} interventionId - Intervention identifier from the route.
       *
       * @returns {Observable<InterventionOutput>} The fetched intervention.
       */
      resolveIntervention(interventionId: string): Observable<InterventionOutput> {
        patchState(store, { getCallState: pendingCallState() });

        return interventionService.get(interventionId).pipe(
          tap({
            next: (intervention: InterventionOutput): void => {
              patchState(store, {
                selectedIntervention: intervention,
                getCallState: successCallState(intervention),
              });
            },
            error: (error: unknown): void => {
              const storeError: StoreError = toStoreError(error);
              patchState(store, { getCallState: errorCallState(storeError) });
              dispatcher.dispatch(
                activeInterventionStoreEvents.getFailed(
                  toStoreFailureEventPayload(storeError, 'Failed to load intervention'),
                ),
              );
            },
          }),
        );
      },

      /**
       * Method clearSelectedIntervention
       * @method clearSelectedIntervention
       *
       * @description
       * Clears the active intervention while keeping the fetch state.
       *
       * @access public
       * @since 1.0.0
       *
       * @returns {void}
       */
      clearSelectedIntervention(): void {
        patchState(store, { selectedIntervention: null });
      },

      /**
       * Method clear
       * @method clear
       *
       * @description
       * Resets the store to its initial state.
       *
       * @access public
       * @since 1.0.0
       *
       * @returns {void}
       */
      clear(): void {
        patchState(store, INITIAL_ACTIVE_INTERVENTION_STATE);
      },
    }),
  ),
);

/**
 * Type ActiveInterventionStoreType
 *
 * @description
 * Instance type of the {@link ActiveInterventionStore}.
 */
export type ActiveInterventionStoreType = InstanceType<typeof ActiveInterventionStore>;
