import { inject } from '@angular/core';
import type { RedirectFunction, Routes } from '@angular/router';
import { Router } from '@angular/router';
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
 * Function redirectToOrganizationMembersTab
 *
 * @description
 * Builds the `redirectTo` for the retired `/team` and `/teams` segments,
 * absorbed as `OrganizationMembersPage` tabs: `/members?tab=roles|teams`,
 * preserving every other query param the incoming URL carried — the same
 * merge-preserving shape as `redirectToInterventionView`
 * (`interventions.routes.ts`).
 *
 * @since 3.0.0
 *
 * @param {'roles' | 'teams'} tab - Which absorbed tab the retired segment maps to.
 *
 * @returns {RedirectFunction} A redirect resolving to the merged `UrlTree`.
 */
function redirectToOrganizationMembersTab(tab: 'roles' | 'teams'): RedirectFunction {
  return (redirectData) => {
    const router: Router = inject(Router);
    const organizationId: string | null = redirectData.paramMap.get('organizationId');

    return router.createUrlTree(['/organizations', organizationId, 'members'], {
      queryParams: { ...redirectData.queryParams, tab },
    });
  };
}

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
 * explorer (`assets`), the maintenance schedule board (`maintenance`), the
 * four-eyes approvals inbox (`approvals`), the checklist template library
 * (`checklists`), the bulk CSV import surface (`imports`), the audit journal
 * (`audit`), the administration pages (members, settings) and a member's
 * profile are mounted today. `statistics` is a permanent redirect to the
 * landing page for old bookmarks and deep links.
 *
 * `members` now also carries what used to be the `team` (roles &
 * permissions) and `teams` routes, absorbed as `OrganizationMembersPage`
 * tabs (`?tab=roles`, `?tab=teams`) — see the page's own `@description` for
 * the per-tab permission story. `/team` and `/teams` stay addressable as
 * functional redirects ({@link redirectToOrganizationMembersTab}) so
 * existing links and bookmarks keep working.
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
        path: 'imports',
        loadChildren: () =>
          import('./features/imports/imports.routes').then((m) => m.IMPORT_ROUTES),
      },
      {
        path: 'maintenance',
        loadChildren: () =>
          import('./features/maintenance-schedules/maintenance-schedules.routes').then(
            (m) => m.MAINTENANCE_SCHEDULE_ROUTES,
          ),
      },
      {
        path: 'approvals',
        loadChildren: () =>
          import('./features/approvals/approvals.routes').then((m) => m.APPROVAL_ROUTES),
      },
      {
        path: 'checklists',
        loadChildren: () =>
          import('./features/checklists/checklists.routes').then((m) => m.CHECKLIST_ROUTES),
      },
      {
        path: 'audit',
        loadChildren: () => import('./features/audit/audit.routes').then((m) => m.AUDIT_ROUTES),
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
              ORGANIZATION_PERMISSION.ROLES_READ,
              ORGANIZATION_PERMISSION.ROLES_MANAGE,
              ORGANIZATION_PERMISSION.TEAMS_READ,
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
        redirectTo: redirectToOrganizationMembersTab('roles'),
      },
      {
        path: 'teams',
        redirectTo: redirectToOrganizationMembersTab('teams'),
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
