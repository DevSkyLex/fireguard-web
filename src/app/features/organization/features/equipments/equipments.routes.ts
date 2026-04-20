import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';

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
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.EQUIPMENT_WRITE] }),
    ],
    loadComponent: () =>
      import('./ui/pages/equipment-create/equipment-create.component').then(
        (m) => m.EquipmentCreatePage,
      ),
    title: 'Create Equipment',
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.EQUIPMENT_READ] })],
    loadComponent: () =>
      import('./ui/pages/equipment-list/equipment-list.component').then((m) => m.EquipmentListPage),
    title: 'Equipments',
    data: {
      breadcrumb: false,
    },
  },
];
