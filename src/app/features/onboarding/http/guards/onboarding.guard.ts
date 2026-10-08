import { inject } from '@angular/core';
import { type CanActivateFn, GuardResult, MaybeAsync, Router } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import { resolveReturnUrl } from '@features/auth/utils';
import type { OnboardingOutput } from '@features/onboarding/models';
import { OnboardingStore } from '@features/onboarding/state';
import { OrganizationLandingService } from '@features/organization/services/organization-landing';

/**
 * Function onboardingGuard
 *
 * @description
 * Wizard-access guard for the `/onboarding` route. The wizard itself never blocks on its own record:
 * it never prevents access to the application. This guard only protects the
 * dedicated activation wizard, restoring a safe return URL or its permission-gated target
 * workspace when the flow is already `completed`. In-progress and
 * dismissed flows are allowed through (the dismissed checklist is independent of
 * the wizard surface).
 *
 * Loading is delegated to {@link OnboardingStore.ensureLoaded}, which returns the
 * cached record when present or fetches it once, failing safe to `null`.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @return {MaybeAsync<GuardResult>} `true` when the wizard may open, or a
 * `UrlTree` redirecting to `/` when onboarding is already complete.
 */
export const onboardingGuard: CanActivateFn = (route): MaybeAsync<GuardResult> => {
  const onboardingStore: OnboardingStore = inject<OnboardingStore>(OnboardingStore);
  const router: Router = inject<Router>(Router);
  const landing: OrganizationLandingService = inject(OrganizationLandingService);

  return onboardingStore.ensureLoaded().pipe(
    switchMap((onboarding: OnboardingOutput | null) => {
      if (onboarding?.state !== 'completed') return of(true);
      const returnUrl = resolveReturnUrl(route.queryParamMap.get('returnUrl'), '');
      if (returnUrl && !returnUrl.split('?')[0].startsWith('/onboarding'))
        return of(router.parseUrl(returnUrl));
      return onboarding.targetOrganizationId
        ? landing
            .defaultDestination(onboarding.targetOrganizationId)
            .pipe(map((destination): GuardResult => router.parseUrl(destination)))
        : of(router.createUrlTree(['/']));
    }),
  );
};
