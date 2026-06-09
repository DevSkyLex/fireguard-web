import type { Routes } from '@angular/router';
import {
  organizationAccessGuard,
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
 * - `/organizations` — list of user organizations
 * - `/organizations/:organizationId` — organization-scoped pages
 *
 * @since 1.0.0
 */
export const ORGANIZATION_ROUTES: Routes = [
  {
    path: 'invitations/accept',
    loadComponent: () =>
      import('./ui/pages/organization-invitation-accept/organization-invitation-accept.component').then(
        (m) => m.OrganizationInvitationAcceptPage,
      ),
    title: 'Accept Invitation',
    data: {
      breadcrumb: false,
    },
  },
  {
    path: ':organizationId',
    canActivate: [organizationAccessGuard],
    resolve: {
      organization: organizationResolver,
      breadcrumb: organizationTitleResolver,
    },
    children: [
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
        path: 'checklists',
        data: {
          breadcrumb: 'Checklists',
          preload: true,
        },
        loadChildren: () =>
          import('./features/checklists/checklists.routes').then((m) => m.CHECKLIST_ROUTES),
      },
      {
        path: 'team',
        canActivate: [
          organizationPermissionGuard({
            permissions: [
              ORGANIZATION_PERMISSION.MEMBERS_READ,
              ORGANIZATION_PERMISSION.MEMBERS_MANAGE,
              ORGANIZATION_PERMISSION.ROLES_READ,
              ORGANIZATION_PERMISSION.ROLES_MANAGE,
            ],
            match: 'any',
            redirectTo: ['/organizations'],
          }),
        ],
        loadComponent: () =>
          import('./ui/pages/organization-team/organization-team.component').then(
            (m) => m.OrganizationTeamPage,
          ),
        title: 'Team',
        data: {
          breadcrumb: 'Team',
          preload: true,
        },
      },
      {
        path: 'settings/legal',
        canActivate: [
          organizationPermissionGuard({
            permissions: [ORGANIZATION_PERMISSION.LEGAL_PROFILE_WRITE],
            redirectTo: ['/organizations'],
          }),
        ],
        loadComponent: () =>
          import('./ui/pages/organization-legal-profile/organization-legal-profile.component').then(
            (m) => m.OrganizationLegalProfilePage,
          ),
        title: 'Legal Profile',
        data: {
          breadcrumb: 'Legal Profile',
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
    ],
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./ui/pages/organization-list/organization-list.component').then(
        (m) => m.OrganizationListPage,
      ),
    title: 'Organizations',
    data: {
      breadcrumb: false,
      preload: true,
    },
  },
];
