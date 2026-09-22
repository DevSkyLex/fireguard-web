import { TestBed } from '@angular/core/testing';
import {
  convertToParamMap,
  Router,
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  type GuardResult,
  type RedirectFunction,
  type RouterStateSnapshot,
  type UrlTree,
} from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { OrganizationPermissionService } from '../access';
import { ORGANIZATION_PERMISSION } from '../models';
import { ORGANIZATION_ROUTES } from '../organization.routes';
import { OrganizationMemberAccessStore } from '../state';

/**
 * Function invokePermissionGuard
 * @description Executes the permission guard published by one organization route inside TestBed injection context.
 * @access private
 * @since 1.0.0
 * @param {'members' | 'settings'} path - Guarded child route to execute.
 * @returns {Promise<GuardResult>} Resolved navigation decision.
 */
const invokePermissionGuard = async (path: 'members' | 'settings'): Promise<GuardResult> => {
  const workspace = ORGANIZATION_ROUTES.find((route) => route.path === ':organizationId');
  const guard = workspace?.children?.find((route) => route.path === path)
    ?.canActivate?.[0] as CanActivateFn;
  const route = {
    paramMap: convertToParamMap({ organizationId: 'org-1' }),
  } as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;
  const outcome = TestBed.runInInjectionContext(() => guard(route, state));

  return isObservable(outcome) ? firstValueFrom(outcome) : await outcome;
};

describe('ORGANIZATION_ROUTES', () => {
  const redirectTree = {} as UrlTree;
  const router = { createUrlTree: vi.fn().mockReturnValue(redirectTree) };
  const permissions = { canAccessOrganization: vi.fn() };
  const feedback = { warn: vi.fn() };
  const memberAccess = { ensureAccessResolved: vi.fn().mockReturnValue(of(true)) };

  beforeEach(() => {
    vi.clearAllMocks();
    router.createUrlTree.mockReturnValue(redirectTree);
    permissions.canAccessOrganization.mockReturnValue(true);
    memberAccess.ensureAccessResolved.mockReturnValue(of(true));
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: OrganizationPermissionService, useValue: permissions },
        { provide: FeedbackService, useValue: feedback },
        { provide: OrganizationMemberAccessStore, useValue: memberAccess },
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it.each([
    ['team', 'roles'],
    ['teams', 'teams'],
  ] as const)('redirects retired %s links to the matching members tab', (path, tab) => {
    const workspace = ORGANIZATION_ROUTES.find((route) => route.path === ':organizationId');
    const redirect = workspace?.children?.find((route) => route.path === path)
      ?.redirectTo as RedirectFunction;

    const result = TestBed.runInInjectionContext(() =>
      redirect({
        paramMap: convertToParamMap({ organizationId: 'org-1' }),
        queryParams: { filter: 'active' },
      } as never),
    );

    expect(router.createUrlTree).toHaveBeenCalledExactlyOnceWith(
      ['/organizations', 'org-1', 'members'],
      { queryParams: { filter: 'active', tab } },
    );
    expect(result).toBe(redirectTree);
  });

  it('allows members when any documented member-management permission matches', async () => {
    const result = await invokePermissionGuard('members');

    expect(result).toBe(true);
    expect(permissions.canAccessOrganization).toHaveBeenCalledExactlyOnceWith(
      'org-1',
      [
        ORGANIZATION_PERMISSION.MEMBERS_READ,
        ORGANIZATION_PERMISSION.MEMBERS_MANAGE,
        ORGANIZATION_PERMISSION.ROLES_READ,
        ORGANIZATION_PERMISSION.ROLES_MANAGE,
        ORGANIZATION_PERMISSION.TEAMS_READ,
      ],
      'any',
    );
  });

  it('redirects denied settings access to the organization landing page with feedback', async () => {
    permissions.canAccessOrganization.mockReturnValue(false);

    const result = await invokePermissionGuard('settings');

    expect(result).toBe(redirectTree);
    expect(permissions.canAccessOrganization).toHaveBeenCalledExactlyOnceWith(
      'org-1',
      [ORGANIZATION_PERMISSION.SETTINGS_WRITE],
      'all',
    );
    expect(router.createUrlTree).toHaveBeenCalledWith(['/organizations', 'org-1']);
    expect(feedback.warn).toHaveBeenCalledOnce();
  });
});
