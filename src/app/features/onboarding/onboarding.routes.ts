import type { Routes } from '@angular/router';
import { onboardingGuard } from './http/guards';

/**
 * Routes ONBOARDING_ROUTES
 *
 * @description
 * Lazy-loaded routes for the onboarding feature. A single route, the
 * activation wizard, rendered at the root path of whatever shell mounts this
 * tree — the split shell, per `app.routes.ts` (`FEATURE.md` "Routes").
 * `onboardingGuard` keeps a completed user from re-opening the wizard;
 * `authGuard` and `maintenanceGuard` are applied one level up, on the
 * mounting route, alongside the other top-level shells that share them.
 *
 * @since 1.0.0
 *
 * @type {Routes}
 */
export const ONBOARDING_ROUTES: Routes = [
  {
    path: '',
    canActivate: [onboardingGuard],
    loadComponent: () =>
      import('./ui/pages/onboarding-wizard-page/onboarding-wizard-page.component').then(
        (m) => m.OnboardingWizardPage,
      ),
    title: $localize`:@@route.onboarding:Organization Setup`,
  },
];
