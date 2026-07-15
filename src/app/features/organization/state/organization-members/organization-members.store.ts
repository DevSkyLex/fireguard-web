import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  addEntity,
  removeEntities,
  removeEntity,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, exhaustMap, forkJoin, map, of, pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  errorFeedback,
  idleCallState,
  isCallPending,
  pendingCallState,
  successCallState,
  successFeedback,
  toStoreError,
} from '@core/request-state';
import {
  OrganizationInvitationService,
  OrganizationMemberService,
  OrganizationRoleService,
} from '@features/organization/data-access';
import type {
  AssignOrganizationRoleInput,
  InviteOrganizationMemberInput,
  OrganizationInvitationOutput,
  OrganizationMemberOutput,
} from '@features/organization/models';
import { organizationMembersStoreEvents } from './events';
import type {
  OrganizationMembersLoadOptions,
  OrganizationMembersState,
} from './models/state.interface';

/**
 * Initial organization members workflow state. Members and invitations are held
 * in `withEntities` collections; only roles, the link map and call states live
 * in plain state.
 */
const INITIAL_STATE: OrganizationMembersState = {
  roles: [],
  membersTotal: 0,
  membersPage: 1,
  membersSearch: '',
  invitationLinks: {},
  loadCallState: idleCallState(),
  mutationCallState: idleCallState(),
  lastMutationCanExceedQuota: false,
};

/** Server-side page size for the members table. */
export const MEMBERS_PAGE_SIZE = 20;

/**
 * Captures the fresh accept link returned by an invite/resend response into the
 * id → link map, ignoring empty links (listed invitations never carry a token).
 */
function withCapturedLink(
  links: Record<string, string>,
  invitation: OrganizationInvitationOutput,
): Record<string, string> {
  if (!invitation.acceptUrl) return links;
  return { ...links, [invitation.id]: invitation.acceptUrl };
}

/**
 * Store OrganizationMembersStore
 *
 * @description
 * Component-scoped workflow store for the dedicated members page: loads members,
 * invitations and roles, and owns member/invitation mutations (remove, invite,
 * resend, revoke, role assignment). Members and invitations are kept as
 * `withEntities` collections for O(1) id-based updates; each successful mutation
 * dispatches a feedback event the app-wide listener renders as a confirmation
 * toast. Roles CRUD stays with the roles-only team page.
 *
 * @since 1.0.0
 */
