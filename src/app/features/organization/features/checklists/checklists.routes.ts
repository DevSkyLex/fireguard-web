import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { checklistResolver, checklistTitleResolver } from './http/resolvers';

/**
 * Routes owned by the organization checklist feature.
 */
export const CHECKLIST_ROUTES: Routes = [
  {
    path: 'create',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.INSPECTION_WRITE] }),
    ],
    loadComponent: () =>
      import('./ui/pages/checklist-create/checklist-create.component').then(
        (m) => m.ChecklistCreatePage,
      ),
    title: $localize`:@@route.checklist.create:Create Checklist`,
  },
  {
    path: ':checklistId',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.INSPECTION_READ] }),
    ],
    resolve: {
      checklist: checklistResolver,
      breadcrumb: checklistTitleResolver,
    },
    loadComponent: () =>
      import('./ui/pages/checklist-detail/checklist-detail.component').then(
        (m) => m.ChecklistDetailPage,
      ),
    title: checklistTitleResolver,
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.INSPECTION_READ] }),
    ],
    loadComponent: () =>
      import('./ui/pages/checklist-list/checklist-list.component').then((m) => m.ChecklistListPage),
    title: $localize`:@@route.checklists:Checklists`,
    data: {
      breadcrumb: false,
      preload: true,
    },
  },
];
