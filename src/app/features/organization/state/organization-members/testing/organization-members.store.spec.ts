import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import type { HydraCollection, HydraItem } from '@core/api/models';
import {
  OrganizationInvitationService,
  OrganizationMemberService,
  OrganizationRoleService,
} from '@features/organization/data-access';
import type {
  OrganizationInvitationOutput,
  OrganizationMemberOutput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import { MEMBERS_PAGE_SIZE, OrganizationMembersStore } from '../organization-members.store';

const flush = async (): Promise<void> => {
  await Promise.resolve();
};

function collection<T extends HydraItem>(member: T[]): HydraCollection<T> {
  return {
    '@id': '/api',
    '@type': 'Collection',
    totalItems: member.length,
    member,
  } as HydraCollection<T>;
}

const member = (id: string): OrganizationMemberOutput =>
  ({
    id,
    userId: `u-${id}`,
    displayName: id,
    isActive: true,
    joinedAt: '2026-01-01',
    roleIds: ['r1'],
  }) as unknown as OrganizationMemberOutput;

const invitation = (id: string, status = 'pending'): OrganizationInvitationOutput =>
  ({
    id,
    email: `${id}@example.com`,
    status,
    roleIds: [],
    expiresAt: '2026-02-01',
    acceptUrl: `https://app/accept?token=${id}`,
  }) as unknown as OrganizationInvitationOutput;

const role = { id: 'r1', name: 'Admin' } as unknown as OrganizationRoleOutput;

const ALL = {
  organizationId: 'org-1',
  includeMembers: true,
  includeInvitations: true,
  includeRoles: true,
} as const;

describe('OrganizationMembersStore', () => {
  let store: OrganizationMembersStore;
  let dispatch: ReturnType<typeof vi.fn>;
  let memberService: {
    list: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    removeMany: ReturnType<typeof vi.fn>;
  };
  let roleService: {
    list: ReturnType<typeof vi.fn>;
    listAll: ReturnType<typeof vi.fn>;
    assignToMember: ReturnType<typeof vi.fn>;
    removeFromMember: ReturnType<typeof vi.fn>;
  };
  let invitationService: {
    list: ReturnType<typeof vi.fn>;
    invite: ReturnType<typeof vi.fn>;
    revoke: ReturnType<typeof vi.fn>;
    resend: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    dispatch = vi.fn();
    memberService = {
      list: vi.fn().mockReturnValue(of(collection([member('m1')]))),
      remove: vi.fn().mockReturnValue(of(undefined)),
      removeMany: vi.fn().mockReturnValue(of({ removedIds: [], failedIds: [] })),
    };
    roleService = {
      list: vi.fn().mockReturnValue(of(collection([role]))),
      listAll: vi.fn().mockReturnValue(of([role])),
      assignToMember: vi.fn(),
      removeFromMember: vi.fn().mockReturnValue(of(undefined)),
    };
    invitationService = {
      list: vi.fn().mockReturnValue(of(collection([invitation('i1')]))),
      invite: vi.fn(),
      revoke: vi.fn().mockReturnValue(of(undefined)),
      resend: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        OrganizationMembersStore,
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: OrganizationMemberService, useValue: memberService },
        { provide: OrganizationRoleService, useValue: roleService },
        { provide: OrganizationInvitationService, useValue: invitationService },
      ],
    });
    store = TestBed.inject(OrganizationMembersStore);
  });

  it('loads members, invitations and roles into entity collections', async () => {
    store.load(ALL);
    await flush();

    expect(store.members().map((m) => m.id)).toEqual(['m1']);
    expect(store.invitations().map((i) => i.id)).toEqual(['i1']);
    expect(store.roles().map((r) => r.id)).toEqual(['r1']);
    expect(store.membersTotal()).toBe(1);
    expect(store.membersStatus()).toBe('all');
    expect(store.isLoading()).toBe(false);
  });

  it('fetches an organization-wide active-membership count alongside the initial load, independent of the roster page size', async () => {
    memberService.list.mockImplementation((_org: string, options: { itemsPerPage: number }) =>
      of(collection(options.itemsPerPage === 1 ? [member('a1'), member('a2')] : [member('m1')])),
    );
    store.load(ALL);
    await flush();

    expect(store.membersActiveTotal()).toBe(2);
    expect(store.membersTotal()).toBe(1);
  });

  it('loads a members page with a server-side search term', async () => {
    memberService.list.mockReturnValue(of(collection([member('m2')])));
    store.loadMembers({ organizationId: 'org-1', page: 2, search: 'ali', status: 'all' });
    await flush();

    expect(store.members().map((m) => m.id)).toEqual(['m2']);
    expect(store.membersPage()).toBe(2);
    expect(store.membersSearch()).toBe('ali');
    expect(memberService.list).toHaveBeenCalledWith(
      'org-1',
      { page: 2, itemsPerPage: MEMBERS_PAGE_SIZE },
      { search: 'ali', status: undefined },
    );
  });

  it('loads a members page filtered by status', async () => {
    memberService.list.mockReturnValue(of(collection([member('m3')])));
    store.loadMembers({ organizationId: 'org-1', page: 1, search: '', status: 'inactive' });
    await flush();

    expect(store.membersStatus()).toBe('inactive');
    expect(memberService.list).toHaveBeenCalledWith(
      'org-1',
      { page: 1, itemsPerPage: MEMBERS_PAGE_SIZE },
      { search: undefined, status: 'inactive' },
    );
  });

  it('loads a members page with an explicit page size, remembered on the state', async () => {
    memberService.list.mockReturnValue(of(collection([member('m4')])));
    store.loadMembers({
      organizationId: 'org-1',
      page: 1,
      search: '',
      status: 'all',
      pageSize: 60,
    });
    await flush();

    expect(store.membersPageSize()).toBe(60);
    expect(memberService.list).toHaveBeenCalledWith(
      'org-1',
      { page: 1, itemsPerPage: 60 },
      { search: undefined, status: undefined },
    );
  });

  it('keeps only pending/expired invitations in activeInvitations', async () => {
    invitationService.list.mockReturnValue(
      of(
        collection([
          invitation('i1', 'pending'),
          invitation('i2', 'revoked'),
          invitation('i3', 'expired'),
        ]),
      ),
    );
    store.load(ALL);
    await flush();

    expect(store.invitations()).toHaveLength(3);
    expect(store.activeInvitations().map((i) => i.id)).toEqual(['i1', 'i3']);
  });

  it('captures the accept link and adds the invitation on invite', async () => {
    invitationService.invite.mockReturnValue(of(invitation('new')));
    store.invite({ organizationId: 'org-1', input: { email: 'new@example.com', roleIds: [] } });
    await flush();

    expect(store.invitations().map((i) => i.id)).toContain('new');
    expect(store.invitationLinks()['new']).toBe('https://app/accept?token=new');
    expect(dispatch).toHaveBeenCalled();
  });

  it('removes a single member', async () => {
    store.load(ALL);
    await flush();
    store.removeMember({ organizationId: 'org-1', memberId: 'm1' });
    await flush();

    expect(store.members()).toHaveLength(0);
  });

  it('prunes only the members that were actually removed on a partial bulk failure', async () => {
    memberService.list.mockReturnValue(of(collection([member('m1'), member('m2')])));
    store.load(ALL);
    await flush();

    memberService.removeMany.mockReturnValue(of({ removedIds: ['m1'], failedIds: ['m2'] }));
    store.removeMembers({ organizationId: 'org-1', memberIds: ['m1', 'm2'] });
    await flush();

    expect(store.members().map((m) => m.id)).toEqual(['m2']);
    const lastPayload = dispatch.mock.calls.at(-1)?.[0]?.payload;
    expect(lastPayload?.severity).toBe('error');
  });

  it('removes a revoked invitation', async () => {
    store.load(ALL);
    await flush();
    store.revokeInvitation({ organizationId: 'org-1', invitationId: 'i1' });
    await flush();

    expect(store.invitations()).toHaveLength(0);
  });

  it('replaces an invitation on resend', async () => {
    store.load(ALL);
    await flush();
    invitationService.resend.mockReturnValue(of(invitation('i1', 'pending')));
    store.resendInvitation({ organizationId: 'org-1', invitationId: 'i1' });
    await flush();

    expect(store.invitations().map((i) => i.id)).toEqual(['i1']);
    expect(store.invitationLinks()['i1']).toBe('https://app/accept?token=i1');
  });

  it('records a load error', async () => {
    memberService.list.mockReturnValue(throwError(() => new Error('nope')));
    store.load(ALL);
    await flush();

    expect(store.loadError()).not.toBeNull();
    expect(store.isLoading()).toBe(false);
  });

  it('flags only the invite mutation as quota-bearing so other 409s are not read as quota', async () => {
    invitationService.invite.mockReturnValue(of(invitation('new')));
    store.invite({ organizationId: 'org-1', input: { email: 'new@example.com', roleIds: [] } });
    await flush();
    expect(store.lastMutationCanExceedQuota()).toBe(true);

    store.removeMember({ organizationId: 'org-1', memberId: 'm1' });
    await flush();
    expect(store.lastMutationCanExceedQuota()).toBe(false);
  });

  it('does nothing when removing an empty batch of members', async () => {
    store.load(ALL);
    await flush();

    store.removeMembers({ organizationId: 'org-1', memberIds: [] });
    await flush();

    expect(memberService.removeMany).not.toHaveBeenCalled();
    expect(store.isMutating()).toBe(false);
  });

  it('records a mutation error when removing a member fails', async () => {
    store.load(ALL);
    await flush();
    memberService.remove.mockReturnValue(throwError(() => new Error('nope')));

    store.removeMember({ organizationId: 'org-1', memberId: 'm1' });
    await flush();

    expect(store.mutationError()).not.toBeNull();
    expect(store.isMutating()).toBe(false);
  });

  it('records a mutation error when a bulk removal fails outright', async () => {
    store.load(ALL);
    await flush();
    memberService.removeMany.mockReturnValue(throwError(() => new Error('nope')));

    store.removeMembers({ organizationId: 'org-1', memberIds: ['m1'] });
    await flush();

    expect(store.mutationError()).not.toBeNull();
  });

  it('records a mutation error when an invite fails', async () => {
    invitationService.invite.mockReturnValue(throwError(() => new Error('quota exceeded')));

    store.invite({ organizationId: 'org-1', input: { email: 'new@example.com', roleIds: [] } });
    await flush();

    expect(store.mutationError()).not.toBeNull();
  });

  it('records a mutation error when revoking an invitation fails', async () => {
    store.load(ALL);
    await flush();
    invitationService.revoke.mockReturnValue(throwError(() => new Error('nope')));

    store.revokeInvitation({ organizationId: 'org-1', invitationId: 'i1' });
    await flush();

    expect(store.mutationError()).not.toBeNull();
    expect(store.invitations()).toHaveLength(1);
  });

  it('records a mutation error when resending an invitation fails', async () => {
    store.load(ALL);
    await flush();
    invitationService.resend.mockReturnValue(throwError(() => new Error('nope')));

    store.resendInvitation({ organizationId: 'org-1', invitationId: 'i1' });
    await flush();

    expect(store.mutationError()).not.toBeNull();
  });

  it('assigns a role to a member', async () => {
    store.load(ALL);
    await flush();
    const updated = { ...member('m1'), roleIds: ['r1', 'r2'] };
    roleService.assignToMember.mockReturnValue(of(updated));

    store.assignRole({ organizationId: 'org-1', memberId: 'm1', input: { roleId: 'r2' } });
    await flush();

    expect(store.members().find((m) => m.id === 'm1')?.roleIds).toEqual(['r1', 'r2']);
  });

  it('records a mutation error when assigning a role fails', async () => {
    store.load(ALL);
    await flush();
    roleService.assignToMember.mockReturnValue(throwError(() => new Error('nope')));

    store.assignRole({ organizationId: 'org-1', memberId: 'm1', input: { roleId: 'r2' } });
    await flush();

    expect(store.mutationError()).not.toBeNull();
  });

  it('does nothing when assigning a role to an empty batch of members', async () => {
    store.assignRoleToMembers({ organizationId: 'org-1', memberIds: [], roleId: 'r2' });
    await flush();

    expect(roleService.assignToMember).not.toHaveBeenCalled();
    expect(store.isMutating()).toBe(false);
  });

  it('assigns a role to several members and reports partial failures', async () => {
    memberService.list.mockReturnValue(of(collection([member('m1'), member('m2')])));
    store.load(ALL);
    await flush();

    roleService.assignToMember.mockImplementation((_org: string, memberId: string) =>
      memberId === 'm1'
        ? of({ ...member('m1'), roleIds: ['r1', 'r2'] })
        : throwError(() => new Error('nope')),
    );

    store.assignRoleToMembers({ organizationId: 'org-1', memberIds: ['m1', 'm2'], roleId: 'r2' });
    await flush();

    expect(store.members().find((m) => m.id === 'm1')?.roleIds).toEqual(['r1', 'r2']);
    const lastPayload = dispatch.mock.calls.at(-1)?.[0]?.payload;
    expect(lastPayload?.severity).toBe('error');
  });

  it('removes a role from a member', async () => {
    store.load(ALL);
    await flush();
    roleService.removeFromMember.mockReturnValue(of(undefined));

    store.removeRoleFromMember({ organizationId: 'org-1', memberId: 'm1', roleId: 'r1' });
    await flush();

    expect(store.members().find((m) => m.id === 'm1')?.roleIds).toEqual([]);
  });

  it('succeeds removing a role even when the member is no longer in the collection', async () => {
    roleService.removeFromMember.mockReturnValue(of(undefined));

    store.removeRoleFromMember({ organizationId: 'org-1', memberId: 'missing', roleId: 'r1' });
    await flush();

    expect(store.isMutating()).toBe(false);
    expect(store.mutationError()).toBeNull();
  });

  it('records a mutation error when removing a role fails', async () => {
    store.load(ALL);
    await flush();
    roleService.removeFromMember.mockReturnValue(throwError(() => new Error('nope')));

    store.removeRoleFromMember({ organizationId: 'org-1', memberId: 'm1', roleId: 'r1' });
    await flush();

    expect(store.mutationError()).not.toBeNull();
  });
});
