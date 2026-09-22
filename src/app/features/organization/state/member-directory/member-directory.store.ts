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
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { OrganizationMemberService } from '@features/organization/data-access';
import {
  ORGANIZATION_PERMISSION,
  type MemberDirectoryEntry,
  type OrganizationMemberOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '../active-organization';
import type { MemberDirectoryState } from './models';
import { toDirectoryEntry } from './utils';

const INITIAL_STATE: MemberDirectoryState = {
  organizationId: null,
  byId: new Map<string, MemberDirectoryEntry>(),
  callState: idleCallState(),
};

/**
 * Constant MemberDirectoryStore
 * @const MemberDirectoryStore
 *
 * @description
 * Root-provided lookup from a bare member id to a name and an avatar, backing
 * `MEMBER_DIRECTORY_PORT`.
 *
 * Root-provided on purpose: its consumers are shell-level (a workspace panel,
 * a message row) and it would otherwise reload on every navigation.
 *
 * Two behaviours are deliberate. It refuses to call the API without
 * `organization.members.read` — messaging permissions do not imply it, so the
 * request would be a guaranteed 403 on every workspace visit. And it reads the
 * whole roster through the paginating `listAll`, because messaging hands out
 * member ids from anywhere in the organization; a single capped page would
 * silently leave some authors as UUIDs.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const MemberDirectoryStore = signalStore(
  { providedIn: 'root' },
  withState<MemberDirectoryState>(INITIAL_STATE),

  withComputed((store, permissions = inject(OrganizationPermissionService)) => ({
    isLoading: computed((): boolean => isCallPending(store.callState())),

    /**
     * Whether the directory is readable at all. Callers must degrade to raw
     * ids when this is false rather than surface an error.
     */
    isAvailable: computed((): boolean =>
      permissions.hasPermission(ORGANIZATION_PERMISSION.MEMBERS_READ),
    ),
  })),

  withMethods(
    (
      store,
      service = inject(OrganizationMemberService),
      permissions = inject(OrganizationPermissionService),
      authSession = inject(AUTH_SESSION_PORT),
    ) => {
      const cancellation = new Subject<void>();
      let generation = 0;
      let sessionRevision = authSession.sessionRevision();
      /**
       * Function clear
       * @description Drops names from a previous organization or session and cancels its directory read.
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
       * @description Invalidates the cache before a caller can reuse it after a new login.
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
      const load = rxMethod<string>(
        pipe(
          switchMap((organizationId: string) => {
            synchronizeSession();
            if (!authSession.isAuthenticated()) return EMPTY;
            const revision = authSession.sessionRevision();
            const requestGeneration = ++generation;
            patchState(store, {
              organizationId,
              byId: store.organizationId() === organizationId ? store.byId() : new Map(),
              callState: pendingCallState(),
            });
            const isCurrent = (): boolean =>
              requestGeneration === generation && revision === authSession.sessionRevision();
            return service.listAll(organizationId).pipe(
              takeUntil(cancellation),
              tapResponse({
                next: (members: readonly OrganizationMemberOutput[]): void => {
                  if (!isCurrent()) return;
                  patchState(store, {
                    byId: new Map<string, MemberDirectoryEntry>(
                      members.map((member) => [member.id, toDirectoryEntry(member)]),
                    ),
                    callState: successCallState(null),
                  });
                },
                error: (error: unknown): void => {
                  if (isCurrent())
                    patchState(store, { callState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      );

      return {
        clear,
        synchronizeSession,
        /**
         * Loads the directory for an organization unless it is already loaded
         * or loading for that same organization. A no-op without the
         * permission.
         */
        ensureLoaded(organizationId: string): void {
          synchronizeSession();
          if (!permissions.hasPermission(ORGANIZATION_PERMISSION.MEMBERS_READ)) {
            clear();
            return;
          }
          if (
            store.organizationId() === organizationId &&
            ['pending', 'success'].includes(store.callState().status)
          )
            return;

          load(organizationId);
        },

        /**
         * Best available label for a member reference, accepting a bare id or
         * an IRI without exposing the transport identifier when unresolved.
         */
        displayNameFor(memberIdOrIri: string): string {
          const memberId: string = memberIdOrIri.slice(memberIdOrIri.lastIndexOf('/') + 1);

          return (
            store.byId().get(memberId)?.displayName ??
            $localize`:@@common.unknownMember:Unknown member`
          );
        },

        /** Forces a reload of the currently loaded organization. */
        reload(): void {
          const organizationId: string | null = store.organizationId();

          if (organizationId === null) return;
          if (!permissions.hasPermission(ORGANIZATION_PERMISSION.MEMBERS_READ)) return;

          load(organizationId);
        },
      };
    },
  ),
  withHooks(
    (
      store,
      authSession = inject(AUTH_SESSION_PORT),
      activeOrganization = inject(ActiveOrganizationStore),
    ) => {
      let previousOrganizationId = activeOrganization.selectedOrganizationId();
      return {
        onInit(): void {
          effect(() => {
            authSession.sessionRevision();
            authSession.isAuthenticated();
            const organizationId = activeOrganization.selectedOrganizationId();
            const available = store.isAvailable();
            untracked(() => {
              if (
                !available ||
                (organizationId !== previousOrganizationId &&
                  organizationId !== store.organizationId())
              )
                store.clear();
              store.synchronizeSession();
            });
            previousOrganizationId = organizationId;
          });
        },
        onDestroy(): void {
          store.clear();
        },
      };
    },
  ),
);

/**
 * Type MemberDirectoryStoreType
 *
 * @description
 * Injection type of {@link MemberDirectoryStore}.
 *
 * @since 1.0.0
 */
export type MemberDirectoryStoreType = InstanceType<typeof MemberDirectoryStore>;
