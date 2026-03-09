import type { Routes } from '@angular/router';

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
    loadComponent: () => import('./pages/inspection-create/inspection-create.component').then((m) => m.InspectionCreatePage),
    title: 'Create Inspection',
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/inspection-list/inspection-list.component').then((m) => m.InspectionListPage),
    title: 'Inspections',
    data: {
      breadcrumb: false,
    },
  },
];
