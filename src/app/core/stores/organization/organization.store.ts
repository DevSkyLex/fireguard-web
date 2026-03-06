import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, forkJoin, map, pipe, switchMap, tap } from 'rxjs';
import { OrganizationService } from '@core/services/api/organization';
import type { HydraCollection } from '@core/models/api';
import type { OrganizationOutput, CreateOrganizationInput } from '@core/models/organization';
import type { RequestOptions } from '@core/services/api';
import { withPaginatedList } from '@core/stores/features';
import { ActiveOrganizationStore } from './active-organization.store';
import type { OrganizationState } from './organization-state.interface';
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
import { organizationStoreEvents } from './organization.events';

//#region Initial State
/**
 * Constant INITIAL_ORGANIZATION_STATE
 * @const INITIAL_ORGANIZATION_STATE
 *
 * @description
 * Initial state for the OrganizationStore, representing an idle
 * state with no ongoing create operation.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
const INITIAL_ORGANIZATION_STATE: OrganizationState = {
  createOperation: createIdleOperation(),
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
 * Built on {@link withPaginatedList} which provides all pagination state and
 * helpers. This store adds the organization-specific load, create, and delete
 * methods that call the API directly.
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
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OrganizationStore = signalStore(
  //#region Features
  /**
   * Feature withPaginatedList
   *
   * @description
   * Adds paginated list state and helpers to the store for managing a list of
   * organizations. The generic type parameter is set to `OrganizationOutput` to
   * type the list items and total count appropriately.
   *
   * @since 1.0.0
   *
   * @returns {object} The initial state and methods for paginated list
   * management, typed for organizations.
   */
  withPaginatedList<OrganizationOutput>(),

  /**
   * Feature withState
   *
   * @description
   * Adds the create operation state to the store, initialized with
   * INITIAL_ORGANIZATION_STATE.
   *
   * @since 1.0.0
   *
   * @returns {object} The initial state for the organization store.
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
       * Convenience alias for `items()` — reads naturally in templates
       * without exposing the generic paginated list naming.
       *
       * @since 1.0.0
       *
       * @type {ReadonlyArray<OrganizationOutput>} The current page of organizations.
       */
      organizations: computed<ReadonlyArray<OrganizationOutput>>(
        () => store.items(),
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
      selectedOrganization: computed<OrganizationOutput | null>(
        () => activeOrganizationStore.selectedOrganization(),
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
      isLoadingOrganizations: computed<boolean>(
        () => store.isLoading(),
      ),

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
      isLoadingOrganization: computed<boolean>(
        () => activeOrganizationStore.isLoadingOrganization(),
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
      isCreating: computed<boolean>(
        () => store.createOperation().status === 'loading',
      ),

      /**
       * Property createError
       *
       * @description
       * Error from the last create operation, if any. Null if the operation
       * is idle, loading, or succeeded.
       *
       * @since 1.0.0
       *
       * @type {OperationError<unknown> | null} The error object if the create operation is in error, or null otherwise.
       */
      createError: computed<OperationError<unknown> | null>(() => {
        /**
         * Constant operation
         * @const operation
         *
         * @description
         * Current create operation, used to derive the createError computed property.
         *
         * @type {Operation<OrganizationOutput | null, unknown>}
         */
        const operation: Operation<OrganizationOutput | null, unknown> = store.createOperation();

        // If the operation is in error, return the error object; otherwise, return null.
        return operation.status === 'error' ? operation.error : null;
      }),
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
  withMethods((
    store,
    organizationService: OrganizationService = inject<OrganizationService>(OrganizationService),
    activeOrganizationStore: ActiveOrganizationStore = inject<ActiveOrganizationStore>(ActiveOrganizationStore),
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
        tap((): void => { store.setLoading(true); }),
        switchMap((options: RequestOptions | void) =>
          organizationService.list(options ?? undefined).pipe(
            tapResponse({
              next: (response: HydraCollection<OrganizationOutput>): void => {
                store.setItems([...response.member], response.totalItems);
              },
              error: (error: unknown): void => {
                store.setLoading(false);
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                dispatcher.dispatch(
                  organizationStoreEvents.listFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load organizations'),
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
            patchState(store, {
              createOperation: createLoadingOperation(store.createOperation().data),
            });
          }),
          exhaustMap((input: CreateOrganizationInput) =>
            organizationService.create(input).pipe(
              tapResponse({
                next: (organization: OrganizationOutput): void => {
                  patchState(store, {
                    createOperation: createSuccessOperation(organization),
                  });
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
                    organizationStoreEvents.createFailed(
                      toOperationFailureEventPayload(operationError, 'Failed to create organization'),
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
          tap((): void => { store.setDeleting(true); }),
          exhaustMap((id: string) =>
            organizationService.remove(id).pipe(
              tapResponse({
                next: (): void => {
                  store.removeItem(id);
                  store.setDeleting(false);
                  if (activeOrganizationStore.selectedOrganization()?.id === id) {
                    activeOrganizationStore.clearSelectedOrganization();
                  }
                },
                error: (error: unknown): void => {
                  store.setDeleting(false);
                  const operationError: OperationError<unknown> =
                    createOperationErrorFromUnknown(error);
                  dispatcher.dispatch(
                    organizationStoreEvents.deleteFailed(
                      toOperationFailureEventPayload(operationError, 'Failed to delete organization'),
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
          tap((): void => { store.setDeleting(true); }),
          exhaustMap((ids: string[]) =>
            forkJoin(ids.map((id: string) => organizationService.remove(id))).pipe(
              map((): void => void 0),
              tapResponse({
                next: (): void => {
                  store.removeItems(ids);
                  store.setDeleting(false);
                  const selectedId: string | undefined =
                    activeOrganizationStore.selectedOrganization()?.id;
                  if (selectedId !== undefined && ids.includes(selectedId)) {
                    activeOrganizationStore.clearSelectedOrganization();
                  }
                },
                error: (error: unknown): void => {
                  store.setDeleting(false);
                  const operationError: OperationError<unknown> =
                    createOperationErrorFromUnknown(error);
                  dispatcher.dispatch(
                    organizationStoreEvents.deleteManyFailed(
                      toOperationFailureEventPayload(operationError, 'Failed to delete organizations'),
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
        patchState(store, { createOperation: createIdleOperation() });
      },
    };
  }),
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
