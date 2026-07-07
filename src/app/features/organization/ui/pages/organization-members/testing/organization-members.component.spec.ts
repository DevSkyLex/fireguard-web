import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from 'primeng/api';
import { FeedbackService } from '@core/feedback';
import { OrganizationPermissionService } from '@features/organization/access';
import { ActiveOrganizationStore, OrganizationQuotaStore } from '@features/organization/state';
import { OrganizationMembersStore } from '@features/organization/state/organization-members';
import { OrganizationMembersPage } from '../organization-members.component';

type MembersPageTestApi = OrganizationMembersPage & {
  inviteDrawerVisible: WritableSignal<boolean>;
  invite(input: { email: string; roleIds: string[] }): void;
  onMembersPage(page: number): void;
  onMembersSearch(search: string): void;
  bulkAssignRole(assignment: { members: ReadonlyArray<{ id: string }>; roleId: string }): void;
};

describe('OrganizationMembersPage', () => {
  let component: MembersPageTestApi;
  let store: {
    load: ReturnType<typeof vi.fn>;
    loadMembers: ReturnType<typeof vi.fn>;
    invite: ReturnType<typeof vi.fn>;
    assignRoleToMembers: ReturnType<typeof vi.fn>;
    membersSearch: WritableSignal<string>;
    mutationError: WritableSignal<unknown>;
    invitationLinks: WritableSignal<Record<string, string>>;
  };

  beforeEach(() => {
    store = {
      load: vi.fn(),
      loadMembers: vi.fn(),
      invite: vi.fn(),
      assignRoleToMembers: vi.fn(),
      membersSearch: signal(''),
      mutationError: signal(null),
      invitationLinks: signal({}),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ConfirmationService, useValue: { confirm: vi.fn() } },
        { provide: FeedbackService, useValue: { show: vi.fn() } },
        {
          provide: ActiveOrganizationStore,
          useValue: { selectedOrganization: signal({ id: 'org-1' }) },
        },
        { provide: OrganizationQuotaStore, useValue: { isAtLimit: () => false, reload: vi.fn() } },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: () => true, hasAnyPermission: () => true },
        },
      ],
    });
    TestBed.overrideComponent(OrganizationMembersPage, {
      set: { providers: [{ provide: OrganizationMembersStore, useValue: store }] },
    });

    component = TestBed.createComponent(OrganizationMembersPage)
      .componentInstance as unknown as MembersPageTestApi;
  });

  it('loads resources on init', () => {
    expect(store.load).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', includeMembers: true }),
    );
  });

  it('sends an invitation and closes the drawer', () => {
    component.inviteDrawerVisible.set(true);
    component.invite({ email: 'new@example.com', roleIds: [] });

    expect(store.invite).toHaveBeenCalledWith({
      organizationId: 'org-1',
      input: { email: 'new@example.com', roleIds: [] },
    });
    expect(component.inviteDrawerVisible()).toBe(false);
  });

  it('loads the requested members page with the active search term', () => {
    component.onMembersPage(3);
    expect(store.loadMembers).toHaveBeenCalledWith({
      organizationId: 'org-1',
      page: 3,
      search: '',
    });
  });

  it('runs a member search from the first page', () => {
    component.onMembersSearch('alice');
    expect(store.loadMembers).toHaveBeenCalledWith({
      organizationId: 'org-1',
      page: 1,
      search: 'alice',
    });
  });

  it('dispatches a bulk role assignment for the selected members', () => {
    component.bulkAssignRole({ members: [{ id: 'm1' }, { id: 'm2' }], roleId: 'r1' });
    expect(store.assignRoleToMembers).toHaveBeenCalledWith({
      organizationId: 'org-1',
      memberIds: ['m1', 'm2'],
      roleId: 'r1',
    });
  });
});
