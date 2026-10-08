import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { MaintenanceCostAccessService } from '../maintenance-cost-access.service';

describe('MaintenanceCostAccessService', () => {
  const authenticated = signal(true);
  const revision = signal(3);
  const grants = signal<readonly string[]>([]);

  const setup = (platform = 'browser'): MaintenanceCostAccessService => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platform },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { isAuthenticated: authenticated, sessionRevision: revision },
        },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (permission: string) => grants().includes(permission) },
        },
      ],
    });
    return TestBed.inject(MaintenanceCostAccessService);
  };

  beforeEach(() => {
    authenticated.set(true);
    revision.set(3);
    grants.set([ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ]);
  });

  it.each(['server', 'anonymous', 'no-read'])('denies private work for %s', (mode) => {
    if (mode === 'anonymous') authenticated.set(false);
    if (mode === 'no-read') grants.set([ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE]);
    expect(setup(mode === 'server' ? 'server' : 'browser').isReadable()).toBe(false);
  });

  it('projects live authentication, dedicated grants and captured session generations independently', () => {
    const access = setup();
    expect(access.isReadable()).toBe(true);
    expect(access.isSessionCurrent(3)).toBe(true);
    expect(access.canManage()).toBe(false);
    expect(access.canReadMembers()).toBe(false);
    grants.set([
      ...grants(),
      ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE,
      ORGANIZATION_PERMISSION.MEMBERS_READ,
    ]);
    expect(access.canManage()).toBe(true);
    expect(access.canReadMembers()).toBe(true);
    revision.set(4);
    expect(access.isSessionCurrent(3)).toBe(false);
    expect(access.isSessionCurrent(4)).toBe(true);
    authenticated.set(false);
    expect(access.isReadable()).toBe(false);
  });
});
