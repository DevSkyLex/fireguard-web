import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withMethods, withState } from '@ngrx/signals';
import {
  addEntity,
  removeEntity,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
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
  listCallState: idleCallState(),
  createCallState: idleCallState(),
  updateCallState: idleCallState(),
  removeCallState: idleCallState(),
  savingId: null,
  removingId: null,
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
 * write) lands immediately without a second round trip.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const InterventionRecurrenceStore = signalStore(
  withEntities({ entity: type<InterventionRecurrenceOutput>(), collection: 'recurrence' }),
  withState<InterventionRecurrenceState>(INITIAL_STATE),

  withMethods(
    (
      store,
      service: InterventionRecurrenceService = inject(InterventionRecurrenceService),
      dispatcher: Dispatcher = inject(Dispatcher),
    ) => ({
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
          tap((): void => {
            patchState(store, { listCallState: pendingCallState() });
          }),
          switchMap(({ organizationIri, options }) =>
            service.list(organizationIri, options).pipe(
              tapResponse({
                next: (response): void => {
                  patchState(
                    store,
                    setAllEntities([...response.member], { collection: 'recurrence' }),
                    { listCallState: successCallState(null) },
                  );
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { listCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    interventionRecurrenceStoreEvents.loadFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load recurrences'),
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
       * @description Creates a recurrence.
       * @access public
       * @since 1.0.0
       * @type {RxMethod<CreateInterventionRecurrenceInput>}
       */
      create: rxMethod<CreateInterventionRecurrenceInput>(
        pipe(
          tap((): void => {
            patchState(store, { createCallState: pendingCallState() });
          }),
          switchMap((input) =>
            service.create(input).pipe(
              tapResponse({
                next: (recurrence): void => {
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
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { createCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    interventionRecurrenceStoreEvents.createFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to create the recurrence'),
                    ),
                  );
                },
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
          tap(({ recurrenceId }): void => {
            patchState(store, { updateCallState: pendingCallState(), savingId: recurrenceId });
          }),
          switchMap(({ recurrenceId, input }) =>
            service.update(recurrenceId, input).pipe(
              tapResponse({
                next: (recurrence): void => {
                  patchState(
                    store,
                    updateEntity(
                      { id: recurrenceId, changes: recurrence },
                      { collection: 'recurrence' },
                    ),
                    { updateCallState: successCallState(null), savingId: null },
                  );
                  dispatcher.dispatch(
                    interventionRecurrenceStoreEvents.updateSucceeded(
                      successFeedback(
                        $localize`:@@intervention.recurrences.toast.updated:Recurrence updated`,
                      ),
                    ),
                  );
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, {
                    updateCallState: errorCallState(storeError),
                    savingId: null,
                  });
                  dispatcher.dispatch(
                    interventionRecurrenceStoreEvents.updateFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to update the recurrence'),
                    ),
                  );
                },
              }),
            ),
          ),
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
          tap((recurrenceId): void => {
            patchState(store, { removeCallState: pendingCallState(), removingId: recurrenceId });
          }),
          switchMap((recurrenceId) =>
            service.remove(recurrenceId).pipe(
              tapResponse({
                next: (): void => {
                  patchState(store, removeEntity(recurrenceId, { collection: 'recurrence' }), {
                    removeCallState: successCallState(null),
                    removingId: null,
                  });
                  dispatcher.dispatch(
                    interventionRecurrenceStoreEvents.removeSucceeded(
                      successFeedback(
                        $localize`:@@intervention.recurrences.toast.removed:Recurrence deleted`,
                      ),
                    ),
                  );
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, {
                    removeCallState: errorCallState(storeError),
                    removingId: null,
                  });
                  dispatcher.dispatch(
                    interventionRecurrenceStoreEvents.removeFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to delete the recurrence'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),
    }),
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
