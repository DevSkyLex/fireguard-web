import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { addEntity, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
} from '@core/request-state';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { interventionStoreEvents } from './events';
import type {
  InterventionCreateCommand,
  InterventionListLoadCommand,
  InterventionState,
} from './models';

//#region Initial State
/**
 * Constant INITIAL_INTERVENTION_STATE
 * @const INITIAL_INTERVENTION_STATE
 *
 * @description
 * Initial state for the component-scoped InterventionStore.
 *
 * @since 1.0.0
 *
 * @type {InterventionState}
 */
const INITIAL_INTERVENTION_STATE: InterventionState = {
  totalInterventions: 0,
  listCallState: idleCallState(),
  createCallState: idleCallState<InterventionOutput>(),
} as const;
//#endregion

/**
 * Store InterventionStore
 * @const InterventionStore
 *
 * @description
 * Component-scoped NgRx SignalStore for intervention list and creation workflows.
 * The store owns request state and normalized intervention entities; route pages
 * remain responsible for navigation and UI composition.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const InterventionStore = signalStore(
  withEntities({ entity: type<InterventionOutput>(), collection: 'intervention' }),
  withState<InterventionState>(INITIAL_INTERVENTION_STATE),
  withComputed((store) => ({
    /**
     * Computed interventionList.
     *
     * @description
     * All cached interventions for the active organization.
     */
    interventionList: computed<ReadonlyArray<InterventionOutput>>(() =>
      store.interventionEntities(),
    ),

    /**
     * Computed isLoadingInterventions.
     *
     * @description
     * True while the intervention list is loading.
     */
    isLoadingInterventions: computed<boolean>(() => store.listCallState().status === 'pending'),

    /**
     * Computed isCreating.
     *
     * @description
     * True while intervention creation is in-flight.
     */
    isCreating: computed<boolean>(() => store.createCallState().status === 'pending'),

    /**
     * Computed createdIntervention.
     *
     * @description
     * Last intervention created by the store, if any.
     */
    createdIntervention: computed<InterventionOutput | null>(() => store.createCallState().data),

    /**
     * Computed isEmpty.
     *
     * @description
     * True when there are no interventions and the list is not loading.
     */
    isEmpty: computed<boolean>(
      () => store.interventionIds().length === 0 && store.listCallState().status !== 'pending',
    ),
  })),
  withMethods(
    (
      store,
      dispatcher = inject<Dispatcher>(Dispatcher),
      interventionService = inject<InterventionService>(InterventionService),
    ) => ({
      /**
       * Method load
       * @method load
       *
       * @description
       * Loads interventions for the active organization.
       *
       * @access public
       * @since 1.0.0
       *
       * @type {RxMethod<{ organizationId: string }>}
       */

      load: rxMethod<InterventionListLoadCommand>(
        pipe(
          tap(() => patchState(store, { listCallState: pendingCallState() })),
          switchMap(({ organizationId, options }) =>
            interventionService.list(organizationId, options).pipe(
              tapResponse({
                next: (response) => {
                  patchState(
                    store,
                    setAllEntities([...response.member], { collection: 'intervention' }),
                    {
                      totalInterventions: response.totalItems,
                      listCallState: successCallState(null),
                    },
                  );
                },
                error: (error: unknown) => {
                  const storeError = toStoreError(error);
                  patchState(store, { listCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    interventionStoreEvents.listFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load interventions'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method create
       * @method create
       *
       * @description
       * Creates a intervention and stores it in the local entity collection.
       * Uses `exhaustMap` to avoid duplicate submissions.
       *
       * @access public
       * @since 1.0.0
       *
       * @type {RxMethod<{ organizationId: string; name: string }>}
       */

      create: rxMethod<InterventionCreateCommand>(
        pipe(
          tap(() => patchState(store, { createCallState: pendingCallState<InterventionOutput>() })),
          exhaustMap(({ organizationId, name }) =>
            interventionService.create(organizationId, name).pipe(
              tapResponse({
                next: (intervention) => {
                  patchState(store, addEntity(intervention, { collection: 'intervention' }), {
                    totalInterventions: store.totalInterventions() + 1,
                    createCallState: successCallState(intervention),
                  });
                },
                error: (error: unknown) => {
                  const storeError = toStoreError(error);
                  patchState(store, { createCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    interventionStoreEvents.createFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to create intervention'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method clearCreatedIntervention
       * @method clearCreatedIntervention
       *
       * @description
       * Clears the last created intervention navigation handoff.
       *
       * @access public
       * @since 1.0.0
       *
       * @return {void}
       */
      clearCreatedIntervention(): void {
        patchState(store, { createCallState: idleCallState<InterventionOutput>() });
      },
    }),
  ),
);

/**
 * Type InterventionStoreType
 *
 * @description
 * Defines the supported intervention store type values.
 */
export type InterventionStoreType = InstanceType<typeof InterventionStore>;
