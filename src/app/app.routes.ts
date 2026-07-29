import type { Routes } from '@angular/router';
import { withAccountRailMenu, withNotificationBell } from '@features/account';
import { withAuthShowcase } from '@features/auth';
import { authGuard } from '@features/auth/http/guards';
import { provideMainFeature } from '@features/main';
import { maintenanceGuard } from '@features/maintenance/http/guards';
import { onboardingGuard, onboardingRequiredGuard } from '@features/onboarding/http/guards';
import { withOnboardingShowcase } from '@features/onboarding/providers';
import {
  provideOrganizationFeature,
  withOrganizationRail,
  withOrganizationWorkspaceNav,
} from '@features/organization';
import {
  provideCollaborationAssistant,
  withCollaborationAssistantPanel,
  withCollaborationAssistantToggle,
  withCollaborationChannelNav,
  withCollaborationDirectNav,
  withCollaborationInfoPanel,
  withCollaborationInfoToggle,
  withMessagingSyncChip,
} from '@features/organization/features/collaboration';
import {
  withInterventionHeaderActions,
  withInterventionSyncChip,
} from '@features/organization/features/interventions';
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
 * Every authenticated destination is served by a single shell,
 * {@link WorkspaceLayout}: the root path (`/`) forwards to the active
 * organization, organization-scoped pages live under
 * `/organizations/:organizationId`, and the cross-organization page —
 * `/account` — sits beside them.
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
    component: WorkspaceLayout,
    canActivate: [authGuard, maintenanceGuard, onboardingRequiredGuard],
    providers: [
      provideMainFeature(),
      provideOrganizationFeature(),
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
          withInterventionSyncChip(),
          withCollaborationAssistantToggle(),
          withCollaborationInfoToggle(),
          withNotificationBell(),
          withThemeSwitcher(),
        ],
        pageHeader: [withInterventionHeaderActions()],
        panel: [withCollaborationAssistantPanel(), withCollaborationInfoPanel()],
      }),
    ],
    children: [
      {
        path: '',
        data: { breadcrumb: false },
        loadChildren: () => import('@features/main/main.routes').then((m) => m.MAIN_ROUTES),
      },
      {
        path: 'organizations',
        data: { breadcrumb: false },
        loadChildren: () =>
          import('@features/organization/organization.routes').then((m) => m.ORGANIZATION_ROUTES),
      },
      {
        path: 'account',
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
