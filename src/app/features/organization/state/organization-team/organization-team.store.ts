import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, forkJoin, map, of, pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/state/request-state';
import {
  OrganizationInvitationService,
  OrganizationMemberService,
  OrganizationRoleService,
  OrganizationService,
} from '@features/organization/data-access';
import type {
  AddOrganizationMemberInput,
  AssignOrganizationRoleInput,
  CreateOrganizationRoleInput,
  InviteOrganizationMemberInput,
  OrganizationInvitationOutput,
  OrganizationMemberOutput,
  OrganizationPermissionOutput,
  OrganizationRoleOutput,
  UpdateOrganizationRoleInput,
} from '@features/organization/models';

/**
 * State owned by the organization team workflow.
 */
interface OrganizationTeamState {
  /** Members loaded for the active organization. */
  readonly members: readonly OrganizationMemberOutput[];
  /** Roles loaded for the active organization. */
  readonly roles: readonly OrganizationRoleOutput[];
  /** Pending invitations loaded for the active organization. */
  readonly invitations: readonly OrganizationInvitationOutput[];
  /** Permissions available for role configuration. */
  readonly permissions: readonly OrganizationPermissionOutput[];
  /** Request state for team resource loading. */
  readonly loadCallState: CallState;
  /** Request state shared by team mutations. */
  readonly mutationCallState: CallState;
}

/**
 * Selects the team resources that must be loaded for the current member.
 */
export interface OrganizationTeamLoadOptions {
  /** Organization whose team resources must be loaded. */
  readonly organizationId: string;
  /** Whether members must be loaded. */
  readonly includeMembers: boolean;
  /** Whether roles must be loaded. */
  readonly includeRoles: boolean;
  /** Whether invitations must be loaded. */
  readonly includeInvitations: boolean;
  /** Whether permissions must be loaded. */
  readonly includePermissions: boolean;
}

/**
 * Initial organization team workflow state.
 */
const INITIAL_STATE: OrganizationTeamState = {
  members: [],
  roles: [],
  invitations: [],
  permissions: [],
  loadCallState: idleCallState(),
  mutationCallState: idleCallState(),
};

/**
 * Store OrganizationTeamStore
 *
 * @description
 * Component-scoped workflow store responsible for members, invitations,
 * organization roles and their assignments.
 *
 * @since 1.0.0
 */
