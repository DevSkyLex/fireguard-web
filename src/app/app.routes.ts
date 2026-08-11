import type { Routes } from '@angular/router';
import { withAccountMenu } from '@features/account';
import { authGuard } from '@features/auth';
import { notFoundRedirectGuard } from '@features/error';
import { maintenanceGuard } from '@features/maintenance/http/guards';
import { onboardingRequiredGuard } from '@features/onboarding/http/guards';
import { withOnboardingShowcase } from '@features/onboarding/providers';
import {
  provideCollaborationAssistant,
  withAssistantToggle,
  withDirectMessagesNav,
  withOrganizationNav,
  withOrganizationSwitcher,
} from '@features/organization';
import {
  DashboardLayout,
  provideDashboardLayoutSlots,
  withDashboardBreadcrumb,
  withDashboardGlobalNav,
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
 * Every shell is wired to real features — the authentication workflow and the
 * mandatory activation wizard share the split shell, the error pages the
 * focused one, and both the account and the organization tree the dashboard.
 *
 * The dashboard is mounted **once**, for every signed-in destination. Its
 * sidebar is composed rather than swapped per section: the organization block
 * fills it while an organization is selected, and the global destinations sit
 * at the bottom whether or not one is. Two mounts would rebuild the shell — and
 * lose the sidebar's state with it — every time the reader stepped into their
 * account.
 *
 * `onboardingRequiredGuard` on the dashboard root is the mandatory half of the
 * mutual gate it forms with `/onboarding`'s own `onboardingGuard`: any
 * non-completed record is redirected to the wizard before any dashboard child
 * route resolves, and `organizationGuard` still sends an organization-less
 * member to the same wizard as its own fallback once inside (`@features/onboarding`
 * `FEATURE.md` "Routing and SSR Notes").
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
    path: 'onboarding',
    component: SplitLayout,
    canActivate: [authGuard, maintenanceGuard],
    providers: [
      provideSplitLayoutSlots({
        showcase: [withSplitLayoutShowcase(), withOnboardingShowcase()],
        header: [withThemeSwitcher()],
      }),
    ],
    loadChildren: () =>
      import('@features/onboarding/onboarding.routes').then((m) => m.ONBOARDING_ROUTES),
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
    canActivate: [onboardingRequiredGuard],
    providers: [
      provideCollaborationAssistant(),
      provideDashboardLayoutSlots({
        sidebarHeader: [withOrganizationSwitcher()],
        sidebarNav: [withOrganizationNav(), withDirectMessagesNav(), withDashboardGlobalNav()],
        sidebarFooter: [withAccountMenu()],
        header: [withDashboardBreadcrumb()],
        headerActions: [withAssistantToggle(), withThemeSwitcher()],
      }),
    ],
    children: [
      {
        path: 'account',
        canActivate: [authGuard],
        loadChildren: () =>
          import('@features/account/account.routes').then((m) => m.ACCOUNT_ROUTES),
      },
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
