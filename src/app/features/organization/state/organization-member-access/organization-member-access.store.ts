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
  defer,
  defaultIfEmpty,
  finalize,
  map,
  of,
  pipe,
  shareReplay,
  Subject,
  switchMap,
  takeUntil,
  type Observable,
} from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type StoreError,
} from '@core/request-state';
import { authStoreEvents } from '@features/auth';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth/ports';
import { OrganizationMemberService } from '@features/organization/data-access';
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

      let generation = 0;
      let sessionRevision = authSession.sessionRevision();

      /**
       * Function clearAccess
       * @description Invalidates every permission reader without destroying the reusable rxMethod.
       * @since 1.0.0
       * @returns {void}
       */
      const clearAccess = (): void => {
        generation += 1;
        accessCancellation.next();
        pendingAccess = null;
        patchState(store, INITIAL_STATE);
      };

      /**
       * Function synchronizeSession
       * @description Invalidates the access cache once per session transition, including guard-driven loads before effects run.
       * @since 1.0.0
       * @returns {void}
       */
      const synchronizeSession = (): void => {
        const revision = authSession.sessionRevision();
        if (sessionRevision !== revision || !authSession.isAuthenticated()) {
          sessionRevision = revision;
          clearAccess();
        }
      };

      /**
       * Function resolveAccess
       * @description Shares one permission read across guards and imperative loads in the current session.
       * @since 1.0.0
       * @param {string} organizationId - Organization whose access is required.
       * @returns {Observable<boolean>} False when superseded, unauthenticated or refused.
       */
      const resolveAccess = (organizationId: string): Observable<boolean> =>
        defer(() => {
          synchronizeSession();
          const revision = authSession.sessionRevision();
          if (!authSession.isAuthenticated()) return of(false);
          if (
            store.currentOrganizationId() === organizationId &&
            store.accessCallState().status === 'success'
          ) {
            return of(true);
          }
          if (pendingAccess?.organizationId === organizationId) return pendingAccess.request$;

          clearAccess();
          const requestGeneration = generation;
          patchState(store, {
            currentOrganizationId: organizationId,
            accessCallState: pendingCallState(),
          });
          const isCurrent = (): boolean =>
            requestGeneration === generation &&
            revision === authSession.sessionRevision() &&
            authSession.isAuthenticated();
          const request$ = defer(() =>
            isCurrent()
              ? organizationMemberService.getCurrentProfile(organizationId).pipe(
                  takeUntil(accessCancellation),
                  tapResponse({
                    next: (profile) => {
                      if (isCurrent())
                        patchState(store, { profile, accessCallState: successCallState(profile) });
                    },
                    error: (error: unknown) => {
                      if (isCurrent())
                        patchState(store, {
                          profile: null,
                          accessCallState: errorCallState(toStoreError(error)),
                        });
                    },
                  }),
                  map(() => isCurrent()),
                  catchError(() => of(false)),
                  defaultIfEmpty(false),
                )
              : of(false),
          ).pipe(
            finalize(() => {
              if (pendingAccess?.request$ === request$) pendingAccess = null;
            }),
            shareReplay({ bufferSize: 1, refCount: false }),
          );
          pendingAccess = { organizationId, request$ };
          return request$;
        });

      return {
        synchronizeSession,
        /**
         * Method loadAccess
         * @method loadAccess
         * @description Loads access through the same request coordinator used by route guards.
         * @access public
         * @since 1.0.0
         * @type {RxMethod<string>}
         */
        loadAccess: rxMethod<string>(pipe(switchMap(resolveAccess))),

        /**
         * Method ensureAccessResolved
         * @method ensureAccessResolved
         * @description Resolves directly from the HTTP request so guards never wait on an Angular effect.
         * @access public
         * @since 1.0.0
         * @param {string} organizationId - Organization identifier to resolve.
         * @returns {Observable<boolean>} Whether the current access request succeeded.
         */
        ensureAccessResolved: resolveAccess,

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
          clearAccess();
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
      onDestroy(): void {
        store.clear();
      },
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
          .subscribe(({ payload }) => {
            const organizationId =
              'organizationId' in payload ? payload.organizationId : payload.id;
            if (organizationId === store.currentOrganizationId()) store.reload();
          });
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
          authSession.sessionRevision();
          untracked(() => store.synchronizeSession());
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
