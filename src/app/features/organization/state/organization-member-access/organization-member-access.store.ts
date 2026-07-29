import { computed, effect, inject, untracked } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
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
import { combineLatest, filter, first, map, of, pipe, switchMap, tap, type Observable } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
  type StoreError,
} from '@core/request-state';
import { OrganizationMemberService } from '@features/organization/data-access';
import type { CurrentOrganizationMemberProfileOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '../active-organization';
import type { OrganizationMemberAccessState } from './models';

const INITIAL_STATE: OrganizationMemberAccessState = {
  currentOrganizationId: null,
  profile: null,
  accessCallState: idleCallState(),
};

/**
 * Store OrganizationMemberAccessStore
 * @const OrganizationMemberAccessStore
 *
 * @description
 * Root-level NgRx SignalStore publishing the authenticated user's effective
 * roles and permissions inside the currently active organization.
 *
 * Ownership remains with the organization feature because the payload is
 * organization-scoped and depends on the active organization context.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OrganizationMemberAccessStore = signalStore(
  { providedIn: 'root' },

  withState<OrganizationMemberAccessState>(INITIAL_STATE),

  withComputed((store) => ({
    /** Indicates whether the organization member access payload is loading. */
    isLoadingAccess: computed<boolean>(() => store.accessCallState().status === 'pending'),

    /** Last organization member access loading error. */
    accessError: computed<StoreError | null>(() => store.accessCallState().error),

    /** Resolved organization role names for the authenticated user. */
    roles: computed<ReadonlyArray<string>>(
      () => store.profile()?.roles.map((role) => role.name) ?? [],
    ),

    /** Effective permission names for the authenticated user. */
    permissions: computed<ReadonlyArray<string>>(
      () => store.profile()?.permissions.map((permission) => permission.name) ?? [],
    ),
  })),

  withMethods(
    (
      store,
      organizationMemberService = inject<OrganizationMemberService>(OrganizationMemberService),
      activeOrganizationStore = inject<ActiveOrganizationStore>(ActiveOrganizationStore),
    ) => {
      const currentOrganizationId$: Observable<string | null> = toObservable(
        store.currentOrganizationId,
      );
      const accessCallState$: Observable<CallState<CurrentOrganizationMemberProfileOutput>> =
        toObservable(store.accessCallState);

      return {
        /**
         * Method loadAccess
         *
         * @description
         * Loads the authenticated user's effective access for the given organization.
         * Skips duplicate successful loads for the same organization identifier.
         */
        loadAccess: rxMethod<string>(
          pipe(
            filter((organizationId: string) => {
              const callState: CallState<CurrentOrganizationMemberProfileOutput> =
                store.accessCallState();
              return (
                organizationId !== store.currentOrganizationId() ||
                (callState.status !== 'success' && callState.status !== 'pending')
              );
            }),
            tap((organizationId: string) => {
              patchState(store, {
                currentOrganizationId: organizationId,
                profile: null,
                accessCallState: pendingCallState(),
              });
            }),
            switchMap((organizationId: string) =>
              organizationMemberService.getCurrentProfile(organizationId).pipe(
                tapResponse({
                  next: (profile: CurrentOrganizationMemberProfileOutput) => {
                    patchState(store, {
                      currentOrganizationId: organizationId,
                      profile,
                      accessCallState: successCallState(profile),
                    });
                  },
                  error: (error: unknown) => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, {
                      currentOrganizationId: organizationId,
                      profile: null,
                      accessCallState: errorCallState(storeError),
                    });
                  },
                }),
              ),
            ),
          ),
        ),

        /**
         * Method ensureAccessResolved
         *
         * @description
         * Ensures the target organization's access payload is either already
         * resolved or gets loaded once through the shared store, then waits until
         * the store reaches a success or error state for that organization.
         *
         * @param {string} organizationId - Organization identifier to resolve.
         *
         * @returns {Observable<boolean>} `true` when access is resolved successfully.
         */
        ensureAccessResolved(organizationId: string): Observable<boolean> {
          const currentOrganizationId: string | null = store.currentOrganizationId();
          const accessCallState: CallState<CurrentOrganizationMemberProfileOutput> =
            store.accessCallState();

          if (currentOrganizationId === organizationId && accessCallState.status === 'success') {
            return of(true);
          }

          if (
            currentOrganizationId !== organizationId ||
            (accessCallState.status !== 'pending' && accessCallState.status !== 'success')
          ) {
            this.loadAccess(organizationId);
          }

          return combineLatest([currentOrganizationId$, accessCallState$]).pipe(
            first(
              ([loadedOrganizationId, loadedAccessCallState]) =>
                loadedOrganizationId === organizationId &&
                (loadedAccessCallState.status === 'success' ||
                  loadedAccessCallState.status === 'error'),
            ),
            map(([, loadedAccessCallState]) => loadedAccessCallState.status === 'success'),
          );
        },

        /**
         * Method reload
         *
         * @description
         * Forces a reload of the current organization member access payload.
         */
        reload(): void {
          const organizationId: string | null =
            activeOrganizationStore.selectedOrganizationId() ?? store.currentOrganizationId();

          if (!organizationId) {
            this.clear();
            return;
          }

          patchState(store, {
            currentOrganizationId: organizationId,
            accessCallState: idleCallState(),
          });
          this.loadAccess(organizationId);
        },

        /**
         * Method clear
         *
         * @description
         * Resets the organization member access state.
         */
        clear(): void {
          patchState(store, INITIAL_STATE);
        },
      };
    },
  ),

  withHooks((store) => {
    const activeOrganizationStore: ActiveOrganizationStore =
      inject<ActiveOrganizationStore>(ActiveOrganizationStore);

    return {
      onInit(): void {
        /**
         * Identifier seen by the previous run, so a *transition* to `null` can
         * be told apart from simply not knowing it yet.
         */
        let previousOrganizationId: string | null = null;

        /**
         * Follow the routed organization: load its access payload, and drop it
         * once the URL leaves the organization scope.
         *
         * One effect covers both directions because the identifier is
         * URL-derived — leaving `/organizations/:id` turns it `null`, which is
         * exactly the signal the previous `NavigationEnd` subscription had to
         * recompute for itself.
         *
         * Clearing on the transition rather than on the value matters at boot:
         * `organizationAccessGuard` calls `ensureAccessResolved()` while the
         * navigation is still in flight, before the first `NavigationEnd` has
         * published the identifier. Treating that `null` as "left the scope"
         * would throw away the request the guard is waiting on.
         */
        effect(() => {
          const organizationId: string | null = activeOrganizationStore.selectedOrganizationId();
          const leftOrganizationScope: boolean =
            organizationId === null && previousOrganizationId !== null;

          previousOrganizationId = organizationId;

          if (organizationId === null) {
            if (leftOrganizationScope) untracked(() => store.clear());

            return;
          }

          untracked(() => store.loadAccess(organizationId));
        });
      },
    };
  }),
);

/**
 * Type OrganizationMemberAccessStore
 * @type OrganizationMemberAccessStore
 *
 * @description
 * Instance type of the {@link OrganizationMemberAccessStore} signal store.
 *
 * @version 1.0.0
 */
export type OrganizationMemberAccessStore = InstanceType<typeof OrganizationMemberAccessStore>;
