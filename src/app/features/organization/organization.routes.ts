import type { Routes } from '@angular/router';
import { ACCOUNT_PERMISSION, accountPermissionGuard } from '@features/account';
import {
  organizationAccessGuard,
  organizationGuard,
  organizationLandingGuard,
  organizationPermissionGuard,
  organizationSettingsLandingGuard,
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
export const ORGANIZATION_ROUTES: Routes = [
  {
    path: ':organizationId',
    canActivate: [organizationAccessGuard],
    resolve: {
      organization: organizationResolver,
      breadcrumb: organizationTitleResolver,
    },
    children: [
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
          import('./features/interventions/interventions.routes').then(
            (m) => m.INTERVENTION_ROUTES,
          ),
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
      /**
       * The compliance register.
       *
       * Additive, not a replacement for `/inspections`: the two sit behind
       * different backend permissions (`compliance.read` vs `inspection.read`),
       * so redirecting one to the other would lock out any member holding only
       * the inspection permission.
       */
      {
        path: 'compliance',
        title: 'Compliance',
        canActivate: [
          organizationPermissionGuard({
            permissions: [ORGANIZATION_PERMISSION.COMPLIANCE_READ],
          }),
        ],
        data: {
          breadcrumb: 'Compliance',
          description: 'Maintenance coverage and open non-conformities across your sites.',
        },
        loadComponent: () =>
          import('./features/compliance/ui/pages/compliance').then((m) => m.CompliancePage),
      },
      /**
       * Settings is a tab shell, and every tab is a real child route.
       *
       * The parent deliberately carries NO permission guard. It used to require
       * `SETTINGS_WRITE`; keeping that while folding members, roles and the
       * audit log underneath would lock the members list away from holders of
       * `MEMBERS_READ` and the audit log away from holders of the platform-wide
       * `audit.read`. Each tab keeps its own guard instead.
       */
      {
        path: 'settings',
        title: $localize`:@@route.settings:Settings`,
        data: { breadcrumb: 'Settings' },
        children: [
          {
            path: 'general',
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
            path: 'roles',
            canActivate: [
              organizationPermissionGuard({
                permissions: [
                  ORGANIZATION_PERMISSION.ROLES_READ,
                  ORGANIZATION_PERMISSION.ROLES_MANAGE,
                ],
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
            /**
             * The danger zone is a route, not a `?tab=` section, so its guard
             * actually runs. As a query param it was only hidden behind an
             * `@if`, and `canActivate` does not re-run on a query-param change:
             * anyone could reach it by typing the URL.
             */
            path: 'danger',
            canActivate: [
              organizationPermissionGuard({
                permissions: [ORGANIZATION_PERMISSION.DELETE],
              }),
            ],
            loadComponent: () =>
              import('./ui/pages/organization-settings-danger').then(
                (m) => m.OrganizationSettingsDangerPage,
              ),
            title: $localize`:@@route.danger:Danger zone`,
            data: {
              breadcrumb: 'Danger zone',
            },
          },
          {
            path: '',
            pathMatch: 'full',
            canActivate: [organizationSettingsLandingGuard],
            children: [],
          },
        ],
      },
      // Legacy top-level paths, kept so bookmarks and external deep links keep
      // resolving. `pathMatch: 'full'` is mandatory: with prefix matching these
      // would also swallow any deeper URL that happens to share the segment.
      { path: 'members', pathMatch: 'full', redirectTo: 'settings/members' },
      { path: 'team', pathMatch: 'full', redirectTo: 'settings/roles' },
      { path: 'audit', pathMatch: 'full', redirectTo: 'settings/audit' },
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
          // Deviation from the prototype, deliberately: it titles this page
          // "Overview", but `title` also drives the browser tab, and the
          // organization name identifies the tab far better than a word every
          // workspace shares. The description carries the prototype's copy.
          description: $localize`:@@org.overview.description:Your fire-safety operations at a glance across all sites.`,
        },
      },
    ],
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
