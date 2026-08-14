import {
  computed,
  provideZonelessChangeDetection,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  errorCallState,
  idleCallState,
  successCallState,
  toStoreError,
  type CallState,
  type StoreError,
} from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  ORGANIZATION_PERMISSION,
  type InviteOrganizationMemberInput,
  type OrganizationInvitationOutput,
  type OrganizationMemberOutput,
} from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { OrganizationQuotaStore } from '@features/organization/state';
import { OrganizationMembersStore } from '@features/organization/state/organization-members';
import { OrganizationMembersPage } from '../organization-members-page.component';

function member(overrides: Partial<OrganizationMemberOutput> = {}): OrganizationMemberOutput {
  return {
    id: 'member-1',
    organizationId: 'org-1',
    userId: 'user-1',
    email: 'amelie@example.com',
    displayName: 'Amélie Rousseau',
    isActive: true,
    joinedAt: '2026-01-01T00:00:00+00:00',
    roleIds: [],
    ...overrides,
  } as unknown as OrganizationMemberOutput;
}

function invitation(
  overrides: Partial<OrganizationInvitationOutput> = {},
): OrganizationInvitationOutput {
  return {
    id: 'invitation-1',
    organizationId: 'org-1',
    email: 'new@example.com',
    status: 'pending',
    invitedByUserId: 'user-1',
    acceptedByUserId: null,
    revokedByUserId: null,
    expiresAt: '2026-02-01T00:00:00+00:00',
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    roleIds: [],
    ...overrides,
  } as unknown as OrganizationInvitationOutput;
}

