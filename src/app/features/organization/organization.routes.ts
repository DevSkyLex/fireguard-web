import type { Routes } from '@angular/router';

/**
 * Constant ORGANIZATION_ROUTES
 *
 * @description
 * Routes for organization onboarding flow.
 *
 * @version 1.0.0
 */
export const ORGANIZATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/onboarding-page/onboarding-page.component').then(
        (m) => m.OnboardingPage,
      ),
    title: 'Onboarding',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
