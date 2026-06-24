import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { type Observable, firstValueFrom, isObservable, of } from 'rxjs';
import type { OnboardingOutput } from '@features/onboarding/models';
import { OnboardingStore } from '@features/onboarding/state';
import { onboardingGuard } from '../onboarding.guard';

describe('onboardingGuard', () => {
  let mockRouter: { createUrlTree: ReturnType<typeof vi.fn> };
  let mockStore: { ensureLoaded: ReturnType<typeof vi.fn> };
  const dashboardUrlTree = {} as UrlTree;
  const route = {} as unknown as Parameters<typeof onboardingGuard>[0];
  const state = {} as unknown as Parameters<typeof onboardingGuard>[1];

  const onboardingWith = (s: OnboardingOutput['state']): OnboardingOutput =>
    ({ state: s }) as OnboardingOutput;

  async function runGuard(): Promise<boolean | UrlTree> {
    const result = TestBed.runInInjectionContext(() => onboardingGuard(route, state));
    return isObservable(result)
      ? firstValueFrom(result as Observable<boolean | UrlTree>)
      : (result as boolean | UrlTree);
  }

  beforeEach(() => {
    mockRouter = { createUrlTree: vi.fn().mockReturnValue(dashboardUrlTree) };
    mockStore = { ensureLoaded: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: OnboardingStore, useValue: mockStore },
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
});
