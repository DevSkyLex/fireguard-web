import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import type { MissionCreatePage } from './ui/pages/mission-create/mission-create.component';
import type { MissionDetailPage } from './ui/pages/mission-detail/mission-detail.component';
import type { MissionListPage } from './ui/pages/mission-list/mission-list.component';
import type { MyMissionsPage } from './ui/pages/my-missions/my-missions.component';

/**
 * Constant MISSION_ROUTES
 * @const MISSION_ROUTES
 *
 * @description
 * Route tree for organization-scoped mission workflows.
 *
 * - `/organizations/:organizationId/missions` exposes the mission list page
 *   used to start or resume field missions.
 * - `/organizations/:organizationId/missions/:missionId` exposes the mission
 *   detail page that orchestrates facilities, equipment and inspections for
 *   one mission.
 *
 * Access is protected by organization permission guards so mission pages are
 * available only when the active member can read mission data.
 *
 * @since 1.0.0
 *
 * @type {Routes}
 */
export const MISSION_ROUTES: Routes = [
  {
    path: 'my',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.MISSIONS_READ] }),
    ],
    loadComponent: (): Promise<typeof MyMissionsPage> =>
      import('./ui/pages/my-missions/my-missions.component').then(
        (module) => module.MyMissionsPage,
      ),
    title: 'My missions',
  },
  {
    path: 'new',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.MISSIONS_PLAN] }),
    ],
    loadComponent: (): Promise<typeof MissionCreatePage> =>
      import('./ui/pages/mission-create/mission-create.component').then(
        (module) => module.MissionCreatePage,
      ),
    title: 'New mission',
  },
  {
    path: ':missionId',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.MISSIONS_READ] }),
    ],
    loadComponent: (): Promise<typeof MissionDetailPage> =>
      import('./ui/pages/mission-detail/mission-detail.component').then(
        (module) => module.MissionDetailPage,
      ),
    title: 'Mission',
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.MISSIONS_READ] }),
    ],
    loadComponent: (): Promise<typeof MissionListPage> =>
      import('./ui/pages/mission-list/mission-list.component').then(
        (module) => module.MissionListPage,
      ),
    title: 'Missions',
    data: { breadcrumb: false, preload: true },
  },
];
