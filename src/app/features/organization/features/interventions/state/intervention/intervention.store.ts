import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { addEntity, setAllEntities, updateEntity, withEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, exhaustMap, expand, mergeMap, pipe, reduce, switchMap, tap } from 'rxjs';
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
 * Constant INTERVENTION_LIST_PAGE_SIZE
 * @const INTERVENTION_LIST_PAGE_SIZE
 *
 * @description
 * Page size requested per `list` call while accumulating the capped
 * intervention set (see {@link INTERVENTION_LIST_MAX_ITEMS}). Matches the
 * backend's own `itemsPerPage` clamp.
 *
 * @since 1.3.0
 *
 * @type {number}
 */
const INTERVENTION_LIST_PAGE_SIZE = 100;

/**
 * Constant INTERVENTION_LIST_MAX_ITEMS
 * @const INTERVENTION_LIST_MAX_ITEMS
 *
 * @description
 * Maximum number of interventions `load` accumulates across pages before
 * stopping, so the List/Board/Calendar page never fetches an organization's
 * entire history at once. Reaching the cap sets `isListCapped` so the page can
 * surface a "refine your search" notice.
 *
 * @since 1.3.0
 *
 * @type {number}
 */
const INTERVENTION_LIST_MAX_ITEMS = 500;

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
  isListCapped: false,
} as const;
//#endregion

/**
 * Store InterventionStore
 * @const InterventionStore
 *
 * @description
 * Component-scoped NgRx SignalStore for intervention list and creation workflows.
 * The store owns request state and normalized intervention entities; route pages
 * remain responsible for navigation and UI composition. `load` accumulates up
 * to `INTERVENTION_LIST_MAX_ITEMS` interventions across pages so the
 * List/Board/Calendar page never fetches an organization's full history.
 *
 * @version 1.3.0
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
         * Loads interventions for the active organization, accumulating up to
         * {@link INTERVENTION_LIST_MAX_ITEMS} across
         * {@link INTERVENTION_LIST_PAGE_SIZE}-sized pages (the backend clamps
         * `itemsPerPage` at 100, so a single request can never return the whole
         * set). Stops fetching as soon as either the cap or the server's
         * `totalItems` is reached and records whether the cap was hit via
         * `isListCapped`, so the list/board/calendar page can surface a
         * "refine your search" notice instead of silently truncating.
         *
         * @access public
         * @since 1.0.0
         *
         * @type {RxMethod<InterventionListLoadCommand>}
         */
        load: rxMethod<InterventionListLoadCommand>(
          pipe(
            tap(() => patchState(store, { listCallState: pendingCallState() })),
            switchMap(({ organizationId, options }) => {
              const fetchPage = (page: number) =>
                interventionService.list(organizationId, {
                  // Default to newest-first so the 500-item cap really keeps the
                  // "most recent" interventions the banner promises; a caller may
                  // still override the order via options.
                  order: { createdAt: 'desc' },
                  ...options,
                  page,
                  itemsPerPage: INTERVENTION_LIST_PAGE_SIZE,
                });

              return fetchPage(1).pipe(
                expand((collection, pageIndex) => {
                  const fetchedSoFar = (pageIndex + 1) * INTERVENTION_LIST_PAGE_SIZE;
                  return fetchedSoFar < collection.totalItems &&
                    fetchedSoFar < INTERVENTION_LIST_MAX_ITEMS
                    ? fetchPage(pageIndex + 2)
                    : EMPTY;
                }),
                reduce(
                  (accumulated, collection) => ({
                    items: [...accumulated.items, ...collection.member],
                    totalItems: collection.totalItems,
                  }),
                  { items: [] as InterventionOutput[], totalItems: 0 },
                ),
                tapResponse({
                  next: ({ items, totalItems }) => {
                    const capped = items.slice(0, INTERVENTION_LIST_MAX_ITEMS);
                    patchState(store, setAllEntities(capped, { collection: 'intervention' }), {
                      totalInterventions: totalItems,
                      isListCapped: totalItems > INTERVENTION_LIST_MAX_ITEMS,
                      listCallState: successCallState(null),
                    });
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
              );
            }),
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
         * change (403).
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
            // mergeMap (not switchMap): board drag-drop can fire several
            // transitions in quick succession, each keyed by its own id with its
            // own optimistic snapshot/rollback. switchMap would cancel an
            // in-flight PATCH — dropping its success/rollback handlers and
            // leaving a card visually moved while the server never confirmed.
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
