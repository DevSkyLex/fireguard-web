import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { OrganizationStore } from '@core/stores/organization';
import { onboardingRouteGuard } from './onboarding-route.guard';

describe('onboardingRouteGuard', () => {
  let mockRouter: {
    parseUrl: ReturnType<typeof vi.fn>;
  };
  let mockOrganizationStore: {
    syncOnboardingStatus: ReturnType<typeof vi.fn>;
    resolveOnboardingRoute: ReturnType<typeof vi.fn>;
  };
  const urlTree = {} as UrlTree;

  const runGuard = async (url: string): Promise<boolean | UrlTree> => {
    return TestBed.runInInjectionContext(
      () =>
        onboardingRouteGuard({} as any, { url } as any) as Promise<boolean | UrlTree>,
    );
  };

  beforeEach(() => {
    mockRouter = {
      parseUrl: vi.fn().mockReturnValue(urlTree),
    };
    mockOrganizationStore = {
      syncOnboardingStatus: vi.fn(),
      resolveOnboardingRoute: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: OrganizationStore, useValue: mockOrganizationStore },
      ],
    });
  });

  it('should allow access when current onboarding route matches target route', async () => {
    mockOrganizationStore.syncOnboardingStatus.mockResolvedValue({
      state: 'in_progress',
      nextStep: 'create_organization',
    });
    mockOrganizationStore.resolveOnboardingRoute.mockReturnValue('/onboarding');

    const result = await runGuard('/onboarding');
    expect(result).toBe(true);
  });

  it('should redirect to target route when current route does not match', async () => {
    mockOrganizationStore.syncOnboardingStatus.mockResolvedValue({
      state: 'in_progress',
      nextStep: 'create_organization',
    });
    mockOrganizationStore.resolveOnboardingRoute.mockReturnValue('/onboarding');

    const result = await runGuard('/onboarding/other');
    expect(result).toBe(urlTree);
    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/onboarding');
  });

  it('should allow access when status cannot be loaded', async () => {
    mockOrganizationStore.syncOnboardingStatus.mockResolvedValue(null);
    const result = await runGuard('/onboarding');
    expect(result).toBe(true);
  });

  it('should allow access when status refresh throws', async () => {
    mockOrganizationStore.syncOnboardingStatus.mockRejectedValue(
      new Error('Network error'),
    );
    const result = await runGuard('/onboarding');
    expect(result).toBe(true);
  });
});
