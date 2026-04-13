import { inject } from '@angular/core';
import { type CanActivateFn, GuardResult, MaybeAsync, Router } from '@angular/router';
import { map } from 'rxjs';
import { OnboardingStore } from '@features/onboarding/state';

/**
 * Guard onboardingGuard
 *
 * @description
 * Prevents navigation to any protected route while an onboarding workflow
 * is active (`in_progress` or `blocked`). In that case the user is
 * redirected to `/onboarding` so they must complete the setup first.
 *
 * The blocking check is delegated to {@link OnboardingStore.checkBlocking},
 * which handles both the fast-path (state already in the store) and the
 * slow-path (API call + store hydration as side-effect).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @return {MaybeAsync<GuardResult>} `true` when navigation is allowed,
 * or a `UrlTree` redirecting to `/onboarding` otherwise.
 */
export const onboardingGuard: CanActivateFn = (): MaybeAsync<GuardResult> => {
  /**
   * Constant onboardingStore
   * @const onboardingStore
   *
   * @description
   * Store managing the onboarding state, which provides the `checkBlocking` method
   * used by this guard to determine if the user is currently blocked by an active
   * onboarding workflow, thus preventing access to protected routes until completion.
   *
   * @var {OnboardingStore}
   */
  const onboardingStore: OnboardingStore = inject<OnboardingStore>(OnboardingStore);

  /**
   * Constant router
   * @const router
   *
   * @description
   * Router used to create a `UrlTree` redirecting to the onboarding
   * page (`/onboarding`) when the guard determines that navigation should be blocked
   * due to an active onboarding workflow. This allows the guard to seamlessly
   * redirect users to complete their onboarding before accessing protected routes.
   *
   * @var {Router}
   */
  const router: Router = inject<Router>(Router);

  // Check if the user is blocked by an active onboarding workflow.
  return onboardingStore
    .checkBlocking()
    .pipe(
      map(
        (blocking: boolean): GuardResult =>
          blocking ? router.createUrlTree(['/onboarding']) : true,
      ),
    );
};
