import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ImportJobsStore } from './state';

/**
 * Constant IMPORT_ROUTES
 * @const IMPORT_ROUTES
 *
 * @description
 * Organization-scoped bulk CSV import surface: a single index page at
 * `/organizations/:organizationId/imports`. The plural folder name matches
 * the collection this subfeature owns (`imports`); the const stays
 * singular, matching `facilities/facilities.routes.ts` → `FACILITY_ROUTES`.
 *
 * The read permission guard sits on the pathless parent, the same shape
 * `APPROVAL_ROUTES` uses, gated on either equipment or facility read since
 * a reader with only one may still import that one kind. There is no
 * detail route: a job's report renders inline on the index page, so
 * {@link ImportJobsStore} is provided once, on the single leaf.
 *
 * @since 1.0.0
 *
 * @type {Routes}
 */
export const IMPORT_ROUTES: Routes = [
  {
    path: '',
    canActivate: [
      organizationPermissionGuard({
        permissions: [
          ORGANIZATION_PERMISSION.EQUIPMENT_READ,
          ORGANIZATION_PERMISSION.FACILITIES_READ,
        ],
        match: 'any',
      }),
    ],
    data: { breadcrumb: false },
    children: [
      {
        path: '',
        pathMatch: 'full',
        providers: [ImportJobsStore],
        loadComponent: () =>
          import('./ui/pages/imports-page/imports-page.component').then((m) => m.ImportsPage),
        title: $localize`:@@route.imports:Imports`,
        data: { breadcrumb: false },
      },
    ],
  },
];
