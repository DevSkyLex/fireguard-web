import type { Routes } from '@angular/router';
import { organizationAccessGuard, organizationPermissionGuard } from './http/guards';
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
        path: '',
        canActivate: [
          organizationPermissionGuard({
            permissions: [ORGANIZATION_PERMISSION.DASHBOARD_READ],
            redirectTo: ['/organizations'],
          }),
        ],
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
