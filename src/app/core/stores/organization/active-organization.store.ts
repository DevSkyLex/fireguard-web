import { computed, inject } from '@angular/core';
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
import { Observable, filter, pipe, switchMap, tap } from 'rxjs';
import { OrganizationService } from '@core/services/api/organization';
import type {
  OrganizationDashboardOutput,
  OrganizationDashboardInspectionTrendQueryOptions,
  OrganizationDashboardNonConformityTrendQueryOptions,
  OrganizationDashboardQueryOptions,
  OrganizationDashboardTrendKey,
  OrganizationDashboardTrendQueryOptions,
  OrganizationDashboardTrendOutput,
  OrganizationOutput,
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
 * Interface DashboardRequestPayload
 * @interface DashboardRequestPayload
 *
 * @description
 * Internal request payload used by dashboard rxMethods so they can
 * receive both the organization identifier and optional query filters.
 */
interface DashboardRequestPayload {
  readonly organizationId: string;
  readonly options?: OrganizationDashboardQueryOptions;
}

/**
 * Interface DashboardTrendRequestPayload
 * @interface DashboardTrendRequestPayload
 *
 * @description
 * Internal request payload used by dedicated trend rxMethods.
 */
interface DashboardTrendRequestPayload<TOptions extends OrganizationDashboardTrendQueryOptions> {
  readonly organizationId: string;
  readonly options?: TOptions;
}

/**
 * Function createInitialDashboardTrendMap
 *
 * @description
 * Creates the empty dashboard trend-resource cache for the active organization.
 *
 * @returns {ActiveOrganizationState['dashboardTrendMap']} Initial dashboard trend map.
 */
const createInitialDashboardTrendMap = (): ActiveOrganizationState['dashboardTrendMap'] => ({
  inspections: null,
  nonConformitiesOpened: null,
  nonConformitiesResolved: null,
});

/**
 * Function createInitialDashboardTrendOperations
 *
 * @description
 * Creates the idle operation state for each dedicated dashboard trend endpoint.
 *
 * @returns {ActiveOrganizationState['dashboardTrendOperations']} Initial dashboard trend operation map.
 */
const createInitialDashboardTrendOperations = (): ActiveOrganizationState['dashboardTrendOperations'] => ({
  inspections: createIdleOperation(),
  nonConformitiesOpened: createIdleOperation(),
  nonConformitiesResolved: createIdleOperation(),
});

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
  dashboard: null,
  dashboardOperation: createIdleOperation(),
  dashboardTrendMap: createInitialDashboardTrendMap(),
  dashboardTrendOperations: createInitialDashboardTrendOperations(),
} as const;
//#endregion

