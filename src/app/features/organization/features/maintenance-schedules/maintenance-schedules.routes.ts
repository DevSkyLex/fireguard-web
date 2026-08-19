import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { MaintenanceSchedulesStore } from './state';

/**
 * Constant MAINTENANCE_SCHEDULE_ROUTES
 * @const MAINTENANCE_SCHEDULE_ROUTES
 *
 * @description
 * Organization-scoped maintenance schedules: a single index page at
 * `/organizations/:organizationId/maintenance`. Named `maintenance-schedules`
 * — not the unqualified `maintenance` an app-level feature already owns (the
 * app-maintenance-mode page) — to avoid a selector and folder collision.
 *
 * The read permission guard sits on the pathless parent, the same shape
 * `EQUIPMENT_ROUTES` and `INTERVENTION_ROUTES` use: it re-runs on an
 * organization switch because the params change. There is no create or
 * detail route — schedules are derived server-side from tracked equipment,
 * never authored directly — so `MaintenanceSchedulesStore` is provided once,
 * on the single leaf, rather than per several routes.
 *
 * @since 1.0.0
 *
 * @type {Routes}
 */
export const MAINTENANCE_SCHEDULE_ROUTES: Routes = [
  {
    path: '',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.MAINTENANCE_READ] }),
    ],
    data: { breadcrumb: false },
    children: [
      {
        path: '',
        pathMatch: 'full',
        providers: [MaintenanceSchedulesStore],
        loadComponent: () =>
          import('./ui/pages/maintenance-schedules-page/maintenance-schedules-page.component').then(
            (m) => m.MaintenanceSchedulesPage,
          ),
        title: $localize`:@@route.maintenance:Maintenance`,
        data: { breadcrumb: false },
      },
    ],
  },
];
