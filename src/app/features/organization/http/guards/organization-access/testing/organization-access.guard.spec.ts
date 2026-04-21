import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, type GuardResult, type MaybeAsync } from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { OrganizationMemberAccessStore } from '@features/organization/state';
import { organizationAccessGuard } from '../organization-access.guard';

describe('organizationAccessGuard', () => {
  const redirectUrlTree = {} as UrlTree;

  let mockRouter: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };
  let mockOrganizationMemberAccessStore: {
    ensureAccessResolved: ReturnType<typeof vi.fn>;
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

  function createRouteWithOrganizationId(
    organizationId: string | null,
  ): Parameters<typeof organizationAccessGuard>[0] {
    return {
      paramMap: {
        get: (key: string): string | null => (key === 'organizationId' ? organizationId : null),
      },
    } as unknown as Parameters<typeof organizationAccessGuard>[0];
  }

  beforeEach(() => {
    mockRouter = {
      createUrlTree: vi.fn().mockReturnValue(redirectUrlTree),
    };

    mockOrganizationMemberAccessStore = {
      ensureAccessResolved: vi.fn().mockReturnValue(of(true)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: OrganizationMemberAccessStore, useValue: mockOrganizationMemberAccessStore },
      ],
    });
  });

  it('should allow activation when the shared store resolves access successfully', async () => {
    const result = await TestBed.runInInjectionContext(() =>
      resolveGuardResult(organizationAccessGuard(createRouteWithOrganizationId('org-1'), {} as never)),
    );

    expect(result).toBe(true);
    expect(mockOrganizationMemberAccessStore.ensureAccessResolved).toHaveBeenCalledWith('org-1');
  });

  it('should redirect to the organization list when the shared store reports unresolved access', async () => {
    mockOrganizationMemberAccessStore.ensureAccessResolved.mockReturnValue(of(false));

    const result = await TestBed.runInInjectionContext(() =>
      resolveGuardResult(organizationAccessGuard(createRouteWithOrganizationId('org-1'), {} as never)),
    );

    expect(result).toBe(redirectUrlTree);
    expect(mockOrganizationMemberAccessStore.ensureAccessResolved).toHaveBeenCalledWith('org-1');
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/organizations']);
  });

  it('should redirect when no organization id can be resolved', async () => {
    const result = await TestBed.runInInjectionContext(() =>
      resolveGuardResult(organizationAccessGuard(createRouteWithOrganizationId(null), {} as never)),
    );

    expect(result).toBe(redirectUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
  });
});
