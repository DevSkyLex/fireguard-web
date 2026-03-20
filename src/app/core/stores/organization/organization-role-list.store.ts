import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { OrganizationRoleService } from '@core/services/api/organization';
import type { OrganizationRoleListState } from './organization-role-list-state.interface';

const INITIAL_STATE: OrganizationRoleListState = {
  roles: [],
  rolesLoading: false,
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

  withMethods((store, roleService = inject(OrganizationRoleService)) => ({
    loadRoles: rxMethod<string>(
      pipe(
        tap(() => patchState(store, { rolesLoading: true })),
        switchMap((organizationId) =>
          roleService.list(organizationId).pipe(
            tapResponse({
              next: (collection) =>
                patchState(store, { roles: [...collection.member], rolesLoading: false }),
              error: () => patchState(store, { rolesLoading: false }),
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
