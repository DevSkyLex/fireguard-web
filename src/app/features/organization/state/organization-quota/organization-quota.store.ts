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
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationService } from '@features/organization/data-access';
import {
  ORGANIZATION_QUOTA_RESOURCES,
  type OrganizationQuotaItemOutput,
  type OrganizationQuotaOutput,
  type OrganizationQuotaResource,
  type QuotaStatus,
} from '@features/organization/models';
import { resolveQuotaStatus } from '@features/organization/utils';
import { ActiveOrganizationStore } from '../active-organization';
import type { OrganizationQuotaState } from './models';

//#region Initial State
const INITIAL_STATE: OrganizationQuotaState = {
  currentOrganizationId: null,
  quotaCallState: idleCallState(),
};
//#endregion

/**
 * Store OrganizationQuotaStore
 * @const OrganizationQuotaStore
 *
 * @description
 * Root-level NgRx SignalStore exposing the active organization's quota usage
 * (members, facilities, equipment, inspections) so the context sidebar can
 * render usage meters. It reloads automatically whenever the active organization
 * changes (tracked through `selectedOrganizationId`). A plan change keeps the
 * same organization id, so the limits are refreshed imperatively by
 * `OrganizationPlanStore.changePlan`, which calls {@link load} after assigning
 * the new plan; {@link reload} resyncs the meters after a quota-affecting action.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OrganizationQuotaStore = signalStore(
  { providedIn: 'root' },

  withState<OrganizationQuotaState>(INITIAL_STATE),

  withComputed((store) => ({
    /** Per-resource quota usage items. */
    items: computed<ReadonlyArray<OrganizationQuotaItemOutput>>(() => {
      const state = store.quotaCallState();
      return state.data?.items ?? [];
    }),

    /** Whether the quota payload is currently loading. */
    isLoadingQuota: computed<boolean>(() => store.quotaCallState().status === 'pending'),

    /**
     * Quota status (`ok` / `near` / `full`) per capped resource. Resources
     * without quota data default to `ok` so consumers can index safely.
     */
    statusByResource: computed<Record<OrganizationQuotaResource, QuotaStatus>>(() => {
      const state = store.quotaCallState();
      const items: ReadonlyArray<OrganizationQuotaItemOutput> = state.data?.items ?? [];

      const statuses = {} as Record<OrganizationQuotaResource, QuotaStatus>;
      for (const resource of ORGANIZATION_QUOTA_RESOURCES) {
        statuses[resource] = 'ok';
      }

      for (const item of items) {
        statuses[item.resource] = resolveQuotaStatus(item.used, item.limit);
      }

      return statuses;
    }),
  })),

  withMethods((store) => ({
    /**
     * Method isAtLimit
     *
     * @description
     * Returns whether the given capped resource has reached its plan limit.
     */
    isAtLimit(resource: OrganizationQuotaResource): boolean {
      return store.statusByResource()[resource] === 'full';
    },
  })),

  withMethods(
    (
      store,
      organizationService = inject(OrganizationService),
      authSession = inject(AUTH_SESSION_PORT),
    ) => {
      const cancellation = new Subject<void>();
      let generation = 0;
      let sessionRevision = authSession.sessionRevision();
      /**
       * Function clear
       * @description Invalidates quota reads and drops usage from a previous context.
       * @since 1.0.0
       * @returns {void}
       */
      const clear = (): void => {
        generation += 1;
        cancellation.next();
        patchState(store, INITIAL_STATE);
      };
      /**
       * Function synchronizeSession
       * @description Invalidates cached limits whenever the authenticated session changes.
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
         * @description Loads quota usage, retaining values only for a refresh of the same context.
         * @access public
         * @since 1.0.0
         * @type {RxMethod<string>}
         */
        load: rxMethod<string>(
          pipe(
            switchMap((organizationId) => {
              synchronizeSession();
              if (!authSession.isAuthenticated()) return EMPTY;
              const revision = authSession.sessionRevision();
              const requestGeneration = ++generation;
              const previous =
                store.currentOrganizationId() === organizationId
                  ? (store.quotaCallState().data ?? undefined)
                  : undefined;
              patchState(store, {
                currentOrganizationId: organizationId,
                quotaCallState: pendingCallState(previous),
              });
              const isCurrent = (): boolean =>
                requestGeneration === generation && revision === authSession.sessionRevision();
              return organizationService.getQuota(organizationId).pipe(
                takeUntil(cancellation),
                tapResponse({
                  next: (quota: OrganizationQuotaOutput) => {
                    if (isCurrent()) patchState(store, { quotaCallState: successCallState(quota) });
                  },
                  error: (error: unknown) => {
                    if (isCurrent())
                      patchState(store, {
                        quotaCallState: errorCallState(toStoreError(error), previous),
                      });
                  },
                }),
              );
            }),
          ),
        ),
      };
    },
  ),

  withMethods((store) => ({
    /**
     * Method reload
     *
     * @description
     * Re-fetches the quota usage for the organization currently in state, if
     * any. Used to resync the meters after a quota-affecting action (e.g. a
     * create rejected with HTTP 409).
     */
    reload(): void {
      const organizationId: string | null = store.currentOrganizationId();
      if (organizationId !== null) {
        store.load(organizationId);
      }
    },
  })),

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
          if (!authenticated || !organizationId) {
            untracked(() => store.clear());
            return;
          }

          untracked(() => store.load(organizationId));
        });
      },
    };
  }),
);

/**
 * Type OrganizationQuotaStore
 * @type OrganizationQuotaStore
 *
 * @description
 * Instance type of the {@link OrganizationQuotaStore} signal store.
 *
 * @version 1.0.0
 */
export type OrganizationQuotaStore = InstanceType<typeof OrganizationQuotaStore>;
