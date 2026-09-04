import type { Routes } from '@angular/router';
import { withAccountMenu, withNotificationBell } from '@features/account';
import { authGuard, withLogoutControl } from '@features/auth';
import { notFoundRedirectGuard } from '@features/error';
import { maintenanceGuard } from '@features/maintenance/http/guards';
import { onboardingRequiredGuard } from '@features/onboarding/http/guards';
import { withOnboardingShowcase } from '@features/onboarding/providers';
import {
  provideCollaborationAssistant,
  withAssistantToggle,
  withCollaborationNav,
  withDirectMessagesSidebarExtension,
  withChannelsSidebarExtension,
  provideChannelsWorkspace,
  withGlobalSearch,
  withOrganizationNav,
  withOrganizationSwitcher,
  withSyncIndicator,
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
 * The auth split shell uses a presentation panel; onboarding keeps a compact rail.
 * `data.splitWidth` sizes
 * the main form: `md` for authentication and `xl` for onboarding offers.
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
 * `organizations/invitations/accept` is declared before the dashboard `''`
 * route and outside its `organizations` child subtree on purpose: that subtree
 * is reached through `organizationGuard`/`organizationAccessGuard`, both of
 * which assume an authenticated member picking a workspace, while an
 * invitation link must stay reachable signed out. It shares the focused shell
 * with `error` and `auth` — a single centered page, no sidebar — because
 * nothing here needs a workspace to render.
 *
 * @since 1.0.0
 */
export const APP_ROUTES: Routes = [
  {
    path: 'auth',
    component: SplitLayout,
    data: { splitShowcase: 'panel' },
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
    data: { splitWidth: 'xl', splitAlign: 'start' },
    providers: [
      provideSplitLayoutSlots({
        showcase: [withSplitLayoutShowcase(), withOnboardingShowcase()],
        header: [withThemeSwitcher(), withLogoutControl()],
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
    path: 'maintenance',
    component: FocusedLayout,
    providers: [provideFocusedLayoutSlots({ header: [withThemeSwitcher()] })],
    loadChildren: () =>
      import('@features/maintenance/maintenance.routes').then((m) => m.MAINTENANCE_ROUTES),
  },
  {
    path: 'organizations/invitations/accept',
    component: FocusedLayout,
    providers: [provideFocusedLayoutSlots({ header: [withThemeSwitcher()] })],
    loadChildren: () =>
      import('@features/organization/organization-invitation-accept.routes').then(
        (m) => m.ORGANIZATION_INVITATION_ACCEPT_ROUTES,
      ),
  },
  {
    path: '',
    component: DashboardLayout,
    canActivate: [onboardingRequiredGuard],
    providers: [
      provideCollaborationAssistant(),
      provideChannelsWorkspace(),
      provideDashboardLayoutSlots({
        sidebarHeader: [withOrganizationSwitcher()],
        sidebarNav: [withOrganizationNav()],
        sidebarExtension: [withDirectMessagesSidebarExtension(), withChannelsSidebarExtension()],
        sidebarFooter: [withCollaborationNav(), withDashboardGlobalNav(), withAccountMenu()],
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
