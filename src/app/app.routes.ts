import type { Routes } from '@angular/router';
import { withAccountMenu } from '@features/account';
import { notFoundRedirectGuard } from '@features/error';
import { withOrganizationNav, withOrganizationSwitcher } from '@features/organization';
import {
  DashboardLayout,
  provideDashboardLayoutSlots,
  withDashboardBreadcrumb,
} from '@layouts/dashboard-layout';
import { FocusedLayout, provideFocusedLayoutSlots } from '@layouts/focused-layout';
import {
  provideSplitLayoutSlots,
  SplitLayout,
  withSplitLayoutShowcase,
} from '@layouts/split-layout';
import { withThemeSwitcher } from '@shared/theme-switcher';

/**
 * Constant APP_ROUTES
 *
 * @description
 * Application root routes configuration: each shell on the URL it will keep.
 *
 * Every shell is now wired to real features — the authentication workflow on
 * the split shell, the error pages on the focused one, and the organization
 * tree on the dashboard, whose sidebar is filled by feature slot contributions.
 *
 * The trailing wildcard sends an unmatched address through
 * `notFoundRedirectGuard` rather than a bare `redirectTo`, so the not-found page
 * receives the URL that failed and can name it (section 9.5).
 *
 * @since 1.0.0
 */
export const APP_ROUTES: Routes = [
  {
    path: 'auth',
    component: SplitLayout,
    providers: [
      provideSplitLayoutSlots({
        showcase: [withSplitLayoutShowcase()],
        header: [withThemeSwitcher()],
      }),
    ],
    loadChildren: () => import('@features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'error',
    component: FocusedLayout,
    providers: [provideFocusedLayoutSlots({ header: [withThemeSwitcher()] })],
    loadChildren: () => import('@features/error/error.routes').then((m) => m.ERROR_ROUTES),
  },
  {
    path: '',
    component: DashboardLayout,
    providers: [
      provideDashboardLayoutSlots({
        sidebarHeader: [withOrganizationSwitcher()],
        sidebarNav: [withOrganizationNav()],
        sidebarFooter: [withAccountMenu()],
        header: [withDashboardBreadcrumb()],
        headerActions: [withThemeSwitcher()],
      }),
    ],
    children: [
      {
        path: 'organizations',
        loadChildren: () =>
          import('@features/organization/organization.routes').then((m) => m.ORGANIZATION_ROUTES),
      },
      { path: '', pathMatch: 'full', redirectTo: 'organizations' },
    ],
  },
  { path: '**', canActivate: [notFoundRedirectGuard], children: [] },
];
