import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { type Observable, firstValueFrom, isObservable, of } from 'rxjs';
import type { OnboardingOutput } from '@features/onboarding/models';
import { OnboardingStore } from '@features/onboarding/state';
import { onboardingRequiredGuard } from '../onboarding-required.guard';

describe('onboardingRequiredGuard', () => {
  let mockRouter: { createUrlTree: ReturnType<typeof vi.fn> };
  let mockStore: { ensureLoaded: ReturnType<typeof vi.fn> };
  const onboardingUrlTree = {} as UrlTree;
  const route = {} as unknown as Parameters<typeof onboardingRequiredGuard>[0];
  const state = {} as unknown as Parameters<typeof onboardingRequiredGuard>[1];

  const onboardingWith = (s: OnboardingOutput['state']): OnboardingOutput =>
    ({ state: s }) as OnboardingOutput;

  async function runGuard(): Promise<boolean | UrlTree> {
    const result = TestBed.runInInjectionContext(() => onboardingRequiredGuard(route, state));
    return isObservable(result)
      ? firstValueFrom(result as Observable<boolean | UrlTree>)
      : (result as boolean | UrlTree);
  }

  beforeEach(() => {
    mockRouter = { createUrlTree: vi.fn().mockReturnValue(onboardingUrlTree) };
    mockStore = { ensureLoaded: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: OnboardingStore, useValue: mockStore },
      ],
    });
  });

  it('should allow the app when onboarding is completed', async () => {
    mockStore.ensureLoaded.mockReturnValue(of(onboardingWith('completed')));
    await expect(runGuard()).resolves.toBe(true);
  });

  it('should redirect to the wizard while onboarding is in progress', async () => {
    mockStore.ensureLoaded.mockReturnValue(of(onboardingWith('in_progress')));
    await expect(runGuard()).resolves.toBe(onboardingUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/onboarding']);
  });

  it('should redirect to the wizard when no onboarding record is available (mandatory)', async () => {
    mockStore.ensureLoaded.mockReturnValue(of(null));
    await expect(runGuard()).resolves.toBe(onboardingUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/onboarding']);
  });
});
