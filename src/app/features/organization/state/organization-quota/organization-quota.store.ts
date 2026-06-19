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
} from '@core/state/request-state';
import { OrganizationService } from '@features/organization/data-access';
import type {
  OrganizationQuotaItemOutput,
  OrganizationQuotaOutput,
} from '@features/organization/models';
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
 * render usage meters. It reloads whenever the active organization changes or
 * its plan changes (tracked through the active organization's `planId`).
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
  })),

  withMethods((store, organizationService = inject(OrganizationService)) => ({
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

  withHooks((store) => {
    const activeOrganizationStore: ActiveOrganizationStore = inject(ActiveOrganizationStore);

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
