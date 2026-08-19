import { computed, effect, inject, untracked } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap } from 'rxjs';
import {
  resetQuery,
  setErrorQuery,
  setPendingQuery,
  setSuccessQuery,
  toStoreError,
  withQueryState,
} from '@core/request-state';
import { OrganizationService } from '@features/organization/data-access';
import type { OrganizationNavigationCountersOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '../active-organization';
import type { OrganizationNavigationCountersState } from './models';

//#region Initial State
/**
 * Constant INITIAL_STATE
 * @const INITIAL_STATE
 *
 * @description
 * Initial state for the OrganizationNavigationCountersStore: no query has
 * resolved for any organization yet.
 */
const INITIAL_STATE: OrganizationNavigationCountersState = {
  currentOrganizationId: null,
};
//#endregion

/**
 * Store OrganizationNavigationCountersStore
 * @const OrganizationNavigationCountersStore
 *
 * @description
 * Root-level NgRx SignalStore holding the sidebar navigation badge counters
 * (`OrganizationNav`'s single consumer, contributed to the shell through
 * `withOrganizationNav()`) for the currently active organization — exactly
 * one query concern, so `withQueryState` carries the whole lifecycle.
 *
 * Reloads on organization switch only, mirroring
 * {@link OrganizationMemberAccessStore}'s own `ActiveOrganizationStore`
 * effect: there is no polling, since the badge is chrome a member may leave
 * open for a whole session, not a live counter that must track every
 * intervention submitted elsewhere.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OrganizationNavigationCountersStore = signalStore(
  { providedIn: 'root' },

  withQueryState<OrganizationNavigationCountersOutput>(),
  withState<OrganizationNavigationCountersState>(INITIAL_STATE),

  withComputed((store) => ({
    /**
     * Property submittedInterventions
     *
     * @description
     * Interventions awaiting review, `0` while unloaded or on error — the
     * count the Interventions nav row's badge renders.
     *
     * @type {number}
     */
    submittedInterventions: computed<number>(() => store.queryData()?.submittedInterventions ?? 0),

    /**
     * Property openInterventions
     *
     * @description
     * Open field interventions. Exposed for a future nav badge; no entry
     * consumes it yet.
     *
     * @type {number}
     */
    openInterventions: computed<number>(() => store.queryData()?.openInterventions ?? 0),

    /**
     * Property openNonConformities
     *
     * @description
     * Open non-conformities. Exposed for a future nav badge; no entry
     * consumes it yet.
     *
     * @type {number}
     */
    openNonConformities: computed<number>(() => store.queryData()?.openNonConformities ?? 0),
  })),

  withMethods((store, service = inject<OrganizationService>(OrganizationService)) => ({
    /**
     * Method load
     * @method load
     *
     * @description
     * Loads the navigation counters for one organization, superseding any
     * in-flight read.
     *
     * @access public
     * @since 1.0.0
     *
     * @type {RxMethod<string>}
     */
    load: rxMethod<string>(
      pipe(
        switchMap((organizationId) => {
          patchState(store, { currentOrganizationId: organizationId }, setPendingQuery());

          return service.navigationCounters(organizationId).pipe(
            tapResponse({
              next: (counters) => patchState(store, setSuccessQuery(counters)),
              error: (error: unknown) => patchState(store, setErrorQuery(toStoreError(error))),
            }),
          );
        }),
      ),
    ),

    /**
     * Method clear
     * @method clear
     *
     * @description
     * Resets the store to its idle state.
     *
     * @access public
     * @since 1.0.0
     *
     * @returns {void} No return value.
     */
    clear(): void {
      patchState(store, { currentOrganizationId: null }, resetQuery());
    },
  })),

  withHooks((store) => {
    const activeOrganizationStore: ActiveOrganizationStore =
      inject<ActiveOrganizationStore>(ActiveOrganizationStore);

    return {
      onInit(): void {
        effect(() => {
          const organizationId: string | null = activeOrganizationStore.selectedOrganizationId();

          if (organizationId === null) {
            untracked(() => store.clear());
            return;
          }

          if (organizationId === store.currentOrganizationId()) return;

          untracked(() => store.load(organizationId));
        });
      },
    };
  }),
);

/**
 * Type OrganizationNavigationCountersStore
 * @type OrganizationNavigationCountersStore
 *
 * @description
 * Instance type of the {@link OrganizationNavigationCountersStore} signal store.
 *
 * @version 1.0.0
 */
export type OrganizationNavigationCountersStore = InstanceType<
  typeof OrganizationNavigationCountersStore
>;
