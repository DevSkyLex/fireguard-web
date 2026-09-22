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
import { EMPTY, pipe, Subject, switchMap, takeUntil } from 'rxjs';
import {
  resetQuery,
  setErrorQuery,
  setPendingQuery,
  setSuccessQuery,
  toStoreError,
  withQueryState,
} from '@core/request-state';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
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

  withMethods(
    (store, service = inject(OrganizationService), authSession = inject(AUTH_SESSION_PORT)) => {
      const cancellation = new Subject<void>();
      let generation = 0;
      let sessionRevision = authSession.sessionRevision();
      /**
       * Function clear
       * @description Clears counters and invalidates any outstanding organization read.
       * @since 1.0.0
       * @returns {void}
       */
      const clear = (): void => {
        generation += 1;
        cancellation.next();
        patchState(store, { currentOrganizationId: null }, resetQuery());
      };
      /**
       * Function synchronizeSession
       * @description Invalidates counts retained across authentication transitions.
       * @since 1.0.0
       * @returns {void}
       */
      const synchronizeSession = (): void => {
        const revision = authSession.sessionRevision();
        if (revision !== sessionRevision || !authSession.isAuthenticated()) {
          sessionRevision = revision;
          clear();
        }
      };
      return {
        clear,
        synchronizeSession,
        /**
         * Method load
         * @method load
         * @description Loads counters, retaining prior values only during a refresh of the same context.
         * @access public
         * @since 1.0.0
         * @type {RxMethod<string>}
         */
        load: rxMethod<string>(
          pipe(
            switchMap((organizationId) => {
              synchronizeSession();
              if (!authSession.isAuthenticated()) return EMPTY;
              if (store.currentOrganizationId() !== organizationId) clear();
              const revision = authSession.sessionRevision();
              const requestGeneration = ++generation;
              patchState(store, { currentOrganizationId: organizationId }, setPendingQuery());
              const isCurrent = (): boolean =>
                requestGeneration === generation && revision === authSession.sessionRevision();
              return service.navigationCounters(organizationId).pipe(
                takeUntil(cancellation),
                tapResponse({
                  next: (counters) => {
                    if (isCurrent()) patchState(store, setSuccessQuery(counters));
                  },
                  error: (error: unknown) => {
                    if (isCurrent()) patchState(store, setErrorQuery(toStoreError(error)));
                  },
                }),
              );
            }),
          ),
        ),
      };
    },
  ),

  withHooks((store, authSession = inject(AUTH_SESSION_PORT)) => {
    const activeOrganizationStore: ActiveOrganizationStore =
      inject<ActiveOrganizationStore>(ActiveOrganizationStore);

    return {
      onDestroy(): void {
        store.clear();
      },
      onInit(): void {
        effect(() => {
          const organizationId: string | null = activeOrganizationStore.selectedOrganizationId();
          authSession.sessionRevision();
          const authenticated = authSession.isAuthenticated();
          untracked(() => store.synchronizeSession());
          if (!authenticated || organizationId === null) {
            untracked(() => store.clear());
            return;
          }

          if (untracked(() => organizationId === store.currentOrganizationId())) return;

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
