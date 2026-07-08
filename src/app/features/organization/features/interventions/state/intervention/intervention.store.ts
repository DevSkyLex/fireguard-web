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
  isCallError,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
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
     * Computed listError.
     *
     * @description
     * Normalized error from the last failed list load, or `null` when the load
     * is idle, pending or successful. Lets the page distinguish a failed fetch
     * from a legitimately empty collection.
     */
    listError: computed<StoreError | null>(() => {
      const state = store.listCallState();

      return isCallError(state) ? state.error : null;
    }),

    /**
     * Computed isEmpty.
     *
     * @description
     * True only when there are no interventions and the last list load neither
     * is in flight nor failed — a failed load surfaces an error, not the empty
     * state.
     */
    isEmpty: computed<boolean>(() => {
      const status = store.listCallState().status;

      return store.interventionIds().length === 0 && status !== 'pending' && status !== 'error';
    }),
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
       * Creates an intervention from the guided-creation payload, stores it in
       * the local entity collection, records the success in `createCallState`
       * (so `createdIntervention`/`isCreating` drive the page) and dispatches a
       * typed `created` event for navigation. Uses `exhaustMap` to avoid
       * duplicate submissions.
       *
       * @access public
       * @since 1.0.0
       *
       * @type {RxMethod<InterventionCreateCommand>}
       */

      create: rxMethod<InterventionCreateCommand>(
        pipe(
          tap(() => patchState(store, { createCallState: pendingCallState<InterventionOutput>() })),
          exhaustMap(
            ({
              organizationId,
              name,
              type: interventionType,
              site,
              responsible,
              participants,
              priority,
              plannedStartAt,
              dueAt,
            }) =>
              interventionService
                .create(organizationId, name, {
                  type: interventionType,
                  site,
                  responsible,
                  participants,
                  priority,
                  plannedStartAt,
                  dueAt,
                })
                .pipe(
                  tapResponse({
                    next: (intervention) => {
                      patchState(store, addEntity(intervention, { collection: 'intervention' }), {
                        totalInterventions: store.totalInterventions() + 1,
                        createCallState: successCallState(intervention),
                      });
                      dispatcher.dispatch(interventionStoreEvents.created(intervention));
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
