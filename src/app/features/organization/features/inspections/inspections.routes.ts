import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';

/**
 * Constant INSPECTION_ROUTES
 *
 * @description
 * Routes for the inspection feature, nested under the organization
 * context (`/organizations/:organizationId/inspections`).
 *
 * @since 1.0.0
 */
export const INSPECTION_ROUTES: Routes = [
  {
    path: 'create',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.INSPECTION_WRITE] }),
    ],
    loadComponent: () =>
      import('./ui/pages/inspection-create/inspection-create.component').then(
        (m) => m.InspectionCreatePage,
      ),
    title: 'Create Inspection',
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.INSPECTION_READ] })],
    loadComponent: () =>
      import('./ui/pages/inspection-list/inspection-list.component').then(
        (m) => m.InspectionListPage,
      ),
    title: 'Inspections',
    data: {
      breadcrumb: false,
    },
  },
];
