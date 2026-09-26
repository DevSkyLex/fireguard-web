import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  provideZonelessChangeDetection,
  signal,
  type InputSignal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { PageActionsService } from '@core/page-actions';
import { PageTabsService } from '@core/page-tabs';
import {
  errorCallState,
  idleCallState,
  successCallState,
  toStoreError,
  type CallState,
  type StoreError,
} from '@core/request-state';
import { THEME_PORT, type ThemePort } from '@core/theme';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  ORGANIZATION_PERMISSION,
  type InviteOrganizationMemberInput,
  type OrganizationInvitationOutput,
  type OrganizationMemberOutput,
  type OrganizationRoleOutput,
} from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT, REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { OrganizationMemberListPreferencesService } from '@features/organization/services';
import { OrganizationQuotaStore } from '@features/organization/state';
import { OrganizationAccessAdminStore } from '@features/organization/state/organization-access-admin';
import { OrganizationMembersStore } from '@features/organization/state/organization-members';
import { DEFAULT_REGIONAL_FORMAT_SETTINGS } from '@shared/regional-format';
import { OrganizationTeamPage } from '../../organization-team-page/organization-team-page.component';
import { OrganizationTeamsPage } from '../../organization-teams-page/organization-teams-page.component';
import { OrganizationMembersPage } from '../organization-members-page.component';

/**
 * Stands in for the shell's `DashboardPageActions` — see `InterventionsPage`'s
 * spec for the approach every migrated page's spec reuses.
 */
@Component({
  selector: 'app-page-actions-host',
  imports: [NgTemplateOutlet],
  template: '<ng-container *ngTemplateOutlet="template()" />',
})
class PageActionsHost {
  public readonly template: InputSignal<TemplateRef<unknown> | null> =
    input<TemplateRef<unknown> | null>(null);
}

