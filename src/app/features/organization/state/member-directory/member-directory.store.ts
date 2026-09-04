import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { OrganizationMemberService } from '@features/organization/data-access';
import {
  ORGANIZATION_PERMISSION,
  type MemberDirectoryEntry,
  type OrganizationMemberOutput,
} from '@features/organization/models';
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
    ) => {
      const load = rxMethod<string>(
        pipe(
          tap((organizationId: string) =>
            patchState(store, { organizationId, callState: pendingCallState() }),
          ),
          switchMap((organizationId: string) =>
            service.listAll(organizationId).pipe(
              tapResponse({
                next: (members: readonly OrganizationMemberOutput[]): void => {
                  patchState(store, {
                    byId: new Map<string, MemberDirectoryEntry>(
                      members.map(
                        (member: OrganizationMemberOutput): [string, MemberDirectoryEntry] => [
                          member.id,
                          toDirectoryEntry(member),
                        ],
                      ),
                    ),
                    callState: successCallState(null),
                  });
                },
                // Failure is silent by design: every consumer already renders
                // correctly without a name, and a directory toast would fire on
                // a surface the member did not ask for.
                error: (error: unknown): void =>
                  patchState(store, { callState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      );

      return {
        /**
         * Loads the directory for an organization unless it is already loaded
         * or loading for that same organization. A no-op without the
         * permission.
         */
        ensureLoaded(organizationId: string): void {
          if (!permissions.hasPermission(ORGANIZATION_PERMISSION.MEMBERS_READ)) return;
          if (store.organizationId() === organizationId) return;

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
