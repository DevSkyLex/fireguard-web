import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { MaintenancePlansStore, MaintenanceSchedulesStore } from './state';

/**
 * Constant MAINTENANCE_SCHEDULE_ROUTES
 *
 * @description
 * Organization-scoped historical schedules and independent equipment operation plans at
 * `/organizations/:organizationId/maintenance` and its `/plans` library. Named `maintenance-schedules`
 * — not the unqualified `maintenance` an app-level feature already owns (the
 * app-maintenance-mode page) — to avoid a selector and folder collision.
 *
 * The read permission guard sits on the pathless parent, the same shape
 * `EQUIPMENT_ROUTES` and `INTERVENTION_ROUTES` use: it re-runs on an
 * organization switch because the params change. There is no create or
 * detail route for historical schedules — they are derived server-side from tracked equipment.
 * Each leaf provides its own store; operation plans are prepared through their library.
 *
 * @since 1.0.0
 *
 * @type {Routes}
 *
 * @const MAINTENANCE_SCHEDULE_ROUTES
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
        path: 'plans',
        providers: [MaintenancePlansStore],
        loadComponent: () =>
          import('./ui/pages/maintenance-plans-page').then((m) => m.MaintenancePlansPage),
        title: $localize`:@@route.maintenancePlans:Operation plans`,
        data: { breadcrumb: false },
      },
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
