import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, type GuardResult, type MaybeAsync } from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { OrganizationPermissionService } from '@features/organization/access';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { OrganizationMemberAccessStore } from '@features/organization/state';
import { organizationPermissionGuard } from '../organization-permission.guard';

async function resolveGuardResult(result: MaybeAsync<GuardResult>): Promise<GuardResult> {
  if (result instanceof Promise) {
    return result;
  }

  if (isObservable(result)) {
    return firstValueFrom(result);
  }

  return result;
}

function createRouteWithOrganizationId(
  organizationId: string | null,
): Parameters<ReturnType<typeof organizationPermissionGuard>>[0] {
  return {
    paramMap: {
      get: (key: string): string | null => (key === 'organizationId' ? organizationId : null),
    },
    pathFromRoot: [{ url: [] }],
  } as unknown as Parameters<ReturnType<typeof organizationPermissionGuard>>[0];
}

describe('organizationPermissionGuard', () => {
  const redirectUrlTree = {} as UrlTree;

  let mockRouter: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };
  let mockFeedback: { warn: ReturnType<typeof vi.fn> };
  let mockOrganizationPermissionService: {
    canAccessOrganization: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRouter = {
      createUrlTree: vi.fn().mockReturnValue(redirectUrlTree),
    };
    mockFeedback = { warn: vi.fn() };

    mockOrganizationPermissionService = {
      canAccessOrganization: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: OrganizationMemberAccessStore,
          useValue: { ensureAccessResolved: () => of(true) },
        },
        { provide: Router, useValue: mockRouter },
        { provide: OrganizationPermissionService, useValue: mockOrganizationPermissionService },
        { provide: FeedbackService, useValue: mockFeedback },
      ],
    });
  });

  it('should allow access when all required permissions are granted', async () => {
    mockOrganizationPermissionService.canAccessOrganization.mockReturnValue(true);

    const guard = organizationPermissionGuard({
      permissions: [ORGANIZATION_PERMISSION.FACILITIES_WRITE],
    });
    const result = await TestBed.runInInjectionContext(() =>
      resolveGuardResult(guard(createRouteWithOrganizationId('org-1'), {} as never)),
    );

    expect(result).toBe(true);
    expect(mockOrganizationPermissionService.canAccessOrganization).toHaveBeenCalledWith(
      'org-1',
      [ORGANIZATION_PERMISSION.FACILITIES_WRITE],
      'all',
    );
  });

  it('should name the missing permission instead of redirecting in silence', async () => {
    mockOrganizationPermissionService.canAccessOrganization.mockReturnValue(false);

    const guard = organizationPermissionGuard({
      permissions: [ORGANIZATION_PERMISSION.FACILITIES_WRITE],
    });
    await TestBed.runInInjectionContext(() =>
      resolveGuardResult(guard(createRouteWithOrganizationId('org-1'), {} as never)),
    );

    expect(mockFeedback.warn).toHaveBeenCalledTimes(1);
    expect(mockFeedback.warn.mock.calls[0][0]).toContain(ORGANIZATION_PERMISSION.FACILITIES_WRITE);
  });

  it('should stay silent when access is granted', async () => {
    mockOrganizationPermissionService.canAccessOrganization.mockReturnValue(true);

    const guard = organizationPermissionGuard({
      permissions: [ORGANIZATION_PERMISSION.FACILITIES_WRITE],
    });
    await TestBed.runInInjectionContext(() =>
      resolveGuardResult(guard(createRouteWithOrganizationId('org-1'), {} as never)),
    );

    expect(mockFeedback.warn).not.toHaveBeenCalled();
  });

  it('should redirect when one required permission is missing', async () => {
    mockOrganizationPermissionService.canAccessOrganization.mockReturnValue(false);

    const guard = organizationPermissionGuard({
      permissions: [ORGANIZATION_PERMISSION.FACILITIES_WRITE],
    });
    const result = await TestBed.runInInjectionContext(() =>
      resolveGuardResult(guard(createRouteWithOrganizationId('org-1'), {} as never)),
    );

    expect(result).toBe(redirectUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/organizations', 'org-1']);
  });

  it('should support the any match strategy', async () => {
    mockOrganizationPermissionService.canAccessOrganization.mockReturnValue(true);

    const guard = organizationPermissionGuard({
      permissions: [
        ORGANIZATION_PERMISSION.EQUIPMENT_READ,
        ORGANIZATION_PERMISSION.FACILITIES_WRITE,
      ],
      match: 'any',
    });
    const result = await TestBed.runInInjectionContext(() =>
      resolveGuardResult(guard(createRouteWithOrganizationId('org-1'), {} as never)),
    );

    expect(result).toBe(true);
    expect(mockOrganizationPermissionService.canAccessOrganization).toHaveBeenCalledWith(
      'org-1',
      [ORGANIZATION_PERMISSION.EQUIPMENT_READ, ORGANIZATION_PERMISSION.FACILITIES_WRITE],
      'any',
    );
  });

  it('should redirect when the service denies access', async () => {
    mockOrganizationPermissionService.canAccessOrganization.mockReturnValue(false);

    const guard = organizationPermissionGuard({
      permissions: [ORGANIZATION_PERMISSION.FACILITIES_WRITE],
    });
    const result = await TestBed.runInInjectionContext(() =>
      resolveGuardResult(guard(createRouteWithOrganizationId('org-1'), {} as never)),
    );

    expect(result).toBe(redirectUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/organizations', 'org-1']);
  });

  it('should delegate empty permission lists to the service', async () => {
    mockOrganizationPermissionService.canAccessOrganization.mockReturnValue(true);

    const guard = organizationPermissionGuard({ permissions: [] });
    const result = await TestBed.runInInjectionContext(() =>
      resolveGuardResult(guard(createRouteWithOrganizationId('org-1'), {} as never)),
    );

    expect(result).toBe(true);
    expect(mockOrganizationPermissionService.canAccessOrganization).toHaveBeenCalledWith(
      'org-1',
      [],
      'all',
    );
  });

  it('should redirect to / when no organization id can be resolved', async () => {
    const guard = organizationPermissionGuard({
      permissions: [ORGANIZATION_PERMISSION.FACILITIES_WRITE],
    });
    const result = await TestBed.runInInjectionContext(() =>
      resolveGuardResult(guard(createRouteWithOrganizationId(null), {} as never)),
    );

    expect(result).toBe(redirectUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
  });
});
