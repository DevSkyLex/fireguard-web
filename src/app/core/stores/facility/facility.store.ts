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
import { FacilityService } from '@core/services/api/facility';
import type { RequestOptions } from '@core/services/api';
import type { HydraCollection } from '@core/models/api';
import type {
  FacilityOutput,
  FacilityTypeOutput,
  CreateFacilityInput,
  UpdateFacilityInput,
  MoveFacilityInput,
} from '@core/models/facility';
import { ActiveFacilityStore } from './active-facility.store';
import type { FacilityState } from './facility-state.interface';
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
import { facilityStoreEvents } from './facility.events';

//#region Initial State
/**
 * Constant INITIAL_FACILITY_STATE
 * @const INITIAL_FACILITY_STATE
 *
 * @description
 * Initial state for the FacilityStore. Entity state (`facilityEntities`,
 * `facilityEntityMap`, `facilityIds`) is initialised by `withEntities`.
 * This constant only seeds the auxiliary state managed in `FacilityState`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
const INITIAL_FACILITY_STATE: FacilityState = {
  totalFacilities: 0,
  isLoading: false,
  createOperation: createIdleOperation(),
  updateOperation: createIdleOperation(),
  archiveOperation: createIdleOperation(),
  moveOperation: createIdleOperation(),
  facilityTypes: [],
  typesOperation: createIdleOperation(),
} as const;
//#endregion

/**
 * Store FacilityStore
 * @const FacilityStore
 *
 * @description
 * Component-scoped NgRx SignalStore for facility list management, CRUD,
 * archiving, moving, and type reference data.
 * Designed to be provided at **component level** (no `providedIn: 'root'`), so
 * each consumer gets an independent instance tied to its own lifecycle.
 *
 * Entity state is managed by `withEntities<FacilityOutput>({ collection:
 * 'facility' })`, which provides O(1) lookups via `facilityEntityMap`
 * and keeps insertions/deletions efficient via normalized storage.
 *
 * For reading the currently active/selected facility use the root-level
 * {@link ActiveFacilityStore} instead.
 *
 * @example
 * ```typescript
 * @Component({ providers: [FacilityStore] })
 * export class FacilityListPage {
 *   readonly store = inject(FacilityStore);
 * }
 * ```
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const FacilityStore = signalStore(

  //#region Features
  /**
   * Feature withEntities
   *
   * @description
   * Adds NgRx entity state and entity-adapter updater functions for
   * `FacilityOutput` objects keyed by their `id` field.
   *
   * @since 2.0.0
   *
   * @returns {object} Entity state slices and updater helpers.
   */
  withEntities({ entity: type<FacilityOutput>(), collection: 'facility' }),

  /**
   * Feature withState
   *
   * @description
   * Adds auxiliary state to the store. Entity state is handled separately by
   * `withEntities`.
   *
   * @since 1.0.0
   *
   * @returns {object} The initial auxiliary state for the facility store.
   */
  withState<FacilityState>(INITIAL_FACILITY_STATE),

  /**
   * Feature withComputed
   *
   * @description
   * Adds computed properties to the store for common derived state
   * related to the facility list and its operations.
   *
   * @since 1.0.0
   *
   * @param {SignalStore} store - The store instance to which the computed properties will be added.
   *
   * @returns {object} An object containing the computed properties to add to the store.
   */
  withComputed((store) => {
    /**
     * Constant activeFacilityStore
     * @const activeFacilityStore
     *
     * @description
     * The root-level store that tracks the currently active facility and
     * its associated loading state.
     *
     * @type {ActiveFacilityStore} The injected ActiveFacilityStore instance.
     */
    const activeFacilityStore: ActiveFacilityStore =
      inject<ActiveFacilityStore>(ActiveFacilityStore);

    return {
      /**
       * Property facilities
       *
       * @description
       * All cached facilities from the entity collection, in insertion order.
       *
       * @since 1.0.0
       *
       * @type {ReadonlyArray<FacilityOutput>}
       */
      facilities: computed<ReadonlyArray<FacilityOutput>>(
        () => store.facilityEntities(),
      ),

      /**
       * Property isEmpty
       *
       * @description
       * True when the entity collection is empty and no list request is
       * currently in-flight.
       *
       * @since 2.0.0
       *
       * @type {boolean}
       */
      isEmpty: computed<boolean>(
        () => store.facilityIds().length === 0 && !store.isLoading(),
      ),

      /**
       * Property selectedFacility
       *
       * @description
       * Proxied from {@link ActiveFacilityStore} so consumers can read
       * the currently active facility without an extra injection.
       *
       * @since 1.0.0
       *
       * @type {FacilityOutput | null}
       */
      selectedFacility: computed<FacilityOutput | null>(
        () => activeFacilityStore.selectedFacility(),
      ),

      /**
       * Property isLoadingFacilities
       *
       * @description
       * True while the facility list is loading.
       *
       * @since 1.0.0
       *
       * @type {boolean}
       */
      isLoadingFacilities: computed<boolean>(
        () => store.isLoading(),
      ),

      /**
       * Property isLoadingFacility
       *
       * @description
       * Proxied from {@link ActiveFacilityStore} — true while the
       * facility is being resolved (e.g., by the route resolver).
       *
       * @since 1.0.0
       *
       * @type {boolean}
       */
      isLoadingFacility: computed<boolean>(
        () => activeFacilityStore.isLoadingFacility(),
      ),

      /**
       * Property isCreating
       *
       * @description
       * True while a create operation is in-flight.
       *
       * @since 1.0.0
       *
       * @type {boolean}
       */
      isCreating: computed<boolean>(
        () => store.createOperation().status === 'loading',
      ),

      /**
       * Property isUpdating
       *
       * @description
       * True while an update operation is in-flight.
       *
       * @since 1.0.0
       *
       * @type {boolean}
       */
      isUpdating: computed<boolean>(
        () => store.updateOperation().status === 'loading',
      ),

      /**
       * Property createError
       *
       * @description
       * Error from the last create operation, if any.
       *
       * @since 1.0.0
       *
       * @type {OperationError<unknown> | null}
       */
      createError: computed<OperationError<unknown> | null>(() => {
        const operation: Operation<FacilityOutput | null, unknown> = store.createOperation();
        return operation.status === 'error' ? operation.error : null;
      }),
    };
  }),

  /**
   * Feature withMethods
   *
   * @description
   * Adds methods to the store for managing the facility list, including
   * loading a paginated list, creating, updating, archiving, moving
   * facilities, loading facility types, and resetting operations.
   *
   * @since 1.0.0
   *
   * @param {SignalStore} store - The store instance to which the methods will be added.
   * @param {ActiveFacilityStore} activeFacilityStore - The root store tracking the currently active facility.
   * @param {Dispatcher} dispatcher - The NgRx Signals event dispatcher, used to dispatch events on errors.
   * @param {FacilityService} facilityService - The service used to interact with the facility API.
   *
   * @returns {object} An object containing the methods to add to the store.
   */
  //#region Methods
  withMethods((
    store,
    activeFacilityStore: ActiveFacilityStore = inject<ActiveFacilityStore>(ActiveFacilityStore),
    dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
    facilityService: FacilityService = inject<FacilityService>(FacilityService),
  ) => {
    /**
     * Constant loadFn
     * @const loadFn
     *
     * @description
     * Shared rxMethod implementation for loading a paginated facility list.
     * Uses `switchMap` so that a new request cancels any previous in-flight one.
     * Exposed under two names: {@link load} (table / generic usage) and
     * {@link loadFacilities} (page usage).
     *
     * @since 2.0.0
     *
     * @type {RxMethod<{ organizationId: string; options?: RequestOptions }>}
     */
    const loadFn = rxMethod<{ organizationId: string; options?: RequestOptions }>(
      pipe(
        tap((): void => { patchState(store, { isLoading: true }); }),
        switchMap(({ organizationId, options }) =>
          facilityService.list(organizationId, options).pipe(
            tapResponse({
              next: (response: HydraCollection<FacilityOutput>): void => {
                patchState(store,
                  setAllEntities([...response.member], { collection: 'facility' }),
                  { totalFacilities: response.totalItems, isLoading: false },
                );
              },
              error: (error: unknown): void => {
                patchState(store, { isLoading: false });
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                dispatcher.dispatch(
                  facilityStoreEvents.listFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load facilities'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    );

    return {
      // ── Facility List ──────────────────────────────────────────────────────

      /**
       * Method load
       * @method load
       *
       * @description
       * Fetches one page of facilities from the API. Cancels any in-flight
       * request via `switchMap`. Alias: {@link loadFacilities}.
       *
       * @since 2.0.0
       *
       * @type {RxMethod<{ organizationId: string; options?: RequestOptions }>}
       */
      load: loadFn,

      /**
       * Method loadFacilities
       * @method loadFacilities
       *
       * @description
       * Alias for {@link load} — kept for backward-compatibility.
       *
       * @since 1.0.0
       *
       * @type {RxMethod<{ organizationId: string; options?: RequestOptions }>}
       */
      loadFacilities: loadFn,

      // ── Facility CRUD ──────────────────────────────────────────────────────

      /**
       * Method create
       * @method create
       *
       * @description
       * Creates a new facility via the API. Uses `exhaustMap` to prevent
       * concurrent submissions. On success the `createOperation` transitions
       * to a success state carrying the newly created entity.
       *
       * @since 1.0.0
       *
       * @type {RxMethod<{ organizationId: string; input: CreateFacilityInput }>}
       */
      create: rxMethod<{ organizationId: string; input: CreateFacilityInput }>(
        pipe(
          tap((): void => {
            patchState(store, {
              createOperation: createLoadingOperation(store.createOperation().data),
            });
          }),
          exhaustMap(({ organizationId, input }) =>
            facilityService.create(organizationId, input).pipe(
              tapResponse({
                next: (facility: FacilityOutput): void => {
                  patchState(store,
                    addEntity(facility, { collection: 'facility' }),
                    {
                      totalFacilities: store.totalFacilities() + 1,
                      createOperation: createSuccessOperation(facility),
                    },
                  );
                },
                error: (error: unknown): void => {
                  const operationError: OperationError<unknown> =
                    createOperationErrorFromUnknown(error);
                  patchState(store, {
                    createOperation: createErrorOperation(
                      operationError,
                      store.createOperation().data,
                    ),
                  });
                  dispatcher.dispatch(
                    facilityStoreEvents.createFailed(
                      toOperationFailureEventPayload(operationError, 'Failed to create facility'),
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
       * @description
       * Updates an existing facility via the API. Uses `exhaustMap` to prevent
       * concurrent submissions. On success, updates the entity in the collection
       * and synchronises the {@link ActiveFacilityStore}.
       *
       * @since 1.0.0
       *
       * @type {RxMethod<{ organizationId: string; facilityId: string; input: UpdateFacilityInput }>}
       */
      update: rxMethod<{ organizationId: string; facilityId: string; input: UpdateFacilityInput }>(
        pipe(
          tap((): void => {
            patchState(store, {
              updateOperation: createLoadingOperation(store.updateOperation().data),
            });
          }),
          exhaustMap(({ organizationId, facilityId, input }) =>
            facilityService.update(organizationId, facilityId, input).pipe(
              tapResponse({
                next: (facility: FacilityOutput): void => {
                  patchState(store,
                    setEntity(facility, { collection: 'facility' }),
                    { updateOperation: createSuccessOperation(facility) },
                  );
                  activeFacilityStore.setFacility(facility);
                },
                error: (error: unknown): void => {
                  const operationError: OperationError<unknown> =
                    createOperationErrorFromUnknown(error);
                  patchState(store, {
                    updateOperation: createErrorOperation(
                      operationError,
                      store.updateOperation().data,
                    ),
                  });
                  dispatcher.dispatch(
                    facilityStoreEvents.updateFailed(
                      toOperationFailureEventPayload(operationError, 'Failed to update facility'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method archive
       * @method archive
       *
       * @description
       * Archives a facility by organization ID and facility ID. Uses
       * `exhaustMap` to prevent concurrent archive operations. On success:
       * updates the entity in the collection and transitions the
       * `archiveOperation` to success. If the archived facility is the
       * currently active one, synchronises the {@link ActiveFacilityStore}.
       *
       * @since 1.0.0
       *
       * @type {RxMethod<{ organizationId: string; facilityId: string }>}
       */
      archive: rxMethod<{ organizationId: string; facilityId: string }>(
        pipe(
          tap((): void => {
            patchState(store, {
              archiveOperation: createLoadingOperation(store.archiveOperation().data),
            });
          }),
          exhaustMap(({ organizationId, facilityId }) =>
            facilityService.archive(organizationId, facilityId).pipe(
              tapResponse({
                next: (facility: FacilityOutput): void => {
                  patchState(store,
                    setEntity(facility, { collection: 'facility' }),
                    { archiveOperation: createSuccessOperation(facility) },
                  );
                  // If the archived facility is the currently active one, update it.
                  if (activeFacilityStore.selectedFacility()?.id === facility.id) {
                    activeFacilityStore.setFacility(facility);
                  }
                },
                error: (error: unknown): void => {
                  const operationError: OperationError<unknown> =
                    createOperationErrorFromUnknown(error);
                  patchState(store, {
                    archiveOperation: createErrorOperation(
                      operationError,
                      store.archiveOperation().data,
                    ),
                  });
                  dispatcher.dispatch(
                    facilityStoreEvents.archiveFailed(
                      toOperationFailureEventPayload(operationError, 'Failed to archive facility'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method move
       * @method move
       *
       * @description
       * Moves a facility to a new parent. Uses `exhaustMap` to prevent
       * concurrent submissions. On success, updates the entity in the
       * collection and synchronises the {@link ActiveFacilityStore}.
       *
       * @since 1.0.0
       *
       * @type {RxMethod<{ organizationId: string; facilityId: string; input: MoveFacilityInput }>}
       */
      move: rxMethod<{ organizationId: string; facilityId: string; input: MoveFacilityInput }>(
        pipe(
          tap((): void => {
            patchState(store, {
              moveOperation: createLoadingOperation(store.moveOperation().data),
            });
          }),
          exhaustMap(({ organizationId, facilityId, input }) =>
            facilityService.move(organizationId, facilityId, input).pipe(
              tapResponse({
                next: (facility: FacilityOutput): void => {
                  patchState(store,
                    setEntity(facility, { collection: 'facility' }),
                    { moveOperation: createSuccessOperation(facility) },
                  );
                  activeFacilityStore.setFacility(facility);
                },
                error: (error: unknown): void => {
                  const operationError: OperationError<unknown> =
                    createOperationErrorFromUnknown(error);
                  patchState(store, {
                    moveOperation: createErrorOperation(
                      operationError,
                      store.moveOperation().data,
                    ),
                  });
                  dispatcher.dispatch(
                    facilityStoreEvents.moveFailed(
                      toOperationFailureEventPayload(operationError, 'Failed to move facility'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      // ── Types ──────────────────────────────────────────────────────────────

      /**
       * Method loadTypes
       * @method loadTypes
       *
       * @description
       * Loads the list of available facility types (reference data).
       * Uses `switchMap` to cancel any previous in-flight request.
       *
       * @since 1.0.0
       *
       * @type {RxMethod<void>}
       */
      loadTypes: rxMethod<void>(
        pipe(
          tap((): void => {
            patchState(store, {
              typesOperation: createLoadingOperation(store.typesOperation().data),
            });
          }),
          switchMap(() =>
            facilityService.listTypes().pipe(
              tapResponse({
                next: (response: HydraCollection<FacilityTypeOutput>): void => {
                  patchState(store, {
                    facilityTypes: [...response.member],
                    typesOperation: {
                      ...createSuccessOperation(response.member),
                      total: response.totalItems,
                    },
                  });
                },
                error: (error: unknown): void => {
                  const operationError: OperationError<unknown> =
                    createOperationErrorFromUnknown(error);
                  patchState(store, {
                    typesOperation: createErrorOperation(
                      operationError,
                      store.typesOperation().data,
                    ),
                  });
                  dispatcher.dispatch(
                    facilityStoreEvents.typesFailed(
                      toOperationFailureEventPayload(operationError, 'Failed to load facility types'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      // ── Sync Helpers ───────────────────────────────────────────────────────

      /**
       * Method resetCreateOperation
       * @method resetCreateOperation
       *
       * @description
       * Resets the create operation back to its idle state.
       *
       * @since 1.0.0
       *
       * @returns {void} No return value.
       */
      resetCreateOperation(): void {
        patchState(store, { createOperation: createIdleOperation() });
      },

      /**
       * Method resetUpdateOperation
       * @method resetUpdateOperation
       *
       * @description
       * Resets the update operation back to its idle state.
       *
       * @since 1.0.0
       *
       * @returns {void} No return value.
       */
      resetUpdateOperation(): void {
        patchState(store, { updateOperation: createIdleOperation() });
      },
    };
  }),
  //#endregion
);

/**
 * Type FacilityStore
 * @type FacilityStore
 *
 * @description
 * Instance type of the {@link FacilityStore} signal store.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type FacilityStore = InstanceType<typeof FacilityStore>;
