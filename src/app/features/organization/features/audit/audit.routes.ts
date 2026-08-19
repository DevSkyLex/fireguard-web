import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { AuditEventsStore } from './state';

/**
 * Constant AUDIT_ROUTES
 * @const AUDIT_ROUTES
 *
 * @description
 * Organization-scoped audit journal: a single index page at
 * `/organizations/:organizationId/audit`. The read permission guard sits on
 * the pathless parent, the same shape `APPROVAL_ROUTES` and `IMPORT_ROUTES`
 * use. There is no detail route — every entry renders inline, in the
 * table's own expandable metadata row — so {@link AuditEventsStore} is
 * provided once, on the single leaf.
 *
 * @since 1.0.0
 *
 * @type {Routes}
 */
export const AUDIT_ROUTES: Routes = [
  {
    path: '',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.AUDIT_READ] }),
    ],
    data: { breadcrumb: false },
    children: [
      {
        path: '',
        pathMatch: 'full',
        providers: [AuditEventsStore],
        loadComponent: () =>
          import('./ui/pages/audit-page/audit-page.component').then((m) => m.AuditPage),
        title: $localize`:@@route.audit:Audit journal`,
        data: { breadcrumb: false },
      },
    ],
  },
];
