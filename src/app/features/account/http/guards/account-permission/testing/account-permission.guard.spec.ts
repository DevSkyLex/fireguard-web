import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, type GuardResult, type MaybeAsync } from '@angular/router';
import { firstValueFrom, isObservable } from 'rxjs';
import { UserPermissionService } from '@features/account/access';
import { ACCOUNT_PERMISSION } from '@features/account/models';
import { accountPermissionGuard } from '../account-permission.guard';

describe('accountPermissionGuard', () => {
  const redirectUrlTree = {} as UrlTree;

  let mockRouter: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };
  let mockUserPermissionService: {
    canAccessGlobalPermissions: ReturnType<typeof vi.fn>;
  };

  async function resolveGuardResult(result: MaybeAsync<GuardResult>): Promise<GuardResult> {
    if (result instanceof Promise) {
      return result;
    }

    if (isObservable(result)) {
      return firstValueFrom(result);
    }

    return result;
  }

  beforeEach(() => {
    mockRouter = {
      createUrlTree: vi.fn().mockReturnValue(redirectUrlTree),
    };

    mockUserPermissionService = {
      canAccessGlobalPermissions: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: UserPermissionService, useValue: mockUserPermissionService },
      ],
    });
  });

  it('should allow access when all required permissions are granted', async () => {
    mockUserPermissionService.canAccessGlobalPermissions.mockReturnValue(true);

    const guard = accountPermissionGuard({
      permissions: [ACCOUNT_PERMISSION.SESSIONS_READ],
    });
    const result = await TestBed.runInInjectionContext(() => resolveGuardResult(guard({} as never, {} as never)));

    expect(result).toBe(true);
    expect(mockUserPermissionService.canAccessGlobalPermissions).toHaveBeenCalledWith(
      [ACCOUNT_PERMISSION.SESSIONS_READ],
      'all',
    );
  });

  it('should redirect when one required permission is missing', async () => {
    mockUserPermissionService.canAccessGlobalPermissions.mockReturnValue(false);

    const guard = accountPermissionGuard({
      permissions: [ACCOUNT_PERMISSION.SESSIONS_READ],
    });
    const result = await TestBed.runInInjectionContext(() => resolveGuardResult(guard({} as never, {} as never)));

    expect(result).toBe(redirectUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
  });

  it('should support the any match strategy', async () => {
    mockUserPermissionService.canAccessGlobalPermissions.mockReturnValue(true);

    const guard = accountPermissionGuard({
      permissions: [ACCOUNT_PERMISSION.USERS_READ, ACCOUNT_PERMISSION.SESSIONS_READ],
      match: 'any',
    });
    const result = await TestBed.runInInjectionContext(() => resolveGuardResult(guard({} as never, {} as never)));

    expect(result).toBe(true);
    expect(mockUserPermissionService.canAccessGlobalPermissions).toHaveBeenCalledWith(
      [ACCOUNT_PERMISSION.USERS_READ, ACCOUNT_PERMISSION.SESSIONS_READ],
      'any',
    );
  });

  it('should use the configured redirect target when access is denied', async () => {
    mockUserPermissionService.canAccessGlobalPermissions.mockReturnValue(false);

    const guard = accountPermissionGuard({
      permissions: [ACCOUNT_PERMISSION.SESSIONS_READ],
      redirectTo: ['/account', 'notifications'],
    });
    const result = await TestBed.runInInjectionContext(() => resolveGuardResult(guard({} as never, {} as never)));

    expect(result).toBe(redirectUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/account', 'notifications']);
  });
});