export const OrganizationTeamStore = signalStore(
  withState(INITIAL_STATE),
  withComputed((store) => ({
    /** Whether team resources are loading. */
    isLoading: computed(() => store.loadCallState().status === 'pending'),
    /** Whether a team mutation is pending. */
    isMutating: computed(() => store.mutationCallState().status === 'pending'),
    /** Error from the last team resource load. */
    loadError: computed(() => store.loadCallState().error),
    /** Error from the last team mutation. */
    mutationError: computed(() => store.mutationCallState().error),
  })),
  withMethods(
    (
      store,
      memberService = inject<OrganizationMemberService>(OrganizationMemberService),
      roleService = inject<OrganizationRoleService>(OrganizationRoleService),
      invitationService = inject<OrganizationInvitationService>(OrganizationInvitationService),
      organizationService = inject<OrganizationService>(OrganizationService),
    ) => ({
      /** Loads the team resources permitted for the active member. */
      load: rxMethod<OrganizationTeamLoadOptions>(
        pipe(
          tap(() => patchState(store, { loadCallState: pendingCallState() })),
          switchMap(
            ({
              organizationId,
              includeMembers,
              includeRoles,
              includeInvitations,
              includePermissions,
            }) =>
              forkJoin({
                members: includeMembers
                  ? memberService
                      .list(organizationId, { itemsPerPage: 30 })
                      .pipe(map((response) => [...response.member]))
                  : of([]),
                roles: includeRoles
                  ? roleService
                      .list(organizationId, { itemsPerPage: 30 })
                      .pipe(map((response) => [...response.member]))
                  : of([]),
                invitations: includeInvitations
                  ? organizationService
                      .listInvitations(organizationId, { itemsPerPage: 30 })
                      .pipe(map((response) => [...response.member]))
                  : of([]),
                permissions: includePermissions
                  ? organizationService
                      .listPermissions(organizationId, { itemsPerPage: 30 })
                      .pipe(map((response) => [...response.member]))
                  : of([]),
              }).pipe(
                tapResponse({
                  next: ({ members, roles, invitations, permissions }) =>
                    patchState(store, {
                      members,
                      roles,
                      invitations,
                      permissions,
                      loadCallState: successCallState(null),
                    }),
                  error: (error: unknown) =>
                    patchState(store, { loadCallState: errorCallState(toStoreError(error)) }),
                }),
              ),
          ),
        ),
      ),
      /** Adds an existing user to the organization. */
      addMember: rxMethod<{
        organizationId: string;
        input: AddOrganizationMemberInput;
      }>(
        pipe(
          tap(() => patchState(store, { mutationCallState: pendingCallState() })),
          exhaustMap(({ organizationId, input }) =>
            memberService.add(organizationId, input).pipe(
              tapResponse({
                next: (member) =>
                  patchState(store, {
                    members: [...store.members(), member],
                    mutationCallState: successCallState(null),
                  }),
                error: (error: unknown) =>
                  patchState(store, { mutationCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      ),
      /** Removes a member from the organization. */
      removeMember: rxMethod<{ organizationId: string; memberId: string }>(
        pipe(
          tap(() => patchState(store, { mutationCallState: pendingCallState() })),
          exhaustMap(({ organizationId, memberId }) =>
            memberService.remove(organizationId, memberId).pipe(
              tapResponse({
                next: () =>
                  patchState(store, {
                    members: store.members().filter((member) => member.id !== memberId),
                    mutationCallState: successCallState(null),
                  }),
                error: (error: unknown) =>
                  patchState(store, { mutationCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      ),
      /** Sends an organization invitation. */
      invite: rxMethod<{ organizationId: string; input: InviteOrganizationMemberInput }>(
        pipe(
          tap(() => patchState(store, { mutationCallState: pendingCallState() })),
          exhaustMap(({ organizationId, input }) =>
            invitationService.invite(organizationId, input).pipe(
              tapResponse({
                next: (invitation) =>
                  patchState(store, {
                    invitations: [...store.invitations(), invitation],
                    mutationCallState: successCallState(null),
                  }),
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
          tap(() => patchState(store, { mutationCallState: pendingCallState() })),
          exhaustMap(({ organizationId, invitationId }) =>
            organizationService.revokeInvitation(organizationId, invitationId).pipe(
              tapResponse({
                next: () =>
                  patchState(store, {
                    invitations: store
                      .invitations()
                      .filter((invitation) => invitation.id !== invitationId),
                    mutationCallState: successCallState(null),
                  }),
                error: (error: unknown) =>
                  patchState(store, { mutationCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      ),
      /** Creates an organization role. */
      createRole: rxMethod<{ organizationId: string; input: CreateOrganizationRoleInput }>(
        pipe(
          tap(() => patchState(store, { mutationCallState: pendingCallState() })),
          exhaustMap(({ organizationId, input }) =>
            roleService.create(organizationId, input).pipe(
              tapResponse({
                next: (role) =>
                  patchState(store, {
                    roles: [...store.roles(), role],
                    mutationCallState: successCallState(null),
                  }),
                error: (error: unknown) =>
                  patchState(store, { mutationCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      ),
      /** Updates an organization role. */
      updateRole: rxMethod<{
        organizationId: string;
        roleId: string;
        input: UpdateOrganizationRoleInput;
      }>(
        pipe(
          tap(() => patchState(store, { mutationCallState: pendingCallState() })),
          exhaustMap(({ organizationId, roleId, input }) =>
            roleService.update(organizationId, roleId, input).pipe(
              tapResponse({
                next: (role) =>
                  patchState(store, {
                    roles: store
                      .roles()
                      .map((current) => (current.id === role.id ? role : current)),
                    mutationCallState: successCallState(null),
                  }),
                error: (error: unknown) =>
                  patchState(store, { mutationCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      ),
      /** Removes an organization role. */
      removeRole: rxMethod<{ organizationId: string; roleId: string }>(
        pipe(
          tap(() => patchState(store, { mutationCallState: pendingCallState() })),
          exhaustMap(({ organizationId, roleId }) =>
            roleService.remove(organizationId, roleId).pipe(
              tapResponse({
                next: () =>
                  patchState(store, {
                    roles: store.roles().filter((role) => role.id !== roleId),
                    mutationCallState: successCallState(null),
                  }),
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
          tap(() => patchState(store, { mutationCallState: pendingCallState() })),
          exhaustMap(({ organizationId, memberId, input }) =>
            roleService.assignToMember(organizationId, memberId, input).pipe(
              tapResponse({
                next: (member) =>
                  patchState(store, {
                    members: store
                      .members()
                      .map((current) => (current.id === member.id ? member : current)),
                    mutationCallState: successCallState(null),
                  }),
                error: (error: unknown) =>
                  patchState(store, { mutationCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      ),
      /** Removes an assigned role from an organization member. */
      removeRoleFromMember: rxMethod<{
        organizationId: string;
        memberId: string;
        roleId: string;
      }>(
        pipe(
          tap(() => patchState(store, { mutationCallState: pendingCallState() })),
          exhaustMap(({ organizationId, memberId, roleId }) =>
            roleService.removeFromMember(organizationId, memberId, roleId).pipe(
              tapResponse({
                next: () => {
                  const member = store.members().find((current) => current.id === memberId);
                  const updatedMember = member
                    ? { ...member, roleIds: member.roleIds.filter((id) => id !== roleId) }
                    : null;
                  patchState(store, {
                    members: store
                      .members()
                      .map((current) =>
                        current.id === memberId && updatedMember ? updatedMember : current,
                      ),
                    mutationCallState: successCallState(null),
                  });
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
 * Injectable instance type exposed by {@link OrganizationTeamStore}.
 */
export type OrganizationTeamStore = InstanceType<typeof OrganizationTeamStore>;
