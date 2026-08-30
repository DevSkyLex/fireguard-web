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
import {
  catchError,
  exhaustMap,
  from,
  map,
  mergeMap,
  pipe,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
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
import {
  InterventionService,
  InterventionTemplateService,
} from '@features/organization/features/interventions/data-access';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionDuplicatePrefill,
  InterventionOutput,
  InterventionTemplateInstantiationOutput,
} from '@features/organization/features/interventions/models';
import { interventionStoreEvents } from './events';
import type {
  InterventionAssignCommand,
  InterventionCreateCommand,
  InterventionDeleteCommand,
  InterventionInstantiateFromTemplateCommand,
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
 * Function assignFailureMessage
 * @function assignFailureMessage
 *
 * @description
 * Maps a normalized `assignResponsible` failure to a user-facing fallback
 * message, distinguishing the workflow-relevant HTTP statuses (stale
 * revision, forbidden, status refuses assignment) from a generic failure.
 *
 * @access private
 * @since 4.2.0
 *
 * @param {StoreError} error - Normalized assign error.
 *
 * @return {string} Localized fallback message for the failure toast.
 */
function assignFailureMessage(error: StoreError): string {
  switch (error.code) {
    case 412:
      return $localize`:@@intervention.store.assignStale:This intervention changed since it was loaded. Refresh and try again.`;
    case 409:
      return $localize`:@@intervention.store.assignConflict:This intervention cannot be assigned in its current status.`;
    case 403:
      return $localize`:@@intervention.store.assignForbidden:You do not have permission to assign this intervention.`;
    default:
      return $localize`:@@intervention.store.assignFailed:The intervention could not be assigned.`;
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

/**
 * Function instantiateFailureMessage
 * @function instantiateFailureMessage
 *
 * @description
 * Maps a normalized `instantiateFromTemplate` failure to a user-facing
 * fallback message.
 *
 * @access private
 * @since 4.3.0
 *
 * @param {StoreError} error - Normalized instantiate error.
 *
 * @return {string} Localized fallback message for the failure toast.
 */
function instantiateFailureMessage(error: StoreError): string {
  switch (error.code) {
    case 404:
      return $localize`:@@intervention.store.instantiateNotFound:This template no longer exists.`;
    case 403:
      return $localize`:@@intervention.store.instantiateForbidden:You do not have permission to use this template.`;
    default:
      return $localize`:@@intervention.store.instantiateFailed:The intervention could not be created from this template.`;
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
  servedFromLocalCache: false,
  createCallState: idleCallState<InterventionOutput>(),
  transitionCallState: idleCallState<InterventionOutput>(),
  transitioningInterventionIds: [],
  deleteCallState: idleCallState(),
  assignCallState: idleCallState<InterventionOutput>(),
  instantiateCallState: idleCallState<InterventionTemplateInstantiationOutput>(),
  pendingDuplicatePrefill: null,
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
 * @version 4.5.0
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
     * Computed isDeleting.
     *
     * @description
     * True while a delete write is in-flight, driving the confirm dialog's
     * busy discipline — its action button `[disabled]` and `[disableClose]`.
     *
     * @since 4.4.0
     * @type {boolean}
     */
    isDeleting: computed<boolean>(() => store.deleteCallState().status === 'pending'),

    /**
     * Computed deleteError.
     *
     * @description
     * Error from the last delete write, if any — surfaced in the confirm
     * dialog rather than a page-level toast only.
     *
     * @since 4.4.0
     * @type {StoreError | null}
     */
    deleteError: computed<StoreError | null>(() => store.deleteCallState().error),

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
     * Computed isInstantiatingFromTemplate.
     *
     * @description
     * True while instantiating an intervention draft from a template is
     * in-flight.
     *
     * @since 4.3.0
     */
    isInstantiatingFromTemplate: computed<boolean>(
      () => store.instantiateCallState().status === 'pending',
    ),

    /**
     * Computed instantiateFromTemplateError.
     *
     * @description
     * Error from the last template instantiation, if any.
     *
     * @since 4.3.0
     *
     * @type {StoreError | null}
     */
    instantiateFromTemplateError: computed<StoreError | null>(
      () => store.instantiateCallState().error,
    ),

    /**
     * Computed createdInterventionId.
     *
     * @description
     * Identifier of the intervention draft to navigate to, from whichever
     * creation path last succeeded — the manual guided-creation form
     * ({@link createdIntervention}) or a template instantiation. The
     * instantiate endpoint returns only `{ interventionId, number }`, not a
     * full {@link InterventionOutput}, so this is the single signal the page
     * watches to close the creation sheet and navigate, regardless of which
     * path produced it.
     *
     * @since 4.3.0
     *
     * @type {string | null}
     */
    createdInterventionId: computed<string | null>(
      () =>
        store.createCallState().data?.id ??
        store.instantiateCallState().data?.interventionId ??
        null,
    ),

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
      templateService = inject<InterventionTemplateService>(InterventionTemplateService),
      connectivity = inject<ConnectivityService>(ConnectivityService),
      offline = inject<InterventionOfflineService>(InterventionOfflineService),
    ) => {
      /**
       * Pre-transition entity snapshots keyed by intervention id, kept only
       * for the lifetime of an in-flight `transition` call so a failure can
       * roll back the optimistic patch without a second fetch.
       */
      const transitionSnapshots = new Map<string, InterventionOutput>();

      /**
       * Pre-assignment entity snapshots keyed by intervention id, kept only
       * for the lifetime of an in-flight `assignResponsible` call so a
       * failure can roll back the optimistic patch without a second fetch.
       */
      const assignSnapshots = new Map<string, InterventionOutput>();

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
                  map((collection) => ({ collection, fromCache: false })),
                  /*
                   * A lost connection falls back to this device's own snapshot
                   * rather than to an error state. The detail workspace has
                   * always been offline-first; the list had not, which made the
                   * workspace unreachable by navigation the moment the network
                   * dropped. Only a genuine network failure takes this branch —
                   * a 4xx/5xx still surfaces as an error, since retrying local
                   * data would hide a real refusal.
                   */
                  catchError((error: unknown) =>
                    connectivity.isNetworkFailure(error)
                      ? from(offline.listInterventions(organizationId)).pipe(
                          map((interventions) => {
                            if (interventions.length === 0) throw error;

                            return {
                              collection: {
                                member: interventions,
                                totalItems: interventions.length,
                              },
                              fromCache: true,
                            };
                          }),
                        )
                      : throwError(() => error),
                  ),
                  tapResponse({
                    next: ({ collection, fromCache }) => {
                      patchState(
                        store,
                        setAllEntities([...collection.member], { collection: 'intervention' }),
                        {
                          totalInterventions: collection.totalItems,
                          listCallState: successCallState(null),
                          servedFromLocalCache: fromCache,
                        },
                      );
                    },
                    error: (error: unknown) => {
                      const storeError = toStoreError(error);
                      patchState(store, {
                        listCallState: errorCallState(storeError),
                        servedFromLocalCache: false,
                      });
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
         * Method instantiateFromTemplate
         * @method instantiateFromTemplate
         *
         * @description
         * Instantiates an intervention draft from a template — the "start
         * from a template" alternative to {@link create} offered atop the
         * same creation sheet. Records the success in `instantiateCallState`
         * so `createdInterventionId`/`isInstantiatingFromTemplate` drive the
         * page exactly like a manual create does. Uses `exhaustMap` to avoid
         * duplicate submissions.
         *
         * @access public
         * @since 4.3.0
         *
         * @type {RxMethod<InterventionInstantiateFromTemplateCommand>}
         */
        instantiateFromTemplate: rxMethod<InterventionInstantiateFromTemplateCommand>(
          pipe(
            tap(() =>
              patchState(store, {
                instantiateCallState: pendingCallState<InterventionTemplateInstantiationOutput>(),
              }),
            ),
            exhaustMap(({ templateId, name, site, responsible, plannedStartAt }) =>
              templateService
                .instantiate(templateId, { name, site, responsible, plannedStartAt })
                .pipe(
                  tapResponse({
                    next: (result) => {
                      patchState(store, { instantiateCallState: successCallState(result) });
                    },
                    error: (error: unknown) => {
                      const storeError = toStoreError(error);
                      patchState(store, { instantiateCallState: errorCallState(storeError) });
                      dispatcher.dispatch(
                        interventionStoreEvents.instantiateFailed(
                          toStoreFailureEventPayload(
                            storeError,
                            instantiateFailureMessage(storeError),
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
         * server never confirmed. While a row's PATCH is in flight its id sits
         * in `transitioningInterventionIds`: the optimistic patch writes only
         * `status`, so the row's cached `allowedTransitions`/`revision` are
         * stale until the server entity lands, and consumers withhold that
         * row's transition controls rather than offer moves computed from the
         * pre-transition state.
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
              patchState(store, {
                transitionCallState: pendingCallState<InterventionOutput>(),
                transitioningInterventionIds: [...store.transitioningInterventionIds(), id],
              });
            }),
            mergeMap(({ id, status, revision }) =>
              interventionService.update(id, { status }, revision).pipe(
                tapResponse({
                  next: (updated) => {
                    transitionSnapshots.delete(id);
                    patchState(
                      store,
                      updateEntity({ id, changes: updated }, { collection: 'intervention' }),
                      {
                        transitionCallState: successCallState(updated),
                        transitioningInterventionIds: store
                          .transitioningInterventionIds()
                          .filter((pending: string): boolean => pending !== id),
                      },
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
                    patchState(store, {
                      transitionCallState: errorCallState(storeError),
                      transitioningInterventionIds: store
                        .transitioningInterventionIds()
                        .filter((pending: string): boolean => pending !== id),
                    });
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
         * Method assignResponsible
         * @method assignResponsible
         *
         * @description
         * Assigns a responsible member to a cached intervention: patches the
         * entity's `responsible` optimistically, sends the PATCH with the
         * caller-supplied revision as `If-Match`, and merges the fresh
         * `InterventionOutput` (updated `revision`/`allowedTransitions`) on
         * success. On failure the entity is rolled back to its
         * pre-assignment snapshot and an `assignFailed` event is dispatched
         * so the app-wide feedback listener surfaces a toast — the message
         * is tailored for a stale revision (412), a status that refuses
         * assignment (409) and a forbidden change (403). Requests flow
         * through `mergeMap`, not `switchMap`: a bulk assignment from the
         * list can fire several requests in quick succession, each keyed by
         * its own id with its own optimistic snapshot/rollback, and
         * `switchMap` would cancel an in-flight PATCH — dropping its
         * success/rollback handlers and leaving a row visually assigned
         * while the server never confirmed.
         *
         * @access public
         * @since 4.2.0
         *
         * @type {RxMethod<InterventionAssignCommand>}
         */
        assignResponsible: rxMethod<InterventionAssignCommand>(
          pipe(
            tap(({ interventionId, responsible }) => {
              const snapshot = store.interventionEntityMap()[interventionId];
              if (snapshot) {
                assignSnapshots.set(interventionId, snapshot);
                patchState(
                  store,
                  updateEntity(
                    { id: interventionId, changes: { responsible } },
                    { collection: 'intervention' },
                  ),
                );
              }
              patchState(store, { assignCallState: pendingCallState<InterventionOutput>() });
            }),
            mergeMap(({ interventionId, responsible, revision }) =>
              interventionService.update(interventionId, { responsible }, revision).pipe(
                tapResponse({
                  next: (updated) => {
                    assignSnapshots.delete(interventionId);
                    patchState(
                      store,
                      updateEntity(
                        { id: interventionId, changes: updated },
                        { collection: 'intervention' },
                      ),
                      { assignCallState: successCallState(updated) },
                    );
                    dispatcher.dispatch(
                      interventionStoreEvents.assignSucceeded(
                        successFeedback(
                          $localize`:@@intervention.assign.toast:Intervention assigned`,
                        ),
                      ),
                    );
                  },
                  error: (error: unknown) => {
                    const snapshot = assignSnapshots.get(interventionId);
                    assignSnapshots.delete(interventionId);
                    if (snapshot) {
                      patchState(
                        store,
                        updateEntity(
                          { id: interventionId, changes: snapshot },
                          { collection: 'intervention' },
                        ),
                      );
                    }
                    const storeError = toStoreError(error);
                    patchState(store, { assignCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      interventionStoreEvents.assignFailed(
                        toStoreFailureEventPayload(storeError, assignFailureMessage(storeError)),
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
         * Method resetDeleteState
         * @method resetDeleteState
         *
         * @description
         * Returns `deleteCallState` to idle — called when the delete confirm
         * dialog opens for a fresh target, so a previous attempt's error
         * never flashes in a dialog it does not belong to.
         *
         * @access public
         * @since 4.4.0
         *
         * @return {void}
         */
        resetDeleteState(): void {
          patchState(store, { deleteCallState: idleCallState() });
        },

        /**
         * Method clearCreatedIntervention
         * @method clearCreatedIntervention
         *
         * @description
         * Clears the last created intervention navigation handoff, from
         * either creation path — manual create or template instantiation.
         *
         * @access public
         * @since 1.0.0
         *
         * @return {void}
         */
        clearCreatedIntervention(): void {
          patchState(store, {
            createCallState: idleCallState<InterventionOutput>(),
            instantiateCallState: idleCallState<InterventionTemplateInstantiationOutput>(),
          });
        },

        /**
         * Method setPendingDuplicatePrefill
         * @method setPendingDuplicatePrefill
         *
         * @description
         * Records a "Duplicate" prefill ahead of navigating from the detail
         * page to the list route — the cross-route handoff `createdIntervention`
         * uses for the opposite direction. `InterventionsPage` consumes it once
         * and clears it via {@link clearPendingDuplicatePrefill}.
         *
         * @access public
         * @since 6.1.0
         *
         * @param {InterventionDuplicatePrefill} prefill - The values to seed the creation form with.
         *
         * @return {void}
         */
        setPendingDuplicatePrefill(prefill: InterventionDuplicatePrefill): void {
          patchState(store, { pendingDuplicatePrefill: prefill });
        },

        /**
         * Method clearPendingDuplicatePrefill
         * @method clearPendingDuplicatePrefill
         *
         * @description
         * Clears the cross-route "Duplicate" handoff once the list page has
         * read it, so a later plain "New intervention" never reuses it.
         *
         * @access public
         * @since 6.1.0
         *
         * @return {void}
         */
        clearPendingDuplicatePrefill(): void {
          patchState(store, { pendingDuplicatePrefill: null });
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
