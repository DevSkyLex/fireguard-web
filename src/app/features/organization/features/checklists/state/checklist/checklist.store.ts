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
import { ChecklistService } from '@features/organization/features/checklists/data-access';
import type {
  ChecklistOutput,
  ChecklistListOptions,
  CreateChecklistInput,
} from '@features/organization/features/checklists/models';
import { ActiveChecklistStore } from '../active-checklist/active-checklist.store';
import type { ChecklistState } from './checklist-state.interface';
import { checklistStoreEvents } from './checklist.events';

//#region Initial State
/**
 * Constant INITIAL_CHECKLIST_STATE
 * @const INITIAL_CHECKLIST_STATE
 *
 * @description
 * Initial state for the ChecklistStore. Entity state (`checklistEntities`,
 * `checklistEntityMap`, `checklistIds`) is initialised by `withEntities`.
 * This constant only seeds the auxiliary state managed in `ChecklistState`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
const INITIAL_CHECKLIST_STATE: ChecklistState = {
  createCallState: idleCallState(),
  archiveCallState: idleCallState(),
  totalChecklists: 0,
  listCallState: idleCallState(),
} as const;
//#endregion

/**
 * Store ChecklistStore
 * @const ChecklistStore
 *
 * @description
 * Component-scoped NgRx SignalStore for checklist list management and CRUD.
 * Designed to be provided at **component level** (no `providedIn: 'root'`), so
 * each consumer (table, page, etc.) gets an independent instance tied to
 * its own lifecycle.
 *
 * Entity state is managed by `withEntities<ChecklistOutput>({ collection:
 * 'checklist' })`, which provides O(1) lookups via `checklistEntityMap`
 * and keeps insertions/updates efficient via normalized storage.
 * Auxiliary state (`isLoading`, `totalChecklists`, `createOperation`,
 * `archiveOperation`) is held in `withState<ChecklistState>`.
 *
 * For reading the currently active/selected checklist use the root-level
 * {@link ActiveChecklistStore} instead.
 *
 * @example
 * ```typescript
 * @Component({ providers: [ChecklistStore] })
 * export class ChecklistListPage {
 *   readonly store = inject(ChecklistStore);
 * }
 * ```
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ChecklistStore = signalStore(
  //#region Features
  /**
   * Feature withEntities
   *
   * @description
   * Adds NgRx entity state and entity-adapter updater functions for
   * `ChecklistOutput` objects keyed by their `id` field. Provides:
   * - `checklistEntities` — ordered array of all cached entities
   * - `checklistEntityMap` — `{ [id]: ChecklistOutput }` lookup map
   * - `checklistIds` — ordered array of entity ids
   *
   * @since 2.0.0
   *
   * @returns {object} Entity state slices and updater helpers for checklists.
   */
  withEntities({ entity: type<ChecklistOutput>(), collection: 'checklist' }),

  /**
   * Feature withState
   *
   * @description
   * Adds auxiliary state to the store: `createOperation`, `archiveOperation`,
   * `totalChecklists`, and `isLoading`. Initialized from
   * `INITIAL_CHECKLIST_STATE`. Entity state is handled separately by
   * `withEntities`.
   *
   * @since 1.0.0
   *
   * @returns {object} The initial auxiliary state for the checklist store.
   */
  withState<ChecklistState>(INITIAL_CHECKLIST_STATE),

  /**
   * Feature withComputed
   *
   * @description
   * Adds computed properties to the store for common derived state
   * related to the checklist list and its operations.
   *
   * @since 1.0.0
   *
   * @param {SignalStore} store - The store instance to which the computed properties will be added.
   *
   * @returns {object} An object containing the computed properties to add to the store.
   */
  withComputed((store) => {
    /**
     * Constant activeChecklistStore
     * @const activeChecklistStore
     *
     * @description
     * The root-level store that tracks the currently active checklist and
     * its associated loading state.
     *
     * @type {ActiveChecklistStore} The injected ActiveChecklistStore instance.
     */
    const activeChecklistStore: ActiveChecklistStore =
      inject<ActiveChecklistStore>(ActiveChecklistStore);

    return {
      /**
       * Property checklists
       *
       * @description
       * All cached checklists from the entity collection, in insertion order.
       * Reads from `checklistEntities` provided by `withEntities`.
       *
       * @since 1.0.0
       *
       * @type {ReadonlyArray<ChecklistOutput>} The current page of checklists.
       */
      checklists: computed<ReadonlyArray<ChecklistOutput>>(() => store.checklistEntities()),

      /**
       * Property isEmpty
       *
       * @description
       * True when the entity collection is empty and no list request is
       * currently in-flight. Equivalent to `checklists.length === 0 &&
       * !isLoading`.
       *
       * @since 2.0.0
       *
       * @type {boolean}
       */
      isEmpty: computed<boolean>(
        () => store.checklistIds().length === 0 && store.listCallState().status !== 'pending',
      ),

      /**
       * Property selectedChecklist
       *
       * @description
       * Proxied from {@link ActiveChecklistStore} so consumers can read
       * the currently active checklist without an extra injection.
       *
       * @since 1.0.0
       *
       * @type {ChecklistOutput | null} The currently selected checklist, or null if none.
       */
      selectedChecklist: computed<ChecklistOutput | null>(() =>
        activeChecklistStore.selectedChecklist(),
      ),

      /**
       * Property isLoadingChecklists
       *
       * @description
       * Alias for `isLoading()` — matches naming used in templates and specs
       * to distinguish list loading from single-entity loading.
       *
       * @since 1.0.0
       *
       * @type {boolean} True if the checklist list is currently loading, false otherwise.
       */
      isLoadingChecklists: computed<boolean>(() => store.listCallState().status === 'pending'),

      /**
       * Property isLoadingChecklist
       *
       * @description
       * Proxied from {@link ActiveChecklistStore} — true while the
       * checklist is being resolved (e.g., by the route resolver).
       *
       * @since 1.0.0
       *
       * @type {boolean} True if the active checklist is currently loading, false otherwise.
       */
      isLoadingChecklist: computed<boolean>(() => activeChecklistStore.isLoadingChecklist()),

      /**
       * Property isCreating
       *
       * @description
       * True while a create operation is in-flight. Use this to disable
       * the submit button or show a spinner in create forms.
       *
       * @since 1.0.0
       *
       * @type {boolean} True if the create operation is currently loading, false otherwise.
       */
      isCreating: computed<boolean>(() => store.createCallState().status === 'pending'),

      /**
       * Property isArchiving
       *
       * @description
       * True while an archive operation is in-flight.
       *
       * @since 2.0.0
       *
       * @type {boolean}
       */
      isArchiving: computed<boolean>(() => store.archiveCallState().status === 'pending'),

      /**
       * Property createError
       *
       * @description
       * Error from the last create operation, if any. Null if the operation
       * is idle, loading, or succeeded.
       *
       * @since 1.0.0
       *
       * @type {StoreError | null} The error object if the create operation is in error, or null otherwise.
       */
      createError: computed<StoreError | null>(() => store.createCallState().error),
    };
  }),

  /**
   * Feature withMethods
   *
   * @description
   * Adds methods to the store for managing the checklist list, including
   * loading a paginated list, creating, archiving checklists,
   * and resetting the create operation.
   *
   * @since 1.0.0
   *
   * @param {SignalStore} store - The store instance to which the methods will be added.
   * @param {ChecklistService} checklistService - The service used to fetch checklist data from the API.
   * @param {ActiveChecklistStore} activeChecklistStore - The root store tracking the currently active checklist.
   * @param {Dispatcher} dispatcher - The NgRx Signals event dispatcher, used to dispatch events on errors.
   *
   * @returns {object} An object containing the methods to add to the store.
   */
  withMethods(
    (
      store,
      checklistService: ChecklistService = inject<ChecklistService>(ChecklistService),
      activeChecklistStore: ActiveChecklistStore = inject<ActiveChecklistStore>(
        ActiveChecklistStore,
      ),
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
    ) => {
      /**
       * Constant loadFn
       * @const loadFn
       *
       * @description
       * Shared rxMethod implementation for loading a paginated checklist list.
       * Uses `switchMap` so that a new request cancels any previous in-flight one.
       * Exposed under two names: {@link load} (table / generic usage) and
       * {@link loadChecklists} (page usage).
       *
       * @since 1.0.0
       *
       * @type {RxMethod<{ organizationId: string; options?: RequestOptions }>}
       */
      const loadFn = rxMethod<{ organizationId: string; options?: ChecklistListOptions }>(
        pipe(
          tap((): void => {
            patchState(store, { listCallState: pendingCallState() });
          }),
          switchMap(({ organizationId, options }) =>
            checklistService.list(organizationId, options).pipe(
              tapResponse({
                next: (response: HydraCollection<ChecklistOutput>): void => {
                  patchState(
                    store,
                    setAllEntities([...response.member], { collection: 'checklist' }),
                    { totalChecklists: response.totalItems, listCallState: successCallState(null) },
                  );
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { listCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    checklistStoreEvents.listFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load checklists'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      );

      return {
        /**
         * Method load
         * @method load
         *
         * @description
         * Fetches one page of checklists from the API. Cancels any in-flight
         * request via `switchMap`. Alias: {@link loadChecklists}.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<{ organizationId: string; options?: RequestOptions }>} An RxMethod that accepts organization ID and optional request options.
         */
        load: loadFn,

        /**
         * Method loadChecklists
         * @method loadChecklists
         *
         * @description
         * Alias for {@link load} — preferred name when called without pagination
         * options (e.g. from the list page).
         *
         * @since 1.0.0
         *
         * @type {RxMethod<{ organizationId: string; options?: RequestOptions }>} An RxMethod that accepts organization ID and optional request options.
         */
        loadChecklists: loadFn,

        /**
         * Method create
         * @method create
         *
         * @description
         * Creates a new checklist via the API. Uses `exhaustMap` to prevent
         * concurrent submissions. On success the `createOperation` transitions
         * to a success state carrying the newly created entity.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<{ organizationId: string; input: CreateChecklistInput }>} An RxMethod that accepts the creation input.
         */
        create: rxMethod<{ organizationId: string; input: CreateChecklistInput }>(
          pipe(
            tap((): void => {
              patchState(store, { createCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, input }) =>
              checklistService.create(organizationId, input).pipe(
                tapResponse({
                  next: (checklist: ChecklistOutput): void => {
                    patchState(store, addEntity(checklist, { collection: 'checklist' }), {
                      createCallState: successCallState(checklist),
                      totalChecklists: store.totalChecklists() + 1,
                    });
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { createCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      checklistStoreEvents.createFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to create checklist'),
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
         * Archives a checklist by organization ID and checklist ID. Uses
         * `exhaustMap` to prevent concurrent archive operations. On success:
         * updates the entity in the collection and transitions the
         * `archiveOperation` to success.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<{ organizationId: string; checklistId: string }>} An RxMethod that accepts the organization ID and checklist ID to archive.
         */
        archive: rxMethod<{ organizationId: string; checklistId: string }>(
          pipe(
            tap((): void => {
              patchState(store, { archiveCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, checklistId }) =>
              checklistService.archive(organizationId, checklistId).pipe(
                tapResponse({
                  next: (checklist: ChecklistOutput): void => {
                    patchState(store, setEntity(checklist, { collection: 'checklist' }), {
                      archiveCallState: successCallState(checklist),
                    });
                    // If the archived checklist is the currently active one, update it.
                    if (activeChecklistStore.selectedChecklist()?.id === checklist.id) {
                      activeChecklistStore.setChecklist(checklist);
                    }
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { archiveCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      checklistStoreEvents.archiveFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to archive checklist'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        /**
         * Method resetCreateOperation
         * @method resetCreateOperation
         *
         * @description
         * Resets the create operation back to its idle state.
         * Call this after the create form is dismissed or the dialog is closed.
         *
         * @since 1.0.0
         *
         * @returns {void} No return value.
         */
        resetCreateOperation(): void {
          patchState(store, { createCallState: idleCallState() });
        },

        /**
         * Method resetArchiveOperation
         * @method resetArchiveOperation
         *
         * @description
         * Resets the archive operation back to its idle state.
         *
         * @since 2.0.0
         *
         * @returns {void} No return value.
         */
        resetArchiveOperation(): void {
          patchState(store, { archiveCallState: idleCallState() });
        },
      };
    },
  ),
  //#endregion
);

/**
 * Type ChecklistStore
 * @type ChecklistStore
 *
 * @description
 * Instance type of the {@link ChecklistStore} signal store.
 *
 * @version 1.0.0
 */
export type ChecklistStore = InstanceType<typeof ChecklistStore>;
