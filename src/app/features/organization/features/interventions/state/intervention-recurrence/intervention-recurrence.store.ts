import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  addEntity,
  removeEntity,
  removeAllEntities,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  EMPTY,
  Subject,
  exhaustMap,
  finalize,
  groupBy,
  map,
  mergeMap,
  pipe,
  switchMap,
  takeUntil,
} from 'rxjs';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  pendingCallState,
  successCallState,
  successFeedback,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { InterventionRecurrenceService } from '@features/organization/features/interventions/data-access';
import type {
  CreateInterventionRecurrenceInput,
  InterventionRecurrenceListOptions,
  InterventionRecurrenceOutput,
  UpdateInterventionRecurrenceInput,
} from '@features/organization/features/interventions/models';
import { interventionRecurrenceStoreEvents } from './events';
import type { InterventionRecurrenceState } from './models';

const INITIAL_STATE: InterventionRecurrenceState = {
  organizationIri: null,
  listCallState: idleCallState(),
  createCallState: idleCallState(),
  updateCallStates: {},
  removeCallStates: {},
};

/**
 * Store InterventionRecurrenceStore
 * @const InterventionRecurrenceStore
 *
 * @description
 * Component-scoped CRUD store for the organization's recurring intervention
 * schedules (`InterventionRecurrenceService`), backing the "Recurrences"
 * sheet reachable from the interventions list toolbar. `withEntities` holds
 * the loaded page (`recurrenceEntities`); `create`/`update`/`remove` patch
 * the entity collection directly from the response rather than reloading
 * the whole list, so `nextOccurrenceAt` (server-authoritative on every
 * write) lands immediately without a second round trip. Updates and removals
 * share a lock per recurrence; writes to different rows remain independent.
 * Creation accepts one command per organization generation. Changing the
 * organization invalidates reads and result application without cancelling
 * accepted writes; their groups close after those requests settle.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const InterventionRecurrenceStore = signalStore(
  withEntities({ entity: type<InterventionRecurrenceOutput>(), collection: 'recurrence' }),
  withState<InterventionRecurrenceState>(INITIAL_STATE),
  withComputed((store) => ({
    savingIds: computed((): readonly string[] =>
      Object.entries(store.updateCallStates())
        .filter(([, state]) => isCallPending(state))
        .map(([id]) => id),
    ),
    removingIds: computed((): readonly string[] =>
      Object.entries(store.removeCallStates())
        .filter(([, state]) => isCallPending(state))
        .map(([id]) => id),
    ),
  })),

  withMethods(
    (
      store,
      service: InterventionRecurrenceService = inject(InterventionRecurrenceService),
      dispatcher: Dispatcher = inject(Dispatcher),
    ) => {
      let generation = 0;
      const invalidated = new Subject<void>();
      const writes = new Set<string>();

      /**
       * Function setOrganization
       * @description Invalidates reads and command results when the owning organization changes.
       * @param {string} organizationIri - Organization owning subsequent reads and commands.
       * @returns {void}
       * @since 1.0.0
       */
      function setOrganization(organizationIri: string): void {
        if (store.organizationIri() === organizationIri) return;
        generation += 1;
        invalidated.next();
        patchState(store, removeAllEntities({ collection: 'recurrence' }), {
          ...INITIAL_STATE,
          organizationIri,
        });
      }

      return {
        setOrganization,
        /**
         * Method load
         * @method load
         *
         * @description Fetches one server page of recurrences.
         * @access public
         * @since 1.0.0
         * @type {RxMethod<{ organizationIri: string; options?: InterventionRecurrenceListOptions }>}
         */
        load: rxMethod<{ organizationIri: string; options?: InterventionRecurrenceListOptions }>(
          pipe(
            switchMap(({ organizationIri, options }) => {
              setOrganization(organizationIri);
              const revision = generation;
              patchState(store, { listCallState: pendingCallState() });
              return service.list(organizationIri, options).pipe(
                takeUntil(invalidated),
                tapResponse({
                  next: (response): void => {
                    if (revision !== generation) return;
                    patchState(
                      store,
                      setAllEntities([...response.member], { collection: 'recurrence' }),
                      { listCallState: successCallState(null) },
                    );
                  },
                  error: (error: unknown): void => {
                    if (revision !== generation) return;
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { listCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      interventionRecurrenceStoreEvents.loadFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to load recurrences'),
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
         * @description Creates a recurrence.
         * @access public
         * @since 1.0.0
         * @type {RxMethod<CreateInterventionRecurrenceInput>}
         */
        create: rxMethod<CreateInterventionRecurrenceInput>(
          pipe(
            map((input) => {
              setOrganization(input.organization);
              return { input, revision: generation };
            }),
            groupBy(({ revision }) => revision, { duration: () => invalidated }),
            mergeMap((commands) =>
              commands.pipe(
                exhaustMap(({ input, revision }) => {
                  patchState(store, { createCallState: pendingCallState() });
                  return service.create(input).pipe(
                    tapResponse({
                      next: (recurrence): void => {
                        if (revision !== generation) return;
                        patchState(store, addEntity(recurrence, { collection: 'recurrence' }), {
                          createCallState: successCallState(null),
                        });
                        dispatcher.dispatch(
                          interventionRecurrenceStoreEvents.createSucceeded(
                            successFeedback(
                              $localize`:@@intervention.recurrences.toast.created:Recurrence created`,
                            ),
                          ),
                        );
                      },
                      error: (error: unknown): void => {
                        if (revision !== generation) return;
                        const storeError: StoreError = toStoreError(error);
                        patchState(store, { createCallState: errorCallState(storeError) });
                        dispatcher.dispatch(
                          interventionRecurrenceStoreEvents.createFailed(
                            toStoreFailureEventPayload(
                              storeError,
                              'Failed to create the recurrence',
                            ),
                          ),
                        );
                      },
                    }),
                  );
                }),
              ),
            ),
          ),
        ),

        /**
         * Method update
         * @method update
         *
         * @description Merge-patches a recurrence — including the active-toggle's own write.
         * @access public
         * @since 1.0.0
         * @type {RxMethod<{ recurrenceId: string; input: UpdateInterventionRecurrenceInput }>}
         */
        update: rxMethod<{ recurrenceId: string; input: UpdateInterventionRecurrenceInput }>(
          pipe(
            mergeMap(({ recurrenceId, input }) => {
              const revision = generation;
              const key = `${revision}:${recurrenceId}`;
              if (writes.has(key)) return EMPTY;
              writes.add(key);
              patchState(store, {
                updateCallStates: {
                  ...store.updateCallStates(),
                  [recurrenceId]: pendingCallState(),
                },
              });
              return service.update(recurrenceId, input).pipe(
                tapResponse({
                  next: (recurrence): void => {
                    if (revision !== generation) return;
                    patchState(
                      store,
                      updateEntity(
                        { id: recurrenceId, changes: recurrence },
                        { collection: 'recurrence' },
                      ),
                      {
                        updateCallStates: {
                          ...store.updateCallStates(),
                          [recurrenceId]: successCallState(null),
                        },
                      },
                    );
                    dispatcher.dispatch(
                      interventionRecurrenceStoreEvents.updateSucceeded({
                        ...successFeedback(
                          $localize`:@@intervention.recurrences.toast.updated:Recurrence updated`,
                        ),
                        recurrenceId,
                      }),
                    );
                  },
                  error: (error: unknown): void => {
                    if (revision !== generation) return;
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, {
                      updateCallStates: {
                        ...store.updateCallStates(),
                        [recurrenceId]: errorCallState(storeError),
                      },
                    });
                    dispatcher.dispatch(
                      interventionRecurrenceStoreEvents.updateFailed({
                        ...toStoreFailureEventPayload(
                          storeError,
                          'Failed to update the recurrence',
                        ),
                        recurrenceId,
                      }),
                    );
                  },
                }),
                finalize(() => writes.delete(key)),
              );
            }),
          ),
        ),

        /**
         * Method remove
         * @method remove
         *
         * @description Deletes a recurrence. Already-materialized interventions are unaffected.
         * @access public
         * @since 1.0.0
         * @type {RxMethod<string>}
         */
        remove: rxMethod<string>(
          pipe(
            mergeMap((recurrenceId) => {
              const revision = generation;
              const key = `${revision}:${recurrenceId}`;
              if (writes.has(key)) return EMPTY;
              writes.add(key);
              patchState(store, {
                removeCallStates: {
                  ...store.removeCallStates(),
                  [recurrenceId]: pendingCallState(),
                },
              });
              return service.remove(recurrenceId).pipe(
                tapResponse({
                  next: (): void => {
                    if (revision !== generation) return;
                    patchState(store, removeEntity(recurrenceId, { collection: 'recurrence' }), {
                      removeCallStates: {
                        ...store.removeCallStates(),
                        [recurrenceId]: successCallState(null),
                      },
                    });
                    dispatcher.dispatch(
                      interventionRecurrenceStoreEvents.removeSucceeded({
                        ...successFeedback(
                          $localize`:@@intervention.recurrences.toast.removed:Recurrence deleted`,
                        ),
                        recurrenceId,
                      }),
                    );
                  },
                  error: (error: unknown): void => {
                    if (revision !== generation) return;
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, {
                      removeCallStates: {
                        ...store.removeCallStates(),
                        [recurrenceId]: errorCallState(storeError),
                      },
                    });
                    dispatcher.dispatch(
                      interventionRecurrenceStoreEvents.removeFailed({
                        ...toStoreFailureEventPayload(
                          storeError,
                          'Failed to delete the recurrence',
                        ),
                        recurrenceId,
                      }),
                    );
                  },
                }),
                finalize(() => writes.delete(key)),
              );
            }),
          ),
        ),
      };
    },
  ),
);

/**
 * Type InterventionRecurrenceStoreType
 * @type InterventionRecurrenceStoreType
 *
 * @description Instance type of the InterventionRecurrenceStore signal store.
 * @since 1.0.0
 */
export type InterventionRecurrenceStoreType = InstanceType<typeof InterventionRecurrenceStore>;
