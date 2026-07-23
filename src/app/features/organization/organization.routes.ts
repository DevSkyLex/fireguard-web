import type { Routes } from '@angular/router';
import { ACCOUNT_PERMISSION, accountPermissionGuard } from '@features/account';
import {
  organizationAccessGuard,
  organizationGuard,
  organizationLandingGuard,
  organizationPermissionGuard,
} from './http/guards';
import { organizationResolver, organizationTitleResolver } from './http/resolvers';
import { ORGANIZATION_PERMISSION } from './models';

/**
 * Constant ORGANIZATION_ROUTES
 *
 * @description
 * Routes for the organization feature module.
 *
 * - `/organizations` — redirect-only entry point: `organizationGuard` forwards
 *   to the user's default organization workspace (last used, else first
 *   accessible, else onboarding)
 * - `/organizations/:organizationId` — organization-scoped pages
 *
 * @since 1.0.0
 */
export const ORGANIZATION_SCOPED_ROUTES: Routes = [
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
      preload: true,
    },
    loadChildren: () =>
      import('./features/interventions/interventions.routes').then((m) => m.INTERVENTION_ROUTES),
  },
  {
    path: 'facilities',
    data: {
      breadcrumb: 'Facilities',
      preload: true,
    },
    loadChildren: () =>
      import('./features/facilities/facilities.routes').then((m) => m.FACILITY_ROUTES),
  },
  {
    path: 'equipments',
    data: {
      breadcrumb: 'Equipments',
      preload: true,
    },
    loadChildren: () =>
      import('./features/equipments/equipments.routes').then((m) => m.EQUIPMENT_ROUTES),
  },
  {
    path: 'inspections',
    data: {
      breadcrumb: 'Inspections',
      preload: true,
    },
    loadChildren: () =>
      import('./features/inspections/inspections.routes').then((m) => m.INSPECTION_ROUTES),
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
      preload: true,
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
      preload: true,
    },
  },
  {
    /**
     * Audit log entry point. Gated by the global `audit.read` permission
     * (`@features/account`), not organization-member RBAC: audit access is a
     * platform-wide capability that happens to be reachable from inside the
     * organization shell rather than a per-organization member permission.
     */
    path: 'audit',
    canActivate: [
      accountPermissionGuard({
        permissions: [ACCOUNT_PERMISSION.AUDIT_READ],
      }),
    ],
    loadComponent: () =>
      import('./ui/pages/organization-audit-log/organization-audit-log.component').then(
        (m) => m.OrganizationAuditLogPage,
      ),
    title: $localize`:@@route.audit:Audit log`,
    data: {
      breadcrumb: 'Audit log',
      preload: true,
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
      preload: true,
    },
  },
  {
    path: '',
    canActivate: [organizationLandingGuard],
    loadComponent: () =>
      import('./ui/pages/organization-overview/organization-overview.component').then(
        (m) => m.OrganizationOverviewPage,
      ),
    title: organizationTitleResolver,
    data: {
      breadcrumb: false,
      preload: true,
    },
  },
];

/**
 * Constant ORGANIZATION_ROUTES
 *
 * @description
 * Organization route tree as mounted by the dashboard shell: the
 * `:organizationId` segment carries the access guard and the context
 * resolvers, then delegates to {@link ORGANIZATION_SCOPED_ROUTES}.
 *
 * The workspace shell mounts the very same children under its own
 * `:organizationId` segment, so neither shell can drift from the other on
 * destinations, guards or breadcrumbs.
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
     * Redirect-only default-organization entry point.
     *
     * `organizationGuard` always returns a UrlTree (last-used organization,
     * first accessible organization, or onboarding), so this route never
     * activates and needs no component.
     */
    path: '',
    pathMatch: 'full',
    canActivate: [organizationGuard],
    children: [],
  },
];
