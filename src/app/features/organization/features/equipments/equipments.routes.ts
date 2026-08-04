import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { equipmentResolver, equipmentTitleResolver } from './http/resolvers';

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
    title: $localize`:@@route.equipment.create:Create Equipment`,
  },
  {
    path: ':equipmentId',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.EQUIPMENT_READ] }),
    ],
    resolve: {
      equipment: equipmentResolver,
      breadcrumb: equipmentTitleResolver,
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
          import('./ui/pages/equipment-detail/equipment-detail.component').then(
            (m) => m.EquipmentDetailPage,
          ),
        title: equipmentTitleResolver,
        data: { breadcrumb: false },
      },
    ],
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.EQUIPMENT_READ] }),
    ],
    loadComponent: () =>
      import('./ui/pages/equipment-list/equipment-list.component').then((m) => m.EquipmentListPage),
    title: $localize`:@@route.equipments:Equipments`,
    data: {
      breadcrumb: false,
    },
  },
];
