import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { resolveReturnUrl } from '@features/auth/utils';
import { OnboardingStore } from '@features/onboarding/state';
/**
 * Guard onboardingEntryGuard
 * @description Resolves workspace access without starting organization creation.
 * Existing invitation destinations take precedence; pinned creation remains resumable.
 * @since 1.0.0
 * @returns {Observable<UrlTree>} Safe workflow destination.
 */
export const onboardingEntryGuard: CanActivateFn = (route) => {
  const store = inject(OnboardingStore);
  const router = inject(Router);
  const returnUrl = resolveReturnUrl(route.queryParamMap.get('returnUrl'), '');
  const outsideOnboarding = returnUrl && !returnUrl.split('?')[0].startsWith('/onboarding');
  return store.ensureLoaded().pipe(
    map((record) => {
      if (outsideOnboarding && returnUrl.startsWith('/organizations/invitations/accept'))
        return router.parseUrl(returnUrl);
      if (record?.state === 'completed' || record?.accessibleOrganizationId) {
        if (outsideOnboarding) return router.parseUrl(returnUrl);
        return router.createUrlTree(['/organizations']);
      }
      return router.createUrlTree(
        [record?.targetOrganizationId ? '/onboarding/create' : '/onboarding/workspace'],
        { queryParams: { returnUrl: returnUrl || undefined } },
      );
    }),
  );
};