export const OrganizationMembersStore = signalStore(
  withEntities({ entity: type<OrganizationMemberOutput>(), collection: 'member' }),
  withEntities({ entity: type<OrganizationInvitationOutput>(), collection: 'invitation' }),
  withState(INITIAL_STATE),
  withComputed((store) => ({
    /** Loaded organization members. */
    members: computed(() => store.memberEntities()),
    /** Loaded organization invitations (all statuses). */
    invitations: computed(() => store.invitationEntities()),
    /** Actionable invitations (pending or expired) for the pending-invitations card. */
    activeInvitations: computed(() =>
      store
        .invitationEntities()
        .filter((invitation) => invitation.status === 'pending' || invitation.status === 'expired'),
    ),
    /** Whether member-page resources are loading. */
    isLoading: computed(() => isCallPending(store.loadCallState())),
    /** Whether a member/invitation mutation is pending. */
    isMutating: computed(() => isCallPending(store.mutationCallState())),
    /** Error from the last resource load. */
    loadError: computed(() => store.loadCallState().error),
    /** Error from the last mutation. */
    mutationError: computed(() => store.mutationCallState().error),
  })),
  withMethods(
    (
      store,
      memberService = inject<OrganizationMemberService>(OrganizationMemberService),
      roleService = inject<OrganizationRoleService>(OrganizationRoleService),
      invitationService = inject<OrganizationInvitationService>(OrganizationInvitationService),
      dispatcher = inject<Dispatcher>(Dispatcher),
    ) => ({
      /** Loads the member-page resources permitted for the active member. */
      load: rxMethod<OrganizationMembersLoadOptions>(
        pipe(
          tap(() => patchState(store, { loadCallState: pendingCallState() })),
          switchMap(({ organizationId, includeMembers, includeInvitations, includeRoles }) =>
            forkJoin({
              members: includeMembers
                ? memberService
                    .list(organizationId, { page: 1, itemsPerPage: MEMBERS_PAGE_SIZE })
                    .pipe(
                      map((response) => ({
                        items: [...response.member],
                        total: response.totalItems,
                      })),
                    )
                : of({ items: [] as OrganizationMemberOutput[], total: 0 }),
              invitations: includeInvitations
                ? invitationService
                    .list(organizationId, { itemsPerPage: 100 })
                    .pipe(map((response) => [...response.member]))
                : of([]),
              roles: includeRoles
                ? roleService
                    .list(organizationId, { itemsPerPage: 100 })
                    .pipe(map((response) => [...response.member]))
                : of([]),
            }).pipe(
              tapResponse({
                next: ({ members, invitations, roles }) =>
                  patchState(
                    store,
                    setAllEntities(members.items, { collection: 'member' }),
                    setAllEntities(invitations, { collection: 'invitation' }),
                    {
                      roles,
                      membersTotal: members.total,
                      membersPage: 1,
                      membersSearch: '',
                      loadCallState: successCallState(null),
                    },
                  ),
                error: (error: unknown) =>
                  patchState(store, { loadCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      ),
      /** Loads a single members page for the given search term (server-side). */
      loadMembers: rxMethod<{ organizationId: string; page: number; search: string }>(
        pipe(
          tap(() => patchState(store, { loadCallState: pendingCallState() })),
          switchMap(({ organizationId, page, search }) =>
            memberService
              .list(organizationId, {
                page,
                itemsPerPage: MEMBERS_PAGE_SIZE,
                params: search ? { search } : undefined,
              })
              .pipe(
                tapResponse({
                  next: (response) =>
                    patchState(
                      store,
                      setAllEntities([...response.member], { collection: 'member' }),
                      {
                        membersTotal: response.totalItems,
                        membersPage: page,
                        membersSearch: search,
                        loadCallState: successCallState(null),
                      },
                    ),
                  error: (error: unknown) =>
                    patchState(store, { loadCallState: errorCallState(toStoreError(error)) }),
                }),
              ),
          ),
        ),
      ),
      /** Removes a member from the organization. */
      removeMember: rxMethod<{ organizationId: string; memberId: string }>(
        pipe(
          tap(() =>
            patchState(store, {
              mutationCallState: pendingCallState(),
              lastMutationCanExceedQuota: false,
            }),
          ),
          exhaustMap(({ organizationId, memberId }) =>
            memberService.remove(organizationId, memberId).pipe(
              tapResponse({
                next: () => {
                  patchState(store, removeEntity(memberId, { collection: 'member' }), {
                    membersTotal: Math.max(0, store.membersTotal() - 1),
                    mutationCallState: successCallState(null),
                  });
                  dispatcher.dispatch(
                    organizationMembersStoreEvents.removeMemberSucceeded(
                      successFeedback($localize`:@@org.members.toast.removed:Member removed`),
                    ),
                  );
                },
                error: (error: unknown) =>
                  patchState(store, { mutationCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      ),
      /** Removes several members in one action and confirms with a single toast. */
      removeMembers: rxMethod<{ organizationId: string; memberIds: readonly string[] }>(
        pipe(
          tap(() =>
            patchState(store, {
              mutationCallState: pendingCallState(),
              lastMutationCanExceedQuota: false,
            }),
          ),
          exhaustMap(({ organizationId, memberIds }) => {
            const ids = [...memberIds];
            if (ids.length === 0) {
              patchState(store, { mutationCallState: successCallState(null) });
              return EMPTY;
            }
            // One batch request; the endpoint reports which ids were removed and
            // which failed so local state stays exact on a partial failure.
            return memberService.removeMany(organizationId, ids).pipe(
              tapResponse({
                next: (result) => {
                  const removedIds = [...result.removedIds];
                  patchState(store, removeEntities(removedIds, { collection: 'member' }), {
                    membersTotal: Math.max(0, store.membersTotal() - removedIds.length),
                    mutationCallState: successCallState(null),
                  });
                  dispatcher.dispatch(
                    result.failedIds.length === 0
                      ? organizationMembersStoreEvents.removeMembersSucceeded(
                          successFeedback(
                            $localize`:@@org.members.toast.bulkRemoved:Members removed`,
                          ),
                        )
                      : organizationMembersStoreEvents.removeMembersFailed(
                          errorFeedback(
                            $localize`:@@org.members.toast.bulkPartial:Some members could not be removed.`,
                          ),
                        ),
                  );
                },
                error: (error: unknown) =>
                  patchState(store, { mutationCallState: errorCallState(toStoreError(error)) }),
              }),
            );
          }),
        ),
      ),
      /** Sends an organization invitation. */
      invite: rxMethod<{ organizationId: string; input: InviteOrganizationMemberInput }>(
        pipe(
          tap(() =>
            patchState(store, {
              mutationCallState: pendingCallState(),
              lastMutationCanExceedQuota: true,
            }),
          ),
          exhaustMap(({ organizationId, input }) =>
            invitationService.invite(organizationId, input).pipe(
              tapResponse({
                next: (invitation) => {
                  patchState(store, addEntity(invitation, { collection: 'invitation' }), {
                    invitationLinks: withCapturedLink(store.invitationLinks(), invitation),
                    mutationCallState: successCallState(null),
                  });
                  dispatcher.dispatch(
                    organizationMembersStoreEvents.inviteSucceeded(
                      successFeedback($localize`:@@org.members.toast.invited:Invitation sent`),
                    ),
                  );
                },
                error: (error: unknown) =>
                  patchState(store, { mutationCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      ),
      /** Revokes a pending organization invitation. */
      revokeInvitation: rxMethod<{ organizationId: string; invitationId: string }>(
        pipe(
          tap(() =>
            patchState(store, {
              mutationCallState: pendingCallState(),
              lastMutationCanExceedQuota: false,
            }),
          ),
          exhaustMap(({ organizationId, invitationId }) =>
            invitationService.revoke(organizationId, invitationId).pipe(
              tapResponse({
                next: () => {
                  patchState(store, removeEntity(invitationId, { collection: 'invitation' }), {
                    mutationCallState: successCallState(null),
                  });
                  dispatcher.dispatch(
                    organizationMembersStoreEvents.revokeSucceeded(
                      successFeedback($localize`:@@org.members.toast.revoked:Invitation revoked`),
                    ),
                  );
                },
                error: (error: unknown) =>
                  patchState(store, { mutationCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      ),
      /** Resends an invitation, regenerating its token and accept link. */
      resendInvitation: rxMethod<{ organizationId: string; invitationId: string }>(
        pipe(
          tap(() =>
            patchState(store, {
              mutationCallState: pendingCallState(),
              lastMutationCanExceedQuota: false,
            }),
          ),
          exhaustMap(({ organizationId, invitationId }) =>
            invitationService.resend(organizationId, invitationId).pipe(
              tapResponse({
                next: (invitation) => {
                  patchState(
                    store,
                    updateEntity(
                      { id: invitation.id, changes: invitation },
                      { collection: 'invitation' },
                    ),
                    {
                      invitationLinks: withCapturedLink(store.invitationLinks(), invitation),
                      mutationCallState: successCallState(null),
                    },
                  );
                  dispatcher.dispatch(
                    organizationMembersStoreEvents.resendSucceeded(
                      successFeedback($localize`:@@org.members.toast.resent:Invitation resent`),
                    ),
                  );
                },
                error: (error: unknown) =>
                  patchState(store, { mutationCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      ),
      /** Assigns an organization role to a member. */
      assignRole: rxMethod<{
        organizationId: string;
        memberId: string;
        input: AssignOrganizationRoleInput;
      }>(
        pipe(
          tap(() =>
            patchState(store, {
              mutationCallState: pendingCallState(),
              lastMutationCanExceedQuota: false,
            }),
          ),
          exhaustMap(({ organizationId, memberId, input }) =>
            roleService.assignToMember(organizationId, memberId, input).pipe(
              tapResponse({
                next: (member) => {
                  patchState(
                    store,
                    updateEntity({ id: member.id, changes: member }, { collection: 'member' }),
                    { mutationCallState: successCallState(null) },
                  );
                  dispatcher.dispatch(
                    organizationMembersStoreEvents.assignRoleSucceeded(
                      successFeedback($localize`:@@org.members.toast.roleAssigned:Role assigned`),
                    ),
                  );
                },
                error: (error: unknown) =>
                  patchState(store, { mutationCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      ),
      /** Assigns one role to several members in a single action. */
      assignRoleToMembers: rxMethod<{
        organizationId: string;
        memberIds: readonly string[];
        roleId: string;
      }>(
        pipe(
          tap(() =>
            patchState(store, {
              mutationCallState: pendingCallState(),
              lastMutationCanExceedQuota: false,
            }),
          ),
          exhaustMap(({ organizationId, memberIds, roleId }) => {
            const ids = [...memberIds];
            if (ids.length === 0) {
              patchState(store, { mutationCallState: successCallState(null) });
              return EMPTY;
            }
            return forkJoin(
              ids.map((memberId) =>
                roleService.assignToMember(organizationId, memberId, { roleId }).pipe(
                  map((member) => ({ member, ok: true as const })),
                  catchError(() => of({ member: null, ok: false as const })),
                ),
              ),
            ).pipe(
              tapResponse({
                next: (results) => {
                  const updated = results.flatMap((result) =>
                    result.ok && result.member ? [result.member] : [],
                  );
                  patchState(
                    store,
                    ...updated.map((member) =>
                      updateEntity({ id: member.id, changes: member }, { collection: 'member' }),
                    ),
                    { mutationCallState: successCallState(null) },
                  );
                  dispatcher.dispatch(
                    updated.length === results.length
                      ? organizationMembersStoreEvents.assignRoleSucceeded(
                          successFeedback(
                            $localize`:@@org.members.toast.roleAssigned:Role assigned`,
                          ),
                        )
                      : organizationMembersStoreEvents.assignRoleToMembersFailed(
                          errorFeedback(
                            $localize`:@@org.members.toast.bulkRoleFailed:The role could not be assigned to some members.`,
                          ),
                        ),
                  );
                },
                error: (error: unknown) =>
                  patchState(store, { mutationCallState: errorCallState(toStoreError(error)) }),
              }),
            );
          }),
        ),
      ),
      /** Removes an assigned role from an organization member. */
      removeRoleFromMember: rxMethod<{
        organizationId: string;
        memberId: string;
        roleId: string;
      }>(
        pipe(
          tap(() =>
            patchState(store, {
              mutationCallState: pendingCallState(),
              lastMutationCanExceedQuota: false,
            }),
          ),
          exhaustMap(({ organizationId, memberId, roleId }) =>
            roleService.removeFromMember(organizationId, memberId, roleId).pipe(
              tapResponse({
                next: () => {
                  const member = store.memberEntityMap()[memberId];
                  if (member) {
                    patchState(
                      store,
                      updateEntity(
                        {
                          id: memberId,
                          changes: { roleIds: member.roleIds.filter((id) => id !== roleId) },
                        },
                        { collection: 'member' },
                      ),
                      { mutationCallState: successCallState(null) },
                    );
                  } else {
                    patchState(store, { mutationCallState: successCallState(null) });
                  }
                  dispatcher.dispatch(
                    organizationMembersStoreEvents.removeRoleSucceeded(
                      successFeedback($localize`:@@org.members.toast.roleRemoved:Role removed`),
                    ),
                  );
                },
                error: (error: unknown) =>
                  patchState(store, { mutationCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      ),
    }),
  ),
);

/**
 * Injectable instance type exposed by {@link OrganizationMembersStore}.
 */
export type OrganizationMembersStore = InstanceType<typeof OrganizationMembersStore>;
