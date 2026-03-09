import type { Routes } from '@angular/router';

/**
 * Constant EQUIPMENT_ROUTES
 *
 * @description
 * Routes for the equipment feature, nested under the organization
 * context (`/organizations/:organizationId/equipments`).
 *
 * @since 1.0.0
 */
export const EQUIPMENT_ROUTES: Routes = [
  {
    path: 'create',
    loadComponent: () => import('./pages/equipment-create/equipment-create.component').then((m) => m.EquipmentCreatePage),
    title: 'Create Equipment',
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/equipment-list/equipment-list.component').then((m) => m.EquipmentListPage),
    title: 'Equipments',
    data: {
      breadcrumb: false,
    },
  },
];
