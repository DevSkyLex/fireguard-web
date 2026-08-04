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
 * activation flow is `completed`. Any non-completed record redirects to the
 * `/onboarding` wizard. It is the mirror of {@link onboardingGuard}, which keeps a
 * completed user from re-opening the wizard — together they form a mutual gate
 * around `/onboarding` and the rest of the app.
 *
 * **A transport failure is not an answer.** {@link OnboardingStore.ensureLoaded}
 * resolves to `null` both when the account genuinely has no record and when the
 * endpoint failed. Treating the second as "not activated" locked an already
 * activated member inside the wizard for as long as the endpoint stayed down —
 * with no way out, since the wizard's own first step needs the same API. When the
 * store reports the load as failed, the guard lets the navigation through: a
 * member who really has no organization still lands on onboarding, sent there by
 * `organizationGuard`, and a member who has one keeps working.
 *
 * @version 1.1.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @return {MaybeAsync<GuardResult>} `true` when onboarding is complete or its
 * state is unknown because the request failed, a `UrlTree` to `/onboarding`
 * otherwise.
 */
export const onboardingRequiredGuard: CanActivateFn = (): MaybeAsync<GuardResult> => {
  const onboardingStore: OnboardingStore = inject<OnboardingStore>(OnboardingStore);
  const router: Router = inject<Router>(Router);

  return onboardingStore.ensureLoaded().pipe(
    map((onboarding: OnboardingOutput | null): GuardResult => {
      if (onboarding?.state === 'completed') return true;

      if (onboarding === null && onboardingStore.loadError() !== null) return true;

      return router.createUrlTree(['/onboarding']);
    }),
  );
};
