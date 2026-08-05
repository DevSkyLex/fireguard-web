import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, type GuardResult, type MaybeAsync } from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { CookieService } from '@core/cookie';
import { LAST_ORGANIZATION_COOKIE_NAME } from '@features/organization/constants';
import { OrganizationMemberAccessStore } from '@features/organization/state';
import { organizationAccessGuard } from '../organization-access.guard';

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
): Parameters<typeof organizationAccessGuard>[0] {
  return {
    paramMap: {
      get: (key: string): string | null => (key === 'organizationId' ? organizationId : null),
    },
  } as unknown as Parameters<typeof organizationAccessGuard>[0];
}

describe('organizationAccessGuard', () => {
  const redirectUrlTree = {} as UrlTree;

  let mockRouter: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };
  let mockOrganizationMemberAccessStore: {
    ensureAccessResolved: ReturnType<typeof vi.fn>;
  };
  let mockCookieService: {
    getCookie: ReturnType<typeof vi.fn>;
    deleteCookie: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRouter = {
      createUrlTree: vi.fn().mockReturnValue(redirectUrlTree),
    };

    mockOrganizationMemberAccessStore = {
      ensureAccessResolved: vi.fn().mockReturnValue(of(true)),
    };

    mockCookieService = {
      getCookie: vi.fn().mockReturnValue(null),
      deleteCookie: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: OrganizationMemberAccessStore, useValue: mockOrganizationMemberAccessStore },
        { provide: CookieService, useValue: mockCookieService },
      ],
    });
  });

  it('should allow activation when the shared store resolves access successfully', async () => {
    const result = await TestBed.runInInjectionContext(() =>
      resolveGuardResult(
        organizationAccessGuard(createRouteWithOrganizationId('org-1'), {} as never),
      ),
    );

    expect(result).toBe(true);
    expect(mockOrganizationMemberAccessStore.ensureAccessResolved).toHaveBeenCalledWith('org-1');
  });

  it('should redirect to the default-organization route with the failing id excluded when access is unresolved', async () => {
    mockOrganizationMemberAccessStore.ensureAccessResolved.mockReturnValue(of(false));

    const result = await TestBed.runInInjectionContext(() =>
      resolveGuardResult(
        organizationAccessGuard(createRouteWithOrganizationId('org-1'), {} as never),
      ),
    );

    expect(result).toBe(redirectUrlTree);
    expect(mockOrganizationMemberAccessStore.ensureAccessResolved).toHaveBeenCalledWith('org-1');
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/organizations'], {
      queryParams: { excluded: 'org-1' },
    });
  });

  it('should delete the last-organization cookie when it points at the failing organization', async () => {
    mockOrganizationMemberAccessStore.ensureAccessResolved.mockReturnValue(of(false));
    mockCookieService.getCookie.mockReturnValue('org-1');

    await TestBed.runInInjectionContext(() =>
      resolveGuardResult(
        organizationAccessGuard(createRouteWithOrganizationId('org-1'), {} as never),
      ),
    );

    expect(mockCookieService.getCookie).toHaveBeenCalledWith(LAST_ORGANIZATION_COOKIE_NAME);
    expect(mockCookieService.deleteCookie).toHaveBeenCalledWith(LAST_ORGANIZATION_COOKIE_NAME);
  });

  it('should keep the last-organization cookie when it points at a different organization', async () => {
    mockOrganizationMemberAccessStore.ensureAccessResolved.mockReturnValue(of(false));
    mockCookieService.getCookie.mockReturnValue('org-2');

    await TestBed.runInInjectionContext(() =>
      resolveGuardResult(
        organizationAccessGuard(createRouteWithOrganizationId('org-1'), {} as never),
      ),
    );

    expect(mockCookieService.deleteCookie).not.toHaveBeenCalled();
  });

  it('should redirect when no organization id can be resolved', async () => {
    const result = await TestBed.runInInjectionContext(() =>
      resolveGuardResult(organizationAccessGuard(createRouteWithOrganizationId(null), {} as never)),
    );

    expect(result).toBe(redirectUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
  });
});
