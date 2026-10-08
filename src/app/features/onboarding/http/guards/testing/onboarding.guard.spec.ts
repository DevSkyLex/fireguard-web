import { TestBed } from '@angular/core/testing';
import { convertToParamMap, Router, UrlTree } from '@angular/router';
import { type Observable, firstValueFrom, isObservable, of } from 'rxjs';
import type { OnboardingOutput } from '@features/onboarding/models';
import { OnboardingStore } from '@features/onboarding/state';
import { OrganizationLandingService } from '@features/organization/services/organization-landing';
import { onboardingGuard } from '../onboarding.guard';

const onboardingWith = (s: OnboardingOutput['state']): OnboardingOutput =>
  ({ state: s }) as OnboardingOutput;

describe('onboardingGuard', () => {
  let mockRouter: { createUrlTree: ReturnType<typeof vi.fn>; parseUrl: ReturnType<typeof vi.fn> };
  let defaultDestination: ReturnType<typeof vi.fn>;
  let mockStore: { ensureLoaded: ReturnType<typeof vi.fn> };
  const dashboardUrlTree = {} as UrlTree;
  const route = { queryParamMap: convertToParamMap({}) } as unknown as Parameters<
    typeof onboardingGuard
  >[0];
  const state = {} as unknown as Parameters<typeof onboardingGuard>[1];

  async function runGuard(
    selectedRoute: Parameters<typeof onboardingGuard>[0] = route,
  ): Promise<boolean | UrlTree> {
    const result = TestBed.runInInjectionContext(() => onboardingGuard(selectedRoute, state));
    return isObservable(result)
      ? firstValueFrom(result as Observable<boolean | UrlTree>)
      : (result as boolean | UrlTree);
  }

  beforeEach(() => {
    mockRouter = {
      createUrlTree: vi.fn().mockReturnValue(dashboardUrlTree),
      parseUrl: vi.fn().mockReturnValue(dashboardUrlTree),
    };
    defaultDestination = vi.fn((organizationId: string) =>
      of(`/organizations/${organizationId}/assets`),
    );
    mockStore = { ensureLoaded: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: OnboardingStore, useValue: mockStore },
        { provide: OrganizationLandingService, useValue: { defaultDestination } },
      ],
    });
  });

  it('should allow opening the wizard while onboarding is in progress', async () => {
    mockStore.ensureLoaded.mockReturnValue(of(onboardingWith('in_progress')));
    await expect(runGuard()).resolves.toBe(true);
  });

  it('should redirect to the dashboard when onboarding is already completed', async () => {
    mockStore.ensureLoaded.mockReturnValue(of(onboardingWith('completed')));
    await expect(runGuard()).resolves.toBe(dashboardUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
  });

  it('should allow the wizard when no onboarding record is available (non-blocking)', async () => {
    mockStore.ensureLoaded.mockReturnValue(of(null));
    await expect(runGuard()).resolves.toBe(true);
  });
  it('should reopen the completed target organization instead of the last active organization', async () => {
    mockStore.ensureLoaded.mockReturnValue(
      of({ ...onboardingWith('completed'), targetOrganizationId: 'org-created' }),
    );
    await expect(runGuard()).resolves.toBe(dashboardUrlTree);
    expect(defaultDestination).toHaveBeenCalledWith('org-created');
    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/organizations/org-created/assets');
  });
  it('keeps an explicit safe historical deep link ahead of the default fleet destination', async () => {
    mockStore.ensureLoaded.mockReturnValue(
      of({ ...onboardingWith('completed'), targetOrganizationId: 'org-created' }),
    );
    const selectedRoute = {
      queryParamMap: convertToParamMap({ returnUrl: '/organizations/org-created?tab=overview' }),
    } as unknown as Parameters<typeof onboardingGuard>[0];
    await runGuard(selectedRoute);
    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/organizations/org-created?tab=overview');
    expect(defaultDestination).not.toHaveBeenCalled();
  });
});
