import { computed } from '@angular/core';
import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  StoreError,
  successCallState,
  toStoreError,
} from '@core/state/request-state';
import { OrganizationRoleService } from '@features/organization/data-access';
import type { OrganizationRoleListState } from './models';

const INITIAL_STATE: OrganizationRoleListState = {
  rolesCallState: idleCallState(),
};

/**
 * Store OrganizationRoleListStore
 * @const OrganizationRoleListStore
 *
 * @description
 * Component-scoped NgRx SignalStore for loading the list of roles
 * defined for a given organization.
 * Designed to be provided at **component level** (no `providedIn: 'root'`).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OrganizationRoleListStore = signalStore(
  withState<OrganizationRoleListState>(INITIAL_STATE),

  withComputed((store) => ({
    roles: computed(() => store.rolesCallState().data ?? []),
    rolesLoading: computed(() => store.rolesCallState().status === 'pending'),
  })),

  withMethods((store, roleService = inject(OrganizationRoleService)) => ({
    loadRoles: rxMethod<string>(
      pipe(
        tap(() => patchState(store, { rolesCallState: pendingCallState() })),
        switchMap((organizationId) =>
          roleService.list(organizationId).pipe(
            tapResponse({
              next: (collection) =>
                patchState(store, {
                  rolesCallState: successCallState([...collection.member]),
                }),
              error: (err: unknown) => {
                const storeError: StoreError = toStoreError(err);
                patchState(store, {
                  rolesCallState: errorCallState(storeError),
                });
              },
            }),
          ),
        ),
      ),
    ),
  })),
);

/**
 * Type OrganizationRoleListStore
 * @type OrganizationRoleListStore
 *
 * @description
 * Instance type of the {@link OrganizationRoleListStore} signal store.
 *
 * @version 1.0.0
 */
export type OrganizationRoleListStore = InstanceType<typeof OrganizationRoleListStore>;