/**
 * Store ActiveOrganizationStore
 * @const ActiveOrganizationStore
 *
 * @description
 * Root-level NgRx SignalStore that tracks only the **currently active /
 * selected organization** and its associated dashboard analytics.
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
  withState<ActiveOrganizationState>(INITIAL_ACTIVE_ORGANIZATION_STATE),

  withComputed((store) => ({
    /**
     * Property isLoadingOrganization
     *
     * @description
     * True while the selected organization resource is loading.
     *
     * @type {boolean}
     */
    isLoadingOrganization: computed<boolean>(
      () => store.getOperation().status === 'loading',
    ),

    /**
     * Property isLoadingDashboard
     *
     * @description
     * True while the aggregate dashboard resource is loading.
     *
     * @type {boolean}
     */
    isLoadingDashboard: computed<boolean>(
      () => store.dashboardOperation().status === 'loading',
    ),

    /**
     * Property dashboardInspectionsTrend
     *
     * @description
     * Dedicated inspections trend resource for the active organization.
     *
     * @type {OrganizationDashboardTrendOutput | null}
     */
    dashboardInspectionsTrend: computed<OrganizationDashboardTrendOutput | null>(
      () => store.dashboardTrendMap().inspections,
    ),

    /**
     * Property dashboardNonConformitiesOpenedTrend
     *
     * @description
     * Dedicated opened non-conformities trend resource for the active organization.
     *
     * @type {OrganizationDashboardTrendOutput | null}
     */
    dashboardNonConformitiesOpenedTrend: computed<OrganizationDashboardTrendOutput | null>(
      () => store.dashboardTrendMap().nonConformitiesOpened,
    ),

    /**
     * Property dashboardNonConformitiesResolvedTrend
     *
     * @description
     * Dedicated resolved non-conformities trend resource for the active organization.
     *
     * @type {OrganizationDashboardTrendOutput | null}
     */
    dashboardNonConformitiesResolvedTrend: computed<OrganizationDashboardTrendOutput | null>(
      () => store.dashboardTrendMap().nonConformitiesResolved,
    ),

    /**
     * Property isLoadingDashboardTrends
     *
     * @description
     * True while at least one dedicated dashboard trend endpoint is loading.
     *
     * @type {boolean}
     */
    isLoadingDashboardTrends: computed<boolean>(() =>
      Object.values(store.dashboardTrendOperations()).some(
        (operation) => operation.status === 'loading',
      ),
    ),

    /**
     * Property getError
     *
     * @description
     * Error associated with the active-organization fetch operation.
     *
     * @type {OperationError<unknown> | null}
     */
    getError: computed<OperationError<unknown> | null>(() => {
      const operation: Operation<OrganizationOutput | null, unknown> = store.getOperation();

      return operation.status === 'error' ? operation.error : null;
    }),

    /**
     * Property dashboardError
     *
     * @description
     * Error associated with the aggregate dashboard fetch operation.
     *
     * @type {OperationError<unknown> | null}
     */
    dashboardError: computed<OperationError<unknown> | null>(() => {
      const operation: Operation<OrganizationDashboardOutput | null, unknown> =
        store.dashboardOperation();

      return operation.status === 'error' ? operation.error : null;
    }),
  })),
  withMethods((
    store,
    dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
    organizationService: OrganizationService = inject<OrganizationService>(OrganizationService),
  ) => {
    /**
     * Function resetDashboardState
     *
     * @description
     * Produces a fresh idle dashboard state used when the selected organization
     * changes or when the store is cleared.
     *
     * @returns {Pick<ActiveOrganizationState, 'dashboard' | 'dashboardOperation' | 'dashboardTrendMap' | 'dashboardTrendOperations'>}
     * Dashboard-related slices reset to idle.
     */
    const resetDashboardState = (): Pick<
      ActiveOrganizationState,
      'dashboard' | 'dashboardOperation' | 'dashboardTrendMap' | 'dashboardTrendOperations'
    > => ({
      dashboard: null,
      dashboardOperation: createIdleOperation(),
      dashboardTrendMap: createInitialDashboardTrendMap(),
      dashboardTrendOperations: createInitialDashboardTrendOperations(),
    });

    /**
     * Function createDashboardTrendLoader
     *
     * @description
     * Creates a reusable rxMethod loader for one dedicated dashboard trend endpoint.
     *
     * @param {OrganizationDashboardTrendKey} metric - Logical key of the dashboard trend resource.
     * @param {(organizationId: string, options?: TOptions) => Observable<OrganizationDashboardTrendOutput>} request
     * Backend request function for the target trend endpoint.
     *
     * @returns {ReturnType<typeof rxMethod<DashboardTrendRequestPayload<TOptions>>>} Configured rxMethod for the target trend endpoint.
     */
    const createDashboardTrendLoader = <TOptions extends OrganizationDashboardTrendQueryOptions>(
      metric: OrganizationDashboardTrendKey,
      request: (
        organizationId: string,
        options?: TOptions,
      ) => Observable<OrganizationDashboardTrendOutput>,
    ) => rxMethod<DashboardTrendRequestPayload<TOptions>>(
      pipe(
        tap((): void => {
          patchState(store, {
            dashboardTrendOperations: {
              ...store.dashboardTrendOperations(),
              [metric]: createLoadingOperation(
                store.dashboardTrendOperations()[metric].data,
              ),
            },
          });
        }),
        switchMap(({ organizationId, options }: DashboardTrendRequestPayload<TOptions>) =>
          request(organizationId, options).pipe(
            tapResponse({
              next: (trend: OrganizationDashboardTrendOutput): void => {
                patchState(store, {
                  dashboardTrendMap: {
                    ...store.dashboardTrendMap(),
                    [metric]: trend,
                  },
                  dashboardTrendOperations: {
                    ...store.dashboardTrendOperations(),
                    [metric]: createSuccessOperation(trend),
                  },
                });
              },
              error: (error: unknown): void => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  dashboardTrendOperations: {
                    ...store.dashboardTrendOperations(),
                    [metric]: createErrorOperation(
                      operationError,
                      store.dashboardTrendOperations()[metric].data,
                    ),
                  },
                });
                dispatcher.dispatch(
                  activeOrganizationStoreEvents.dashboardTrendFailed(
                    toOperationFailureEventPayload(
                      operationError,
                      `Failed to load ${metric} dashboard trend`,
                    ),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    );

    const loadDashboard = rxMethod<DashboardRequestPayload>(
      pipe(
        tap((): void => {
          patchState(store, {
            dashboardOperation: createLoadingOperation(store.dashboardOperation().data),
          });
        }),
        switchMap(({ organizationId, options }: DashboardRequestPayload) =>
          organizationService.getDashboard(organizationId, options).pipe(
            tapResponse({
              next: (dashboard: OrganizationDashboardOutput): void => {
                patchState(store, {
                  dashboard,
                  dashboardOperation: createSuccessOperation(dashboard),
                });
              },
              error: (error: unknown): void => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  dashboardOperation: createErrorOperation(
                    operationError,
                    store.dashboardOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  activeOrganizationStoreEvents.dashboardFailed(
                    toOperationFailureEventPayload(
                      operationError,
                      'Failed to load organization dashboard',
                    ),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    );

    const loadDashboardInspectionsTrend = createDashboardTrendLoader(
      'inspections',
      organizationService.getDashboardInspectionsTrend.bind(organizationService),
    );
    const loadDashboardNonConformitiesOpenedTrend = createDashboardTrendLoader(
      'nonConformitiesOpened',
      organizationService.getDashboardNonConformitiesOpenedTrend.bind(organizationService),
    );
    const loadDashboardNonConformitiesResolvedTrend = createDashboardTrendLoader(
      'nonConformitiesResolved',
      organizationService.getDashboardNonConformitiesResolvedTrend.bind(organizationService),
    );

    return {
      /**
       * Method setOrganization
       * @method setOrganization
       *
       * @description
       * Marks the provided organization as active and resets dashboard data
       * when the selection changes.
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
          ...(hasChangedOrganization ? resetDashboardState() : {}),
        });
      },

      /**
       * Method resolveOrganization
       * @method resolveOrganization
       *
       * @description
       * Fetches an organization by ID and stores it as the active organization.
       *
       * @param {string} id - Organization identifier.
       *
       * @returns {Observable<OrganizationOutput>} Observable emitting the resolved organization.
       */
      resolveOrganization(id: string): Observable<OrganizationOutput> {
        patchState(store, {
          getOperation: createLoadingOperation(store.getOperation().data),
        });

        return organizationService.get(id).pipe(
          tap({
            next: (organization: OrganizationOutput): void => {
              const hasChangedOrganization: boolean =
                store.selectedOrganization()?.id !== organization.id;

              patchState(store, {
                selectedOrganization: organization,
                getOperation: createSuccessOperation(organization),
                ...(hasChangedOrganization ? resetDashboardState() : {}),
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
       * Clears only the active organization selection and all dashboard data.
       *
       * @returns {void} No return value.
       */
      clearSelectedOrganization(): void {
        patchState(store, {
          selectedOrganization: null,
          ...resetDashboardState(),
        });
      },

      /**
       * Method loadDashboard
       * @method loadDashboard
       *
       * @description
       * RxMethod that loads the aggregate organization dashboard resource.
       */
      loadDashboard,

      /**
       * Method loadDashboardInspectionsTrend
       * @method loadDashboardInspectionsTrend
       *
       * @description
       * RxMethod that loads the dedicated inspections trend resource.
       */
      loadDashboardInspectionsTrend,

      /**
       * Method loadDashboardNonConformitiesOpenedTrend
       * @method loadDashboardNonConformitiesOpenedTrend
       *
       * @description
       * RxMethod that loads the dedicated opened non-conformities trend resource.
       */
      loadDashboardNonConformitiesOpenedTrend,

      /**
       * Method loadDashboardNonConformitiesResolvedTrend
       * @method loadDashboardNonConformitiesResolvedTrend
       *
       * @description
       * RxMethod that loads the dedicated resolved non-conformities trend resource.
       */
      loadDashboardNonConformitiesResolvedTrend,

      /**
       * Method loadDashboardTrends
       * @method loadDashboardTrends
       *
       * @description
       * Triggers all dedicated dashboard trend requests for the active organization.
       *
       * @param {string} organizationId - Organization identifier.
      * @param {OrganizationDashboardTrendQueryOptions} [options] - Optional shared trend query filters.
       *
       * @returns {void} No return value.
       */
      loadDashboardTrends(
        organizationId: string,
        options?: OrganizationDashboardTrendQueryOptions,
      ): void {
        const payload = { organizationId, options };

        loadDashboardInspectionsTrend(payload);
        loadDashboardNonConformitiesOpenedTrend(payload);
        loadDashboardNonConformitiesResolvedTrend(payload);
      },

      /**
       * Method ensureDashboardLoaded
       * @method ensureDashboardLoaded
       *
       * @description
       * Loads the aggregate dashboard resource only when it is missing
       * for the currently selected organization.
       *
       * @param {string} organizationId - Organization identifier.
       * @param {OrganizationDashboardQueryOptions} [options] - Optional dashboard query filters.
       *
       * @returns {void} No return value.
       */
      ensureDashboardLoaded(
        organizationId: string,
        options?: OrganizationDashboardQueryOptions,
      ): void {
        if (!organizationId) {
          return;
        }

        const isSelectedOrganization: boolean =
          store.selectedOrganization()?.id === organizationId;
        const hasLoadedDashboard: boolean = store.dashboard() !== null;
        const isLoadingDashboard: boolean =
          store.dashboardOperation().status === 'loading';

        if (isSelectedOrganization && !hasLoadedDashboard && !isLoadingDashboard) {
          loadDashboard({ organizationId, options });
        }
      },

      /**
       * Method clear
       * @method clear
       *
       * @description
       * Resets the entire active-organization store to its idle state.
       *
       * @returns {void} No return value.
       */
      clear(): void {
        patchState(store, {
          selectedOrganization: null,
          getOperation: createIdleOperation(),
          ...resetDashboardState(),
        });
      },
    };
  }),

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
