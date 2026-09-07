import { inject } from '@angular/core';
import { type CanActivateFn, GuardResult, MaybeAsync, Router } from '@angular/router';
import { map } from 'rxjs';
import { resolveReturnUrl } from '@features/auth/utils';
import type { OnboardingOutput } from '@features/onboarding/models';
import { OnboardingStore } from '@features/onboarding/state';

/**
 * Guard onboardingRequiredGuard
 *
 * @description
 * Workspace gate for the application shell. A completed creator flow or an
 * independently accessible organization permits navigation. An unfinished pinned
 * creation never blocks a member who joined another organization. Organization
 * guards remain authoritative for the specific destination and its permissions.
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
 * @return {MaybeAsync<GuardResult>} `true` when workspace access exists or onboarding is complete, or its
 * state is unknown because the request failed, a `UrlTree` to `/onboarding`
 * otherwise.
 */
export const onboardingRequiredGuard: CanActivateFn = (_route, state): MaybeAsync<GuardResult> => {
  const onboardingStore: OnboardingStore = inject<OnboardingStore>(OnboardingStore);
  const router: Router = inject<Router>(Router);

  return onboardingStore.ensureLoaded().pipe(
    map((onboarding: OnboardingOutput | null): GuardResult => {
      if (onboarding?.state === 'completed' || onboarding?.accessibleOrganizationId) return true;

      if (onboarding === null && onboardingStore.loadError() !== null) return true;

      const returnUrl = resolveReturnUrl(state.url, '');
      return returnUrl && !returnUrl.startsWith('/onboarding')
        ? router.createUrlTree(['/onboarding'], { queryParams: { returnUrl } })
        : router.createUrlTree(['/onboarding']);
    }),
  );
};
