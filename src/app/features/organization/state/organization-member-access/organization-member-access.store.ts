import { computed, effect, inject, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Events } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  catchError,
  defaultIfEmpty,
  filter,
  finalize,
  map,
  of,
  pipe,
  shareReplay,
  Subject,
  switchMap,
  takeUntil,
  tap,
  type Observable,
} from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
  type StoreError,
} from '@core/request-state';
import { authStoreEvents } from '@features/auth';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth/ports';
import { OrganizationMemberService } from '@features/organization/data-access';
import type { CurrentOrganizationMemberProfileOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '../active-organization';
import { myOrganizationsStoreEvents } from '../my-organizations/events';
import { organizationInvitationAcceptStoreEvents } from '../organization-invitation-accept/events';
import { organizationMembershipEvents } from '../organization-membership/events';
import { organizationSettingsStoreEvents } from '../organization-settings/events';
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
      authSession = inject<AuthSessionPort>(AUTH_SESSION_PORT),
    ) => {
      /**
       * Constant accessCancellation
       * @description Cancels permission reads when the session or organization context is cleared.
       * @since 1.0.0
       * @type {Subject<void>}
       */
      const accessCancellation = new Subject<void>();
      /**
       * The access request currently in flight, if any. Two guards resolve the
       * same organization on a single navigation — the parent `:organizationId`
       * gate and the child route's own — so without this they would each fire
       * their own `/me`.
       */
      let pendingAccess: {
        readonly organizationId: string;
        readonly request$: Observable<boolean>;
      } | null = null;

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
            filter(() => authSession.isAuthenticated()),
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
                takeUntil(accessCancellation),
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
         * Ensures the target organization's access payload is resolved, loading
         * it when the store holds another organization's.
         *
         * **The wait is driven by the request, not by watching store signals.**
         * It used to subscribe to `toObservable(currentOrganizationId)` and
         * `toObservable(accessCallState)` and wait for the pair to settle. Those
         * bridges emit from an effect, and effects do not run while the router is
         * blocked on a guard — so switching organization from inside the running
         * application waited on an emission that never came, the navigation was
         * cancelled, and the member silently stayed where they were. A full page
         * load worked, which is why the bug survived: every deep link resolved
         * during bootstrap, when effects still run.
         *
         * @param {string} organizationId - Organization identifier to resolve.
         *
         * @returns {Observable<boolean>} `true` when access is resolved successfully.
         */
        ensureAccessResolved(organizationId: string): Observable<boolean> {
          if (!authSession.isAuthenticated()) return of(false);
          const currentOrganizationId: string | null = store.currentOrganizationId();
          const accessCallState: CallState<CurrentOrganizationMemberProfileOutput> =
            store.accessCallState();

          if (currentOrganizationId === organizationId && accessCallState.status === 'success') {
            return of(true);
          }

          if (pendingAccess?.organizationId === organizationId) {
            return pendingAccess.request$;
          }

          patchState(store, {
            currentOrganizationId: organizationId,
            profile: null,
            accessCallState: pendingCallState(),
          });

          const request$: Observable<boolean> = organizationMemberService
            .getCurrentProfile(organizationId)
            .pipe(
              takeUntil(accessCancellation),
              map((profile: CurrentOrganizationMemberProfileOutput): boolean => {
                patchState(store, {
                  currentOrganizationId: organizationId,
                  profile,
                  accessCallState: successCallState(profile),
                });

                return true;
              }),
              catchError((error: unknown): Observable<boolean> => {
                patchState(store, {
                  currentOrganizationId: organizationId,
                  profile: null,
                  accessCallState: errorCallState(toStoreError(error)),
                });

                return of(false);
              }),
              defaultIfEmpty(false),
              finalize((): void => {
                if (pendingAccess?.organizationId === organizationId) pendingAccess = null;
              }),
              shareReplay({ bufferSize: 1, refCount: false }),
            );

          pendingAccess = { organizationId, request$ };

          return request$;
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

          this.clear();
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
          accessCancellation.next();
          pendingAccess = null;
          patchState(store, INITIAL_STATE);
        },
      };
    },
  ),

  withHooks((store) => {
    const accessEvents = inject(Events);
    const activeOrganizationStore: ActiveOrganizationStore =
      inject<ActiveOrganizationStore>(ActiveOrganizationStore);
    const authSession: AuthSessionPort = inject<AuthSessionPort>(AUTH_SESSION_PORT);

    return {
      onInit(): void {
        accessEvents
          .on(authStoreEvents.sessionEnded)
          .pipe(takeUntilDestroyed())
          .subscribe(() => store.clear());
        accessEvents
          .on(
            myOrganizationsStoreEvents.leaveSucceeded,
            organizationSettingsStoreEvents.membershipLeft,
          )
          .pipe(takeUntilDestroyed())
          .subscribe(({ payload }) => {
            if (payload.organizationId === store.currentOrganizationId()) store.clear();
          });
        accessEvents
          .on(
            organizationInvitationAcceptStoreEvents.acceptSucceeded,
            organizationMembershipEvents.joined,
            organizationSettingsStoreEvents.organizationUpdated,
          )
          .pipe(takeUntilDestroyed())
          .subscribe(() => store.reload());
        /**
         * Identifier seen by the previous run, so a *transition* to `null` can
         * be told apart from simply not knowing it yet.
         */
        let previousOrganizationId: string | null = null;

        /**
         * Follow the open organization: load its access payload, and drop it
         * once there is no organization at all.
         *
         * One effect covers both directions. Stepping into a global page no
         * longer clears anything — the context keeps naming the workspace last
         * worked in — so the payload survives `/account` instead of being
         * thrown away and refetched on the way back.
         *
         * Clearing on the transition rather than on the value matters at boot:
         * `organizationAccessGuard` calls `ensureAccessResolved()` while the
         * navigation is still in flight, before the first `NavigationEnd` has
         * published the identifier. Treating that `null` as "left the scope"
         * would throw away the request the guard is waiting on.
         */
        effect(() => {
          // A remembered workspace is a preference, not proof of an authenticated session.
          // Loading it before OAuth/MFA completes would turn its 401 into a login redirect.
          if (!authSession.isAuthenticated()) {
            previousOrganizationId = null;
            untracked(() => store.clear());
            return;
          }
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
