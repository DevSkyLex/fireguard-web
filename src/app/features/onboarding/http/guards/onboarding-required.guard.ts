import { inject } from '@angular/core';
import { type CanActivateFn, GuardResult, MaybeAsync, Router } from '@angular/router';
import { map } from 'rxjs';
import type { OnboardingOutput } from '@features/onboarding/models';
import { OnboardingStore } from '@features/onboarding/state';

/**
 * Guard onboardingRequiredGuard
 *
 * @description
 * Mandatory-onboarding gate for the application shell. Onboarding is **blocking**:
 * a user may not reach the dashboard, organizations, or account areas until the
 * activation flow is `completed`. Any non-completed (or missing) record redirects
 * to the `/onboarding` wizard. It is the mirror of {@link onboardingGuard}, which
 * keeps a completed user from re-opening the wizard — together they form a mutual
 * gate around `/onboarding` and the rest of the app.
 *
 * Loading is delegated to {@link OnboardingStore.ensureLoaded}, which returns the
 * cached record when present or fetches it once, failing safe to `null`. A `null`
 * record is treated as "not completed", so a failing endpoint sends the user to
 * onboarding rather than into an un-activated app.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @return {MaybeAsync<GuardResult>} `true` when onboarding is complete, or a
 * `UrlTree` redirecting to `/onboarding` otherwise.
 */
export const onboardingRequiredGuard: CanActivateFn = (): MaybeAsync<GuardResult> => {
  const onboardingStore: OnboardingStore = inject<OnboardingStore>(OnboardingStore);
  const router: Router = inject<Router>(Router);

  return onboardingStore
    .ensureLoaded()
    .pipe(
      map(
        (onboarding: OnboardingOutput | null): GuardResult =>
          onboarding?.state === 'completed' ? true : router.createUrlTree(['/onboarding']),
      ),
    );
};
