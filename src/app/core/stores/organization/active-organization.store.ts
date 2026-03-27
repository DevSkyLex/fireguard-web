import { inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { computed } from '@angular/core';
import { Observable, filter, forkJoin, pipe, switchMap, tap } from 'rxjs';
import { OrganizationService } from '@core/services/api/organization';
import type {
  OrganizationDashboardStatistics,
  OrganizationOutput,
  OrganizationStatisticsOutput,
} from '@core/models/organization';
import type { ActiveOrganizationState } from './active-organization-state.interface';
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
import { activeOrganizationStoreEvents } from './active-organization.events';

//#region Initial State
/**
 * Constant INITIAL_ACTIVE_ORGANIZATION_STATE
 * @const INITIAL_ACTIVE_ORGANIZATION_STATE
 *
 * @description
 * Initial state for the ActiveOrganizationStore, representing an idle
 * state with no selected organization and no ongoing operations.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
const INITIAL_ACTIVE_ORGANIZATION_STATE: ActiveOrganizationState = {
  selectedOrganization: null,
  getOperation: createIdleOperation(),
  statistics: null,
  dashboardStatistics: null,
  statisticsOperation: createIdleOperation(),
} as const;
//#endregion

/**
 * Store ActiveOrganizationStore
 * @const ActiveOrganizationStore
 *
 * @description
 * Root-level NgRx SignalStore that tracks only the **currently active /
 * selected organization** and its associated statistics.
 *
 * This store is intentionally minimal — its single responsibility is
 * answering "which organization are we looking at right now?". All list
 * management and CRUD live in the component-scoped {@link OrganizationStore}.
 *
 * Provided at the root level (`providedIn: 'root'`) so that any service or
 * component can read `selectedOrganization` without providing anything.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ActiveOrganizationStore = signalStore(
  { providedIn: 'root' },

  //#region Features
  /**
   * Feature withState
   *
   * @description
   * Adds the ActiveOrganizationState to the store, initialized with
   * INITIAL_ACTIVE_ORGANIZATION_STATE.
   *
   * @since 1.0.0
   *
   * @returns {ActiveOrganizationState} The initial state for the active organization store.
   */
  withState<ActiveOrganizationState>(INITIAL_ACTIVE_ORGANIZATION_STATE),

  /**
   * Feature withComputed
   *
   * @description
   * Adds computed properties to the store for common
   * derived state related to the active organization and its statistics.
   *
   * @since 1.0.0
   *
   * @param {SignalStore} store - The store instance to which the computed properties will be added.
   *
   * @returns {object} An object containing the computed properties to add to the store.
   */
  withComputed((store) => ({
    /**
     * Property isLoadingOrganization
     *
     * @description
     * True while the organization is being resolved / fetched.
     *
     * @since 1.0.0
     *
     * @type {boolean} True if the get operation is currently loading, false otherwise.
     */
    isLoadingOrganization: computed<boolean>(
      () => store.getOperation().status === 'loading',
    ),

    /**
     * Property isLoadingStatistics
     *
     * @description
     * True while the organization's statistics are being fetched.
     *
     * @since 1.0.0
     *
     * @type {boolean} True if the statistics operation is currently loading, false otherwise.
     */
    isLoadingStatistics: computed<boolean>(
      () => store.statisticsOperation().status === 'loading',
    ),

    /**
     * Property getError
     *
     * @description
     * Error from the get operation, if any. Null if the operation is idle
     * or loading, or if it succeeded.
     *
     * @since 1.0.0
     *
     * @type {OperationError<unknown> | null} The error object if the get operation is in error, or null otherwise.
     */
    getError: computed<OperationError<unknown> | null>(() => {
      /**
       * Constant operation
       * @const operation
       *
       * @description
       * Current get operation for fetching the selected organization, used to
       * derive the getError computed property.
       *
       * @type {Operation<OrganizationOutput | null, unknown>}
       */
      const operation: Operation<OrganizationOutput | null, unknown> = store.getOperation();

      // If the operation is in error, return the error object; otherwise, return null.
      return operation.status === 'error' ? operation.error : null;
    }),

    /**
     * Property statisticsError
     *
     * @description
     * Error from the statistics operation, if any. Null if the operation is idle
     * or loading, or if it succeeded.
     *
     * @since 1.0.0
     *
     * @type {OperationError<unknown> | null} The error object if the statistics operation is in error, or null otherwise.
     */
    statisticsError: computed<OperationError<unknown> | null>(() => {
      /**
       * Constant operation
       * @const operation
       *
       * @description
       * Current statistics operation for fetching the selected organization's statistics, used to
       * derive the statisticsError computed property.
       *
       * @type {Operation<OrganizationStatisticsOutput | null, unknown>}
       */
      const operation: Operation<OrganizationStatisticsOutput | null, unknown> = store.statisticsOperation();

      // If the operation is in error, return the error object; otherwise, return null.
      return operation.status === 'error' ? operation.error : null;
    }),

    equipmentStatistics: computed(
      () => store.dashboardStatistics()?.equipment ?? null,
    ),

    facilityStatistics: computed(
      () => store.dashboardStatistics()?.facilities ?? null,
    ),

    inspectionStatistics: computed(
      () => store.dashboardStatistics()?.inspections ?? null,
    ),

    membershipStatistics: computed(
      () => store.dashboardStatistics()?.membership ?? null,
    ),

    nonConformityStatistics: computed(
      () => store.dashboardStatistics()?.nonConformities ?? null,
    ),
  })),

  /**
   * Feature withMethods
   *
   * @description
   * Adds methods to the store for managing the active organization state, including
   * setting the active organization, resolving it by ID,
   * clearing the selection, and loading statistics.
   *
   * @since 1.0.0
   *
   * @param {SignalStore} store - The store instance to which the methods will be added.
   * @param {Dispatcher} dispatcher - The NgRx Signals event dispatcher, used to dispatch events on errors.
   * @param {OrganizationService} organizationService - The service used to fetch organization data from the API.
   *
   * @returns {object} An object containing the methods to add to the store.
   */
  withMethods((
    store,
    dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
    organizationService: OrganizationService = inject<OrganizationService>(OrganizationService),
  ) => ({
    /**
     * Method setOrganization
     * @method setOrganization
     *
     * @description
     * Directly sets the selected organization (e.g., resolved from route data
     * by DashboardLayout after the resolver runs).
     *
     * @since 1.0.0
     *
     * @param {OrganizationOutput} organization - Organization to mark as active.
     *
     * @returns {void} No return value.
     */
    setOrganization(organization: OrganizationOutput): void {
      const hasChangedOrganization: boolean =
        store.selectedOrganization()?.id !== organization.id;

      patchState(store, {
        selectedOrganization: organization,
        getOperation: createSuccessOperation(organization),
        ...(hasChangedOrganization
          ? {
              statistics: null,
              dashboardStatistics: null,
              statisticsOperation: createIdleOperation(),
            }
          : {}),
      });
    },

    /**
     * Method resolveOrganization
     * @method resolveOrganization
     *
     * @description
     * Fetches a single organization by ID and marks it as the active one.
     * Returns an Observable so Angular route resolvers can await the result.
     *
     * @since 1.0.0
     *
     * @param {string} id - Organization identifier.
     *
     * @returns {Observable<OrganizationOutput>} Observable that emits the resolved
     * organization or an error if it fails.
     */
    resolveOrganization(id: string): Observable<OrganizationOutput> {
      patchState(store, {
        getOperation: createLoadingOperation(store.getOperation().data),
      });

      return organizationService.get(id).pipe(
        tap({
          next: (organization: OrganizationOutput): void => {
            patchState(store, {
              selectedOrganization: organization,
              getOperation: createSuccessOperation(organization),
            });
          },
          error: (error: unknown): void => {
            const operationError: OperationError<unknown> =
              createOperationErrorFromUnknown(error);
            patchState(store, {
              getOperation: createErrorOperation(
                operationError,
                store.getOperation().data,
              ),
            });
            dispatcher.dispatch(
              activeOrganizationStoreEvents.getFailed(
                toOperationFailureEventPayload(operationError, 'Failed to load organization'),
              ),
            );
          },
        }),
      );
    },

    /**
     * Method clearSelectedOrganization
     * @method clearSelectedOrganization
     *
     * @description
     * Clears the active organization selection. Called by
     * {@link OrganizationStore} after a successful delete when the
     * deleted organization was the currently active one.
     *
     * @since 1.0.0
     *
     * @return {void} No return value.
     */
    clearSelectedOrganization(): void {
      patchState(store, {
        selectedOrganization: null,
        statistics: null,
        dashboardStatistics: null,
        statisticsOperation: createIdleOperation(),
      });
    },

    /**
     * Method loadStatistics
     * @method loadStatistics
     *
     * @description
     * Loads the statistics for the currently
     * active organization.
     *
     * @since 1.0.0
     *
     * @type {RxMethod<string>} returns an RxJS pipe that takes an
     * organization ID and triggers the
     */
    loadStatistics: rxMethod<string>(
      pipe(
        tap((): void => {
          patchState(store, {
            statisticsOperation: createLoadingOperation(store.statisticsOperation().data),
          });
        }),
        switchMap((organizationId: string) =>
          forkJoin({
            overview: organizationService.getStatistics(organizationId),
            equipment: organizationService.getEquipmentStatistics(organizationId),
            facilities: organizationService.getFacilityStatistics(organizationId),
            inspections: organizationService.getInspectionStatistics(organizationId),
            membership: organizationService.getMembershipStatistics(organizationId),
            nonConformities: organizationService.getNonConformityStatistics(organizationId),
          }).pipe(
            tapResponse({
              next: (statistics: OrganizationDashboardStatistics): void => {
                patchState(store, {
                  statistics: statistics.overview,
                  dashboardStatistics: statistics,
                  statisticsOperation: createSuccessOperation(statistics.overview),
                });
              },
              error: (error: unknown): void => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  statisticsOperation: createErrorOperation(
                    operationError,
                    store.statisticsOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  activeOrganizationStoreEvents.statisticsFailed(
                    toOperationFailureEventPayload(
                      operationError,
                      'Failed to load organization statistics',
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
     * Method clear
     * @method clear
     *
     * @description
     * Resets the entire active-organization state to idle.
     * Should be called on logout.
     *
     * @since 1.0.0
     *
     * @returns {void} No return value.
     */
    clear(): void {
      patchState(store, INITIAL_ACTIVE_ORGANIZATION_STATE);
    },
  })),

  /**
   * Feature withHooks
   *
   * @description
   * Lifecycle hooks for the ActiveOrganizationStore. On initialization,
   * subscribes to router NavigationEnd events and clears the selected
   * organization whenever the active URL no longer contains an
   * `:organizationId` segment.
   *
   * @since 1.0.0
   *
   * @param {SignalStore} store - The store instance.
   */
  withHooks((store) => {
    const router: Router = inject<Router>(Router);

    return {
      onInit(): void {
        router.events.pipe(
          filter((e): e is NavigationEnd => e instanceof NavigationEnd),
          takeUntilDestroyed(),
        ).subscribe((): void => {
          const hasOrganizationId: boolean =
            router.routerState.snapshot.root.firstChild
              ?.children.some((child) => child.paramMap.has('organizationId')) ?? false;

          if (!hasOrganizationId && store.selectedOrganization() !== null) {
            store.clearSelectedOrganization();
          }
        });
      },
    };
  }),
  //#endregion
);

/**
 * Type ActiveOrganizationStore
 * @type ActiveOrganizationStore
 *
 * @description
 * Instance type of the {@link ActiveOrganizationStore} signal store.
 *
 * @version 1.0.0
 */
export type ActiveOrganizationStore = InstanceType<typeof ActiveOrganizationStore>;
