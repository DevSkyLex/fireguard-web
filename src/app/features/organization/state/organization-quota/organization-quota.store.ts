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
import { pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  isCallSuccess,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
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
      return isCallSuccess(state) ? state.data.items : [];
    }),

    /** Whether the quota payload is currently loading. */
    isLoadingQuota: computed<boolean>(() => store.quotaCallState().status === 'pending'),

    /**
     * Quota status (`ok` / `near` / `full`) per capped resource. Resources
     * without quota data default to `ok` so consumers can index safely.
     */
    statusByResource: computed<Record<OrganizationQuotaResource, QuotaStatus>>(() => {
      const state = store.quotaCallState();
      const items: ReadonlyArray<OrganizationQuotaItemOutput> = isCallSuccess(state)
        ? state.data.items
        : [];

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

  withMethods((store, organizationService = inject<OrganizationService>(OrganizationService)) => ({
    /**
     * Method load
     *
     * @description
     * Loads the quota usage for the given organization.
     */
    load: rxMethod<string>(
      pipe(
        tap((organizationId: string) =>
          patchState(store, {
            currentOrganizationId: organizationId,
            quotaCallState: pendingCallState(store.quotaCallState().data ?? undefined),
          }),
        ),
        switchMap((organizationId: string) =>
          organizationService.getQuota(organizationId).pipe(
            tapResponse({
              next: (quota: OrganizationQuotaOutput) =>
                patchState(store, { quotaCallState: successCallState(quota) }),
              error: (error: unknown) =>
                patchState(store, { quotaCallState: errorCallState(toStoreError(error)) }),
            }),
          ),
        ),
      ),
    ),

    /**
     * Method clear
     *
     * @description
     * Resets the quota state.
     */
    clear(): void {
      patchState(store, INITIAL_STATE);
    },
  })),

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

  withHooks((store) => {
    const activeOrganizationStore: ActiveOrganizationStore =
      inject<ActiveOrganizationStore>(ActiveOrganizationStore);

    return {
      onInit(): void {
        effect(() => {
          const organizationId: string | null = activeOrganizationStore.selectedOrganizationId();

          if (!organizationId) {
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
