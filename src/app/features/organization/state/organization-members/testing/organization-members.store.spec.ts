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
import { OrganizationMembersStore } from '../organization-members.store';

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
    expect(store.isLoading()).toBe(false);
  });

  it('loads a members page with a server-side search term', async () => {
    memberService.list.mockReturnValue(of(collection([member('m2')])));
    store.loadMembers({ organizationId: 'org-1', page: 2, search: 'ali' });
    await flush();

    expect(store.members().map((m) => m.id)).toEqual(['m2']);
    expect(store.membersPage()).toBe(2);
    expect(store.membersSearch()).toBe('ali');
    expect(memberService.list).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ page: 2, params: { search: 'ali' } }),
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
});
