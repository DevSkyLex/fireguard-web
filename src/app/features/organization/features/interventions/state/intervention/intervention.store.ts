import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  addEntity,
  removeEntity,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, mergeMap, pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  isCallError,
  pendingCallState,
  successCallState,
  successFeedback,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { interventionStoreEvents } from './events';
import type {
  InterventionCreateCommand,
  InterventionDeleteCommand,
  InterventionListLoadCommand,
  InterventionState,
  InterventionTransitionCommand,
} from './models';

/**
 * Function transitionFailureMessage
 * @function transitionFailureMessage
 *
 * @description
 * Maps a normalized `transition` failure to a user-facing fallback message,
 * distinguishing the workflow-relevant HTTP statuses (stale revision,
 * forbidden, invalid transition) from a generic failure.
 *
 * @access private
 * @since 1.2.0
 *
 * @param {StoreError} error - Normalized transition error.
 *
 * @return {string} Localized fallback message for the failure toast.
 */
function transitionFailureMessage(error: StoreError): string {
  switch (error.code) {
    case 412:
      return $localize`:@@intervention.store.transitionStale:This intervention changed since it was loaded. Refresh and try again.`;
    case 422:
      return $localize`:@@intervention.store.transitionInvalid:This status change is not allowed from the intervention's current status.`;
    case 403:
      return $localize`:@@intervention.store.transitionForbidden:You do not have permission to change this intervention's status.`;
    default:
      return $localize`:@@intervention.store.transitionFailed:The intervention status could not be updated.`;
  }
}

/**
 * Function deleteFailureMessage
 * @function deleteFailureMessage
 *
 * @description
 * Maps a normalized `delete` failure to a user-facing fallback message. A 409
 * means the intervention's current status refuses deletion (only draft or
 * abandoned interventions may be deleted); a 403 means the member lacks the
 * permission.
 *
 * @access private
 * @since 4.1.0
 *
 * @param {StoreError} error - Normalized delete error.
 *
 * @return {string} Localized fallback message for the failure toast.
 */
function deleteFailureMessage(error: StoreError): string {
  switch (error.code) {
    case 409:
      return $localize`:@@intervention.store.deleteConflict:Only draft or abandoned interventions can be deleted.`;
    case 403:
      return $localize`:@@intervention.store.deleteForbidden:You do not have permission to delete this intervention.`;
    default:
      return $localize`:@@intervention.workspace.deleteFailed:The intervention could not be deleted.`;
  }
}

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
  transitionCallState: idleCallState<InterventionOutput>(),
  deleteCallState: idleCallState(),
} as const;
//#endregion

