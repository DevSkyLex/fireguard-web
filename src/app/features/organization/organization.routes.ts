import type { Routes } from '@angular/router';
import { organizationResolver } from '@core/resolvers';
import { organizationTitleResolver } from '@core/resolvers/organization-title';

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
    resolve: {
      organization: organizationResolver,
      breadcrumb: organizationTitleResolver,
    },
    children: [
      {
        path: 'facilities',
        loadChildren: () => import('./features/facilities/facilities.routes').then((m) => m.FACILITY_ROUTES),
        data: {
          breadcrumb: 'Facilities',
        },
      },
      {
        path: 'equipments',
        loadChildren: () => import('./features/equipments/equipments.routes').then((m) => m.EQUIPMENT_ROUTES),
        data: {
          breadcrumb: 'Equipments',
        },
      },
      {
        path: 'inspections',
        loadChildren: () => import('./features/inspections/inspections.routes').then((m) => m.INSPECTION_ROUTES),
        data: {
          breadcrumb: 'Inspections',
        },
      },
      {
        path: '',
        loadComponent: () => import('./pages/organization-overview/organization-overview.component').then((m) => m.OrganizationOverviewPage),
        title: organizationTitleResolver,
        data: {
          breadcrumb: false,
        },
      },
    ],
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/organization-list/organization-list.component').then((m) => m.OrganizationListPage),
    title: 'Organizations',
    data: {
      breadcrumb: false,
    },
  },
];
