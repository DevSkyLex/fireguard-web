import { inject } from '@angular/core';
import { type CanActivateFn, GuardResult, MaybeAsync, Router } from '@angular/router';
import { OrganizationStore } from '@core/stores/organization';

/**
 * Onboarding Route Guard
 *
 * @description
 * Keeps onboarding users on the backend-defined step route.
 *
 * @version 1.0.0
 *
 * @returns {GuardResult}
 */
export const onboardingRouteGuard: CanActivateFn = (
  _route,
  state,
): MaybeAsync<GuardResult> => {
  const organizationStore: OrganizationStore =
    inject<OrganizationStore>(OrganizationStore);
  const router: Router = inject<Router>(Router);

  return organizationStore
    .syncOnboardingStatus()
    .then((status) => {
      if (!status) return true;

      const targetRoute: string = organizationStore.resolveOnboardingRoute(status, '/');
      const currentPath: string = state.url.split('?')[0] ?? state.url;

      if (currentPath === targetRoute) return true;
      return router.parseUrl(targetRoute);
    })
    .catch(() => true);
};
