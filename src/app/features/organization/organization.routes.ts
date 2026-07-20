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
      /**
       * The facilities map is owned by the organization parent, not the
       * facilities subfeature: a route outside `facilities/` would fall out of
       * `FACILITY_ROUTES` and break the URL-to-ownership match the nested
       * feature exists to keep.
       */
      {
        path: 'map',
        title: 'Map',
        canActivate: [
          organizationPermissionGuard({
            permissions: [ORGANIZATION_PERMISSION.FACILITIES_READ],
          }),
        ],
        data: {
          breadcrumb: 'Map',
          description: 'Every geolocated facility on one map.',
        },
        loadComponent: () =>
          import('./ui/pages/organization-map').then((m) => m.OrganizationMapPage),
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
        path: 'messages',
        canActivate: [
          organizationPermissionGuard({
            permissions: [ORGANIZATION_PERMISSION.MESSAGING_READ],
          }),
        ],
        data: { breadcrumb: 'Messages' },
        children: [
          {
            path: '',
            title: 'Messages',
            loadComponent: () =>
              import('./features/messaging/ui/pages/messaging').then((m) => m.MessagingPage),
          },
          {
            path: 'saved',
            title: $localize`:@@route.saved:Saved items`,
            data: {
              breadcrumb: 'Saved items',
              description: 'Messages you bookmarked across this workspace.',
            },
            loadComponent: () =>
              import('./features/messaging/ui/pages/saved-messages').then(
                (m) => m.SavedMessagesPage,
              ),
          },
          {
            path: 'drafts',
            title: $localize`:@@route.drafts:Drafts`,
            data: {
              breadcrumb: 'Drafts',
              description:
                'Half-written messages waiting on this device — never sent on their own.',
            },
            loadComponent: () =>
              import('./features/messaging/ui/pages/drafts').then((m) => m.DraftsPage),
          },
        ],
      },
      /*
       * The assistant has no route of its own: the design kit puts it beside
       * the thread it answers from, so it is contributed to the shell's panel
       * slot by `withAssistantPanel()` (registered in `app.routes.ts`) and
       * opened from the composer's sparkles action.
       *
       * The `assistant.use` gate moved with it, onto the panel's `available`.
       * ⚠️ Same caveat as before: the backend also has a per-organization
       * setting that can switch the assistant off, which neither the route nor
       * the panel reads — it needs exposing on `OrganizationSettingsOutput`.
       */
      {
        path: 'calendar',
        title: 'Calendar',
        canActivate: [
          organizationPermissionGuard({
            permissions: [ORGANIZATION_PERMISSION.EVENTS_READ],
          }),
        ],
        data: {
          breadcrumb: 'Calendar',
          description: 'Interventions, inspections, maintenance and events on one grid.',
        },
        loadComponent: () =>
          import('./features/calendar/ui/pages/calendar').then((m) => m.CalendarPage),
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
       * Billing is a top-level surface, not a settings section: it has its own
       * audience and its own workflows (plan, invoices, card, consumption).
       *
       * ⚠️ Gated on SETTINGS_WRITE as an interim — the backend exposes no
       * `organization.billing.*` permission, so nothing more precise exists.
       */
      {
        path: 'billing',
        canActivate: [
          organizationPermissionGuard({
            permissions: [ORGANIZATION_PERMISSION.SETTINGS_WRITE],
          }),
        ],
        loadComponent: () =>
          import('./ui/pages/organization-billing').then((m) => m.OrganizationBillingPage),
        title: $localize`:@@route.billing:Billing`,
        data: {
          breadcrumb: 'Billing',
          description: 'Plan, invoices, payment method and usage against your limits.',
        },
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
            /**
             * Pending-invitations management. Gated on MEMBERS_MANAGE alone:
             * resending, revoking and copying accept links are management
             * actions, so read-only members (MEMBERS_READ) have no business
             * here — they keep the read-only invitations tab on the members
             * page.
             */
            path: 'invitations',
            canActivate: [
              organizationPermissionGuard({
                permissions: [ORGANIZATION_PERMISSION.MEMBERS_MANAGE],
              }),
            ],
            loadComponent: () =>
              import('./ui/pages/organization-settings-invitations').then(
                (m) => m.OrganizationSettingsInvitationsPage,
              ),
            title: $localize`:@@route.invitations:Invitations`,
            data: { breadcrumb: 'Invitations' },
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
            path: 'legal',
            canActivate: [
              organizationPermissionGuard({
                permissions: [ORGANIZATION_PERMISSION.SETTINGS_WRITE],
              }),
            ],
            loadComponent: () =>
              import('./ui/pages/organization-settings-legal').then(
                (m) => m.OrganizationSettingsLegalPage,
              ),
            title: $localize`:@@route.legal:Legal profile`,
            data: { breadcrumb: 'Legal profile' },
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
