import type { Routes } from '@angular/router';
import { onboardingGuard } from './http/guards';
import { onboardingEntryGuard } from './http/guards/onboarding-entry.guard';
/**
 * Routes ONBOARDING_ROUTES
 * @description Separates workspace discovery from explicit organization creation.
 * Workspace and request tracking stay reachable without membership; creation uses its existing sequential guard.
 * @since 1.0.0
 * @type {Routes}
 */
export const ONBOARDING_ROUTES: Routes = [
  { path: '', pathMatch: 'full', canActivate: [onboardingEntryGuard], children: [] },
  {
    path: 'workspace',
    loadComponent: () =>
      import('./ui/pages/onboarding-workspace-page/onboarding-workspace-page.component').then(
        (m) => m.OnboardingWorkspacePage,
      ),
    title: $localize`:@@route.workspace:Your workspace`,
  },
  {
    path: 'requests',
    data: { requestsOnly: true },
    loadComponent: () =>
      import('./ui/pages/onboarding-workspace-page/onboarding-workspace-page.component').then(
        (m) => m.OnboardingWorkspacePage,
      ),
    title: $localize`:@@route.joinRequests:Membership requests`,
  },
  {
    path: 'create',
    canActivate: [onboardingGuard],
    loadComponent: () =>
      import('./ui/pages/onboarding-wizard-page/onboarding-wizard-page.component').then(
        (m) => m.OnboardingWizardPage,
      ),
    title: $localize`:@@route.onboarding:Organization Setup`,
  },
];
