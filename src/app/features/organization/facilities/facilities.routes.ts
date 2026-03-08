import type { Routes } from '@angular/router';
import { facilityResolver, facilityTitleResolver } from '@core/resolvers';

/**
 * Constant FACILITY_ROUTES
 *
 * @description
 * Routes for the facility feature, nested under the organization
 * context (`/organizations/:organizationId/facilities`).
 *
 * - `/facilities` — list of facilities for the current organization
 * - `/facilities/:facilityId` — facility detail page with tabs
 *
 * @since 1.0.0
 */
export const FACILITY_ROUTES: Routes = [
  {
    path: 'create',
    loadComponent: () => import('./pages/facility-create/facility-create.component').then((m) => m.FacilityCreatePage),
    title: 'Create Facility',
  },
  {
    path: ':facilityId',
    resolve: {
      facility: facilityResolver,
      breadcrumb: facilityTitleResolver,
    },
    children: [
      {
        path: 'edit',
        loadComponent: () => import('./pages/facility-edit/facility-edit.component').then((m) => m.FacilityEditPage),
        title: 'Edit Facility',
      },
      {
        path: '',
        loadComponent: () => import('./pages/facility-detail/facility-detail.component').then((m) => m.FacilityDetailPage),
        title: facilityTitleResolver,
        data: {
          breadcrumb: false,
        },
      },
    ],
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/facility-list/facility-list.component').then((m) => m.FacilityListPage),
    title: 'Facilities',
    data: {
      breadcrumb: false,
    },
  },
];
