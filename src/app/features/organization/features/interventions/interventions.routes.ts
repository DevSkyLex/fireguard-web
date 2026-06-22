import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { interventionTitleResolver } from './http/resolvers';
import type { InterventionDetailPage } from './ui/pages/intervention-detail/intervention-detail.component';
import type { InterventionsPage } from './ui/pages/interventions/interventions.component';
import type { MyInterventionsPage } from './ui/pages/my-interventions/my-interventions.component';

/**
 * Constant INTERVENTION_ROUTES
 * @const INTERVENTION_ROUTES
 *
 * @description
 * Route tree for organization-scoped intervention workflows.
 *
 * - `/organizations/:organizationId/interventions` exposes the interventions
 *   index page, hosting the planner table and the scheduling calendar as two
 *   interchangeable views (`?view=list|calendar`).
 * - `/organizations/:organizationId/interventions/calendar` is a convenience
 *   entry that opens the same index page on its calendar view.
 * - `/organizations/:organizationId/interventions/:interventionId` exposes the intervention
 *   detail page that orchestrates facilities, equipment and inspections for
 *   one intervention.
 *
 * Access is protected by organization permission guards so intervention pages are
 * available only when the active member can read intervention data.
 *
 * @since 1.0.0
 *
 * @type {Routes}
 */
export const INTERVENTION_ROUTES: Routes = [
  {
    path: 'my',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.INTERVENTIONS_READ] }),
    ],
    loadComponent: (): Promise<typeof MyInterventionsPage> =>
      import('./ui/pages/my-interventions/my-interventions.component').then(
        (module) => module.MyInterventionsPage,
      ),
    title: $localize`:@@route.myInterventions:My interventions`,
  },
  {
    path: 'calendar',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.INTERVENTIONS_READ] }),
    ],
    loadComponent: (): Promise<typeof InterventionsPage> =>
      import('./ui/pages/interventions/interventions.component').then(
        (module) => module.InterventionsPage,
      ),
    title: $localize`:@@route.calendar:Calendar`,
    data: { view: 'calendar', breadcrumb: false },
  },
  {
    path: ':interventionId',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.INTERVENTIONS_READ] }),
    ],
    loadComponent: (): Promise<typeof InterventionDetailPage> =>
      import('./ui/pages/intervention-detail/intervention-detail.component').then(
        (module) => module.InterventionDetailPage,
      ),
    resolve: {
      breadcrumb: interventionTitleResolver,
    },
    title: interventionTitleResolver,
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.INTERVENTIONS_READ] }),
    ],
    loadComponent: (): Promise<typeof InterventionsPage> =>
      import('./ui/pages/interventions/interventions.component').then(
        (module) => module.InterventionsPage,
      ),
    title: $localize`:@@route.interventions:Interventions`,
    data: { breadcrumb: false, preload: true },
  },
];
