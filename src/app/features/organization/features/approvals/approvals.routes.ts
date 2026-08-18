import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ApprovalRequestsStore } from './state';

/**
 * Constant APPROVAL_ROUTES
 * @const APPROVAL_ROUTES
 *
 * @description
 * Organization-scoped four-eyes approvals inbox: a single index page at
 * `/organizations/:organizationId/approvals`. The plural folder name
 * matches the collection this subfeature owns (`approval-requests`); the
 * const stays singular, matching `facilities/facilities.routes.ts` →
 * `FACILITY_ROUTES`.
 *
 * The read permission guard sits on the pathless parent, the same shape
 * `MAINTENANCE_SCHEDULE_ROUTES` uses: it re-runs on an organization switch
 * because the params change. There is no detail or create route — a request
 * is created server-side by the gated action's own use case, never
 * authored directly, so {@link ApprovalRequestsStore} is provided once, on
 * the single leaf.
 *
 * @since 1.0.0
 *
 * @type {Routes}
 */
export const APPROVAL_ROUTES: Routes = [
  {
    path: '',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.APPROVALS_READ] }),
    ],
    data: { breadcrumb: false },
    children: [
      {
        path: '',
        pathMatch: 'full',
        providers: [ApprovalRequestsStore],
        loadComponent: () =>
          import('./ui/pages/approvals-page/approvals-page.component').then((m) => m.ApprovalsPage),
        title: $localize`:@@route.approvals:Approvals`,
        data: { breadcrumb: false },
      },
    ],
  },
];
