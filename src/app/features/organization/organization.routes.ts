import type { Routes } from '@angular/router';
import {
  organizationAccessGuard,
  organizationGuard,
  organizationLandingGuard,
  organizationPermissionGuard,
} from './http/guards';
import { organizationResolver, organizationTitleResolver } from './http/resolvers';
import { ORGANIZATION_PERMISSION } from './models';

/**
 * Constant ORGANIZATION_SCOPED_ROUTES
 *
 * @description
 * Everything served under an organization: this feature's own pages and its
 * nested subfeatures, each mounted through its own lazy route file.
 *
 * Private to this file — external consumers mount {@link ORGANIZATION_ROUTES},
 * which wraps these children with the `:organizationId` segment that gates and
 * resolves them.
 *
 * @since 1.0.0
 */
const ORGANIZATION_SCOPED_ROUTES: Routes = [
  /**
   * Intervention workspace entrypoint.
   *
   * The intervention subfeature remains fully lazy-loaded and owns its own
   * permission gates and page orchestration.
   */
  {
    path: 'interventions',
    data: {
      breadcrumb: 'Interventions',
    },
    loadChildren: () =>
      import('./features/interventions/interventions.routes').then((m) => m.INTERVENTION_ROUTES),
  },
  {
    path: 'facilities',
    data: {
      breadcrumb: 'Facilities',
    },
    loadChildren: () =>
      import('./features/facilities/facilities.routes').then((m) => m.FACILITY_ROUTES),
  },
  {
    path: 'equipments',
    data: {
      breadcrumb: 'Equipments',
    },
    loadChildren: () =>
      import('./features/equipments/equipments.routes').then((m) => m.EQUIPMENT_ROUTES),
  },
  {
    path: 'inspections',
    data: {
      breadcrumb: 'Inspections',
    },
    loadChildren: () =>
      import('./features/inspections/inspections.routes').then((m) => m.INSPECTION_ROUTES),
  },
  {
    path: 'statistics',
    canActivate: [
      organizationPermissionGuard({
        permissions: [ORGANIZATION_PERMISSION.DASHBOARD_READ],
      }),
    ],
    loadComponent: () =>
      import('./ui/pages/organization-statistics/organization-statistics.component').then(
        (m) => m.OrganizationStatisticsPage,
      ),
    title: $localize`:@@route.statistics:Statistics`,
    data: {
      breadcrumb: 'Statistics',
    },
  },
  {
    path: 'members',
    canActivate: [
      organizationPermissionGuard({
        permissions: [ORGANIZATION_PERMISSION.MEMBERS_READ, ORGANIZATION_PERMISSION.MEMBERS_MANAGE],
        match: 'any',
      }),
    ],
    loadComponent: () =>
      import('./ui/pages/organization-members/organization-members.component').then(
        (m) => m.OrganizationMembersPage,
      ),
    title: $localize`:@@route.members:Members`,
    data: {
      breadcrumb: 'Members',
    },
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
      import('./ui/pages/organization-team/organization-team.component').then(
        (m) => m.OrganizationTeamPage,
      ),
    title: $localize`:@@route.team:Roles`,
    data: {
      breadcrumb: 'Roles',
    },
  },
  {
    path: 'settings',
    canActivate: [
      organizationPermissionGuard({
        permissions: [ORGANIZATION_PERMISSION.SETTINGS_WRITE],
      }),
    ],
    loadComponent: () =>
      import('./ui/pages/organization-settings/organization-settings.component').then(
        (m) => m.OrganizationSettingsPage,
      ),
    title: $localize`:@@route.settings:Settings`,
    data: {
      breadcrumb: 'Settings',
    },
  },
  {
    path: '',
    canActivate: [organizationLandingGuard],
    loadComponent: () =>
      import('./ui/pages/organization-today/organization-today.component').then(
        (m) => m.OrganizationTodayPage,
      ),
    title: organizationTitleResolver,
    data: {
      breadcrumb: false,
    },
  },
  {
    /**
     * Conversational destinations (`channels/:channelId`, `direct/:conversationId`,
     * `saved`). Unlike its sibling subfeatures they share no prefix segment, so
     * the subfeature is mounted path-less rather than under a folder segment.
     *
     * Declared last on purpose: an empty-path route is tried in order, and the
     * organization overview above already answers the bare organization URL —
     * so that URL never loads this chunk. Anything the overview cannot consume
     * falls through to here.
     */
    path: '',
    loadChildren: () =>
      import('./features/collaboration/collaboration.routes').then((m) => m.COLLABORATION_ROUTES),
  },
];

/**
 * Constant ORGANIZATION_ROUTES
 *
 * @description
 * The feature's route tree, mounted by the app shell at `/organizations`.
 *
 * The `:organizationId` segment is deliberately component-less: it exists to
 * carry the parameter, gate access and seed the organization context, then hand
 * over to {@link ORGANIZATION_SCOPED_ROUTES}.
 *
 * @since 1.0.0
 */
export const ORGANIZATION_ROUTES: Routes = [
  {
    path: ':organizationId',
    canActivate: [organizationAccessGuard],
    resolve: {
      organization: organizationResolver,
      breadcrumb: organizationTitleResolver,
    },
    children: ORGANIZATION_SCOPED_ROUTES,
  },
  {
    /**
     * Redirect-only default-organization entry point. `organizationGuard`
     * always returns a UrlTree (last-used organization, first accessible
     * organization, or onboarding), so this route never activates and needs no
     * component.
     */
    path: '',
    pathMatch: 'full',
    canActivate: [organizationGuard],
    children: [],
  },
];
