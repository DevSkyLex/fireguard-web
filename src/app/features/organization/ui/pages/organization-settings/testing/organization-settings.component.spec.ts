import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, type ParamMap } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { of, type Observable } from 'rxjs';
import { ACCOUNT_PERMISSION, UserPermissionService } from '@features/account';
import { OrganizationPermissionService } from '@features/organization/access';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OrganizationSettingsStore } from '@features/organization/state/organization-settings';
import { OrganizationSettingsPage } from '../organization-settings.component';

type SettingsPageTestApi = OrganizationSettingsPage & {
  menuItems(): MenuItem[];
};

const menuIds = (component: SettingsPageTestApi): (string | undefined)[] =>
  component.menuItems().map((item) => item.id);

describe('OrganizationSettingsPage', () => {
  let orgPermissions: Set<string>;
  let accountPermissions: Set<string>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let route: { queryParamMap: Observable<ParamMap> };

  const createComponent = (): SettingsPageTestApi => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: router },
        {
          provide: ActiveOrganizationStore,
          useValue: { selectedOrganization: signal({ id: 'org-1' }) },
        },
        {
          provide: OrganizationPermissionService,
          useValue: {
            hasPermission: (permission: string): boolean => orgPermissions.has(permission),
            hasAnyPermission: (permissions: readonly string[]): boolean =>
              permissions.some((permission) => orgPermissions.has(permission)),
          },
        },
        {
          provide: UserPermissionService,
          useValue: {
            hasPermission: (permission: string): boolean => accountPermissions.has(permission),
          },
        },
      ],
    });
    TestBed.overrideComponent(OrganizationSettingsPage, {
      set: {
        providers: [
          {
            provide: OrganizationSettingsStore,
            useValue: {
              isSaving: signal(false),
              isUploadingLogo: signal(false),
              save: vi.fn(),
              uploadLogo: vi.fn(),
            },
          },
        ],
      },
    });

    return TestBed.createComponent(OrganizationSettingsPage)
      .componentInstance as unknown as SettingsPageTestApi;
  };

  beforeEach(() => {
    orgPermissions = new Set<string>();
    accountPermissions = new Set<string>();
    router = { navigate: vi.fn() };
    route = { queryParamMap: of(convertToParamMap({})) };
  });

  it('always lists the in-page sections and the legal route', () => {
    const component = createComponent();

    expect(menuIds(component)).toEqual(['general', 'legal', 'notifications', 'regional']);
  });

  it('lists every settings destination when all permissions are granted', () => {
    orgPermissions = new Set<string>([
      ORGANIZATION_PERMISSION.MEMBERS_READ,
      ORGANIZATION_PERMISSION.MEMBERS_MANAGE,
      ORGANIZATION_PERMISSION.ROLES_READ,
      ORGANIZATION_PERMISSION.ROLES_MANAGE,
      ORGANIZATION_PERMISSION.DELETE,
    ]);
    accountPermissions = new Set<string>([ACCOUNT_PERMISSION.AUDIT_READ]);
    const component = createComponent();

    expect(menuIds(component)).toEqual([
      'general',
      'legal',
      'notifications',
      'regional',
      'members',
      'invitations',
      'roles',
      'audit',
      'danger',
    ]);
  });

  it('shows members to read-only members but keeps invitations manage-gated', () => {
    orgPermissions = new Set<string>([ORGANIZATION_PERMISSION.MEMBERS_READ]);
    const component = createComponent();

    const ids = menuIds(component);
    expect(ids).toContain('members');
    expect(ids).not.toContain('invitations');
  });

  it('resolves the audit entry against the account permission surface', () => {
    accountPermissions = new Set<string>([ACCOUNT_PERMISSION.AUDIT_READ]);
    const component = createComponent();

    expect(menuIds(component)).toContain('audit');
  });

  it('navigates to the sibling route when a route entry is activated', () => {
    orgPermissions = new Set<string>([ORGANIZATION_PERMISSION.MEMBERS_MANAGE]);
    const component = createComponent();

    const invitations = component.menuItems().find((item) => item.id === 'invitations');
    invitations?.command?.({});

    expect(router.navigate).toHaveBeenCalledWith(['../invitations'], { relativeTo: route });
  });

  it('switches the tab query parameter when a section entry is activated', () => {
    const component = createComponent();

    const notifications = component.menuItems().find((item) => item.id === 'notifications');
    notifications?.command?.({});

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: route,
      queryParams: { tab: 'notifications' },
      queryParamsHandling: 'merge',
    });
  });
});
