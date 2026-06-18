import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { interventionTitleResolver } from './http/resolvers';
import type { InterventionDetailPage } from './ui/pages/intervention-detail/intervention-detail.component';
import type { InterventionListPage } from './ui/pages/intervention-list/intervention-list.component';
import type { MyInterventionsPage } from './ui/pages/my-interventions/my-interventions.component';

/**
 * Constant INTERVENTION_ROUTES
 * @const INTERVENTION_ROUTES
 *
 * @description
 * Route tree for organization-scoped intervention workflows.
 *
 * - `/organizations/:organizationId/interventions` exposes the intervention list page
 *   used to start or resume field interventions.
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
    title: 'My interventions',
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
    loadComponent: (): Promise<typeof InterventionListPage> =>
      import('./ui/pages/intervention-list/intervention-list.component').then(
        (module) => module.InterventionListPage,
      ),
    title: 'Interventions',
    data: { breadcrumb: false, preload: true },
  },
];
