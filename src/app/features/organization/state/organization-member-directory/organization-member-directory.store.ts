import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  withQueryState,
  setPendingQuery,
  setSuccessQuery,
  setErrorQuery,
  toStoreError,
} from '@core/request-state';
import { OrganizationMemberService } from '@features/organization/data-access';
import type { OrganizationMemberOutput } from '@features/organization/models';

/**
 * Just enough of a member to render them beside their content.
 *
 * @since 1.0.0
 */
export interface MemberIdentity {
  readonly id: string;
  readonly displayName: string;
  readonly initials: string;
  readonly avatarUrl: string | null;
}

/** Two letters from a name, or from the id when there is no name at all. */
function toInitials(name: string): string {
  const parts: readonly string[] = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  return `${(parts[0] ?? '').charAt(0)}${(parts[1] ?? '').charAt(0)}`.toUpperCase();
}

/** The best name the payload can offer, in descending order of quality. */
function toDisplayName(member: OrganizationMemberOutput): string {
  const full: string = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
  return member.displayName?.trim() || full || member.email?.trim() || member.id;
}

/**
 * Store OrganizationMemberDirectoryStore
 * @const OrganizationMemberDirectoryStore
 *
 * @description
 * Resolves a member id to a name and avatar, for every surface that receives
 * bare member ids — messages, mentions, calendar authors, intervention
 * assignees.
 *
 * **Not `OrganizationMembersStore`.** That one is the admin table's state: one
 * page of twenty, filtered by its search box. Reading it here would make
 * authors and avatars disappear the moment an administrator typed in the
 * members search — a bug that would look like a rendering glitch, far from its
 * cause. This store loads the whole directory once and never filters.
 *
 * Root-provided: the identity of a member does not change between routes, and
 * every consumer wants the same cache.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OrganizationMemberDirectoryStore = signalStore(
  { providedIn: 'root' },

  //#region State
  withQueryState<readonly OrganizationMemberOutput[]>(),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed identities
     *
     * @description
     * Member id → identity, for O(1) lookup from a template-facing helper.
     *
     * @type {Signal<ReadonlyMap<string, MemberIdentity>>}
     */
    identities: computed<ReadonlyMap<string, MemberIdentity>>(() => {
      const map = new Map<string, MemberIdentity>();

      for (const member of store.queryData() ?? []) {
        const displayName: string = toDisplayName(member);
        map.set(member.id, {
          id: member.id,
          displayName,
          initials: toInitials(displayName),
          avatarUrl: member.avatarUrl ?? null,
        });
      }

      return map;
    }),
  })),
  //#endregion

  //#region Methods
  withMethods((store, service = inject(OrganizationMemberService)) => ({
    /**
     * Method load
     *
     * @description
     * Loads the whole directory for an organization. A `null` id is ignored.
     *
     * @param {string | null} organizationId - The organization to load.
     *
     * @returns {void}
     */
    load: rxMethod<string | null>(
      pipe(
        switchMap((organizationId: string | null) => {
          if (organizationId === null) return EMPTY;

          patchState(store, setPendingQuery());

          return service.list(organizationId, { itemsPerPage: 200 }).pipe(
            tapResponse({
              next: (collection: HydraCollection<OrganizationMemberOutput>) =>
                patchState(store, setSuccessQuery(collection.member)),
              error: (error: unknown) => patchState(store, setErrorQuery(toStoreError(error))),
            }),
          );
        }),
      ),
    ),
  })),
  //#endregion
);

/**
 * Type OrganizationMemberDirectoryStoreType
 *
 * @description
 * Injectable instance type of {@link OrganizationMemberDirectoryStore}.
 */
export type OrganizationMemberDirectoryStoreType = InstanceType<
  typeof OrganizationMemberDirectoryStore
>;
