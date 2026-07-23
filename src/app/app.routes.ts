import type { Routes } from '@angular/router';
import { withAccountProfile, withAccountRailMenu, withNotificationBell } from '@features/account';
import { withAuthShowcase } from '@features/auth';
import { authGuard } from '@features/auth/http/guards';
import {
  COLLABORATION_ROUTES,
  provideCollaborationAssistant,
  withCollaborationAssistantPanel,
  withCollaborationAssistantToggle,
  withCollaborationChannelNav,
  withCollaborationDirectNav,
  withCollaborationInfoPanel,
  withCollaborationInfoToggle,
  withMessagingSyncChip,
} from '@features/collaboration';
import { provideMainFeature } from '@features/main';
import { maintenanceGuard } from '@features/maintenance/http/guards';
import { onboardingGuard, onboardingRequiredGuard } from '@features/onboarding/http/guards';
import { withOnboardingShowcase } from '@features/onboarding/providers';
import {
  provideOrganizationFeature,
  withOrganizationNavigation,
  withOrganizationRail,
  withOrganizationSwitcher,
  withOrganizationWorkspaceNav,
} from '@features/organization';
import {
  withInterventionHeaderActions,
  withInterventionSyncChip,
} from '@features/organization/features/interventions';
import { organizationAccessGuard } from '@features/organization/http/guards';
import {
  organizationResolver,
  organizationTitleResolver,
} from '@features/organization/http/resolvers';
import { ORGANIZATION_SCOPED_ROUTES } from '@features/organization/organization.routes';
import { DashboardLayout, provideDashboardLayoutSlots } from '@layouts/dashboard-layout';
import { provideWorkspaceLayoutSlots, WorkspaceLayout } from '@layouts/workspace-layout';
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
    // Collaboration shell, mounted alongside the dashboard tree rather than
    // replacing it. Declared before the `''` dashboard route so this exact
    // path wins; every other organization URL still falls through to it.
    // This level carries the parameter and is deliberately COMPONENT-LESS.
    // Angular only passes a parent's params down when that parent is
    // component-less or path-less (`paramsInheritanceStrategy: 'emptyOnly'`,
    // the default). Mounting `WorkspaceLayout` here instead would hide
    // `organizationId` from every hosted route, and guards reading
    // `route.paramMap.get('organizationId')` would bounce to `/`.
    path: 'organizations/:organizationId/workspace',
    canActivate: [authGuard, maintenanceGuard, onboardingRequiredGuard, organizationAccessGuard],
    // Same context seeding the dashboard tree performs for `:organizationId`:
    // without it `ORGANIZATION_CONTEXT_PORT` stays null and the shell cannot
    // tell which organization is open.
    resolve: {
      organization: organizationResolver,
      breadcrumb: organizationTitleResolver,
    },
    providers: [
      provideMainFeature(),
      provideOrganizationFeature(),
      // Route-scoped: the assistant store reads the organization through
      // `ORGANIZATION_CONTEXT_PORT`, bound here, and both its slot
      // contributions resolve from this same injector.
      provideCollaborationAssistant(),
      provideWorkspaceLayoutSlots({
        rail: [withOrganizationRail(), withAccountRailMenu()],
        secondaryNav: [
          withOrganizationWorkspaceNav(),
          withCollaborationChannelNav(),
          withCollaborationDirectNav(),
        ],
        conversationHeader: [
          withMessagingSyncChip(),
          withCollaborationAssistantToggle(),
          withCollaborationInfoToggle(),
          withThemeSwitcher(),
        ],
        // Same contribution the dashboard shell registers: without it the
        // intervention detail page loses every header action once hosted here.
        pageHeader: [withInterventionHeaderActions()],
        panel: [withCollaborationAssistantPanel(), withCollaborationInfoPanel()],
      }),
    ],
    children: [
      {
        // Path-less, so it inherits the parameter and passes it on.
        path: '',
        component: WorkspaceLayout,
        // Hosted inside the workspace shell at their own URLs rather than
        // moved: the dashboard tree keeps serving the same pages untouched, so
        // the two shells coexist and a route family can be validated before
        // anything is retired. These are the *same* route objects the dashboard
        // mounts, so guards, resolvers and breadcrumbs cannot drift.
        children: [
          ...COLLABORATION_ROUTES,
          ...ORGANIZATION_SCOPED_ROUTES,
          {
            path: 'account',
            data: { preload: true },
            loadChildren: () =>
              import('@features/account/account.routes').then((m) => m.ACCOUNT_ROUTES),
          },
        ],
      },
    ],
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
