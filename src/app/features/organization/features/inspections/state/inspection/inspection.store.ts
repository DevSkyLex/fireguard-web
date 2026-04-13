import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { addEntity, setAllEntities, setEntity, withEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/models/api';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type CallState,
  type StoreError,
} from '@core/state/request-state';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type {
  InspectionOutput,
  CreateInspectionInput,
  NonConformityOutput,
  AddNonConformityInput,
  UpdateNonConformityStatusInput,
  InspectionListOptions,
  NonConformityListOptions,
} from '@features/organization/features/inspections/models';
import { ActiveInspectionStore } from '../active-inspection/active-inspection.store';
import type { InspectionState } from './inspection-state.interface';
import { inspectionStoreEvents } from './inspection.events';

//#region Initial State
/**
 * Constant INITIAL_INSPECTION_STATE
 * @const INITIAL_INSPECTION_STATE
 *
 * @description
 * Initial state for the InspectionStore. Entity state is initialised by
 * `withEntities`. This constant only seeds the auxiliary state.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
const INITIAL_INSPECTION_STATE: InspectionState = {
  totalInspections: 0,
  listCallState: idleCallState(),
  createCallState: idleCallState(),
  submitCallState: idleCallState(),
  closeCallState: idleCallState(),
  totalNonConformities: 0,
  nonConformitiesListCallState: idleCallState(),
  addNonConformityCallState: idleCallState(),
  updateNonConformityStatusCallState: idleCallState(),
} as const;
//#endregion

/**
 * Store InspectionStore
 * @const InspectionStore
 *
 * @description
 * Component-scoped NgRx SignalStore for inspection list management, CRUD,
 * lifecycle transitions, and non-conformity tracking.
 * Designed to be provided at **component level** (no `providedIn: 'root'`), so
 * each consumer gets an independent instance tied to its own lifecycle.
 *
 * For reading the currently active/selected inspection use the root-level
 * {@link ActiveInspectionStore} instead.
 *
 * @example
 * ```typescript
 * @Component({ providers: [InspectionStore] })
 * export class InspectionListPage {
 *   readonly store = inject(InspectionStore);
 * }
 * ```
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const InspectionStore = signalStore(
  //#region Features
  withEntities({ entity: type<InspectionOutput>(), collection: 'inspection' }),
  withEntities({ entity: type<NonConformityOutput>(), collection: 'nonConformity' }),
  withState<InspectionState>(INITIAL_INSPECTION_STATE),

  /**
   * Feature withComputed
   *
   * @description
   * Adds computed properties to the store for common derived state
   * related to the inspection list and its operations.
   *
   * @since 1.0.0
   */
  withComputed((store) => {
    const activeInspectionStore: ActiveInspectionStore =
      inject<ActiveInspectionStore>(ActiveInspectionStore);

    return {
      /** All cached inspections from the entity collection. */
      inspections: computed<ReadonlyArray<InspectionOutput>>(() => store.inspectionEntities()),

      /** All cached non-conformities from the entity collection. */
      nonConformities: computed<ReadonlyArray<NonConformityOutput>>(() =>
        store.nonConformityEntities(),
      ),

      /** True when the entity collection is empty and no list request is in-flight. */
      isEmpty: computed<boolean>(
        () => store.inspectionIds().length === 0 && store.listCallState().status !== 'pending',
      ),

      /** Proxied from {@link ActiveInspectionStore}. */
      selectedInspection: computed<InspectionOutput | null>(() =>
        activeInspectionStore.selectedInspection(),
      ),

      /** True while the inspection list is loading. */
      isLoadingInspections: computed<boolean>(() => store.listCallState().status === 'pending'),

      /** Proxied from {@link ActiveInspectionStore}. */
      isLoadingInspection: computed<boolean>(() => activeInspectionStore.isLoadingInspection()),

      /** True while a create operation is in-flight. */
      isCreating: computed<boolean>(() => store.createCallState().status === 'pending'),

      /** Error from the last create operation, if any. */
      createError: computed<StoreError | null>(() => store.createCallState().error),
    };
  }),

  /**
   * Feature withMethods
   *
   * @description
   * Adds methods to the store for managing the inspection list, including
   * loading, creating, submitting, closing, non-conformities, and resetting operations.
   *
   * @since 1.0.0
   */
  //#region Methods
  withMethods(
    (
      store,
      activeInspectionStore: ActiveInspectionStore = inject<ActiveInspectionStore>(
        ActiveInspectionStore,
      ),
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
      inspectionService: InspectionService = inject<InspectionService>(InspectionService),
    ) => {
      /**
       * Constant loadFn
       * @const loadFn
       *
       * @description
       * Shared rxMethod implementation for loading a paginated inspection list.
       * Uses `switchMap` so that a new request cancels any previous in-flight one.
       *
       * @since 2.0.0
       */
      const loadFn = rxMethod<{ organizationId: string; options?: InspectionListOptions }>(
        pipe(
          tap((): void => {
            patchState(store, { listCallState: pendingCallState() });
          }),
          switchMap(({ organizationId, options }) =>
            inspectionService.list(organizationId, options).pipe(
              tapResponse({
                next: (response: HydraCollection<InspectionOutput>): void => {
                  patchState(
                    store,
                    setAllEntities([...response.member], { collection: 'inspection' }),
                    {
                      totalInspections: response.totalItems,
                      listCallState: successCallState(null),
                    },
                  );
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { listCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    inspectionStoreEvents.listFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load inspections'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      );

      return {
        // ── Inspection List ────────────────────────────────────────────────────

        /** Fetches one page of inspections. Alias: {@link loadInspections}. */
        load: loadFn,

        /** Alias for {@link load} — kept for backward-compatibility. */
        loadInspections: loadFn,

        // ── Inspection CRUD ────────────────────────────────────────────────────

        /**
         * Method create
         * @method create
         *
         * @description
         * Creates a new inspection via the API. Uses `exhaustMap` to prevent
         * concurrent submissions.
         *
         * @since 1.0.0
         */
        create: rxMethod<{ organizationId: string; input: CreateInspectionInput }>(
          pipe(
            tap((): void => {
              patchState(store, { createCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, input }) =>
              inspectionService.create(organizationId, input).pipe(
                tapResponse({
                  next: (inspection: InspectionOutput): void => {
                    patchState(store, addEntity(inspection, { collection: 'inspection' }), {
                      totalInspections: store.totalInspections() + 1,
                      createCallState: successCallState(inspection),
                    });
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { createCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      inspectionStoreEvents.createFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to create inspection'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        // ── Inspection Lifecycle ───────────────────────────────────────────────

        /**
         * Method submit
         * @method submit
         *
         * @description
         * Submits an inspection. Uses `exhaustMap` to prevent concurrent
         * submissions. On success, updates the entity in the collection
         * and synchronises the {@link ActiveInspectionStore}.
         *
         * @since 1.0.0
         */
        submit: rxMethod<{ organizationId: string; inspectionId: string }>(
          pipe(
            tap((): void => {
              patchState(store, { submitCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, inspectionId }) =>
              inspectionService.submit(organizationId, inspectionId).pipe(
                tapResponse({
                  next: (inspection: InspectionOutput): void => {
                    patchState(store, setEntity(inspection, { collection: 'inspection' }), {
                      submitCallState: successCallState(inspection),
                    });
                    activeInspectionStore.setInspection(inspection);
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { submitCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      inspectionStoreEvents.submitFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to submit inspection'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        /**
         * Method close
         * @method close
         *
         * @description
         * Closes an inspection. Uses `exhaustMap` to prevent concurrent
         * submissions. On success, updates the entity in the collection
         * and synchronises the {@link ActiveInspectionStore}.
         *
         * @since 1.0.0
         */
        close: rxMethod<{ organizationId: string; inspectionId: string }>(
          pipe(
            tap((): void => {
              patchState(store, { closeCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, inspectionId }) =>
              inspectionService.close(organizationId, inspectionId).pipe(
                tapResponse({
                  next: (inspection: InspectionOutput): void => {
                    patchState(store, setEntity(inspection, { collection: 'inspection' }), {
                      closeCallState: successCallState(inspection),
                    });
                    activeInspectionStore.setInspection(inspection);
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { closeCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      inspectionStoreEvents.closeFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to close inspection'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        // ── Non-Conformities ─────────────────────────────────────────────────

        /**
         * Method loadNonConformities
         * @method loadNonConformities
         *
         * @description
         * Loads paginated non-conformities for a given inspection.
         * Uses `switchMap` to cancel any previous in-flight request.
         *
         * @since 1.0.0
         */
        loadNonConformities: rxMethod<{
          organizationId: string;
          inspectionId: string;
          options?: NonConformityListOptions;
        }>(
          pipe(
            tap((): void => {
              patchState(store, { nonConformitiesListCallState: pendingCallState() });
            }),
            switchMap(({ organizationId, inspectionId, options }) =>
              inspectionService.listNonConformities(organizationId, inspectionId, options).pipe(
                tapResponse({
                  next: (response: HydraCollection<NonConformityOutput>): void => {
                    patchState(
                      store,
                      setAllEntities([...response.member], { collection: 'nonConformity' }),
                      {
                        totalNonConformities: response.totalItems,
                        nonConformitiesListCallState: successCallState(null),
                      },
                    );
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { nonConformitiesListCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      inspectionStoreEvents.nonConformitiesListFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to load non-conformities'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        /**
         * Method addNonConformity
         * @method addNonConformity
         *
         * @description
         * Adds a non-conformity to an inspection. Uses `exhaustMap` to
         * prevent concurrent submissions.
         *
         * @since 1.0.0
         */
        addNonConformity: rxMethod<{
          organizationId: string;
          inspectionId: string;
          input: AddNonConformityInput;
        }>(
          pipe(
            tap((): void => {
              patchState(store, { addNonConformityCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, inspectionId, input }) =>
              inspectionService.addNonConformity(organizationId, inspectionId, input).pipe(
                tapResponse({
                  next: (nonConformity: NonConformityOutput): void => {
                    patchState(store, addEntity(nonConformity, { collection: 'nonConformity' }), {
                      totalNonConformities: store.totalNonConformities() + 1,
                      addNonConformityCallState: successCallState(nonConformity),
                    });
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { addNonConformityCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      inspectionStoreEvents.addNonConformityFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to add non-conformity'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        /**
         * Method updateNonConformityStatus
         * @method updateNonConformityStatus
         *
         * @description
         * Updates the status of a non-conformity. Uses `exhaustMap` to
         * prevent concurrent submissions.
         *
         * @since 1.0.0
         */
        updateNonConformityStatus: rxMethod<{
          organizationId: string;
          inspectionId: string;
          nonConformityId: string;
          input: UpdateNonConformityStatusInput;
        }>(
          pipe(
            tap((): void => {
              patchState(store, { updateNonConformityStatusCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, inspectionId, nonConformityId, input }) =>
              inspectionService
                .updateNonConformityStatus(organizationId, inspectionId, nonConformityId, input)
                .pipe(
                  tapResponse({
                    next: (nonConformity: NonConformityOutput): void => {
                      patchState(store, setEntity(nonConformity, { collection: 'nonConformity' }), {
                        updateNonConformityStatusCallState: successCallState(nonConformity),
                      });
                    },
                    error: (error: unknown): void => {
                      const storeError: StoreError = toStoreError(error);
                      patchState(store, {
                        updateNonConformityStatusCallState: errorCallState(storeError),
                      });
                      dispatcher.dispatch(
                        inspectionStoreEvents.updateNonConformityStatusFailed(
                          toStoreFailureEventPayload(
                            storeError,
                            'Failed to update non-conformity status',
                          ),
                        ),
                      );
                    },
                  }),
                ),
            ),
          ),
        ),

        // ── Sync Helpers ───────────────────────────────────────────────────────

        /** Resets the create operation back to its idle state. */
        resetCreateOperation(): void {
          patchState(store, { createCallState: idleCallState() });
        },
      };
    },
  ),
  //#endregion
);

/**
 * Type InspectionStore
 * @type InspectionStore
 *
 * @description
 * Instance type of the {@link InspectionStore} signal store.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type InspectionStore = InstanceType<typeof InspectionStore>;
