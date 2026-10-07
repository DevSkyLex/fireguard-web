import { isPlatformBrowser } from '@angular/common';
import { effect, inject, PLATFORM_ID, untracked } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap } from 'rxjs';
import {
  resetQuery,
  setErrorQuery,
  setPendingQuery,
  setSuccessQuery,
  toStoreError,
  withQueryState,
} from '@core/request-state';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionReplacementContext,
  InterventionReplacementContextRequest,
} from '@features/organization/features/interventions/models';
import { InterventionReplacementContextService } from '@features/organization/features/interventions/services';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';

/**
 * Constant InterventionReplacementContextStore
 *
 * @description
 * Reads the Equipment-owned replacement proof without changing equipment or inventing an identity.
 * Scope changes cancel reads and discard proof before a result can be committed.
 */
export const InterventionReplacementContextStore = signalStore(
  withQueryState<InterventionReplacementContext>(),
  withState({
    scope: null as InterventionReplacementContextRequest | null,
    accountId: null as string | null,
    sessionRevision: null as number | null,
  }),
  withMethods(
    (
      store,
      service = inject(InterventionReplacementContextService),
      session = inject(AUTH_SESSION_PORT),
      offline = inject(InterventionOfflineService),
      organization = inject(ORGANIZATION_CONTEXT_PORT),
      permissions = inject(OrganizationPermissionService),
      platformId = inject(PLATFORM_ID),
    ) => {
      const authorized = (
        scope: InterventionReplacementContextRequest,
        accountId: string | null,
        revision: number | null,
      ): boolean =>
        Boolean(accountId) &&
        session.isAuthenticated() &&
        offline.publicationOwner() === accountId &&
        session.sessionRevision() === revision &&
        organization.selectedOrganizationId() === scope.organizationId &&
        !permissions.isLoadingPermissions() &&
        !permissions.permissionError() &&
        permissions.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_READ);
      return {
        /**
         * Method authorized
         *
         * @description
         * Exposes the current proof's account and permission fence to the commit path.
         *
         * @returns {boolean} Whether the captured proof may still be used.
         */
        authorized(): boolean {
          const scope = store.scope();
          return scope !== null && authorized(scope, store.accountId(), store.sessionRevision());
        },
        /**
         * Method load
         *
         * @description
         * Refreshes a single task's original and successor while cancelling an earlier read.
         * Null clears proof and cancels pending transport.
         *
         * @type {RxMethod<InterventionReplacementContextRequest | null>}
         */
        load: rxMethod<InterventionReplacementContextRequest | null>(
          pipe(
            switchMap((scope) => {
              patchState(store, resetQuery(), { scope, accountId: null, sessionRevision: null });
              if (!scope || !isPlatformBrowser(platformId)) return EMPTY;
              const accountId = offline.publicationOwner();
              const revision = session.sessionRevision();
              if (!authorized(scope, accountId, revision)) return EMPTY;
              patchState(store, setPendingQuery(), { accountId, sessionRevision: revision });
              return service.load(scope.organizationId, scope.equipmentId).pipe(
                tapResponse({
                  next: (data) => {
                    if (authorized(scope, accountId, revision))
                      patchState(store, setSuccessQuery(data));
                  },
                  error: (error: unknown) => {
                    if (authorized(scope, accountId, revision))
                      patchState(store, setErrorQuery(toStoreError(error)));
                  },
                }),
              );
            }),
          ),
        ),
      };
    },
  ),
  withHooks((store) => ({
    onInit(): void {
      effect(() => {
        const scope = store.scope();
        if (scope && !store.authorized()) untracked(() => store.load(null));
      });
    },
  })),
);

/**
 * Type InterventionReplacementContextStoreType
 *
 * @description
 * Component-scoped replacement proof query instance.
 *
 * @type {InterventionReplacementContextStoreType}
 */
export type InterventionReplacementContextStoreType = InstanceType<
  typeof InterventionReplacementContextStore
>;
