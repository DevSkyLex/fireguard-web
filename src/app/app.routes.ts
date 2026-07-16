import type { Routes } from '@angular/router';
import { withAccountProfile, withNotificationBell } from '@features/account';
import { withAuthShowcase } from '@features/auth';
import { authGuard } from '@features/auth/http/guards';
import { provideMainFeature } from '@features/main';
import { maintenanceGuard } from '@features/maintenance/http/guards';
import { onboardingGuard, onboardingRequiredGuard } from '@features/onboarding/http/guards';
import { withOnboardingShowcase } from '@features/onboarding/providers';
import {
  provideOrganizationFeature,
  withOrganizationNavigation,
  withOrganizationSwitcher,
} from '@features/organization';
import {
  withInterventionHeaderActions,
  withInterventionSyncChip,
} from '@features/organization/features/interventions';
import { DashboardLayout, provideDashboardLayoutSlots } from '@layouts/dashboard-layout';
import { withThemeSwitcher } from '@shared/components';
import { FocusedLayout } from './layouts/focused-layout';
import { provideSplitLayoutSlots, SplitLayout } from './layouts/split-layout';

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
    path: 'organizations/invitations/accept',
    loadComponent: () =>
      import('@features/organization/ui/pages/organization-invitation-accept/organization-invitation-accept.component').then(
        (m) => m.OrganizationInvitationAcceptPage,
      ),
    title: $localize`:@@route.acceptInvitation:Accept Invitation`,
  },
  {
    path: 'auth',
    component: SplitLayout,
    providers: [
      provideSplitLayoutSlots({
        showcase: [withAuthShowcase()],
      }),
    ],
    loadChildren: () => import('@features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'onboarding',
    component: SplitLayout,
    canActivate: [authGuard, maintenanceGuard, onboardingGuard],
    providers: [
      provideSplitLayoutSlots({
        showcase: [withOnboardingShowcase()],
      }),
    ],
    loadChildren: () =>
      import('@features/onboarding/onboarding.routes').then((m) => m.ONBOARDING_ROUTES),
  },
  {
    path: '',
    component: DashboardLayout,
    canActivate: [authGuard, maintenanceGuard, onboardingRequiredGuard],
    providers: [
      provideMainFeature(),
      provideOrganizationFeature(),
      provideDashboardLayoutSlots({
        navigation: [...withOrganizationNavigation()],
        sidebar: [withOrganizationSwitcher(), withAccountProfile()],
        topbar: [withInterventionSyncChip(), withNotificationBell(), withThemeSwitcher()],
        pageHeader: [withInterventionHeaderActions()],
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
        data: { breadcrumb: false, preload: true },
        loadChildren: () =>
          import('@features/organization/organization.routes').then((m) => m.ORGANIZATION_ROUTES),
      },
      {
        path: 'account',
        data: { preload: true },
        loadChildren: () =>
          import('@features/account/account.routes').then((m) => m.ACCOUNT_ROUTES),
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
