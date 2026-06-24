import { inject } from '@angular/core';
import { type CanActivateFn, GuardResult, MaybeAsync, Router } from '@angular/router';
import { map } from 'rxjs';
import type { OnboardingOutput } from '@features/onboarding/models';
import { OnboardingStore } from '@features/onboarding/state';

/**
 * Guard onboardingGuard
 *
 * @description
 * Wizard-access guard for the `/onboarding` route. Onboarding is **non-blocking**:
 * it never prevents access to the application. This guard only protects the
 * dedicated activation wizard, redirecting to the dashboard (`/`) when the flow
 * is already `completed` so users do not land on an empty wizard. In-progress and
 * dismissed flows are allowed through (the dismissed checklist is independent of
 * the wizard surface).
 *
 * Loading is delegated to {@link OnboardingStore.ensureLoaded}, which returns the
 * cached record when present or fetches it once, failing safe to `null`.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @return {MaybeAsync<GuardResult>} `true` when the wizard may open, or a
 * `UrlTree` redirecting to `/` when onboarding is already complete.
 */
export const onboardingGuard: CanActivateFn = (): MaybeAsync<GuardResult> => {
  const onboardingStore: OnboardingStore = inject<OnboardingStore>(OnboardingStore);
  const router: Router = inject<Router>(Router);

  return onboardingStore
    .ensureLoaded()
    .pipe(
      map(
        (onboarding: OnboardingOutput | null): GuardResult =>
          onboarding?.state === 'completed' ? router.createUrlTree(['/']) : true,
      ),
    );
};
