import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, type GuardResult, type MaybeAsync } from '@angular/router';
import { firstValueFrom, isObservable, of, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { CookieService } from '@core/cookie';
import { LAST_ORGANIZATION_COOKIE_NAME } from '@features/organization/constants';
import { OrganizationService } from '@features/organization/data-access';
import type { OrganizationOutput } from '@features/organization/models';
import { organizationGuard } from '../organization.guard';

function createCollection(
  organizations: ReadonlyArray<OrganizationOutput>,
): HydraCollection<OrganizationOutput> {
  return {
    '@id': '/api/organizations',
    '@type': 'Collection',
    member: organizations,
    totalItems: organizations.length,
  };
}

async function resolveGuardResult(result: MaybeAsync<GuardResult>): Promise<GuardResult> {
  if (result instanceof Promise) {
    return result;
  }

  if (isObservable(result)) {
    return firstValueFrom(result);
  }

  return result;
}

function createRouteWithExcluded(excluded: string | null): Parameters<typeof organizationGuard>[0] {
  return {
    queryParamMap: {
      get: (key: string): string | null => (key === 'excluded' ? excluded : null),
    },
  } as unknown as Parameters<typeof organizationGuard>[0];
}

describe('organizationGuard', () => {
  const redirectUrlTree = {} as UrlTree;

  const firstOrganization = { id: 'org-1', name: 'Acme', slug: 'acme' } as OrganizationOutput;
  const secondOrganization = {
    id: 'org-2',
    name: 'Beta Inc',
    slug: 'beta-inc',
  } as OrganizationOutput;

  let mockRouter: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };
  let mockOrganizationService: {
    get: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
  };
  let mockCookieService: {
    getCookie: ReturnType<typeof vi.fn>;
    deleteCookie: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRouter = {
      createUrlTree: vi.fn().mockReturnValue(redirectUrlTree),
    };

    mockOrganizationService = {
      get: vi.fn().mockReturnValue(of(firstOrganization)),
      list: vi.fn().mockReturnValue(of(createCollection([firstOrganization, secondOrganization]))),
    };

    mockCookieService = {
      getCookie: vi.fn().mockReturnValue(null),
      deleteCookie: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: OrganizationService, useValue: mockOrganizationService },
        { provide: CookieService, useValue: mockCookieService },
      ],
    });
  });

  it('should redirect to the first accessible organization when no cookie is saved', async () => {
    const result = await TestBed.runInInjectionContext(() =>
      resolveGuardResult(organizationGuard(createRouteWithExcluded(null), {} as never)),
    );

    expect(result).toBe(redirectUrlTree);
    expect(mockOrganizationService.get).not.toHaveBeenCalled();
    expect(mockOrganizationService.list).toHaveBeenCalledWith({ page: 1, itemsPerPage: 2 });
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/organizations', 'org-1']);
  });

  it('should redirect to onboarding when the user has no organization', async () => {
    mockOrganizationService.list.mockReturnValue(of(createCollection([])));

    const result = await TestBed.runInInjectionContext(() =>
      resolveGuardResult(organizationGuard(createRouteWithExcluded(null), {} as never)),
    );

    expect(result).toBe(redirectUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/onboarding']);
  });

  it('should redirect to the saved organization when the cookie resolves successfully', async () => {
    mockCookieService.getCookie.mockReturnValue('org-2');
    mockOrganizationService.get.mockReturnValue(of(secondOrganization));

    const result = await TestBed.runInInjectionContext(() =>
      resolveGuardResult(organizationGuard(createRouteWithExcluded(null), {} as never)),
    );

    expect(result).toBe(redirectUrlTree);
    expect(mockCookieService.getCookie).toHaveBeenCalledWith(LAST_ORGANIZATION_COOKIE_NAME);
    expect(mockOrganizationService.get).toHaveBeenCalledWith('org-2');
    expect(mockOrganizationService.list).not.toHaveBeenCalled();
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/organizations', 'org-2']);
  });

  it('should forget a stale cookie and fall back to the first accessible organization', async () => {
    mockCookieService.getCookie.mockReturnValue('org-gone');
    mockOrganizationService.get.mockReturnValue(throwError(() => new Error('Not Found')));

    const result = await TestBed.runInInjectionContext(() =>
      resolveGuardResult(organizationGuard(createRouteWithExcluded(null), {} as never)),
    );

    expect(result).toBe(redirectUrlTree);
    expect(mockOrganizationService.get).toHaveBeenCalledWith('org-gone');
    expect(mockCookieService.deleteCookie).toHaveBeenCalledWith(LAST_ORGANIZATION_COOKIE_NAME);
    expect(mockOrganizationService.list).toHaveBeenCalledWith({ page: 1, itemsPerPage: 2 });
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/organizations', 'org-1']);
  });

  it('should skip the excluded saved organization and pick the next accessible one', async () => {
    mockCookieService.getCookie.mockReturnValue('org-1');

    const result = await TestBed.runInInjectionContext(() =>
      resolveGuardResult(organizationGuard(createRouteWithExcluded('org-1'), {} as never)),
    );

    expect(result).toBe(redirectUrlTree);
    expect(mockOrganizationService.get).not.toHaveBeenCalled();
    expect(mockOrganizationService.list).toHaveBeenCalledWith({ page: 1, itemsPerPage: 2 });
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/organizations', 'org-2']);
  });

  it('should redirect to the forbidden page when every organization is excluded', async () => {
    mockOrganizationService.list.mockReturnValue(of(createCollection([firstOrganization])));

    const result = await TestBed.runInInjectionContext(() =>
      resolveGuardResult(organizationGuard(createRouteWithExcluded('org-1'), {} as never)),
    );

    expect(result).toBe(redirectUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/error/403']);
  });

  it('should redirect to the server-error page when the organization list fails', async () => {
    mockOrganizationService.list.mockReturnValue(throwError(() => new Error('Server Error')));

    const result = await TestBed.runInInjectionContext(() =>
      resolveGuardResult(organizationGuard(createRouteWithExcluded(null), {} as never)),
    );

    expect(result).toBe(redirectUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/error/500']);
  });
});
