import { TestBed } from '@angular/core/testing';
import { throwError, of } from 'rxjs';
import type { HydraCollection, HydraItem } from '@core/api/models';
import {
  OrganizationInvitationService,
  OrganizationMemberService,
  OrganizationRoleService,
  OrganizationService,
} from '@features/organization/data-access';
import type {
  OrganizationInvitationOutput,
  OrganizationMemberOutput,
  OrganizationPermissionOutput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import { OrganizationTeamStore } from '../organization-team.store';

const collection = <T extends HydraItem>(member: readonly T[]): HydraCollection<T> =>
  ({
    '@id': '/api/collection',
    '@type': 'Collection',
    member,
    totalItems: member.length,
  }) as HydraCollection<T>;
const flushEffects = async (): Promise<void> => void (await Promise.resolve());

describe('OrganizationTeamStore', () => {
  let store: OrganizationTeamStore;
  const member = {
    id: 'member-1',
    userId: 'user-1',
    roleIds: [],
  } as unknown as OrganizationMemberOutput;
  const role = { id: 'role-1', name: 'Inspector' } as unknown as OrganizationRoleOutput;
  const invitation = {
    id: 'invitation-1',
    email: 'user@example.com',
  } as unknown as OrganizationInvitationOutput;
  const permission = {
    id: 'permission-1',
    name: 'organization.members.read',
  } as unknown as OrganizationPermissionOutput;
  const anotherMember = {
    id: 'member-2',
    userId: 'user-2',
    roleIds: ['role-1'],
  } as unknown as OrganizationMemberOutput;
  const updatedRole = {
    id: 'role-1',
    name: 'Senior Inspector',
  } as unknown as OrganizationRoleOutput;
  const memberService = { list: vi.fn(), add: vi.fn(), remove: vi.fn() };
  const roleService = {
    list: vi.fn(),
    listAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    assignToMember: vi.fn(),
    removeFromMember: vi.fn(),
  };
  const invitationService = { invite: vi.fn(), list: vi.fn(), revoke: vi.fn() };
  const organizationService = {
    listPermissions: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    memberService.list.mockReturnValue(of(collection([member])));
    roleService.list.mockReturnValue(of(collection([role])));
    roleService.listAll.mockReturnValue(of([role]));
    invitationService.list.mockReturnValue(of(collection([invitation])));
    organizationService.listPermissions.mockReturnValue(of(collection([permission])));
    memberService.remove.mockReturnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        OrganizationTeamStore,
        { provide: OrganizationMemberService, useValue: memberService },
        { provide: OrganizationRoleService, useValue: roleService },
        { provide: OrganizationInvitationService, useValue: invitationService },
        { provide: OrganizationService, useValue: organizationService },
      ],
    });
    store = TestBed.inject(OrganizationTeamStore);
  });

  it('should load all team administration resources', async () => {
    store.load({
      organizationId: 'org-1',
      includeMembers: true,
      includeRoles: true,
      includeInvitations: true,
      includePermissions: true,
    });
    await flushEffects();
    expect(store.members()).toEqual([member]);
    expect(store.roles()).toEqual([role]);
    expect(store.invitations()).toEqual([invitation]);
    expect(store.permissions()).toEqual([permission]);
    expect(store.loadCallState().status).toBe('success');
  });

  it('should remove a member from local state after success', async () => {
    store.load({
      organizationId: 'org-1',
      includeMembers: true,
      includeRoles: true,
      includeInvitations: true,
      includePermissions: true,
    });
    await flushEffects();
    store.removeMember({ organizationId: 'org-1', memberId: member.id });
    await flushEffects();
    expect(store.members()).toEqual([]);
  });

  it('should only call resources allowed by the load plan', async () => {
    store.load({
      organizationId: 'org-1',
      includeMembers: false,
      includeRoles: true,
      includeInvitations: false,
      includePermissions: false,
    });
    await flushEffects();

    expect(memberService.list).not.toHaveBeenCalled();
    expect(roleService.listAll).toHaveBeenCalled();
    expect(invitationService.list).not.toHaveBeenCalled();
    expect(organizationService.listPermissions).not.toHaveBeenCalled();
    expect(store.roles()).toEqual([role]);
  });

  it('should expose an error on load failure', async () => {
    memberService.list.mockReturnValue(throwError(() => new Error('load failed')));
    store.load({
      organizationId: 'org-1',
      includeMembers: true,
      includeRoles: false,
      includeInvitations: false,
      includePermissions: false,
    });
    await flushEffects();

    expect(store.loadCallState().status).toBe('error');
    expect(store.loadError()).not.toBeNull();
    expect(store.loadError()?.message).toBeDefined();
  });

  it('should reflect isLoading as settled once a load completes', async () => {
    memberService.list.mockReturnValue(of(collection([member])));
    expect(store.isLoading()).toBe(false);
    store.load({
      organizationId: 'org-1',
      includeMembers: true,
      includeRoles: true,
      includeInvitations: true,
      includePermissions: true,
    });
    await flushEffects();
    expect(store.isLoading()).toBe(false);
  });

  it('should add a member to local state after success', async () => {
    memberService.add.mockReturnValue(of(anotherMember));
    expect(store.isMutating()).toBe(false);

    store.addMember({ organizationId: 'org-1', input: { userId: 'user-2' } as never });
    await flushEffects();

    expect(store.members()).toEqual([anotherMember]);
    expect(store.mutationCallState().status).toBe('success');
    expect(store.isMutating()).toBe(false);
  });

  it('should expose a normalized mutation error when adding a member fails', async () => {
    memberService.add.mockReturnValue(throwError(() => new Error('add failed')));

    store.addMember({ organizationId: 'org-1', input: { userId: 'user-2' } as never });
    await flushEffects();

    expect(store.mutationCallState().status).toBe('error');
    expect(store.mutationError()).not.toBeNull();
  });

  it('should expose a normalized mutation error when removing a member fails', async () => {
    store.load({
      organizationId: 'org-1',
      includeMembers: true,
      includeRoles: false,
      includeInvitations: false,
      includePermissions: false,
    });
    await flushEffects();
    memberService.remove.mockReturnValue(throwError(() => new Error('remove failed')));

    store.removeMember({ organizationId: 'org-1', memberId: member.id });
    await flushEffects();

    expect(store.mutationCallState().status).toBe('error');
    expect(store.mutationError()).not.toBeNull();
    expect(store.members()).toEqual([member]);
  });

  it('should append an invitation to local state after success', async () => {
    invitationService.invite.mockReturnValue(of(invitation));

    store.invite({
      organizationId: 'org-1',
      input: { email: invitation.email } as never,
    });
    await flushEffects();

    expect(store.invitations()).toEqual([invitation]);
    expect(store.mutationCallState().status).toBe('success');
  });

  it('should expose a normalized mutation error when inviting a member fails', async () => {
    invitationService.invite.mockReturnValue(throwError(() => new Error('invite failed')));

    store.invite({ organizationId: 'org-1', input: { email: 'x@example.com' } as never });
    await flushEffects();

    expect(store.mutationCallState().status).toBe('error');
    expect(store.mutationError()).not.toBeNull();
  });

  it('should remove a revoked invitation from local state after success', async () => {
    store.load({
      organizationId: 'org-1',
      includeMembers: false,
      includeRoles: false,
      includeInvitations: true,
      includePermissions: false,
    });
    await flushEffects();
    invitationService.revoke.mockReturnValue(of(undefined));

    store.revokeInvitation({ organizationId: 'org-1', invitationId: invitation.id });
    await flushEffects();

    expect(store.invitations()).toEqual([]);
    expect(store.mutationCallState().status).toBe('success');
  });

  it('should expose a normalized mutation error when revoking an invitation fails', async () => {
    store.load({
      organizationId: 'org-1',
      includeMembers: false,
      includeRoles: false,
      includeInvitations: true,
      includePermissions: false,
    });
    await flushEffects();
    invitationService.revoke.mockReturnValue(throwError(() => new Error('revoke failed')));

    store.revokeInvitation({ organizationId: 'org-1', invitationId: invitation.id });
    await flushEffects();

    expect(store.mutationCallState().status).toBe('error');
    expect(store.mutationError()).not.toBeNull();
    expect(store.invitations()).toEqual([invitation]);
  });

  it('should append a created role to local state after success', async () => {
    roleService.create.mockReturnValue(of(role));

    store.createRole({ organizationId: 'org-1', input: { name: role.name } as never });
    await flushEffects();

    expect(store.roles()).toEqual([role]);
    expect(store.mutationCallState().status).toBe('success');
  });

  it('should expose a normalized mutation error when creating a role fails', async () => {
    roleService.create.mockReturnValue(throwError(() => new Error('create failed')));

    store.createRole({ organizationId: 'org-1', input: { name: 'x' } as never });
    await flushEffects();

    expect(store.mutationCallState().status).toBe('error');
    expect(store.mutationError()).not.toBeNull();
  });

  it('should replace an updated role in local state after success', async () => {
    store.load({
      organizationId: 'org-1',
      includeMembers: false,
      includeRoles: true,
      includeInvitations: false,
      includePermissions: false,
    });
    await flushEffects();
    roleService.update.mockReturnValue(of(updatedRole));

    store.updateRole({
      organizationId: 'org-1',
      roleId: role.id,
      input: { name: updatedRole.name } as never,
    });
    await flushEffects();

    expect(store.roles()).toEqual([updatedRole]);
    expect(store.mutationCallState().status).toBe('success');
  });

  it('should expose a normalized mutation error when updating a role fails', async () => {
    store.load({
      organizationId: 'org-1',
      includeMembers: false,
      includeRoles: true,
      includeInvitations: false,
      includePermissions: false,
    });
    await flushEffects();
    roleService.update.mockReturnValue(throwError(() => new Error('update failed')));

    store.updateRole({
      organizationId: 'org-1',
      roleId: role.id,
      input: { name: 'x' } as never,
    });
    await flushEffects();

    expect(store.mutationCallState().status).toBe('error');
    expect(store.mutationError()).not.toBeNull();
    expect(store.roles()).toEqual([role]);
  });

  it('should remove a role from local state after success', async () => {
    store.load({
      organizationId: 'org-1',
      includeMembers: false,
      includeRoles: true,
      includeInvitations: false,
      includePermissions: false,
    });
    await flushEffects();
    roleService.remove.mockReturnValue(of(undefined));

    store.removeRole({ organizationId: 'org-1', roleId: role.id });
    await flushEffects();

    expect(store.roles()).toEqual([]);
    expect(store.mutationCallState().status).toBe('success');
  });

  it('should expose a normalized mutation error when removing a role fails', async () => {
    store.load({
      organizationId: 'org-1',
      includeMembers: false,
      includeRoles: true,
      includeInvitations: false,
      includePermissions: false,
    });
    await flushEffects();
    roleService.remove.mockReturnValue(throwError(() => new Error('remove failed')));

    store.removeRole({ organizationId: 'org-1', roleId: role.id });
    await flushEffects();

    expect(store.mutationCallState().status).toBe('error');
    expect(store.mutationError()).not.toBeNull();
    expect(store.roles()).toEqual([role]);
  });

  it('should replace the assigned member in local state after success', async () => {
    store.load({
      organizationId: 'org-1',
      includeMembers: true,
      includeRoles: false,
      includeInvitations: false,
      includePermissions: false,
    });
    await flushEffects();
    const assignedMember = { ...member, roleIds: [role.id] };
    roleService.assignToMember.mockReturnValue(of(assignedMember));

    store.assignRole({
      organizationId: 'org-1',
      memberId: member.id,
      input: { roleId: role.id } as never,
    });
    await flushEffects();

    expect(store.members()).toEqual([assignedMember]);
    expect(store.mutationCallState().status).toBe('success');
  });

  it('should expose a normalized mutation error when assigning a role fails', async () => {
    store.load({
      organizationId: 'org-1',
      includeMembers: true,
      includeRoles: false,
      includeInvitations: false,
      includePermissions: false,
    });
    await flushEffects();
    roleService.assignToMember.mockReturnValue(throwError(() => new Error('assign failed')));

    store.assignRole({
      organizationId: 'org-1',
      memberId: member.id,
      input: { roleId: role.id } as never,
    });
    await flushEffects();

    expect(store.mutationCallState().status).toBe('error');
    expect(store.mutationError()).not.toBeNull();
    expect(store.members()).toEqual([member]);
  });

  it('should remove the role id from the member after removeRoleFromMember succeeds', async () => {
    memberService.list.mockReturnValue(of(collection([anotherMember])));
    store.load({
      organizationId: 'org-1',
      includeMembers: true,
      includeRoles: false,
      includeInvitations: false,
      includePermissions: false,
    });
    await flushEffects();
    roleService.removeFromMember.mockReturnValue(of(undefined));

    store.removeRoleFromMember({
      organizationId: 'org-1',
      memberId: anotherMember.id,
      roleId: role.id,
    });
    await flushEffects();

    expect(store.members()).toEqual([{ ...anotherMember, roleIds: [] }]);
    expect(store.mutationCallState().status).toBe('success');
  });

  it('should leave members unchanged when removeRoleFromMember targets an unknown member', async () => {
    memberService.list.mockReturnValue(of(collection([anotherMember])));
    store.load({
      organizationId: 'org-1',
      includeMembers: true,
      includeRoles: false,
      includeInvitations: false,
      includePermissions: false,
    });
    await flushEffects();
    roleService.removeFromMember.mockReturnValue(of(undefined));

    store.removeRoleFromMember({
      organizationId: 'org-1',
      memberId: 'unknown-member',
      roleId: role.id,
    });
    await flushEffects();

    expect(store.members()).toEqual([anotherMember]);
    expect(store.mutationCallState().status).toBe('success');
  });

  it('should expose a normalized mutation error when removeRoleFromMember fails', async () => {
    memberService.list.mockReturnValue(of(collection([anotherMember])));
    store.load({
      organizationId: 'org-1',
      includeMembers: true,
      includeRoles: false,
      includeInvitations: false,
      includePermissions: false,
    });
    await flushEffects();
    roleService.removeFromMember.mockReturnValue(throwError(() => new Error('unassign failed')));

    store.removeRoleFromMember({
      organizationId: 'org-1',
      memberId: anotherMember.id,
      roleId: role.id,
    });
    await flushEffects();

    expect(store.mutationCallState().status).toBe('error');
    expect(store.mutationError()).not.toBeNull();
    expect(store.members()).toEqual([anotherMember]);
  });
});
