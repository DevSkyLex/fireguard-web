import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { interventionTitleResolver } from './http/resolvers';
import { InterventionStore } from './state';
import type { InterventionDetailPage } from './ui/pages/intervention-detail/intervention-detail.component';
import type { InterventionsPage } from './ui/pages/interventions/interventions.component';

/**
 * Constant INTERVENTION_ROUTES
 * @const INTERVENTION_ROUTES
 *
 * @description
 * Route tree for organization-scoped intervention workflows.
 *
 * - `/organizations/:organizationId/interventions` exposes the interventions
 *   index page, laid out as a dashboard that shows the workflow-health metric
 *   strip, the planner table and the scheduling calendar together as cards.
 * - `/organizations/:organizationId/interventions/:interventionId` exposes the intervention
 *   detail page that orchestrates facilities, equipment and inspections for
 *   one intervention.
 *
 * Both children share one pathless parent route so `InterventionStore` (bound
 * here via route-level `providers`) survives navigation between the list and
 * a detail page — the detail page's prev/next navigation reads the same
 * `orderedIds()` the list populated, with no extra fetch.
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
    path: '',
    providers: [InterventionStore],
    children: [
      {
        path: ':interventionId',
        canActivate: [
          organizationPermissionGuard({
            permissions: [ORGANIZATION_PERMISSION.INTERVENTIONS_READ],
          }),
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
          organizationPermissionGuard({
            permissions: [ORGANIZATION_PERMISSION.INTERVENTIONS_READ],
          }),
        ],
        loadComponent: (): Promise<typeof InterventionsPage> =>
          import('./ui/pages/interventions/interventions.component').then(
            (module) => module.InterventionsPage,
          ),
        title: $localize`:@@route.interventions:Interventions`,
        data: { breadcrumb: false },
      },
    ],
  },
];
