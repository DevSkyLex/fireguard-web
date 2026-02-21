import type { Routes } from '@angular/router';

export const ONBOARDING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/onboarding-page/onboarding-page.component').then(
        (m) => m.OnboardingPage,
      ),
    title: 'Organization Setup',
  },
];
