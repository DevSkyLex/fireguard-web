import { inject } from '@angular/core';
import { Router, type RedirectFunction, type Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { equipmentResolver, equipmentTitleResolver } from './http/resolvers';
import { EquipmentKpisStore, EquipmentStore } from './state';

/**
 * Function redirectToCreateSheet
 *
 * @description
 * `/create` is no longer a page: creation happens in a sheet on the list.
 * The segment survives as a functional `redirectTo` onto the list with
 * `?create=1` merged into whatever the incoming URL carried (`?facility=`,
 * a filter), so bookmarks and older links still open the sheet, pre-scoped.
 * The write-permission guard the page carried does not run on a redirect;
 * the list page ignores `?create=1` without the write permission instead.
 *
 * @since 1.6.0
 *
 * @param {RedirectData} redirectData - The matched segment's params and query.
 *
 * @returns {UrlTree} The list URL with `create=1` merged in.
 */
const redirectToCreateSheet: RedirectFunction = (redirectData) => {
  const router: Router = inject(Router);
  const organizationId: string | null = redirectData.paramMap.get('organizationId');

  return router.createUrlTree(['/organizations', organizationId, 'equipments'], {
    queryParams: { ...redirectData.queryParams, create: '1' },
  });
};

/**
 * Constant EQUIPMENT_ROUTES
 * @const EQUIPMENT_ROUTES
 *
 * @description
 * Organization-scoped equipment workflows: the index at
 * `/organizations/:organizationId/equipments`, a creation page, and one
 * equipment record under it.
 *
 * The read permission guard sits on the pathless parent, as it does in
 * `INTERVENTION_ROUTES`: it re-runs on an organization switch because the
 * params change, and guarding each child would leave the next one added
 * unprotected by omission. `create` carries an additional write-permission
 * guard, since registering an equipment needs more than read access.
 *
 * Each leaf provides its own {@link EquipmentStore} rather than the shared
 * pathless parent: unlike interventions, equipment has no documented
 * list ↔ detail state-sharing requirement (no prev/next walk), so a fresh,
 * independently-scoped instance per page is the simpler default
 * (`ARCHITECTURE.md` §10.11). The index leaf additionally provides
 * {@link EquipmentKpisStore}, backing its KPI strip — component-scoped
 * since the snapshot is specific to that route.
 *
 * `/:equipmentId` seeds the record fetch through {@link equipmentResolver}
 * without blocking activation — the page paints its skeleton from the store's
 * pending state, and redirects back to the index itself if the load fails.
 * {@link equipmentTitleResolver} titles the route synchronously from the same
 * state, falling back to a neutral section label until the record lands.
 * `create` also carries `unsavedChangesGuard`, confirming before the
 * operator loses an in-progress registration.
 *
 * @since 1.0.0
 *
 * @type {Routes}
 */
export const EQUIPMENT_ROUTES: Routes = [
  {
    path: '',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.EQUIPMENT_READ] }),
    ],
    data: { breadcrumb: $localize`:@@route.equipments:Equipments` },
    children: [
      {
        path: '',
        pathMatch: 'full',
        providers: [EquipmentStore, EquipmentKpisStore],
        loadComponent: () =>
          import('./ui/pages/equipments-page/equipments-page.component').then(
            (m) => m.EquipmentsPage,
          ),
        title: $localize`:@@route.equipments:Equipments`,
        data: { breadcrumb: false },
      },
      {
        path: 'create',
        redirectTo: redirectToCreateSheet,
      },
      {
        path: ':equipmentId',
        providers: [EquipmentStore],
        resolve: { equipmentSeeded: equipmentResolver },
        title: equipmentTitleResolver,
        loadComponent: () =>
          import('./ui/pages/equipment-detail-page/equipment-detail-page.component').then(
            (m) => m.EquipmentDetailPage,
          ),
      },
    ],
  },
];
