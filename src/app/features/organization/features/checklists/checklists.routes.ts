import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { unsavedChangesGuard } from '@shared/unsaved-changes';
import { ChecklistStore } from './state';

/**
 * Constant CHECKLIST_ROUTES
 * @const CHECKLIST_ROUTES
 *
 * @description
 * Organization-scoped checklist templates: a single index page at
 * `/organizations/:organizationId/checklists`. The plural folder name
 * matches the collection this subfeature owns (`checklists`); the const
 * stays singular, matching `facilities/facilities.routes.ts` →
 * `FACILITY_ROUTES`.
 *
 * The read permission guard sits on the pathless parent, the same shape
 * `APPROVAL_ROUTES` and `MAINTENANCE_SCHEDULE_ROUTES` use: it re-runs on an
 * organization switch because the params change. There is no detail route —
 * a checklist is created and edited from the list through dialogs, never a
 * separate page — so `ChecklistStore` is provided once, on the single leaf.
 *
 * @since 1.0.0
 *
 * @type {Routes}
 */
export const CHECKLIST_ROUTES: Routes = [
  {
    path: '',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.INSPECTION_READ] }),
    ],
    data: { breadcrumb: false },
    children: [
      {
        path: 'new',
        canActivate: [
          organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.INSPECTION_WRITE] }),
        ],
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./ui/pages/checklist-detail-page/checklist-detail-page.component').then(
            (m) => m.ChecklistDetailPage,
          ),
        title: $localize`:@@checklists.list.new:New checklist`,
      },
      {
        path: ':checklistId',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./ui/pages/checklist-detail-page/checklist-detail-page.component').then(
            (m) => m.ChecklistDetailPage,
          ),
        title: $localize`:@@route.checklists:Checklists`,
      },

      {
        path: '',
        pathMatch: 'full',
        providers: [ChecklistStore],
        loadComponent: () =>
          import('./ui/pages/checklists-page/checklists-page.component').then(
            (m) => m.ChecklistsPage,
          ),
        title: $localize`:@@route.checklists:Checklists`,
        data: { breadcrumb: false },
      },
    ],
  },
];
