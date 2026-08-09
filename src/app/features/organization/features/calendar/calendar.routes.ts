import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';

/**
 * Constant CALENDAR_ROUTES
 * @const CALENDAR_ROUTES
 *
 * @description
 * The organization calendar's route tree: one page, gated by the backend's
 * `organization.events.read` — the permission the unified feed itself checks.
 *
 * @since 1.0.0
 *
 * @type {Routes}
 */
export const CALENDAR_ROUTES: Routes = [
  {
    path: '',
    canActivate: [
      organizationPermissionGuard({
        permissions: [ORGANIZATION_PERMISSION.EVENTS_READ],
      }),
    ],
    loadComponent: () =>
      import('./ui/pages/calendar-page/calendar-page.component').then((m) => m.CalendarPage),
    title: $localize`:@@route.calendar:Calendar`,
    data: { breadcrumb: $localize`:@@route.calendar:Calendar` },
  },
];
