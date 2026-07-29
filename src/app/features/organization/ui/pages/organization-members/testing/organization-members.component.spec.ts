import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Dispatcher } from '@ngrx/signals/events';
import { ConfirmationService } from 'primeng/api';
import { FeedbackService } from '@core/feedback';
import { successFeedback, type StoreError } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  OrganizationInvitationOutput,
  OrganizationMemberOutput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore, OrganizationQuotaStore } from '@features/organization/state';
import {
  organizationMembersStoreEvents,
  OrganizationMembersStore,
} from '@features/organization/state/organization-members';
import { OrganizationMembersPage } from '../organization-members.component';

type MembersPageTestApi = OrganizationMembersPage & {
  inviteDrawerVisible: WritableSignal<boolean>;
  assignDrawerVisible: WritableSignal<boolean>;
  quotaDialogVisible: WritableSignal<boolean>;
  activeTab: WritableSignal<number>;
  invite(input: { email: string; roleIds: string[] }): void;
  assignRole(values: { memberId: string; roleId: string }): void;
  onMembersPage(page: number): void;
  onMembersSearch(search: string): void;
  onTabChange(value: string | number | undefined): void;
  bulkAssignRole(assignment: { members: ReadonlyArray<{ id: string }>; roleId: string }): void;
  bulkRemoveMembers(members: readonly OrganizationMemberOutput[]): void;
  removeMember(member: OrganizationMemberOutput): void;
  removeRoleFromMember(removal: { member: OrganizationMemberOutput; roleId: string }): void;
  revokeInvitation(invitation: OrganizationInvitationOutput): void;
  resendInvitation(invitation: OrganizationInvitationOutput): void;
  copyLink(invitation: OrganizationInvitationOutput): void;
  reload(): void;
};

interface StoreMock {
  load: ReturnType<typeof vi.fn>;
  loadMembers: ReturnType<typeof vi.fn>;
  invite: ReturnType<typeof vi.fn>;
  assignRole: ReturnType<typeof vi.fn>;
  assignRoleToMembers: ReturnType<typeof vi.fn>;
  removeMember: ReturnType<typeof vi.fn>;
  removeMembers: ReturnType<typeof vi.fn>;
  revokeInvitation: ReturnType<typeof vi.fn>;
  resendInvitation: ReturnType<typeof vi.fn>;
  removeRoleFromMember: ReturnType<typeof vi.fn>;
  members: WritableSignal<readonly OrganizationMemberOutput[]>;
  roles: WritableSignal<readonly OrganizationRoleOutput[]>;
  activeInvitations: WritableSignal<readonly OrganizationInvitationOutput[]>;
  membersTotal: WritableSignal<number>;
  membersPage: WritableSignal<number>;
  membersSearch: WritableSignal<string>;
  isLoading: WritableSignal<boolean>;
  isMutating: WritableSignal<boolean>;
  loadError: WritableSignal<StoreError | null>;
  mutationError: WritableSignal<StoreError | null>;
  lastMutationCanExceedQuota: WritableSignal<boolean>;
  invitationLinks: WritableSignal<Record<string, string>>;
}

const MEMBER: OrganizationMemberOutput = {
  id: 'm1',
  userId: 'u1',
  displayName: 'Alice',
  email: 'alice@example.com',
  isActive: true,
  joinedAt: '2026-01-01',
  roleIds: [],
} as unknown as OrganizationMemberOutput;

const INVITATION: OrganizationInvitationOutput = {
  id: 'inv1',
  email: 'bob@example.com',
  status: 'pending',
  roleIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2099-01-01T00:00:00.000Z',
} as unknown as OrganizationInvitationOutput;

function createStoreMock(): StoreMock {
  return {
    load: vi.fn(),
    loadMembers: vi.fn(),
    invite: vi.fn(),
    assignRole: vi.fn(),
    assignRoleToMembers: vi.fn(),
    removeMember: vi.fn(),
    removeMembers: vi.fn(),
    revokeInvitation: vi.fn(),
    resendInvitation: vi.fn(),
    removeRoleFromMember: vi.fn(),
    members: signal([MEMBER]),
    roles: signal([]),
    activeInvitations: signal([INVITATION]),
    membersTotal: signal(1),
    membersPage: signal(1),
    membersSearch: signal(''),
    isLoading: signal(false),
    isMutating: signal(false),
    loadError: signal(null),
    mutationError: signal(null),
    lastMutationCanExceedQuota: signal(false),
    invitationLinks: signal({}),
  };
}

