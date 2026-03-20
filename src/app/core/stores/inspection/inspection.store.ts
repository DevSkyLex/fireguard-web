import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  addEntity,
  setAllEntities,
  setEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';
import { InspectionService } from '@core/services/api/inspection';
import type { HydraCollection } from '@core/models/api';
import type {
  InspectionOutput,
  CreateInspectionInput,
  NonConformityOutput,
  AddNonConformityInput,
  UpdateNonConformityStatusInput,
  InspectionListOptions,
  NonConformityListOptions,
} from '@core/models/inspection';
import { ActiveInspectionStore } from './active-inspection.store';
import type { InspectionState } from './inspection-state.interface';
import {
  createErrorOperation,
  createIdleOperation,
  createLoadingOperation,
  createSuccessOperation,
  createOperationErrorFromUnknown,
  toOperationFailureEventPayload,
  type Operation,
  type OperationError,
} from '../operations';
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
  isLoading: false,
  createOperation: createIdleOperation(),
  submitOperation: createIdleOperation(),
  closeOperation: createIdleOperation(),
  totalNonConformities: 0,
  nonConformitiesListOperation: createIdleOperation(),
  addNonConformityOperation: createIdleOperation(),
  updateNonConformityStatusOperation: createIdleOperation(),
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
      inspections: computed<ReadonlyArray<InspectionOutput>>(
        () => store.inspectionEntities(),
      ),

      /** All cached non-conformities from the entity collection. */
      nonConformities: computed<ReadonlyArray<NonConformityOutput>>(
        () => store.nonConformityEntities(),
      ),

      /** True when the entity collection is empty and no list request is in-flight. */
      isEmpty: computed<boolean>(
        () => store.inspectionIds().length === 0 && !store.isLoading(),
      ),

      /** Proxied from {@link ActiveInspectionStore}. */
      selectedInspection: computed<InspectionOutput | null>(
        () => activeInspectionStore.selectedInspection(),
      ),

      /** True while the inspection list is loading. */
      isLoadingInspections: computed<boolean>(
        () => store.isLoading(),
      ),

      /** Proxied from {@link ActiveInspectionStore}. */
      isLoadingInspection: computed<boolean>(
        () => activeInspectionStore.isLoadingInspection(),
      ),

      /** True while a create operation is in-flight. */
      isCreating: computed<boolean>(
        () => store.createOperation().status === 'loading',
      ),

      /** Error from the last create operation, if any. */
      createError: computed<OperationError<unknown> | null>(() => {
        const operation: Operation<InspectionOutput | null, unknown> = store.createOperation();
        return operation.status === 'error' ? operation.error : null;
      }),
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
  withMethods((
    store,
    activeInspectionStore: ActiveInspectionStore = inject<ActiveInspectionStore>(ActiveInspectionStore),
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
        tap((): void => { patchState(store, { isLoading: true }); }),
        switchMap(({ organizationId, options }) =>
          inspectionService.list(organizationId, options).pipe(
            tapResponse({
              next: (response: HydraCollection<InspectionOutput>): void => {
                patchState(store,
                  setAllEntities([...response.member], { collection: 'inspection' }),
                  { totalInspections: response.totalItems, isLoading: false },
                );
              },
              error: (error: unknown): void => {
                patchState(store, { isLoading: false });
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                dispatcher.dispatch(
                  inspectionStoreEvents.listFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load inspections'),
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
            patchState(store, {
              createOperation: createLoadingOperation(store.createOperation().data),
            });
          }),
          exhaustMap(({ organizationId, input }) =>
            inspectionService.create(organizationId, input).pipe(
              tapResponse({
                next: (inspection: InspectionOutput): void => {
                  patchState(store,
                    addEntity(inspection, { collection: 'inspection' }),
                    {
                      totalInspections: store.totalInspections() + 1,
                      createOperation: createSuccessOperation(inspection),
                    },
                  );
                },
                error: (error: unknown): void => {
                  const operationError: OperationError<unknown> =
                    createOperationErrorFromUnknown(error);
                  patchState(store, {
                    createOperation: createErrorOperation(operationError, store.createOperation().data),
                  });
                  dispatcher.dispatch(
                    inspectionStoreEvents.createFailed(
                      toOperationFailureEventPayload(operationError, 'Failed to create inspection'),
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
            patchState(store, {
              submitOperation: createLoadingOperation(store.submitOperation().data),
            });
          }),
          exhaustMap(({ organizationId, inspectionId }) =>
            inspectionService.submit(organizationId, inspectionId).pipe(
              tapResponse({
                next: (inspection: InspectionOutput): void => {
                  patchState(store,
                    setEntity(inspection, { collection: 'inspection' }),
                    { submitOperation: createSuccessOperation(inspection) },
                  );
                  activeInspectionStore.setInspection(inspection);
                },
                error: (error: unknown): void => {
                  const operationError: OperationError<unknown> =
                    createOperationErrorFromUnknown(error);
                  patchState(store, {
                    submitOperation: createErrorOperation(operationError, store.submitOperation().data),
                  });
                  dispatcher.dispatch(
                    inspectionStoreEvents.submitFailed(
                      toOperationFailureEventPayload(operationError, 'Failed to submit inspection'),
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
            patchState(store, {
              closeOperation: createLoadingOperation(store.closeOperation().data),
            });
          }),
          exhaustMap(({ organizationId, inspectionId }) =>
            inspectionService.close(organizationId, inspectionId).pipe(
              tapResponse({
                next: (inspection: InspectionOutput): void => {
                  patchState(store,
                    setEntity(inspection, { collection: 'inspection' }),
                    { closeOperation: createSuccessOperation(inspection) },
                  );
                  activeInspectionStore.setInspection(inspection);
                },
                error: (error: unknown): void => {
                  const operationError: OperationError<unknown> =
                    createOperationErrorFromUnknown(error);
                  patchState(store, {
                    closeOperation: createErrorOperation(operationError, store.closeOperation().data),
                  });
                  dispatcher.dispatch(
                    inspectionStoreEvents.closeFailed(
                      toOperationFailureEventPayload(operationError, 'Failed to close inspection'),
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
      loadNonConformities: rxMethod<{ organizationId: string; inspectionId: string; options?: NonConformityListOptions }>(
        pipe(
          tap((): void => {
            patchState(store, {
              nonConformitiesListOperation: createLoadingOperation(store.nonConformitiesListOperation().data),
            });
          }),
          switchMap(({ organizationId, inspectionId, options }) =>
            inspectionService.listNonConformities(organizationId, inspectionId, options).pipe(
              tapResponse({
                next: (response: HydraCollection<NonConformityOutput>): void => {
                  patchState(store,
                    setAllEntities([...response.member], { collection: 'nonConformity' }),
                    {
                      totalNonConformities: response.totalItems,
                      nonConformitiesListOperation: {
                        ...createSuccessOperation(response.member),
                        total: response.totalItems,
                      },
                    },
                  );
                },
                error: (error: unknown): void => {
                  const operationError: OperationError<unknown> =
                    createOperationErrorFromUnknown(error);
                  patchState(store, {
                    nonConformitiesListOperation: createErrorOperation(operationError, store.nonConformitiesListOperation().data),
                  });
                  dispatcher.dispatch(
                    inspectionStoreEvents.nonConformitiesListFailed(
                      toOperationFailureEventPayload(operationError, 'Failed to load non-conformities'),
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
      addNonConformity: rxMethod<{ organizationId: string; inspectionId: string; input: AddNonConformityInput }>(
        pipe(
          tap((): void => {
            patchState(store, {
              addNonConformityOperation: createLoadingOperation(store.addNonConformityOperation().data),
            });
          }),
          exhaustMap(({ organizationId, inspectionId, input }) =>
            inspectionService.addNonConformity(organizationId, inspectionId, input).pipe(
              tapResponse({
                next: (nonConformity: NonConformityOutput): void => {
                  patchState(store,
                    addEntity(nonConformity, { collection: 'nonConformity' }),
                    {
                      totalNonConformities: store.totalNonConformities() + 1,
                      addNonConformityOperation: createSuccessOperation(nonConformity),
                    },
                  );
                },
                error: (error: unknown): void => {
                  const operationError: OperationError<unknown> =
                    createOperationErrorFromUnknown(error);
                  patchState(store, {
                    addNonConformityOperation: createErrorOperation(operationError, store.addNonConformityOperation().data),
                  });
                  dispatcher.dispatch(
                    inspectionStoreEvents.addNonConformityFailed(
                      toOperationFailureEventPayload(operationError, 'Failed to add non-conformity'),
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
      updateNonConformityStatus: rxMethod<{ organizationId: string; inspectionId: string; nonConformityId: string; input: UpdateNonConformityStatusInput }>(
        pipe(
          tap((): void => {
            patchState(store, {
              updateNonConformityStatusOperation: createLoadingOperation(store.updateNonConformityStatusOperation().data),
            });
          }),
          exhaustMap(({ organizationId, inspectionId, nonConformityId, input }) =>
            inspectionService.updateNonConformityStatus(organizationId, inspectionId, nonConformityId, input).pipe(
              tapResponse({
                next: (nonConformity: NonConformityOutput): void => {
                  patchState(store,
                    setEntity(nonConformity, { collection: 'nonConformity' }),
                    { updateNonConformityStatusOperation: createSuccessOperation(nonConformity) },
                  );
                },
                error: (error: unknown): void => {
                  const operationError: OperationError<unknown> =
                    createOperationErrorFromUnknown(error);
                  patchState(store, {
                    updateNonConformityStatusOperation: createErrorOperation(operationError, store.updateNonConformityStatusOperation().data),
                  });
                  dispatcher.dispatch(
                    inspectionStoreEvents.updateNonConformityStatusFailed(
                      toOperationFailureEventPayload(operationError, 'Failed to update non-conformity status'),
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
        patchState(store, { createOperation: createIdleOperation() });
      },
    };
  }),
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
