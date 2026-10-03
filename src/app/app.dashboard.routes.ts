import type { Routes } from '@angular/router';
import { withAccountMenu, withNotificationBell } from '@features/account';
import { authGuard } from '@features/auth/http/guards';
import { onboardingRequiredGuard } from '@features/onboarding/http/guards';
import {
  provideCollaborationAssistant,
  withAssistantToggle,
  withCollaborationNav,
  withDirectMessagesSidebarExtension,
  withChannelsSidebarExtension,
  provideChannelsWorkspace,
  withGlobalSearch,
  withOrganizationNav,
  withOrganizationMobileNavigation,
  withOrganizationSwitcher,
  withSyncIndicator,
} from '@features/organization';
import {
  DashboardLayout,
  DashboardPanelRegistry,
  provideDashboardLayoutSlots,
  withDashboardBreadcrumb,
  withDashboardGlobalNav,
  withDashboardPagePanel,
} from '@layouts/dashboard-layout';
import { withThemeSwitcher } from '@shared/theme-switcher';

/**
 * Constant APP_DASHBOARD_ROUTES
 *
 * @description
 * Lazily composes the single authenticated dashboard parent shared by account
 * and organization destinations. Its route providers retain one shell scope;
 * authentication runs before each child's mandatory onboarding gate and runs
 * again when the parent is reused. Global feature bootstrap remains in appConfig.
 *
 * @since 1.0.0
 */
export const APP_DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayout,
    canActivate: [authGuard],
    runGuardsAndResolvers: 'always',
    providers: [
      DashboardPanelRegistry,
      provideCollaborationAssistant(),
      provideChannelsWorkspace(),
      provideDashboardLayoutSlots({
        sidebarHeader: [withOrganizationSwitcher()],
        sidebarNav: [withOrganizationNav()],
        mobileNavigation: [withOrganizationMobileNavigation()],
        sidebarExtension: [withDirectMessagesSidebarExtension(), withChannelsSidebarExtension()],
        panel: [withDashboardPagePanel()],
        sidebarFooter: [withCollaborationNav(), withDashboardGlobalNav(), withAccountMenu()],
        mobileActions: [withAccountMenu()],
        header: [withDashboardBreadcrumb()],
        headerActions: [
          withGlobalSearch(),
          withNotificationBell(),
          withAssistantToggle(),
          withSyncIndicator(),
          withThemeSwitcher(),
        ],
      }),
    ],
    children: [
      {
        path: 'account',
        canActivate: [onboardingRequiredGuard],
        loadChildren: () =>
          import('@features/account/account.routes').then((m) => m.ACCOUNT_ROUTES),
      },
      {
        path: 'organizations',
        canActivate: [onboardingRequiredGuard],
        loadChildren: () =>
          import('@features/organization/organization.routes').then((m) => m.ORGANIZATION_ROUTES),
      },
      { path: '', pathMatch: 'full', redirectTo: 'organizations' },
    ],
  },
];