describe('OrganizationMembersPage', () => {
  beforeAll(() => {
    const windowWithResizeObserver = window as Window & {
      ResizeObserver?: typeof ResizeObserver;
    };

    if (typeof windowWithResizeObserver.ResizeObserver === 'undefined') {
      class ResizeObserverMock {
        public readonly observe = vi.fn();
        public readonly unobserve = vi.fn();
        public readonly disconnect = vi.fn();
      }

      windowWithResizeObserver.ResizeObserver =
        ResizeObserverMock as unknown as typeof ResizeObserver;
    }
  });

  let component: MembersPageTestApi;
  let fixture: ComponentFixture<OrganizationMembersPage>;
  let store: StoreMock;
  let confirmationService: { confirm: ReturnType<typeof vi.fn> };
  let quotaStore: { isAtLimit: ReturnType<typeof vi.fn>; reload: ReturnType<typeof vi.fn> };
  let permissionService: {
    hasPermission: ReturnType<typeof vi.fn>;
    hasAnyPermission: ReturnType<typeof vi.fn>;
  };

  function setup(): void {
    store = createStoreMock();
    confirmationService = { confirm: vi.fn() };
    quotaStore = { isAtLimit: vi.fn(() => false), reload: vi.fn() };
    permissionService = {
      hasPermission: vi.fn(() => true),
      hasAnyPermission: vi.fn(() => true),
    };

    TestBed.configureTestingModule({
      imports: [OrganizationMembersPage],
      providers: [
        provideRouter([]),
        { provide: ConfirmationService, useValue: confirmationService },
        { provide: FeedbackService, useValue: { show: vi.fn() } },
        {
          provide: ActiveOrganizationStore,
          useValue: {
            selectedOrganization: signal({ id: 'org-1' }),
            selectedOrganizationId: signal('org-1'),
          },
        },
        { provide: OrganizationQuotaStore, useValue: quotaStore },
        { provide: OrganizationPermissionService, useValue: permissionService },
      ],
    }).overrideComponent(OrganizationMembersPage, {
      set: { providers: [{ provide: OrganizationMembersStore, useValue: store }] },
    });

    fixture = TestBed.createComponent(OrganizationMembersPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();
    component = fixture.componentInstance as unknown as MembersPageTestApi;
  }

  beforeEach(() => setup());

  it('loads resources on init', () => {
    expect(store.load).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', includeMembers: true }),
    );
  });

  it('renders the members table and invitation count in the tabs', () => {
    expect(fixture.nativeElement.textContent).toContain('Alice');
    expect(fixture.nativeElement.textContent).toContain('Members');
  });

  it('sends an invitation and keeps the drawer open until the server confirms', () => {
    component.inviteDrawerVisible.set(true);
    component.invite({ email: 'new@example.com', roleIds: [] });

    expect(store.invite).toHaveBeenCalledWith({
      organizationId: 'org-1',
      input: { email: 'new@example.com', roleIds: [] },
    });
    // Closing on submit discarded the typed address whenever the invite was
    // refused — a duplicate, or an exhausted seat quota.
    expect(component.inviteDrawerVisible()).toBe(true);
  });

  it('closes the invite drawer once the invitation succeeds', () => {
    component.inviteDrawerVisible.set(true);
    component.invite({ email: 'new@example.com', roleIds: [] });

    TestBed.inject(Dispatcher).dispatch(
      organizationMembersStoreEvents.inviteSucceeded(successFeedback('Invitation sent')),
    );

    expect(component.inviteDrawerVisible()).toBe(false);
  });

  it('assigns a role and keeps the assign drawer open until the server confirms', () => {
    component.assignDrawerVisible.set(true);
    component.assignRole({ memberId: 'm1', roleId: 'r1' });

    expect(store.assignRole).toHaveBeenCalledWith({
      organizationId: 'org-1',
      memberId: 'm1',
      input: { roleId: 'r1' },
    });
    expect(component.assignDrawerVisible()).toBe(true);
  });

  it('closes the assign drawer once the role assignment succeeds', () => {
    component.assignDrawerVisible.set(true);
    component.assignRole({ memberId: 'm1', roleId: 'r1' });

    TestBed.inject(Dispatcher).dispatch(
      organizationMembersStoreEvents.assignRoleSucceeded(successFeedback('Role assigned')),
    );

    expect(component.assignDrawerVisible()).toBe(false);
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

  it('activates the requested tab', () => {
    component.onTabChange(1);
    expect(component.activeTab()).toBe(1);
    component.onTabChange(undefined);
    expect(component.activeTab()).toBe(0);
  });

  it('dispatches a bulk role assignment for the selected members', () => {
    component.bulkAssignRole({ members: [{ id: 'm1' }, { id: 'm2' }], roleId: 'r1' });
    expect(store.assignRoleToMembers).toHaveBeenCalledWith({
      organizationId: 'org-1',
      memberIds: ['m1', 'm2'],
      roleId: 'r1',
    });
  });

  it('does not dispatch a bulk role assignment for an empty selection', () => {
    component.bulkAssignRole({ members: [], roleId: 'r1' });
    expect(store.assignRoleToMembers).not.toHaveBeenCalled();
  });

  it('confirms and removes a single member', () => {
    confirmationService.confirm.mockImplementation((options: { accept?: () => void }): void =>
      options.accept?.(),
    );
    component.removeMember(MEMBER);
    expect(store.removeMember).toHaveBeenCalledWith({ organizationId: 'org-1', memberId: 'm1' });
  });

  it('confirms and removes several members in bulk', () => {
    confirmationService.confirm.mockImplementation((options: { accept?: () => void }): void =>
      options.accept?.(),
    );
    component.bulkRemoveMembers([MEMBER]);
    expect(store.removeMembers).toHaveBeenCalledWith({
      organizationId: 'org-1',
      memberIds: ['m1'],
    });
  });

  it('does not confirm a bulk removal for an empty selection', () => {
    component.bulkRemoveMembers([]);
    expect(confirmationService.confirm).not.toHaveBeenCalled();
  });

  it('confirms and removes a role from a member', () => {
    confirmationService.confirm.mockImplementation((options: { accept?: () => void }): void =>
      options.accept?.(),
    );
    component.removeRoleFromMember({ member: MEMBER, roleId: 'r1' });
    expect(store.removeRoleFromMember).toHaveBeenCalledWith({
      organizationId: 'org-1',
      memberId: 'm1',
      roleId: 'r1',
    });
  });

  it('confirms and revokes an invitation', () => {
    confirmationService.confirm.mockImplementation((options: { accept?: () => void }): void =>
      options.accept?.(),
    );
    component.revokeInvitation(INVITATION);
    expect(store.revokeInvitation).toHaveBeenCalledWith({
      organizationId: 'org-1',
      invitationId: 'inv1',
    });
  });

  it('resends an invitation and clears any pending copy target', () => {
    component.resendInvitation(INVITATION);
    expect(store.resendInvitation).toHaveBeenCalledWith({
      organizationId: 'org-1',
      invitationId: 'inv1',
    });
  });

  it('copies a cached invitation link without confirming', () => {
    store.invitationLinks.set({ inv1: 'https://example.com/accept/inv1' });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    component.copyLink(INVITATION);

    expect(writeText).toHaveBeenCalledWith('https://example.com/accept/inv1');
    expect(confirmationService.confirm).not.toHaveBeenCalled();
  });

  it('confirms before regenerating and resending when no cached link exists', () => {
    confirmationService.confirm.mockImplementation((options: { accept?: () => void }): void =>
      options.accept?.(),
    );
    component.copyLink(INVITATION);
    expect(store.resendInvitation).toHaveBeenCalledWith({
      organizationId: 'org-1',
      invitationId: 'inv1',
    });
  });

  it('reloads and reopens the quota dialog on a quota-exceeded invite failure', () => {
    store.lastMutationCanExceedQuota.set(true);
    store.mutationError.set({
      code: 409,
      message: 'Quota exceeded',
    } as unknown as StoreError);
    fixture.detectChanges();

    expect(quotaStore.reload).toHaveBeenCalled();
    expect(component.quotaDialogVisible()).toBe(true);
  });

  it('shows the retry button when a load error occurs and reloads on click', () => {
    store.loadError.set({ message: 'Network error' } as unknown as StoreError);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Network error');

    const retrySpy = vi.spyOn(component, 'reload' as never);
    const retryButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('button');
    retryButton?.click();
    fixture.detectChanges();
    expect(retrySpy).toHaveBeenCalled();
  });

  it('shows the plan limit warning when at the member quota limit', () => {
    quotaStore.isAtLimit.mockReturnValue(true);
    const localFixture = TestBed.createComponent(OrganizationMembersPage);
    localFixture.componentRef.setInput('organizationId', 'org-1');
    localFixture.detectChanges();
    expect(localFixture.nativeElement.textContent).toContain("reached your plan's member limit");
  });

  it('hides the tabs entirely when the member cannot view members', () => {
    permissionService.hasAnyPermission.mockReturnValue(false);
    const localFixture = TestBed.createComponent(OrganizationMembersPage);
    localFixture.componentRef.setInput('organizationId', 'org-1');
    localFixture.detectChanges();
    expect(localFixture.nativeElement.querySelector('p-tabs')).toBeNull();
  });
});
