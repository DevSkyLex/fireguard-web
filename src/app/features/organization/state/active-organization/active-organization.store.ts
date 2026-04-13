import { computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { Observable, filter, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  StoreError,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type CallState,
} from '@core/state/request-state';
import { OrganizationService } from '@features/organization/data-access';
import type { OrganizationOutput } from '@features/organization/models';
import type { ActiveOrganizationState } from './active-organization-state.interface';
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
  getCallState: idleCallState(),
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
    isLoadingOrganization: computed<boolean>(() => store.getCallState().status === 'pending'),

    /**
     * Property getError
     *
     * @description
     * Error associated with the active-organization fetch operation.
     *
     * @type {StoreError | null}
     */
    getError: computed<StoreError | null>(() => store.getCallState().error),
  })),
  withMethods(
    (
      store,
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
      organizationService: OrganizationService = inject<OrganizationService>(OrganizationService),
    ) => {
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
          patchState(store, {
            selectedOrganization: organization,
            getCallState: successCallState(organization),
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
            getCallState: pendingCallState(),
          });

          return organizationService.get(id).pipe(
            tap({
              next: (organization: OrganizationOutput): void => {
                patchState(store, {
                  selectedOrganization: organization,
                  getCallState: successCallState(organization),
                });
              },
              error: (error: unknown): void => {
                const storeError: StoreError = toStoreError(error);
                patchState(store, {
                  getCallState: errorCallState(storeError),
                });
                dispatcher.dispatch(
                  activeOrganizationStoreEvents.getFailed(
                    toStoreFailureEventPayload(storeError, 'Failed to load organization'),
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
          });
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
            getCallState: idleCallState(),
          });
        },
      };
    },
  ),

  withHooks((store) => {
    const router: Router = inject<Router>(Router);

    return {
      onInit(): void {
        router.events
          .pipe(
            filter((e): e is NavigationEnd => e instanceof NavigationEnd),
            takeUntilDestroyed(),
          )
          .subscribe((): void => {
            const hasOrganizationId: boolean =
              router.routerState.snapshot.root.firstChild?.children.some((child) =>
                child.paramMap.has('organizationId'),
              ) ?? false;

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
