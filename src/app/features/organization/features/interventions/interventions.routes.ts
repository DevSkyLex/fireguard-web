import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { InterventionStore } from './state';

/**
 * Constant INTERVENTION_ROUTES
 * @const INTERVENTION_ROUTES
 *
 * @description
 * Organization-scoped intervention workflows: the index at
 * `/organizations/:organizationId/interventions`, and one intervention under
 * it.
 *
 * The children share a pathless parent so `InterventionStore`, bound in its
 * route-level `providers`, survives navigation between the list and a detail
 * page — the detail page's prev/next walks the same `orderedIds()` the list
 * populated, with no second fetch.
 *
 * The permission guard sits on the parent only, as it does in
 * `COLLABORATION_ROUTES`: it re-runs on an organization switch because the
 * params change, and guarding each child would leave the next one added
 * unprotected by omission.
 *
 * The detail child is Phase 2 and is not mounted yet, so a row currently links
 * to a path the global fallback catches. The index suppresses its breadcrumb
 * because the shell already names the section.
 *
 * @since 2.0.0
 *
 * @type {Routes}
 */
export const INTERVENTION_ROUTES: Routes = [
  {
    path: '',
    providers: [InterventionStore],
    canActivate: [
      organizationPermissionGuard({
        permissions: [ORGANIZATION_PERMISSION.INTERVENTIONS_READ],
      }),
    ],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./ui/pages/interventions/interventions.component').then(
            (m) => m.InterventionsPage,
          ),
        title: $localize`:@@route.interventions:Interventions`,
        data: { breadcrumb: false },
      },
    ],
  },
];
