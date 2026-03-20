import type { Routes } from '@angular/router';

/**
 * Routes ONBOARDING_ROUTES
 *
 * @description
 * Lazy-loaded routes for the onboarding feature.
 * Renders the onboarding wizard page at the root path.
 *
 * @since 1.0.0
 *
 * @type {Routes}
 */
export const ONBOARDING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/onboarding-page/onboarding-page.component').then(
        (module) => module.OnboardingPage,
      ),
    title: 'Organization Setup',
  },
];
