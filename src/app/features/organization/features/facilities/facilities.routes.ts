import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { facilityResolver, facilityTitleResolver } from './http/resolvers';

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
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.FACILITIES_WRITE] }),
    ],
    loadComponent: () =>
      import('./ui/pages/facility-create/facility-create.component').then(
        (m) => m.FacilityCreatePage,
      ),
    title: 'Create Facility',
  },
  {
    path: ':facilityId',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.FACILITIES_READ] }),
    ],
    resolve: {
      facility: facilityResolver,
      breadcrumb: facilityTitleResolver,
    },
    children: [
      {
        path: 'edit',
        canActivate: [
          organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.FACILITIES_WRITE] }),
        ],
        loadComponent: () =>
          import('./ui/pages/facility-edit/facility-edit.component').then(
            (m) => m.FacilityEditPage,
          ),
        title: 'Edit Facility',
      },
      {
        path: '',
        loadComponent: () =>
          import('./ui/pages/facility-detail/facility-detail.component').then(
            (m) => m.FacilityDetailPage,
          ),
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
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.FACILITIES_READ] }),
    ],
    loadComponent: () =>
      import('./ui/pages/facility-list/facility-list.component').then((m) => m.FacilityListPage),
    title: 'Facilities',
    data: {
      breadcrumb: false,
      preload: true,
    },
  },
];
