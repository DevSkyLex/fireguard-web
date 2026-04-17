import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  addEntity,
  removeEntities,
  removeEntity,
  setAllEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, forkJoin, map, pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/models/api';
import type { RequestOptions } from '@core/services/hydra-api';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/state/request-state';
import { OrganizationService } from '@features/organization/data-access';
import type { OrganizationOutput, CreateOrganizationInput } from '@features/organization/models';
import { ActiveOrganizationStore } from '../active-organization/active-organization.store';
import type { OrganizationState } from './models';
import { organizationStoreEvents } from './events';

//#region Initial State
/**
 * Constant INITIAL_ORGANIZATION_STATE
 * @const INITIAL_ORGANIZATION_STATE
 *
 * @description
 * Initial state for the OrganizationStore. Entity state (`organizationEntities`,
 * `organizationEntityMap`, `organizationIds`) is initialised by `withEntities`.
 * This constant only seeds the auxiliary state managed in `OrganizationState`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
const INITIAL_ORGANIZATION_STATE: OrganizationState = {
  createCallState: idleCallState(),
  totalOrganizations: 0,
  listCallState: idleCallState(),
  deleteCallState: idleCallState(),
} as const;
//#endregion

/**
 * Store OrganizationStore
 * @const OrganizationStore
 *
 * @description
 * Component-scoped NgRx SignalStore for organization list management and CRUD.
 * Designed to be provided at **component level** (no `providedIn: 'root'`), so
 * each consumer (table, switcher, etc.) gets an independent instance tied to
 * its own lifecycle.
 *
 * Entity state is managed by `withEntities<OrganizationOutput>({ collection:
 * 'organization' })`, which provides O(1) lookups via `organizationEntityMap`
 * and keeps insertions/deletions efficient via normalized storage.
 * Auxiliary state (`isLoading`, `isDeleting`, `totalOrganizations`,
 * `createOperation`) is held in `withState<OrganizationState>`.
 *
 * For reading the currently active/selected organization use the root-level
 * {@link ActiveOrganizationStore} instead.
 *
 * @example
 * ```typescript
 * @Component({ providers: [OrganizationStore] })
 * export class OrganizationTable {
 *   readonly store = inject(OrganizationStore);
 * }
 * ```
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OrganizationStore = signalStore(
  //#region Features
  /**
   * Feature withEntities
   *
   * @description
   * Adds NgRx entity state and entity-adapter updater functions for
   * `OrganizationOutput` objects keyed by their `id` field. Provides:
   * - `organizationEntities` — ordered array of all cached entities
   * - `organizationEntityMap` — `{ [id]: OrganizationOutput }` lookup map
   * - `organizationIds` — ordered array of entity ids
   *
   * @since 2.0.0
   *
   * @returns {object} Entity state slices and updater helpers for organizations.
   */
  withEntities({ entity: type<OrganizationOutput>(), collection: 'organization' }),

  /**
   * Feature withState
   *
   * @description
   * Adds auxiliary state to the store: `createOperation`, `totalOrganizations`,
   * `isLoading`, and `isDeleting`. Initialized from
   * `INITIAL_ORGANIZATION_STATE`. Entity state is handled separately by
   * `withEntities`.
   *
   * @since 1.0.0
   *
   * @returns {object} The initial auxiliary state for the organization store.
   */
  withState<OrganizationState>(INITIAL_ORGANIZATION_STATE),

  /**
   * Feature withComputed
   *
   * @description
   * Adds computed properties to the store for common derived state
   * related to the organization list and its operations.
   *
   * @since 1.0.0
   *
   * @param {SignalStore} store - The store instance to which the computed properties will be added.
   *
   * @returns {object} An object containing the computed properties to add to the store.
   */
  withComputed((store) => {
    /**
     * Constant activeOrganizationStore
     * @const activeOrganizationStore
     *
     * @description
     * The root-level store that tracks the currently active organization and
     * its associated loading state and statistics.
     *
     * @type {ActiveOrganizationStore} The injected ActiveOrganizationStore instance.
     */
    const activeOrganizationStore: ActiveOrganizationStore =
      inject<ActiveOrganizationStore>(ActiveOrganizationStore);

    return {
      /**
       * Property organizations
       *
       * @description
       * All cached organizations from the entity collection, in insertion order.
       * Reads from `organizationEntities` provided by `withEntities`.
       *
       * @since 1.0.0
       *
       * @type {ReadonlyArray<OrganizationOutput>} The current page of organizations.
       */
      organizations: computed<ReadonlyArray<OrganizationOutput>>(() =>
        store.organizationEntities(),
      ),

      /**
       * Property isEmpty
       *
       * @description
       * True when the entity collection is empty and no list request is
       * currently in-flight. Equivalent to `organizations.length === 0 &&
       * !isLoading`.
       *
       * @since 2.0.0
       *
       * @type {boolean}
       */
      isEmpty: computed<boolean>(
        () => store.organizationIds().length === 0 && store.listCallState().status !== 'pending',
      ),

      /**
       * Property selectedOrganization
       *
       * @description
       * Proxied from {@link ActiveOrganizationStore} so consumers can read
       * the currently active organization without an extra injection.
       *
       * @since 1.0.0
       *
       * @type {OrganizationOutput | null} The currently selected organization, or null if none.
       */
      selectedOrganization: computed<OrganizationOutput | null>(() =>
        activeOrganizationStore.selectedOrganization(),
      ),

      /**
       * Property isLoadingOrganizations
       *
       * @description
       * Alias for `isLoading()` — matches naming used in templates and specs
       * to distinguish list loading from single-entity loading.
       *
       * @since 1.0.0
       *
       * @type {boolean} True if the organization list is currently loading, false otherwise.
       */
      isLoadingOrganizations: computed<boolean>(() => store.listCallState().status === 'pending'),

      /**
       * Property isDeleting
       *
       * @description
       * True while a single or bulk delete operation is in-flight.
       *
       * @since 3.0.0
       *
       * @type {boolean}
       */
      isDeleting: computed<boolean>(() => store.deleteCallState().status === 'pending'),

      /**
       * Property isLoadingOrganization
       *
       * @description
       * Proxied from {@link ActiveOrganizationStore} — true while the
       * organization is being resolved (e.g., by the route resolver).
       *
       * @since 1.0.0
       *
       * @type {boolean} True if the active organization is currently loading, false otherwise.
       */
      isLoadingOrganization: computed<boolean>(() =>
        activeOrganizationStore.isLoadingOrganization(),
      ),

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
   * Adds methods to the store for managing the organization list, including
   * loading a paginated list, creating, deleting single and multiple
   * organizations, and resetting the create operation.
   *
   * @since 1.0.0
   *
   * @param {SignalStore} store - The store instance to which the methods will be added.
   * @param {OrganizationService} organizationService - The service used to fetch organization data from the API.
   * @param {ActiveOrganizationStore} activeOrganizationStore - The root store tracking the currently active organization.
   * @param {Dispatcher} dispatcher - The NgRx Signals event dispatcher, used to dispatch events on errors.
   *
   * @returns {object} An object containing the methods to add to the store.
   */
  withMethods(
    (
      store,
      organizationService: OrganizationService = inject<OrganizationService>(OrganizationService),
      activeOrganizationStore: ActiveOrganizationStore = inject<ActiveOrganizationStore>(
        ActiveOrganizationStore,
      ),
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
    ) => {
      /**
       * Constant loadFn
       * @const loadFn
       *
       * @description
       * Shared rxMethod implementation for loading a paginated organization list.
       * Uses `switchMap` so that a new request cancels any previous in-flight one.
       * Exposed under two names: {@link load} (table / generic usage) and
       * {@link loadOrganizations} (switcher / page usage).
       *
       * @since 1.0.0
       *
       * @type {RxMethod<RequestOptions | void>}
       */
      const loadFn = rxMethod<RequestOptions | void>(
        pipe(
          tap((): void => {
            patchState(store, { listCallState: pendingCallState() });
          }),
          switchMap((options: RequestOptions | void) =>
            organizationService.list(options ?? undefined).pipe(
              tapResponse({
                next: (response: HydraCollection<OrganizationOutput>): void => {
                  patchState(
                    store,
                    setAllEntities([...response.member], { collection: 'organization' }),
                    {
                      totalOrganizations: response.totalItems,
                      listCallState: successCallState(null),
                    },
                  );
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { listCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    organizationStoreEvents.listFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load organizations'),
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
         * Fetches one page of organizations from the API. Cancels any in-flight
         * request via `switchMap`. Alias: {@link loadOrganizations}.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<RequestOptions | void>} An RxMethod that accepts optional request options.
         */
        load: loadFn,

        /**
         * Method loadOrganizations
         * @method loadOrganizations
         *
         * @description
         * Alias for {@link load} — preferred name when called without pagination
         * options (e.g. from the OrganizationSwitcher or the list page).
         *
         * @since 1.0.0
         *
         * @type {RxMethod<RequestOptions | void>} An RxMethod that accepts optional request options.
         */
        loadOrganizations: loadFn,

        /**
         * Method create
         * @method create
         *
         * @description
         * Creates a new organization via the API. Uses `exhaustMap` to prevent
         * concurrent submissions. On success the `createOperation` transitions
         * to a success state carrying the newly created entity.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<CreateOrganizationInput>} An RxMethod that accepts the creation input.
         */
        create: rxMethod<CreateOrganizationInput>(
          pipe(
            tap((): void => {
              patchState(store, { createCallState: pendingCallState() });
            }),
            exhaustMap((input: CreateOrganizationInput) =>
              organizationService.create(input).pipe(
                tapResponse({
                  next: (organization: OrganizationOutput): void => {
                    patchState(store, addEntity(organization, { collection: 'organization' }), {
                      createCallState: successCallState(organization),
                      totalOrganizations: store.totalOrganizations() + 1,
                    });
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { createCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      organizationStoreEvents.createFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to create organization'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        /**
         * Method deleteOne
         * @method deleteOne
         *
         * @description
         * Deletes a single organization by ID. Uses `exhaustMap` to prevent
         * concurrent deletes. On success: removes the item from the paginated
         * list and clears the active selection if the deleted organization was
         * the currently selected one.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<string>} An RxMethod that accepts the organization ID to delete.
         */
        deleteOne: rxMethod<string>(
          pipe(
            tap((): void => {
              patchState(store, { deleteCallState: pendingCallState() });
            }),
            exhaustMap((id: string) =>
              organizationService.remove(id).pipe(
                tapResponse({
                  next: (): void => {
                    patchState(store, removeEntity(id, { collection: 'organization' }), {
                      totalOrganizations: store.totalOrganizations() - 1,
                      deleteCallState: successCallState(null),
                    });
                    if (activeOrganizationStore.selectedOrganization()?.id === id) {
                      activeOrganizationStore.clearSelectedOrganization();
                    }
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { deleteCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      organizationStoreEvents.deleteFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to delete organization'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        /**
         * Method deleteMany
         * @method deleteMany
         *
         * @description
         * Bulk-deletes organizations in parallel using `forkJoin`. Uses `exhaustMap`
         * to prevent concurrent bulk-delete operations. On success: removes all
         * matching items from the list and clears the active selection if it was
         * among the deleted IDs.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<string[]>} An RxMethod that accepts an array of organization IDs to delete.
         */
        deleteMany: rxMethod<string[]>(
          pipe(
            tap((): void => {
              patchState(store, { deleteCallState: pendingCallState() });
            }),
            exhaustMap((ids: string[]) =>
              forkJoin(ids.map((id: string) => organizationService.remove(id))).pipe(
                map((): void => void 0),
                tapResponse({
                  next: (): void => {
                    patchState(store, removeEntities(ids, { collection: 'organization' }), {
                      totalOrganizations: store.totalOrganizations() - ids.length,
                      deleteCallState: successCallState(null),
                    });
                    const selectedId: string | undefined =
                      activeOrganizationStore.selectedOrganization()?.id;
                    if (selectedId !== undefined && ids.includes(selectedId)) {
                      activeOrganizationStore.clearSelectedOrganization();
                    }
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { deleteCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      organizationStoreEvents.deleteManyFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to delete organizations'),
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
      };
    },
  ),
  //#endregion
);

/**
 * Type OrganizationStore
 * @type OrganizationStore
 *
 * @description
 * Instance type of the {@link OrganizationStore} signal store.
 *
 * @version 1.0.0
 */
export type OrganizationStore = InstanceType<typeof OrganizationStore>;
