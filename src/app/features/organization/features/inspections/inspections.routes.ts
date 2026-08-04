import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { inspectionResolver, inspectionTitleResolver } from './http/resolvers';

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
    title: $localize`:@@route.inspection.create:Create Inspection`,
  },
  {
    path: ':inspectionId',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.INSPECTION_READ] }),
    ],
    resolve: {
      inspection: inspectionResolver,
      breadcrumb: inspectionTitleResolver,
    },
    children: [
      {
        /**
         * The record is the edit surface now (ARCHITECTURE.md §10.5): every
         * writable property opens where it is displayed, so a separate edit
         * page has nothing left to offer. The route stays as a redirect —
         * installed applications and bookmarks still resolve.
         */
        path: 'edit',
        redirectTo: '',
        pathMatch: 'full',
      },
      {
        path: '',
        loadComponent: () =>
          import('./ui/pages/inspection-detail/inspection-detail.component').then(
            (m) => m.InspectionDetailPage,
          ),
        title: inspectionTitleResolver,
        data: { breadcrumb: false },
      },
    ],
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.INSPECTION_READ] }),
    ],
    loadComponent: () =>
      import('./ui/pages/inspection-list/inspection-list.component').then(
        (m) => m.InspectionListPage,
      ),
    title: $localize`:@@route.inspections:Inspections`,
    data: {
      breadcrumb: false,
    },
  },
];