describe('OrganizationMembersPage', () => {
  let fixture: ComponentFixture<OrganizationMembersPage>;
  let members: WritableSignal<readonly OrganizationMemberOutput[]>;
  let activeInvitations: WritableSignal<readonly OrganizationInvitationOutput[]>;
  let membersTotal: WritableSignal<number>;
  let membersActiveTotal: WritableSignal<number>;
  let loadCallState: WritableSignal<CallState>;
  let mutationCallState: WritableSignal<CallState>;
  let mutationError: Signal<StoreError | null>;
  let permissions: WritableSignal<ReadonlyArray<string>>;
  let load: ReturnType<typeof vi.fn>;
  let loadMembers: ReturnType<typeof vi.fn>;
  let invite: ReturnType<typeof vi.fn>;
  let assignRole: ReturnType<typeof vi.fn>;
  let removeRoleFromMember: ReturnType<typeof vi.fn>;
  let removeMember: ReturnType<typeof vi.fn>;
  let removeMembers: ReturnType<typeof vi.fn>;
  let resendInvitation: ReturnType<typeof vi.fn>;
  let revokeInvitation: ReturnType<typeof vi.fn>;

  const byTestId = (id: string): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`);

  async function createPage(): Promise<void> {
    const memberEntityMap: Signal<Readonly<Record<string, OrganizationMemberOutput>>> = computed(
      () => Object.fromEntries(members().map((row) => [row.id, row])),
    );

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: {
            selectedOrganizationId: signal<string | null>('org-1'),
            selectedOrganization: signal({ name: 'Acme Corp' }),
            isLoadingOrganization: signal(false),
          },
        },
        {
          provide: OrganizationPermissionService,
          useValue: {
            permissions,
            hasPermission: (name: string): boolean => permissions().includes(name),
          },
        },
        {
          provide: OrganizationQuotaStore,
          useValue: { items: signal([]), isLoadingQuota: signal(false) },
        },
      ],
    });

    TestBed.overrideComponent(OrganizationMembersPage, {
      remove: { providers: [OrganizationMembersStore] },
      add: {
        providers: [
          {
            provide: OrganizationMembersStore,
            useValue: {
              members,
              memberEntityMap,
              invitations: computed(() => []),
              activeInvitations,
              roles: signal([]),
              invitationLinks: signal({}),
              membersTotal,
              membersActiveTotal,
              membersSearch: signal(''),
              isLoading: signal(false),
              isMutating: signal(false),
              loadError: signal<StoreError | null>(null),
              mutationError,
              loadCallState,
              mutationCallState,
              load,
              loadMembers,
              invite,
              assignRole,
              removeRoleFromMember,
              removeMember,
              removeMembers,
              resendInvitation,
              revokeInvitation,
            },
          },
        ],
      },
    });

    fixture = TestBed.createComponent(OrganizationMembersPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    await fixture.whenStable();
  }

  beforeEach(() => {
    members = signal<readonly OrganizationMemberOutput[]>([member()]);
    activeInvitations = signal<readonly OrganizationInvitationOutput[]>([invitation()]);
    membersTotal = signal<number>(1);
    membersActiveTotal = signal<number>(1);
    loadCallState = signal<CallState>(idleCallState());
    mutationCallState = signal<CallState>(idleCallState());
    mutationError = computed(() => mutationCallState().error);
    permissions = signal<ReadonlyArray<string>>([
      ORGANIZATION_PERMISSION.MEMBERS_READ,
      ORGANIZATION_PERMISSION.MEMBERS_MANAGE,
      ORGANIZATION_PERMISSION.ROLES_READ,
      ORGANIZATION_PERMISSION.ROLES_MANAGE,
    ]);
    load = vi.fn();
    loadMembers = vi.fn();
    invite = vi.fn();
    assignRole = vi.fn();
    removeRoleFromMember = vi.fn();
    removeMember = vi.fn();
    removeMembers = vi.fn();
    resendInvitation = vi.fn();
    revokeInvitation = vi.fn();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should load exactly the resources the routed member’s permissions allow', async () => {
    await createPage();

    expect(load).toHaveBeenCalledWith({
      organizationId: 'org-1',
      includeMembers: true,
      includeInvitations: true,
      includeRoles: true,
    });
  });

  it('should not ask for invitations or roles a member without members.manage cannot see', async () => {
    permissions.set([ORGANIZATION_PERMISSION.MEMBERS_READ]);
    await createPage();

    expect(load).toHaveBeenCalledWith({
      organizationId: 'org-1',
      includeMembers: true,
      includeInvitations: false,
      includeRoles: false,
    });
  });

  it('should show Invite only to a member holding members.manage', async () => {
    await createPage();
    expect(byTestId('organization-members-invite')).not.toBeNull();

    permissions.set([ORGANIZATION_PERMISSION.MEMBERS_READ]);
    await fixture.whenStable();

    expect(byTestId('organization-members-invite')).toBeNull();
  });

  it('should send the invite payload scoped to the routed organization and close the dialog on success', async () => {
    await createPage();
    const payload: InviteOrganizationMemberInput = { email: 'new@example.com', roleIds: [] };

    fixture.componentInstance['openInviteDialog']();
    fixture.componentInstance['sendInvite'](payload);

    expect(invite).toHaveBeenCalledWith({ organizationId: 'org-1', input: payload });
    expect(fixture.componentInstance['inviteDialogVisible']()).toBe(true);

    mutationCallState.set(successCallState(null));
    await fixture.whenStable();

    expect(fixture.componentInstance['inviteDialogVisible']()).toBe(false);
  });

  it('should scope the invite dialog error to an invite actually attempted this session', async () => {
    await createPage();
    mutationCallState.set(errorCallState(toStoreError(new Error('quota exceeded'))));
    await fixture.whenStable();

    // No invite was submitted in this dialog session yet — a stale error must not show.
    expect(fixture.componentInstance['inviteServerError']()).toBeNull();

    fixture.componentInstance['sendInvite']({ email: 'new@example.com', roleIds: [] });
    await fixture.whenStable();

    expect(fixture.componentInstance['inviteServerError']()).not.toBeNull();
  });

  it('should assign a role on an assigning toggle and remove it on a clearing toggle', async () => {
    await createPage();
    fixture.componentInstance['openRolesDialog'](member());

    fixture.componentInstance['onRoleToggled']({ roleId: 'role-1', assign: true });
    expect(assignRole).toHaveBeenCalledWith({
      organizationId: 'org-1',
      memberId: 'member-1',
      input: { roleId: 'role-1' },
    });

    fixture.componentInstance['onRoleToggled']({ roleId: 'role-1', assign: false });
    expect(removeRoleFromMember).toHaveBeenCalledWith({
      organizationId: 'org-1',
      memberId: 'member-1',
      roleId: 'role-1',
    });
  });

  it('should remove a single member on confirm and clear the pending target', async () => {
    await createPage();
    fixture.componentInstance['requestRemove'](member());
    await fixture.whenStable();
    expect(fixture.componentInstance['removeDialogState']()).toBe('open');

    fixture.componentInstance['confirmRemove']();

    expect(removeMember).toHaveBeenCalledWith({ organizationId: 'org-1', memberId: 'member-1' });
    expect(fixture.componentInstance['removeDialogState']()).toBe('closed');
  });

  it('should bulk-remove the current selection and clear it', async () => {
    await createPage();
    fixture.componentInstance['onSelectionChanged'](new Set<string>(['member-1', 'member-2']));
    fixture.componentInstance['requestBulkRemove']();
    await fixture.whenStable();

    fixture.componentInstance['confirmRemove']();

    expect(removeMembers).toHaveBeenCalledWith({
      organizationId: 'org-1',
      memberIds: ['member-1', 'member-2'],
    });
    expect(fixture.componentInstance['selectedIds']().size).toBe(0);
  });

  it('should no-op a bulk-remove request when nothing is selected', async () => {
    await createPage();
    fixture.componentInstance['requestBulkRemove']();
    await fixture.whenStable();

    expect(fixture.componentInstance['removeDialogState']()).toBe('closed');
  });

  it('should resend and revoke through the store, scoped to the routed organization', async () => {
    await createPage();

    fixture.componentInstance['resendInvitation'](invitation());
    expect(resendInvitation).toHaveBeenCalledWith({
      organizationId: 'org-1',
      invitationId: 'invitation-1',
    });

    fixture.componentInstance['revokeInvitation'](invitation());
    expect(revokeInvitation).toHaveBeenCalledWith({
      organizationId: 'org-1',
      invitationId: 'invitation-1',
    });
  });

  it('should show a page-level action error for a non-invite mutation failure, hidden while the invite dialog is open', async () => {
    await createPage();
    fixture.componentInstance['confirmRemove'](); // no pending target, but still a plausible action path
    mutationCallState.set(errorCallState(toStoreError(new Error('boom'))));
    await fixture.whenStable();

    expect(byTestId('organization-members-action-error')).not.toBeNull();

    fixture.componentInstance['openInviteDialog']();
    await fixture.whenStable();

    expect(byTestId('organization-members-action-error')).toBeNull();
  });

  it('should dismiss the action-error banner until the next error lands', async () => {
    await createPage();
    mutationCallState.set(errorCallState(toStoreError(new Error('boom'))));
    await fixture.whenStable();
    expect(byTestId('organization-members-action-error')).not.toBeNull();

    fixture.componentInstance['dismissActionError']();
    await fixture.whenStable();
    expect(byTestId('organization-members-action-error')).toBeNull();

    mutationCallState.set(idleCallState());
    mutationCallState.set(errorCallState(toStoreError(new Error('boom again'))));
    await fixture.whenStable();
    expect(byTestId('organization-members-action-error')).not.toBeNull();
  });

  it('should page members with the rendered pagination controls, disabling at the bounds', async () => {
    membersTotal.set(65); // The default page size is 30, so this spans three pages.
    await createPage();

    const previous = byTestId('organization-members-page-prev') as HTMLButtonElement;
    const next = byTestId('organization-members-page-next') as HTMLButtonElement;

    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(false);

    next.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();

    expect(loadMembers).toHaveBeenLastCalledWith({
      organizationId: 'org-1',
      page: 2,
      search: '',
      status: 'all',
      pageSize: 30,
    });
    expect(previous.disabled).toBe(false);

    next.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();

    expect(loadMembers).toHaveBeenLastCalledWith({
      organizationId: 'org-1',
      page: 3,
      search: '',
      status: 'all',
      pageSize: 30,
    });
    expect(next.disabled).toBe(true);

    previous.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();

    expect(loadMembers).toHaveBeenLastCalledWith({
      organizationId: 'org-1',
      page: 2,
      search: '',
      status: 'all',
      pageSize: 30,
    });
  });

  it('changes the page size through the pagination band and returns to the first page', async () => {
    membersTotal.set(65);
    await createPage();

    fixture.componentInstance['setPageSize'](60);
    await fixture.whenStable();

    expect(loadMembers).toHaveBeenLastCalledWith({
      organizationId: 'org-1',
      page: 1,
      search: '',
      status: 'all',
      pageSize: 60,
    });
  });

  it('re-queries the roster on a debounced search keystroke, resetting to page one', async () => {
    await createPage();

    fixture.componentInstance['onSearchInput']({
      target: { value: 'amelie' },
    } as unknown as Event);
    await new Promise<void>((resolve) => setTimeout(resolve, 350));
    await fixture.whenStable();

    expect(loadMembers).toHaveBeenLastCalledWith({
      organizationId: 'org-1',
      page: 1,
      search: 'amelie',
      status: 'all',
      pageSize: 30,
    });
  });

  it('re-queries the roster immediately on a status filter change, without debouncing', async () => {
    await createPage();

    fixture.componentInstance['onStatusFilterChanged']('inactive');

    expect(loadMembers).toHaveBeenLastCalledWith({
      organizationId: 'org-1',
      page: 1,
      search: '',
      status: 'inactive',
      pageSize: 30,
    });
  });

  it('clears the search term and the status filter together', async () => {
    await createPage();
    fixture.componentInstance['onStatusFilterChanged']('active');
    loadMembers.mockClear();

    fixture.componentInstance['clearRosterFilters']();

    expect(fixture.componentInstance['searchTerm']()).toBe('');
    expect(fixture.componentInstance['statusFilter']()).toBe('all');
    expect(loadMembers).toHaveBeenCalledWith({
      organizationId: 'org-1',
      page: 1,
      search: '',
      status: 'all',
      pageSize: 30,
    });
  });

  it('reports the KPI row from the store and the quota item for the seats-used tile', async () => {
    membersTotal.set(12);
    membersActiveTotal.set(9);
    await createPage();

    const tiles = fixture.componentInstance['kpiTiles']();

    expect(tiles.find((tile) => tile.id === 'total')?.value).toBe(12);
    expect(tiles.find((tile) => tile.id === 'active')?.value).toBe(9);
    expect(tiles.find((tile) => tile.id === 'pending-invitations')?.value).toBe(1);
    expect(tiles.find((tile) => tile.id === 'seats-used')?.value).toBe('—');
  });
});
