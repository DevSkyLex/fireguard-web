import type { Routes } from '@angular/router';
import { withAccountProfile, withNotificationBell } from '@features/account';
import { authGuard } from '@features/auth/http/guards';
import { provideMainFeature, withMainNavigation } from '@features/main';
import { maintenanceGuard } from '@features/maintenance/http/guards';
import { onboardingGuard } from '@features/onboarding/http/guards';
import { withSetupChecklist } from '@features/onboarding/providers';
import {
  provideOrganizationFeature,
  withOrganizationContext,
  withOrganizationNavigation,
  withOrganizationSwitcher,
} from '@features/organization';
import { DashboardLayout, provideDashboardLayoutSlots } from '@layouts/dashboard-layout';
import { withThemeSwitcher } from '@shared/components';
import { FocusedLayout } from './layouts/focused-layout';
import { SplitLayout } from './layouts/split-layout';

/**
 * Constant APP_ROUTES
 *
 * @description
 * Application root routes configuration.
 *
 * The root path (`/`) serves the home page.
 * Organization-scoped pages live under `/organizations/:organizationId`.
 */
export const APP_ROUTES: Routes = [
  {
    path: 'auth',
    component: SplitLayout,
    loadChildren: () => import('@features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    component: DashboardLayout,
    canActivate: [authGuard, maintenanceGuard],
    providers: [
      provideMainFeature(),
      provideOrganizationFeature(),
      provideDashboardLayoutSlots({
        navigation: [withMainNavigation(), ...withOrganizationNavigation()],
        topbar: [
          withSetupChecklist(),
          withOrganizationSwitcher(),
          withThemeSwitcher(),
          withNotificationBell(),
          withAccountProfile(),
        ],
        aside: [withOrganizationContext()],
      }),
    ],
    children: [
      {
        path: '',
        data: { breadcrumb: false, preload: true },
        loadChildren: () => import('@features/main/main.routes').then((m) => m.MAIN_ROUTES),
      },
      {
        path: 'organizations',
        data: { breadcrumb: 'Organizations', preload: true },
        loadChildren: () =>
          import('@features/organization/organization.routes').then((m) => m.ORGANIZATION_ROUTES),
      },
      {
        path: 'account',
        data: { preload: true },
        loadChildren: () =>
          import('@features/account/account.routes').then((m) => m.ACCOUNT_ROUTES),
      },
      {
        path: 'onboarding',
        canActivate: [onboardingGuard],
        data: { breadcrumb: false, preload: true },
        loadChildren: () =>
          import('@features/onboarding/onboarding.routes').then((m) => m.ONBOARDING_ROUTES),
      },
    ],
  },
  {
    path: '',
    component: FocusedLayout,
    children: [
      {
        path: 'error',
        loadChildren: () => import('@features/error/error.routes').then((m) => m.ERROR_ROUTES),
      },
      {
        path: 'maintenance',
        loadChildren: () =>
          import('@features/maintenance/maintenance.routes').then((m) => m.MAINTENANCE_ROUTES),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'error/404',
  },
];