@Component({
  selector: 'app-organization-team-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
class OrganizationTeamPageStub {
  public readonly organizationId: InputSignal<string> = input.required<string>();
  public readonly active: InputSignal<boolean> = input.required<boolean>();
}

@Component({
  selector: 'app-organization-teams-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
class OrganizationTeamsPageStub {
  public readonly organizationId: InputSignal<string> = input.required<string>();
  public readonly active: InputSignal<boolean> = input.required<boolean>();
}

const renderPageActions = (): HTMLElement => {
  const hostFixture: ComponentFixture<PageActionsHost> = TestBed.createComponent(PageActionsHost);
  hostFixture.componentRef.setInput('template', TestBed.inject(PageActionsService).actions());
  hostFixture.detectChanges();

  return hostFixture.nativeElement as HTMLElement;
};

const renderPageTabs = (): HTMLElement => {
  const hostFixture: ComponentFixture<PageActionsHost> = TestBed.createComponent(PageActionsHost);
  hostFixture.componentRef.setInput('template', TestBed.inject(PageTabsService).tabs());
  hostFixture.detectChanges();

  return hostFixture.nativeElement as HTMLElement;
};

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

/**
 * Minimal ResizeObserver stand-in: the role filter's select popover observes
 * its anchor, and the test environment provides no implementation.
 */
class ResizeObserverStub {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
}

describe('OrganizationMembersPage', () => {
  const mobileInteractionMode = signal(false);
  beforeEach(() => mobileInteractionMode.set(false));
  beforeAll(() => {
    HTMLElement.prototype.scrollIntoView ??= (): void => {};
    globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
  });

  let fixture: ComponentFixture<OrganizationMembersPage>;
  let members: WritableSignal<readonly OrganizationMemberOutput[]>;
  let activeInvitations: WritableSignal<readonly OrganizationInvitationOutput[]>;
  let membersTotal: WritableSignal<number>;
  let membersActiveTotal: WritableSignal<number>;
  let invitationsTotal: WritableSignal<number>;
  let loadCallState: WritableSignal<CallState>;
  let mutationCallState: WritableSignal<CallState>;
  let mutationError: Signal<StoreError | null>;
  let isMutating: Signal<boolean>;
  let permissions: WritableSignal<ReadonlyArray<string>>;
  let roles: WritableSignal<readonly OrganizationRoleOutput[]>;
  let load: ReturnType<typeof vi.fn>;
  let loadMembers: ReturnType<typeof vi.fn>;
  let loadInvitations: ReturnType<typeof vi.fn>;
  let invite: ReturnType<typeof vi.fn>;
  let assignRole: ReturnType<typeof vi.fn>;
  let removeRoleFromMember: ReturnType<typeof vi.fn>;
  let removeMember: ReturnType<typeof vi.fn>;
  let removeMembers: ReturnType<typeof vi.fn>;
  let reactivateMember: ReturnType<typeof vi.fn>;
  let resendInvitation: ReturnType<typeof vi.fn>;
  let revokeInvitation: ReturnType<typeof vi.fn>;
  let writeSort: ReturnType<typeof vi.fn>;

  const byTestId = (id: string): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`);

  let roleIdParam: string | undefined;
  let tabParam: string | undefined;
  let navigate: ReturnType<typeof vi.fn>;

  async function createPage(): Promise<void> {
    const memberEntityMap: Signal<Readonly<Record<string, OrganizationMemberOutput>>> = computed(
      () => Object.fromEntries(members().map((row) => [row.id, row])),
    );

    TestBed.configureTestingModule({
      providers: [
        {
          provide: THEME_PORT,
          useValue: {
            theme: signal('light'),
            resolvedTheme: signal('light'),
            setTheme: vi.fn(),
          } satisfies ThemePort,
        },
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: {
            isMobileInteractionMode: mobileInteractionMode,
            interactionMode: () => (mobileInteractionMode() ? 'mobile' : 'desktop'),
          },
        },
        provideZonelessChangeDetection(),
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal(DEFAULT_REGIONAL_FORMAT_SETTINGS) },
        },
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
        {
          provide: OrganizationMemberListPreferencesService,
          useValue: { readSort: () => ({ field: 'joinedAt', direction: 'asc' }), write: writeSort },
        },
      ],
    });

    TestBed.overrideComponent(OrganizationMembersPage, {
      remove: {
        providers: [OrganizationMembersStore, OrganizationAccessAdminStore],
        imports: [OrganizationTeamPage, OrganizationTeamsPage],
      },
      add: {
        imports: [OrganizationTeamPageStub, OrganizationTeamsPageStub],
        providers: [
          {
            provide: OrganizationAccessAdminStore,
            useValue: {
              loadPolicy: vi.fn(),
              loadRequests: vi.fn(),
              savePolicy: vi.fn(),
              addDomain: vi.fn(),
              verifyDomain: vi.fn(),
              removeDomain: vi.fn(),
              approve: vi.fn(),
              reject: vi.fn(),
              policy: signal(null),
              policyCallState: signal(idleCallState()),
              requestsCallState: signal(idleCallState()),
              pending: signal(false),
              reviewing: signal(false),
              error: signal(null),
              requestError: signal(null),
              requestEntities: signal([]),
              assignableRoles: signal([]),
            },
          },
          {
            provide: OrganizationMembersStore,
            useValue: {
              members,
              memberEntityMap,
              invitations: computed(() => []),
              activeInvitations,
              roles,
              invitationLinks: signal({}),
              membersTotal,
              membersActiveTotal,
              invitationsTotal,
              membersSearch: signal(''),
              isLoading: signal(false),
              isMutating,
              loadError: signal<StoreError | null>(null),
              mutationError,
              loadCallState,
              mutationCallState,
              load,
              loadMembers,
              loadInvitations,
              invite,
              assignRole,
              removeRoleFromMember,
              removeMember,
              removeMembers,
              reactivateMember,
              resendInvitation,
              revokeInvitation,
            },
          },
        ],
      },
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true) as never;

    fixture = TestBed.createComponent(OrganizationMembersPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    if (roleIdParam !== undefined) fixture.componentRef.setInput('roleId', roleIdParam);
    if (tabParam !== undefined) fixture.componentRef.setInput('tab', tabParam);
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement).appendChild(renderPageTabs());
  }

  beforeEach(() => {
    roleIdParam = undefined;
    tabParam = undefined;
    members = signal<readonly OrganizationMemberOutput[]>([member()]);
    activeInvitations = signal<readonly OrganizationInvitationOutput[]>([invitation()]);
    membersTotal = signal<number>(1);
    membersActiveTotal = signal<number>(1);
    invitationsTotal = signal<number>(1);
    loadCallState = signal<CallState>(idleCallState());
    mutationCallState = signal<CallState>(idleCallState());
    mutationError = computed(() => mutationCallState().error);
    isMutating = computed(() => mutationCallState().status === 'pending');
    permissions = signal<ReadonlyArray<string>>([
      ORGANIZATION_PERMISSION.MEMBERS_READ,
      ORGANIZATION_PERMISSION.MEMBERS_MANAGE,
      ORGANIZATION_PERMISSION.ROLES_READ,
      ORGANIZATION_PERMISSION.ROLES_MANAGE,
    ]);
    roles = signal<readonly OrganizationRoleOutput[]>([]);
    load = vi.fn();
    loadMembers = vi.fn();
    loadInvitations = vi.fn();
    invite = vi.fn();
    assignRole = vi.fn();
    removeRoleFromMember = vi.fn();
    removeMember = vi.fn();
    removeMembers = vi.fn();
    reactivateMember = vi.fn();
    resendInvitation = vi.fn();
    revokeInvitation = vi.fn();
    writeSort = vi.fn();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('uses the same role filter and paging handler from the mobile drawer', async () => {
    mobileInteractionMode.set(true);
    roles.set([{ id: 'role-7', name: 'Safety manager' } as OrganizationRoleOutput]);
    await createPage();
    expect(byTestId('organization-members-role-filter')).toBeNull();
    const trigger = byTestId('organization-members-role-filter-mobile');
    if (!trigger) throw new Error('Expected the mobile role filter trigger');
    trigger.click();
    await fixture.whenStable();
    const drawer = document.querySelector('[data-testid="organization-members-role-drawer"]');
    if (!drawer) throw new Error('Expected the open role filter drawer');
    expect(drawer.querySelector('input')).not.toBeNull();
    const choice = drawer.querySelector<HTMLButtonElement>(
      '[data-testid="organization-members-role-mobile-role-7"]',
    );
    if (!choice) throw new Error('Expected the Safety manager role choice');
    expect(choice.getAttribute('data-value')).toBe('Safety manager');
    choice.click();
    await fixture.whenStable();
    expect(fixture.componentInstance['roleFilter']()).toBe('role-7');
    expect(fixture.componentInstance['roleFilterDrawerVisible']()).toBe(false);
    expect(loadMembers).toHaveBeenCalledTimes(1);
    expect(byTestId('organization-members-role-filter-mobile')?.textContent).toContain(
      'Safety manager',
    );
    expect(navigate).toHaveBeenCalled();
  });

  it('shows the role search empty state only for an unmatched query without changing the filter', async () => {
    mobileInteractionMode.set(true);
    roles.set([{ id: 'role-7', name: 'Safety manager' } as OrganizationRoleOutput]);
    await createPage();
    const trigger = byTestId('organization-members-role-filter-mobile');
    if (!trigger) throw new Error('Expected the mobile role filter trigger');
    trigger.click();
    await fixture.whenStable();
    const drawer = document.querySelector('[data-testid="organization-members-role-drawer"]');
    const search = drawer?.querySelector<HTMLInputElement>('#organization-members-role-search');
    if (!search) throw new Error('Expected the mobile role search input');
    expect(drawer?.querySelector('[hlmCommandEmpty]')).toBeNull();
    search.value = 'No matching role';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(drawer?.querySelector('[hlmCommandEmpty]')?.textContent).toContain('No matching roles.');
    search.value = 'Safety';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(drawer?.querySelector('[hlmCommandEmpty]')).toBeNull();
    expect(fixture.componentInstance['roleFilter']()).toBeNull();
    expect(loadMembers).not.toHaveBeenCalled();
  });

  it('keeps an open role drawer mounted during an interaction mode change', async () => {
    mobileInteractionMode.set(true);
    roles.set([{ id: 'role-7', name: 'Safety manager' } as OrganizationRoleOutput]);
    await createPage();
    const trigger = byTestId('organization-members-role-filter-mobile');
    if (!trigger) throw new Error('Expected the mobile role filter trigger');
    trigger.click();
    await fixture.whenStable();
    const drawer = document.querySelector('[data-testid="organization-members-role-drawer"]');
    expect(drawer).not.toBeNull();
    mobileInteractionMode.set(false);
    await fixture.whenStable();
    expect(document.querySelector('[data-testid="organization-members-role-drawer"]')).toBe(drawer);
    expect(byTestId('organization-members-role-filter')).toBeNull();
    fixture.componentInstance['roleFilterDrawerVisible'].set(false);
    await fixture.whenStable();
    expect(byTestId('organization-members-role-filter')).not.toBeNull();
    expect(loadMembers).not.toHaveBeenCalled();
  });

  it('should narrow the first roster page from ?roleId=, without a second round trip', async () => {
    roleIdParam = 'role-7';
    await createPage();

    expect(load).toHaveBeenCalledWith({
      organizationId: 'org-1',
      includeMembers: true,
      includeInvitations: true,
      includeRoles: true,
      sort: { field: 'joinedAt', direction: 'asc' },
      roleId: 'role-7',
    });
    expect(loadMembers).not.toHaveBeenCalled();
  });

  it('should render a role name instead of its id in the role filter trigger', async () => {
    roleIdParam = '7c99e153-c6f0-470b-9711-1719cbc421d2';
    roles.set([
      {
        id: roleIdParam,
        name: 'Safety manager',
      } as OrganizationRoleOutput,
    ]);
    await createPage();

    const trigger: HTMLElement | null = byTestId('organization-members-role-filter');
    expect(trigger?.textContent).toContain('Safety manager');
    expect(trigger?.textContent).not.toContain(roleIdParam);
  });

  it('should load exactly the resources the routed member’s permissions allow', async () => {
    await createPage();

    expect(load).toHaveBeenCalledWith({
      organizationId: 'org-1',
      includeMembers: true,
      includeInvitations: true,
      includeRoles: true,
      sort: { field: 'joinedAt', direction: 'asc' },
      roleId: null,
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
      sort: { field: 'joinedAt', direction: 'asc' },
      roleId: null,
    });
  });

  it('shows a permission message without a futile retry for a forbidden roster', async () => {
    loadCallState.set(errorCallState({ ...toStoreError(new Error('Forbidden')), code: 403 }));
    await createPage();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Not available with your permissions',
    );
    expect(byTestId('organization-members-retry')).toBeNull();
  });

  it('retries a transient load failure with the current organization and permissions', async () => {
    loadCallState.set(errorCallState(toStoreError(new Error('Service unavailable'))));
    await createPage();
    load.mockClear();

    byTestId('organization-members-retry')?.click();

    expect(load).toHaveBeenCalledExactlyOnceWith({
      organizationId: 'org-1',
      includeMembers: true,
      includeInvitations: true,
      includeRoles: true,
      sort: { field: 'joinedAt', direction: 'asc' },
    });
  });

  it('should show Invite only to a member holding members.manage', async () => {
    await createPage();
    expect(
      renderPageActions().querySelector('[data-testid="organization-members-invite"]'),
    ).not.toBeNull();

    permissions.set([ORGANIZATION_PERMISSION.MEMBERS_READ]);
    await fixture.whenStable();

    expect(
      renderPageActions().querySelector('[data-testid="organization-members-invite"]'),
    ).toBeNull();
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

  it('clears a failed invite when the dialog is dismissed and reopened', async () => {
    await createPage();
    fixture.componentInstance['openInviteDialog']();
    fixture.componentInstance['sendInvite']({ email: 'new@example.com', roleIds: [] });
    mutationCallState.set(errorCallState(toStoreError(new Error('quota exceeded'))));
    await fixture.whenStable();
    expect(fixture.componentInstance['inviteServerError']()).not.toBeNull();

    fixture.componentInstance['onInviteDialogVisibleChange'](false);
    expect(fixture.componentInstance['inviteDialogVisible']()).toBe(false);
    expect(fixture.componentInstance['inviteServerError']()).toBeNull();

    fixture.componentInstance['openInviteDialog']();
    expect(fixture.componentInstance['inviteServerError']()).toBeNull();
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

  it('ignores stale role toggles after its member dialog closes', async () => {
    await createPage();
    fixture.componentInstance['openRolesDialog'](member());
    expect(fixture.componentInstance['rolesDialogMember']()?.id).toBe('member-1');

    fixture.componentInstance['onRolesDialogVisibleChange'](false);
    fixture.componentInstance['onRoleToggled']({ roleId: 'role-1', assign: true });

    expect(fixture.componentInstance['rolesDialogMember']()).toBeNull();
    expect(assignRole).not.toHaveBeenCalled();
    expect(removeRoleFromMember).not.toHaveBeenCalled();
  });

  it('should remove a single member on confirm and keep the dialog open until the write settles', async () => {
    await createPage();
    fixture.componentInstance['requestRemove'](member());
    await fixture.whenStable();
    expect(fixture.componentInstance['removeDialogState']()).toBe('open');

    fixture.componentInstance['confirmRemove']();

    expect(removeMember).toHaveBeenCalledWith({ organizationId: 'org-1', memberId: 'member-1' });
    expect(fixture.componentInstance['removeDialogState']()).toBe('open');
  });

  it('should close the remove confirmation once the store reports success', async () => {
    await createPage();
    fixture.componentInstance['requestRemove'](member());
    fixture.componentInstance['confirmRemove']();

    mutationCallState.set(successCallState(null));
    await fixture.whenStable();

    expect(fixture.componentInstance['removeDialogState']()).toBe('closed');
  });

  it('should keep the remove confirmation open and surface the store error inline on failure', async () => {
    await createPage();
    fixture.componentInstance['requestRemove'](member());
    fixture.componentInstance['confirmRemove']();

    mutationCallState.set(errorCallState(toStoreError(new Error('cannot remove the last owner'))));
    await fixture.whenStable();

    expect(fixture.componentInstance['removeDialogState']()).toBe('open');
    expect(fixture.componentInstance['removeDialogError']()).not.toBeNull();
    expect(byTestId('organization-members-action-error')).toBeNull();
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

  it('keeps a selected roster for a cancelled bulk removal', async () => {
    await createPage();
  it('opens the existing confirmation from the floating selection bar and hides it when cleared', async () => {
    await createPage();
    fixture.componentInstance['onSelectionChanged'](new Set(['member-1']));
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('[data-testid="organization-members-selection-bar"]'),
    ).not.toBeNull();
    fixture.componentInstance['onSelectionActionRequested']('remove');
    expect(fixture.componentInstance['removeDialogState']()).toBe('open');

    fixture.componentInstance['onRemoveDialogVisibleChange'](false);
    fixture.componentInstance['onSelectionChanged'](new Set());
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('[data-testid="organization-members-selection-bar"]'),
    ).toBeNull();
  });

    fixture.componentInstance['onSelectionChanged'](new Set(['member-1']));
    fixture.componentInstance['requestBulkRemove']();
    expect(fixture.componentInstance['removeDialogState']()).toBe('open');

    fixture.componentInstance['onRemoveDialogVisibleChange'](true);
    expect(fixture.componentInstance['removeDialogState']()).toBe('open');
    fixture.componentInstance['onRemoveDialogVisibleChange'](false);
    fixture.componentInstance['confirmRemove']();

    expect(fixture.componentInstance['removeDialogState']()).toBe('closed');
    expect(fixture.componentInstance['selectedIds']()).toEqual(new Set(['member-1']));
    expect(removeMembers).not.toHaveBeenCalled();
  });

  it('clears a mobile card selection when selection mode ends', async () => {
    mobileInteractionMode.set(true);
    await createPage();
    fixture.componentInstance['toggleSelectionMode']();
    fixture.componentInstance['onSelectionChanged'](new Set(['member-1']));
    expect(fixture.componentInstance['selectionMode']()).toBe(true);

    fixture.componentInstance['toggleSelectionMode']();

    expect(fixture.componentInstance['selectionMode']()).toBe(false);
    expect(fixture.componentInstance['selectedIds']().size).toBe(0);
  });

  it('should reactivate a member through the store, scoped to the routed organization', async () => {
    await createPage();

    fixture.componentInstance['reactivateMember'](member({ id: 'member-2', isActive: false }));

    expect(reactivateMember).toHaveBeenCalledWith({
      organizationId: 'org-1',
      memberId: 'member-2',
    });
  });

  it('should offer Reactivate from the row menu of an inactive member, wired to the store', async () => {
    members.set([member({ id: 'member-1', isActive: false })]);
    await createPage();

    byTestId('organization-member-table-row-menu')?.dispatchEvent(
      new Event('click', { bubbles: true }),
    );
    await fixture.whenStable();

    const reactivateButton: HTMLButtonElement | null = document.body.querySelector(
      '[data-testid="organization-member-table-row-reactivate"]',
    );
    expect(reactivateButton).not.toBeNull();

    reactivateButton?.click();
    await fixture.whenStable();

    expect(reactivateMember).toHaveBeenCalledWith({
      organizationId: 'org-1',
      memberId: 'member-1',
    });
  });

  it('should not offer Reactivate from the row menu of an active member', async () => {
    await createPage();

    byTestId('organization-member-table-row-menu')?.dispatchEvent(
      new Event('click', { bubbles: true }),
    );
    await fixture.whenStable();

    expect(
      document.body.querySelector('[data-testid="organization-member-table-row-reactivate"]'),
    ).toBeNull();
  });

  it('should resend through the store, scoped to the routed organization', async () => {
    await createPage();

    fixture.componentInstance['resendInvitation'](invitation());
    expect(resendInvitation).toHaveBeenCalledWith({
      organizationId: 'org-1',
      invitationId: 'invitation-1',
    });
  });

  it('should open the revoke confirmation and send the revoke through the store on confirm', async () => {
    await createPage();

    fixture.componentInstance['requestRevoke'](invitation());
    await fixture.whenStable();

    expect(fixture.componentInstance['pendingRevoke']()).toEqual(invitation());
    expect(revokeInvitation).not.toHaveBeenCalled();

    fixture.componentInstance['confirmRevoke']();
    expect(revokeInvitation).toHaveBeenCalledWith({
      organizationId: 'org-1',
      invitationId: 'invitation-1',
    });
  });

  it('should close the revoke confirmation once the store reports success', async () => {
    await createPage();
    fixture.componentInstance['requestRevoke'](invitation());
    fixture.componentInstance['confirmRevoke']();

    mutationCallState.set(successCallState(null));
    await fixture.whenStable();

    expect(fixture.componentInstance['pendingRevoke']()).toBeNull();
  });

  it('should clear the pending revoke target on dismissal', async () => {
    await createPage();
    fixture.componentInstance['requestRevoke'](invitation());
    await fixture.whenStable();

    fixture.componentInstance['onRevokeDialogVisibleChange'](false);
    await fixture.whenStable();

    expect(fixture.componentInstance['pendingRevoke']()).toBeNull();
  });

  it('keeps a failed invitation revoke open until dismissal and ignores an unscoped confirm', async () => {
    await createPage();
    fixture.componentInstance['confirmRevoke']();
    expect(revokeInvitation).not.toHaveBeenCalled();

    fixture.componentInstance['requestRevoke'](invitation());
    fixture.componentInstance['confirmRevoke']();
    mutationCallState.set(errorCallState(toStoreError(new Error('Cannot revoke'))));
    await fixture.whenStable();

    expect(fixture.componentInstance['pendingRevoke']()?.id).toBe('invitation-1');
    expect(fixture.componentInstance['revokeDialogError']()).not.toBeNull();
    fixture.componentInstance['onRevokeDialogVisibleChange'](true);
    expect(fixture.componentInstance['pendingRevoke']()?.id).toBe('invitation-1');
    fixture.componentInstance['onRevokeDialogVisibleChange'](false);
    expect(fixture.componentInstance['pendingRevoke']()).toBeNull();
    expect(fixture.componentInstance['revokeDialogError']()).toBeNull();
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
      roleId: null,
      pageSize: 30,
      sort: { field: 'joinedAt', direction: 'asc' },
    });
    expect(previous.disabled).toBe(false);

    next.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();

    expect(loadMembers).toHaveBeenLastCalledWith({
      organizationId: 'org-1',
      page: 3,
      search: '',
      status: 'all',
      roleId: null,
      pageSize: 30,
      sort: { field: 'joinedAt', direction: 'asc' },
    });
    expect(next.disabled).toBe(true);

    previous.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();

    expect(loadMembers).toHaveBeenLastCalledWith({
      organizationId: 'org-1',
      page: 2,
      search: '',
      status: 'all',
      roleId: null,
      pageSize: 30,
      sort: { field: 'joinedAt', direction: 'asc' },
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
      roleId: null,
      pageSize: 60,
      sort: { field: 'joinedAt', direction: 'asc' },
    });
  });

  it('sorts the roster from its column header and reverses the current sort on a second click', async () => {
    await createPage();
    fixture.componentInstance['onSelectionChanged'](new Set(['member-1']));

    byTestId('organization-member-table-sort-member')?.click();
    await fixture.whenStable();
    expect(loadMembers).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        sort: { field: 'displayName', direction: 'asc' },
      }),
    );
    expect(fixture.componentInstance['selectedIds']().size).toBe(0);
    expect(writeSort).toHaveBeenLastCalledWith({ field: 'displayName', direction: 'asc' });

    byTestId('organization-member-table-sort-member')?.click();
    await fixture.whenStable();
    expect(loadMembers).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: { field: 'displayName', direction: 'desc' } }),
    );
    expect(writeSort).toHaveBeenLastCalledWith({ field: 'displayName', direction: 'desc' });
    expect(
      byTestId('organization-member-table-sort-member')?.closest('th')?.getAttribute('aria-sort'),
    ).toBe('descending');
  });

  it('pages invitations independently of the member roster', async () => {
    invitationsTotal.set(65);
    await createPage();

    byTestId('organization-invitations-page-next')?.click();
    await fixture.whenStable();

    expect(loadInvitations).toHaveBeenCalledExactlyOnceWith({
      organizationId: 'org-1',
      page: 2,
      pageSize: 30,
    });
    expect(fixture.componentInstance['invitationsPage']()).toBe(2);
    expect(loadMembers).not.toHaveBeenCalled();
  });

  it('resets local filters and selections when the routed organization changes', async () => {
    invitationsTotal.set(65);
    await createPage();
    fixture.componentInstance['onStatusFilterChanged']('inactive');
    fixture.componentInstance['onRoleFilterChanged']('role-7');
    fixture.componentInstance['setPageSize'](60);
    fixture.componentInstance['goToInvitationsPage'](2);
    fixture.componentInstance['onSelectionChanged'](new Set(['member-1']));
    fixture.componentInstance['onSearchQueryChanged']('amelie');
    load.mockClear();

    fixture.componentRef.setInput('organizationId', 'org-2');
    await fixture.whenStable();

    expect(load).toHaveBeenCalledExactlyOnceWith({
      organizationId: 'org-2',
      includeMembers: true,
      includeInvitations: true,
      includeRoles: true,
      sort: { field: 'joinedAt', direction: 'asc' },
      roleId: null,
    });
    expect(fixture.componentInstance['page']()).toBe(1);
    expect(fixture.componentInstance['pageSize']()).toBe(30);
    expect(fixture.componentInstance['invitationsPage']()).toBe(1);
    expect(fixture.componentInstance['selectedIds']().size).toBe(0);
    expect(fixture.componentInstance['searchTerm']()).toBe('');
    expect(fixture.componentInstance['statusFilter']()).toBe('all');
    expect(fixture.componentInstance['roleFilter']()).toBeNull();
  });

  it('re-queries the roster on a debounced search keystroke, resetting to page one', async () => {
    await createPage();

    fixture.componentInstance['onSearchQueryChanged']('amelie');
    await new Promise<void>((resolve) => setTimeout(resolve, 350));
    await fixture.whenStable();

    expect(loadMembers).toHaveBeenLastCalledWith({
      organizationId: 'org-1',
      page: 1,
      search: 'amelie',
      status: 'all',
      roleId: null,
      pageSize: 30,
      sort: { field: 'joinedAt', direction: 'asc' },
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
      roleId: null,
      pageSize: 30,
      sort: { field: 'joinedAt', direction: 'asc' },
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
      roleId: null,
      pageSize: 30,
      sort: { field: 'joinedAt', direction: 'asc' },
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

  describe('tab gating', () => {
    it('should fall back to the first permitted tab for an unauthorized ?tab=', async () => {
      permissions.set([ORGANIZATION_PERMISSION.MEMBERS_READ]);
      tabParam = 'roles';
      await createPage();

      expect(fixture.componentInstance['activeTab']()).toBe('members');
    });

    it('should fall back to the first permitted tab for an unrecognized ?tab=', async () => {
      tabParam = 'not-a-real-tab';
      await createPage();

      expect(fixture.componentInstance['activeTab']()).toBe('members');
    });

    it('should not render a tab trigger for a tab the member holds no permission for', async () => {
      permissions.set([ORGANIZATION_PERMISSION.MEMBERS_READ]);
      await createPage();

      expect(byTestId('organization-members-tab-roles')).toBeNull();
      expect(byTestId('organization-members-tab-teams')).toBeNull();
    });

    it('should keep the roles tab for a member holding a roles permission', async () => {
      await createPage();

      expect(byTestId('organization-members-tab-roles')).not.toBeNull();
    });

    it('hides the members tab when the member can read roles only', async () => {
      permissions.set([ORGANIZATION_PERMISSION.ROLES_READ]);
      await createPage();

      expect(fixture.componentInstance['activeTab']()).toBe('roles');
      expect(byTestId('organization-members-tab-members')).toBeNull();
      expect(byTestId('organization-members-tab-roles')).not.toBeNull();
      navigate.mockClear();
      fixture.componentInstance['onTabActivated']('members');
      expect(fixture.componentInstance['activeTab']()).toBe('roles');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('falls back to Teams when it is the only readable people section', async () => {
      permissions.set([ORGANIZATION_PERMISSION.TEAMS_READ]);
      tabParam = 'members';
      await createPage();

      expect(fixture.componentInstance['activeTab']()).toBe('teams');
      expect(byTestId('organization-members-tab-members')).toBeNull();
      expect(byTestId('organization-members-tab-teams')).not.toBeNull();
      expect(load).toHaveBeenCalledWith(
        expect.objectContaining({
          includeMembers: false,
          includeInvitations: false,
          includeRoles: false,
        }),
      );
    });

    it('recomputes the visible section and allowed reads after permissions change', async () => {
      await createPage();
      load.mockClear();

      permissions.set([ORGANIZATION_PERMISSION.ROLES_READ]);
      await fixture.whenStable();

      expect(fixture.componentInstance['activeTab']()).toBe('roles');
      expect(byTestId('organization-members-tab-members')).toBeNull();
      expect(load).toHaveBeenCalledExactlyOnceWith({
        organizationId: 'org-1',
        includeMembers: false,
        includeInvitations: false,
        includeRoles: true,
        sort: { field: 'joinedAt', direction: 'asc' },
        roleId: null,
      });
    });

    it('should drop the ?tab= query parameter when switching back to the default members tab', async () => {
      await createPage();

      fixture.componentInstance['onTabActivated']('roles'); // never rendered, so the roles tab's own child tree is not this spec's concern
      fixture.componentInstance['onTabActivated']('members');

      expect(navigate).toHaveBeenCalledWith([], {
        relativeTo: TestBed.inject(ActivatedRoute),
        queryParams: { tab: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });

    it('should write the ?tab= query parameter when switching to a non-default tab', async () => {
      await createPage();

      fixture.componentInstance['onTabActivated']('roles');

      expect(navigate).toHaveBeenCalledWith([], {
        relativeTo: TestBed.inject(ActivatedRoute),
        queryParams: { tab: 'roles' },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  });
});
