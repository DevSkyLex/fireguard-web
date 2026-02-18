import { inject } from '@angular/core';
import { type CanActivateFn, GuardResult, MaybeAsync, Router } from '@angular/router';
import { OrganizationStore } from '@core/stores/organization';

/**
 * Onboarding Completed Guard
 *
 * @description
 * Ensures authenticated users cannot access dashboard routes
 * until organization onboarding is completed.
 *
 * @version 1.0.0
 *
 * @returns {GuardResult}
 */
export const onboardingCompletedGuard: CanActivateFn = (): MaybeAsync<GuardResult> => {
  const organizationStore: OrganizationStore =
    inject<OrganizationStore>(OrganizationStore);

  const router: Router =
    inject<Router>(Router);

  return organizationStore
    .syncOnboardingStatus()
    .then((status) => {
      if (!status || status.state === 'completed') return true;

      return router.parseUrl(
        organizationStore.resolveOnboardingRoute(status, '/'),
      );
    })
    .catch(() => true);
};
