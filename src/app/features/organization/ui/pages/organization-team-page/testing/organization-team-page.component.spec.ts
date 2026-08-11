import {
  computed,
  provideZonelessChangeDetection,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
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
  type CreateOrganizationRoleInput,
  type OrganizationPermissionOutput,
  type OrganizationRoleOutput,
} from '@features/organization/models';
import { OrganizationTeamStore } from '@features/organization/state/organization-team';
import { OrganizationTeamPage } from '../organization-team-page.component';

function role(overrides: Partial<OrganizationRoleOutput> = {}): OrganizationRoleOutput {
  return {
    id: 'role-1',
    organizationId: 'org-1',
    name: 'Inspector',
    description: null,
    isSystem: false,
    permissions: ['organization.inspection.read'],
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    ...overrides,
  } as unknown as OrganizationRoleOutput;
}

function permission(name: string): OrganizationPermissionOutput {
  return { id: name, name, description: null } as unknown as OrganizationPermissionOutput;
}

describe('OrganizationTeamPage', () => {
  let fixture: ComponentFixture<OrganizationTeamPage>;
  let roles: WritableSignal<readonly OrganizationRoleOutput[]>;
  let catalog: WritableSignal<readonly OrganizationPermissionOutput[]>;
  let loadCallState: WritableSignal<CallState>;
  let mutationCallState: WritableSignal<CallState>;
  let mutationError: Signal<StoreError | null>;
  let permissions: WritableSignal<ReadonlyArray<string>>;
  let load: ReturnType<typeof vi.fn>;
  let createRole: ReturnType<typeof vi.fn>;
  let updateRole: ReturnType<typeof vi.fn>;
  let removeRole: ReturnType<typeof vi.fn>;

  const byTestId = (id: string): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`);

  async function createPage(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: OrganizationPermissionService,
          useValue: {
            permissions,
            hasPermission: (name: string): boolean => permissions().includes(name),
          },
        },
      ],
    });

    TestBed.overrideComponent(OrganizationTeamPage, {
      remove: { providers: [OrganizationTeamStore] },
      add: {
        providers: [
          {
            provide: OrganizationTeamStore,
            useValue: {
              roles,
              permissions: catalog,
              isLoading: signal(false),
              isMutating: signal(false),
              loadError: signal<StoreError | null>(null),
              mutationError,
              loadCallState,
              mutationCallState,
              load,
              createRole,
              updateRole,
              removeRole,
            },
          },
        ],
      },
    });

    fixture = TestBed.createComponent(OrganizationTeamPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    await fixture.whenStable();
  }

  beforeEach(() => {
    roles = signal<readonly OrganizationRoleOutput[]>([role()]);
    catalog = signal<readonly OrganizationPermissionOutput[]>([
      permission('organization.inspection.read'),
    ]);
    loadCallState = signal<CallState>(idleCallState());
    mutationCallState = signal<CallState>(idleCallState());
    mutationError = computed(() => mutationCallState().error);
    permissions = signal<ReadonlyArray<string>>([ORGANIZATION_PERMISSION.ROLES_MANAGE]);
    load = vi.fn();
    createRole = vi.fn();
    updateRole = vi.fn();
    removeRole = vi.fn();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should load the routed organization’s roles and permission catalog on init', async () => {
    await createPage();

    expect(load).toHaveBeenCalledWith({
      organizationId: 'org-1',
      includeMembers: false,
      includeRoles: true,
      includeInvitations: false,
      includePermissions: true,
    });
  });

  it('should show the create-role action only to a member holding roles.manage', async () => {
    await createPage();
    expect(byTestId('organization-team-create-role')).not.toBeNull();

    permissions.set([]);
    await fixture.whenStable();

    expect(byTestId('organization-team-create-role')).toBeNull();
  });

  it('should offer a retry that re-runs the same load after a failure', async () => {
    loadCallState.set(errorCallState(toStoreError(new Error('offline'))));
    await createPage();

    expect(byTestId('organization-team-retry')).not.toBeNull();
    load.mockClear();

    byTestId('organization-team-retry')?.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();

    expect(load).toHaveBeenCalledWith({
      organizationId: 'org-1',
      includeMembers: false,
      includeRoles: true,
      includeInvitations: false,
      includePermissions: true,
    });
  });

  it('should send the create form’s payload scoped to the routed organization', async () => {
    await createPage();
    const payload: CreateOrganizationRoleInput = { name: 'Auditor', permissions: [] };

    fixture.componentInstance['createRole'](payload);

    expect(createRole).toHaveBeenCalledWith({ organizationId: 'org-1', input: payload });
  });

  it('should close the create dialog once its own mutation resolves, but leave a differently-attributed success alone', async () => {
    await createPage();
    fixture.componentInstance['openCreateDialog']();
    await fixture.whenStable();
    expect(fixture.componentInstance['createDialogVisible']()).toBe(true);

    // A permission-editor success settling must not close a dialog it does not own.
    fixture.componentInstance['openPermissionsEditor'](role());
    mutationCallState.set(successCallState(null));
    await fixture.whenStable();
    expect(fixture.componentInstance['createDialogVisible']()).toBe(true);

    fixture.componentInstance['openCreateDialog']();
    mutationCallState.set(idleCallState());
    fixture.componentInstance['createRole']({ name: 'Auditor', permissions: [] });
    mutationCallState.set(successCallState(null));
    await fixture.whenStable();

    expect(fixture.componentInstance['createDialogVisible']()).toBe(false);
  });

  it('should leave the permission editor open after a successful toggle, rather than closing it', async () => {
    await createPage();
    fixture.componentInstance['openPermissionsEditor'](role());
    fixture.componentInstance['updatePermissions']([
      'organization.inspection.read',
      'organization.inspection.plan',
    ]);
    mutationCallState.set(successCallState(null));
    await fixture.whenStable();

    expect(updateRole).toHaveBeenCalledWith({
      organizationId: 'org-1',
      roleId: 'role-1',
      input: { permissions: ['organization.inspection.read', 'organization.inspection.plan'] },
    });
    // An operator toggling several permissions in a row should not lose the panel.
    expect(fixture.componentInstance['editingRoleId']()).toBe('role-1');
  });

  it('should send the delete confirmation for the requested role and close it on success', async () => {
    await createPage();
    fixture.componentInstance['requestDelete'](role());
    await fixture.whenStable();
    expect(fixture.componentInstance['deleteDialogState']()).toBe('open');

    fixture.componentInstance['confirmDelete']();
    mutationCallState.set(successCallState(null));
    await fixture.whenStable();

    expect(removeRole).toHaveBeenCalledWith({ organizationId: 'org-1', roleId: 'role-1' });
    expect(fixture.componentInstance['deleteDialogState']()).toBe('closed');
  });

  it('should scope a mutation error to whichever surface currently owns it', async () => {
    await createPage();
    fixture.componentInstance['createRole']({ name: 'Auditor', permissions: [] });
    mutationCallState.set(errorCallState(toStoreError(new Error('rejected'))));
    await fixture.whenStable();

    expect(fixture.componentInstance['createDialogError']()).not.toBeNull();
    expect(fixture.componentInstance['deleteDialogError']()).toBeNull();
    expect(fixture.componentInstance['permissionsSheetError']()).toBeNull();
  });
});