/**
 * Store InterventionStore
 * @const InterventionStore
 *
 * @description
 * Component-scoped NgRx SignalStore for intervention list and creation workflows.
 * The store owns request state and normalized intervention entities; route pages
 * remain responsible for navigation and UI composition. `load` fetches exactly
 * the server page the caller asked for — pagination, filtering and sorting are
 * server-side, and the entities ARE the current page.
 *
 * @version 4.1.0
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
     * Computed createError.
     *
     * @description
     * Error from the last create operation, if any. Exposed so the page can hand a
     * 422 back to the form and land it on the field the server refused.
     *
     * @since 1.1.0
     *
     * @type {StoreError | null}
     */
    createError: computed<StoreError | null>(() => store.createCallState().error),

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

    /**
     * Computed orderedIds.
     *
     * @description
     * Ids of the cached interventions in their current entity order (the
     * order of the last successful `load`). The detail page reads this to
     * derive prev/next navigation without duplicating the list ordering.
     */
    orderedIds: computed<readonly string[]>(() => store.interventionIds() as readonly string[]),
  })),
  withMethods(
    (
      store,
      dispatcher = inject<Dispatcher>(Dispatcher),
      interventionService = inject<InterventionService>(InterventionService),
    ) => {
      /**
       * Pre-transition entity snapshots keyed by intervention id, kept only
       * for the lifetime of an in-flight `transition` call so a failure can
       * roll back the optimistic patch without a second fetch.
       */
      const transitionSnapshots = new Map<string, InterventionOutput>();

      return {
        /**
         * Method load
         * @method load
         *
         * @description
         * Loads exactly one server page of interventions for the active
         * organization — `page` and `itemsPerPage` travel in the options, and
         * the entity collection is replaced by that page. `totalInterventions`
         * carries the server's `totalItems`, which is what the page's paginator
         * renders; there is no client-side cap or accumulation anymore.
         *
         * @access public
         * @since 1.0.0
         *
         * @type {RxMethod<InterventionListLoadCommand>}
         */
        load: rxMethod<InterventionListLoadCommand>(
          pipe(
            tap(() => patchState(store, { listCallState: pendingCallState() })),
            switchMap(({ organizationId, options }) =>
              interventionService
                .list(organizationId, { order: { createdAt: 'desc' }, ...options })
                .pipe(
                  tapResponse({
                    next: (collection) => {
                      patchState(
                        store,
                        setAllEntities([...collection.member], { collection: 'intervention' }),
                        {
                          totalInterventions: collection.totalItems,
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
            tap(() =>
              patchState(store, { createCallState: pendingCallState<InterventionOutput>() }),
            ),
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
         * Method transition
         * @method transition
         *
         * @description
         * Applies a single status transition to a cached intervention: patches
         * the entity's `status` optimistically, sends the PATCH with the
         * caller-supplied revision as `If-Match`, and merges the fresh
         * `InterventionOutput` (updated `revision`/`allowedTransitions`) on
         * success. On failure the entity is rolled back to its pre-transition
         * snapshot and a `transitionFailed` event is dispatched so the app-wide
         * feedback listener surfaces a toast — the message is tailored for a
         * stale revision (412), an invalid transition (422) and a forbidden
         * change (403). Requests flow through `mergeMap`, not `switchMap`:
         * board drag-drop can fire several transitions in quick succession,
         * each keyed by its own id with its own optimistic snapshot/rollback,
         * and `switchMap` would cancel an in-flight PATCH — dropping its
         * success/rollback handlers and leaving a card visually moved while the
         * server never confirmed.
         *
         * ⚠️ Zoneless: this method reads and writes `transitionCallState`. Never
         * call it from inside a tracked `effect()` without wrapping the call in
         * `untracked()` — doing so re-triggers the effect on every state write
         * and can spin into an infinite loop.
         *
         * @access public
         * @since 1.2.0
         *
         * @type {RxMethod<InterventionTransitionCommand>}
         */
        transition: rxMethod<InterventionTransitionCommand>(
          pipe(
            tap(({ id, status }) => {
              const snapshot = store.interventionEntityMap()[id];
              if (snapshot) {
                transitionSnapshots.set(id, snapshot);
                patchState(
                  store,
                  updateEntity({ id, changes: { status } }, { collection: 'intervention' }),
                );
              }
              patchState(store, { transitionCallState: pendingCallState<InterventionOutput>() });
            }),
            mergeMap(({ id, status, revision }) =>
              interventionService.update(id, { status }, revision).pipe(
                tapResponse({
                  next: (updated) => {
                    transitionSnapshots.delete(id);
                    patchState(
                      store,
                      updateEntity({ id, changes: updated }, { collection: 'intervention' }),
                      { transitionCallState: successCallState(updated) },
                    );
                  },
                  error: (error: unknown) => {
                    const snapshot = transitionSnapshots.get(id);
                    transitionSnapshots.delete(id);
                    if (snapshot) {
                      patchState(
                        store,
                        updateEntity({ id, changes: snapshot }, { collection: 'intervention' }),
                      );
                    }
                    const storeError = toStoreError(error);
                    patchState(store, { transitionCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      interventionStoreEvents.transitionFailed(
                        toStoreFailureEventPayload(
                          storeError,
                          transitionFailureMessage(storeError),
                        ),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        /**
         * Method delete
         * @method delete
         *
         * @description
         * Deletes a cached intervention (`InterventionService.remove`). Only
         * draft or abandoned interventions are accepted by the API — any other
         * status is refused with a 409, surfaced via `deleteFailed`. Uses
         * `mergeMap` (not `switchMap`) so a bulk selection can delete several
         * interventions concurrently, each keyed by its own request; on success
         * the entity is dropped from the cached collection and the total count
         * decremented, and `deleteSucceeded` drives a confirmation toast.
         *
         * @access public
         * @since 4.1.0
         *
         * @type {RxMethod<InterventionDeleteCommand>}
         */
        delete: rxMethod<InterventionDeleteCommand>(
          pipe(
            tap(() => patchState(store, { deleteCallState: pendingCallState() })),
            mergeMap(({ interventionId, revision }) =>
              interventionService.remove(interventionId, revision).pipe(
                tapResponse({
                  next: () => {
                    patchState(
                      store,
                      removeEntity(interventionId, { collection: 'intervention' }),
                      {
                        totalInterventions: Math.max(0, store.totalInterventions() - 1),
                        deleteCallState: successCallState(null),
                      },
                    );
                    dispatcher.dispatch(
                      interventionStoreEvents.deleteSucceeded(
                        successFeedback(
                          $localize`:@@intervention.delete.toast:Intervention deleted`,
                        ),
                      ),
                    );
                  },
                  error: (error: unknown) => {
                    const storeError = toStoreError(error);
                    patchState(store, { deleteCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      interventionStoreEvents.deleteFailed(
                        toStoreFailureEventPayload(storeError, deleteFailureMessage(storeError)),
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
      };
    },
  ),
);

/**
 * Type InterventionStoreType
 *
 * @description
 * Defines the supported intervention store type values.
 */
export type InterventionStoreType = InstanceType<typeof InterventionStore>;
