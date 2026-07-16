import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { organizationLandingGuard } from '../organization-landing.guard';

describe('organizationLandingGuard', () => {
  const dashboardUrlTree = {} as UrlTree;
  const organizationsUrlTree = {} as UrlTree;
  const rootUrlTree = {} as UrlTree;

  let mockRouter: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };
  let mockPermissionService: {
    canAccessOrganization: ReturnType<typeof vi.fn>;
  };

  function createRoute(
    organizationId: string | null,
    parent: Parameters<typeof organizationLandingGuard>[0]['parent'] = null,
  ): Parameters<typeof organizationLandingGuard>[0] {
    return {
      paramMap: {
        get: (key: string): string | null => (key === 'organizationId' ? organizationId : null),
      },
      parent,
    } as Parameters<typeof organizationLandingGuard>[0];
  }

  beforeEach(() => {
    mockRouter = {
      createUrlTree: vi.fn((commands: ReadonlyArray<string>) => {
        if (commands.length > 1) return dashboardUrlTree;
        return commands[0] === '/' ? rootUrlTree : organizationsUrlTree;
      }),
    };
    mockPermissionService = {
      canAccessOrganization: vi.fn().mockReturnValue(false),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: OrganizationPermissionService, useValue: mockPermissionService },
      ],
    });
  });

  it('should open the dashboard when dashboard access is granted', () => {
    mockPermissionService.canAccessOrganization.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      organizationLandingGuard(createRoute('org-1'), {} as never),
    );

    expect(result).toBe(true);
    expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
  });

  it('should redirect to the first accessible organization section', () => {
    mockPermissionService.canAccessOrganization.mockImplementation(
      (_organizationId: string, permissions: ReadonlyArray<string>) =>
        permissions.length === 1 && permissions.includes(ORGANIZATION_PERMISSION.FACILITIES_READ),
    );

    const result = TestBed.runInInjectionContext(() =>
      organizationLandingGuard(createRoute('org-1'), {} as never),
    );

    expect(result).toBe(dashboardUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith([
      '/organizations',
      'org-1',
      'facilities',
    ]);
  });

  it('should resolve the organization id from a parent route', () => {
    mockPermissionService.canAccessOrganization.mockReturnValue(true);
    const parentRoute = createRoute('org-1');

    const result = TestBed.runInInjectionContext(() =>
      organizationLandingGuard(createRoute(null, parentRoute), {} as never),
    );

    expect(result).toBe(true);
    expect(mockPermissionService.canAccessOrganization).toHaveBeenCalledWith(
      'org-1',
      [ORGANIZATION_PERMISSION.DASHBOARD_READ],
      'all',
    );
  });

  it('should redirect to the application root when no organization id can be resolved', () => {
    const result = TestBed.runInInjectionContext(() =>
      organizationLandingGuard(createRoute(null), {} as never),
    );

    expect(result).toBe(rootUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
  });

  it('should hand back to the default-organization route with the org excluded when no section is accessible', () => {
    const result = TestBed.runInInjectionContext(() =>
      organizationLandingGuard(createRoute('org-1'), {} as never),
    );

    expect(result).toBe(organizationsUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/organizations'], {
      queryParams: { excluded: 'org-1' },
    });
  });
});
