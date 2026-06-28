import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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
  const memberService = { list: vi.fn(), add: vi.fn(), remove: vi.fn() };
  const roleService = {
    list: vi.fn(),
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
    expect(roleService.list).toHaveBeenCalled();
    expect(invitationService.list).not.toHaveBeenCalled();
    expect(organizationService.listPermissions).not.toHaveBeenCalled();
    expect(store.roles()).toEqual([role]);
  });
});
