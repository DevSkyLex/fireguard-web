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
import { InterventionLabelService } from '@features/organization/features/interventions/data-access';
import type {
  CreateInterventionLabelInput,
  InterventionLabelOutput,
  UpdateInterventionLabelInput,
} from '@features/organization/features/interventions/models';
import { interventionLabelStoreEvents } from './events';
import type { InterventionLabelState } from './models';

const INITIAL_STATE: InterventionLabelState = {
  listCallState: idleCallState(),
  createCallState: idleCallState(),
  updateCallState: idleCallState(),
  removeCallState: idleCallState(),
  savingId: null,
  removingId: null,
};

/**
 * Store InterventionLabelStore
 * @const InterventionLabelStore
 *
 * @description
 * Component-scoped CRUD store for the organization's intervention label
 * catalog (`InterventionLabelService`) — the "Manage labels" surface opened
 * from wherever a label is picked. `withEntities` holds the catalog
 * (`labelEntities`); the labels a picker actually offers still come from
 * `InterventionPlanningOptionsStore`, which this store never writes to
 * directly — the caller reloads it (`loadCreationOptions`/
 * `loadWorkspaceOptions`) after a mutation succeeds, keeping the two stores
 * decoupled rather than one reaching into the other's state.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const InterventionLabelStore = signalStore(
  withEntities({ entity: type<InterventionLabelOutput>(), collection: 'label' }),
  withState<InterventionLabelState>(INITIAL_STATE),

  withMethods(
    (
      store,
      service: InterventionLabelService = inject(InterventionLabelService),
      dispatcher: Dispatcher = inject(Dispatcher),
    ) => ({
      /**
       * Method load
       * @method load
       *
       * @description
       * Fetches every label of one organization, sorted by name.
       *
       * @access public
       * @since 1.0.0
       *
       * @type {RxMethod<string>}
       */
      load: rxMethod<string>(
        pipe(
          tap((): void => {
            patchState(store, { listCallState: pendingCallState() });
          }),
          switchMap((organizationIri) =>
            service.list(organizationIri).pipe(
              tapResponse({
                next: (response): void => {
                  patchState(store, setAllEntities([...response.member], { collection: 'label' }), {
                    listCallState: successCallState(null),
                  });
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { listCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    interventionLabelStoreEvents.loadFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load intervention labels'),
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
       * @description Creates a label. The API rejects a duplicate name with `409`.
       * @access public
       * @since 1.0.0
       * @type {RxMethod<CreateInterventionLabelInput>}
       */
      create: rxMethod<CreateInterventionLabelInput>(
        pipe(
          tap((): void => {
            patchState(store, { createCallState: pendingCallState() });
          }),
          switchMap((input) =>
            service.create(input).pipe(
              tapResponse({
                next: (label): void => {
                  patchState(store, addEntity(label, { collection: 'label' }), {
                    createCallState: successCallState(null),
                  });
                  dispatcher.dispatch(
                    interventionLabelStoreEvents.createSucceeded(
                      successFeedback(
                        $localize`:@@intervention.labels.manage.toast.created:Label created`,
                      ),
                    ),
                  );
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { createCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    interventionLabelStoreEvents.createFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        storeError.code === 409
                          ? $localize`:@@intervention.labels.manage.error.duplicate:A label with this name already exists.`
                          : 'Failed to create the label',
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
       * Method update
       * @method update
       *
       * @description Renames or recolors a label.
       * @access public
       * @since 1.0.0
       * @type {RxMethod<{ labelId: string; input: UpdateInterventionLabelInput }>}
       */
      update: rxMethod<{ labelId: string; input: UpdateInterventionLabelInput }>(
        pipe(
          tap(({ labelId }): void => {
            patchState(store, { updateCallState: pendingCallState(), savingId: labelId });
          }),
          switchMap(({ labelId, input }) =>
            service.update(labelId, input).pipe(
              tapResponse({
                next: (label): void => {
                  patchState(
                    store,
                    updateEntity({ id: labelId, changes: label }, { collection: 'label' }),
                    {
                      updateCallState: successCallState(null),
                      savingId: null,
                    },
                  );
                  dispatcher.dispatch(
                    interventionLabelStoreEvents.updateSucceeded(
                      successFeedback(
                        $localize`:@@intervention.labels.manage.toast.updated:Label updated`,
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
                    interventionLabelStoreEvents.updateFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        storeError.code === 409
                          ? $localize`:@@intervention.labels.manage.error.duplicate:A label with this name already exists.`
                          : 'Failed to update the label',
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
       * Method remove
       * @method remove
       *
       * @description Deletes a label; interventions referencing it keep their remaining labels.
       * @access public
       * @since 1.0.0
       * @type {RxMethod<string>}
       */
      remove: rxMethod<string>(
        pipe(
          tap((labelId): void => {
            patchState(store, { removeCallState: pendingCallState(), removingId: labelId });
          }),
          switchMap((labelId) =>
            service.remove(labelId).pipe(
              tapResponse({
                next: (): void => {
                  patchState(store, removeEntity(labelId, { collection: 'label' }), {
                    removeCallState: successCallState(null),
                    removingId: null,
                  });
                  dispatcher.dispatch(
                    interventionLabelStoreEvents.removeSucceeded(
                      successFeedback(
                        $localize`:@@intervention.labels.manage.toast.removed:Label deleted`,
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
                    interventionLabelStoreEvents.removeFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to delete the label'),
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
 * Type InterventionLabelStoreType
 * @type InterventionLabelStoreType
 *
 * @description Instance type of the InterventionLabelStore signal store.
 * @since 1.0.0
 */
export type InterventionLabelStoreType = InstanceType<typeof InterventionLabelStore>;
