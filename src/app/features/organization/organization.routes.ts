import type { Routes } from '@angular/router';
import { FacilityTreeStore } from './features/facilities/state';
import {
  organizationAccessGuard,
  organizationGuard,
  organizationPermissionGuard,
} from './http/guards';
import { organizationResolver, organizationTitleResolver } from './http/resolvers';
import { ORGANIZATION_PERMISSION } from './models';
import { ComplianceExplorerStore } from './state/compliance-explorer';
import { OrganizationAssetsPaneStore } from './state/organization-assets-pane';

/**
 * Constant ORGANIZATION_ROUTES
 *
 * @description
 * The feature's route entry point, and everything served under one organization.
 *
 * `/organizations` is redirect-only: `organizationGuard` forwards to the
 * default workspace — the last organization persisted in the cookie when it is
 * still accessible, else the first accessible one, else onboarding. Its empty
 * `children` exists only to make the path matchable, since the guard always
 * redirects and no component is ever constructed. There is no organization list
 * page; switching happens through the sidebar switcher.
 *
 * `/organizations/:organizationId` resolves organization context before any
 * child renders, so a page never has to reason about a half-known workspace.
 *
 * The landing page — the merged Dashboard, combining the retired Today and
 * Statistics pages into one tabbed surface (`FEATURE.md`) — the
 * conversational surfaces (direct messages and channels), the estate
 * explorer (`assets`), the administration pages (members, team, settings)
 * and a member's profile are mounted today; `checklists` returns under
 * `:organizationId` once its page is rebuilt, and the sidebar navigation
 * already lists it behind its permissions. `statistics` is a permanent
 * redirect to the landing page for old bookmarks and deep links.
 *
 * `messages` and `channels` load the collaboration subfeature's route files
 * directly rather than its barrel, which also exports the offline sync
 * coordinator and would pull it into this lazy chunk.
 *
 * @since 1.0.0
 */
export const ORGANIZATION_ROUTES: Routes = [
  {
    path: '',
    canActivate: [organizationGuard],
    children: [],
  },
  {
    path: ':organizationId',
    canActivate: [organizationAccessGuard],
    resolve: {
      organization: organizationResolver,
    },
    title: organizationTitleResolver,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./ui/pages/organization-dashboard-page/organization-dashboard-page.component').then(
            (m) => m.OrganizationDashboardPage,
          ),
        title: $localize`:@@route.dashboard:Dashboard`,
        data: { breadcrumb: false },
      },
      {
        path: 'messages',
        loadChildren: () =>
          import('./features/collaboration/collaboration.routes').then(
            (m) => m.COLLABORATION_ROUTES,
          ),
      },
      {
        path: 'channels',
        loadChildren: () =>
          import('./features/collaboration/channels.routes').then((m) => m.CHANNEL_ROUTES),
      },
      {
        path: 'interventions',
        loadChildren: () =>
          import('./features/interventions/interventions.routes').then(
            (m) => m.INTERVENTION_ROUTES,
          ),
      },
      {
        path: 'assets',
        canActivate: [
          organizationPermissionGuard({
            permissions: [ORGANIZATION_PERMISSION.FACILITIES_READ],
          }),
        ],
        providers: [FacilityTreeStore, OrganizationAssetsPaneStore, ComplianceExplorerStore],
        loadComponent: () =>
          import('./ui/pages/organization-assets-page/organization-assets-page.component').then(
            (m) => m.OrganizationAssetsPage,
          ),
        title: $localize`:@@route.assets:Assets`,
        data: { breadcrumb: $localize`:@@route.assets:Assets` },
      },
      {
        path: 'equipments',
        loadChildren: () =>
          import('./features/equipments/equipments.routes').then((m) => m.EQUIPMENT_ROUTES),
      },
      {
        path: 'facilities',
        loadChildren: () =>
          import('./features/facilities/facilities.routes').then((m) => m.FACILITY_ROUTES),
      },
      {
        path: 'inspections',
        loadChildren: () =>
          import('./features/inspections/inspections.routes').then((m) => m.INSPECTION_ROUTES),
      },
      {
        path: 'calendar',
        loadChildren: () =>
          import('./features/calendar/calendar.routes').then((m) => m.CALENDAR_ROUTES),
      },
      {
        path: 'statistics',
        pathMatch: 'full',
        redirectTo: '',
      },
      {
        path: 'members',
        canActivate: [
          organizationPermissionGuard({
            permissions: [
              ORGANIZATION_PERMISSION.MEMBERS_READ,
              ORGANIZATION_PERMISSION.MEMBERS_MANAGE,
            ],
            match: 'any',
          }),
        ],
        loadComponent: () =>
          import('./ui/pages/organization-members-page/organization-members-page.component').then(
            (m) => m.OrganizationMembersPage,
          ),
        title: $localize`:@@route.members:Members`,
        data: { breadcrumb: $localize`:@@route.members:Members` },
      },
      {
        path: 'team',
        canActivate: [
          organizationPermissionGuard({
            permissions: [ORGANIZATION_PERMISSION.ROLES_READ, ORGANIZATION_PERMISSION.ROLES_MANAGE],
            match: 'any',
          }),
        ],
        loadComponent: () =>
          import('./ui/pages/organization-team-page/organization-team-page.component').then(
            (m) => m.OrganizationTeamPage,
          ),
        title: $localize`:@@route.team:Team`,
        data: { breadcrumb: $localize`:@@route.team:Team` },
      },
      {
        path: 'settings',
        canActivate: [
          organizationPermissionGuard({
            permissions: [ORGANIZATION_PERMISSION.SETTINGS_WRITE],
          }),
        ],
        loadComponent: () =>
          import('./ui/pages/organization-settings-page/organization-settings-page.component').then(
            (m) => m.OrganizationSettingsPage,
          ),
        title: $localize`:@@route.settings:Settings`,
        data: { breadcrumb: $localize`:@@route.settings:Settings` },
      },
      {
        path: 'members/:memberId',
        loadComponent: () =>
          import('./ui/pages/organization-member-profile-page/organization-member-profile-page.component').then(
            (m) => m.OrganizationMemberProfilePage,
          ),
        title: $localize`:@@route.memberProfile:Profile`,
        data: { breadcrumb: $localize`:@@route.memberProfile:Profile` },
      },
    ],
  },
];
