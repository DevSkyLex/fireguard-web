import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { OrganizationStore } from '@core/stores/organization';
import { onboardingCompletedGuard } from './onboarding-completed.guard';

describe('onboardingCompletedGuard', () => {
  let mockRouter: {
    parseUrl: ReturnType<typeof vi.fn>;
  };
  let mockOrganizationStore: {
    syncOnboardingStatus: ReturnType<typeof vi.fn>;
    resolveOnboardingRoute: ReturnType<typeof vi.fn>;
  };
  const urlTree = {} as UrlTree;

  const runGuard = async (): Promise<boolean | UrlTree> => {
    return TestBed.runInInjectionContext(
      () => onboardingCompletedGuard({} as any, {} as any) as Promise<boolean | UrlTree>,
    );
  };

  beforeEach(() => {
    mockRouter = {
      parseUrl: vi.fn().mockReturnValue(urlTree),
    };
    mockOrganizationStore = {
      syncOnboardingStatus: vi.fn(),
      resolveOnboardingRoute: vi.fn().mockReturnValue('/onboarding'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: OrganizationStore, useValue: mockOrganizationStore },
      ],
    });
  });

  it('should allow access when onboarding is completed', async () => {
    mockOrganizationStore.syncOnboardingStatus.mockResolvedValue({
      state: 'completed',
      nextStep: null,
    });

    const result = await runGuard();
    expect(result).toBe(true);
  });

  it('should redirect to onboarding step when onboarding is not completed', async () => {
    mockOrganizationStore.syncOnboardingStatus.mockResolvedValue({
      state: 'in_progress',
      nextStep: 'create_organization',
    });

    const result = await runGuard();
    expect(result).toBe(urlTree);
    expect(mockOrganizationStore.resolveOnboardingRoute).toHaveBeenCalled();
    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/onboarding');
  });

  it('should allow access when status refresh fails', async () => {
    mockOrganizationStore.syncOnboardingStatus.mockRejectedValue(
      new Error('Network error'),
    );

    const result = await runGuard();
    expect(result).toBe(true);
  });
});
