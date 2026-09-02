import { inject } from '@angular/core';
import { Router, type RedirectFunction, type Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { facilityResolver, facilityTitleResolver } from './http/resolvers';
import { FacilityBuilding3dStore, FacilityStore } from './state';

/**
 * Function redirectToCreateSheet
 *
 * @description
 * `/create` is no longer a page: creation happens in a sheet on the list.
 * The segment survives as a functional `redirectTo` onto the list with
 * `?create=1` merged into whatever the incoming URL carried (`?parent=`,
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

  return router.createUrlTree(['/organizations', organizationId, 'facilities'], {
    queryParams: { ...redirectData.queryParams, create: '1' },
  });
};

/**
 * Constant FACILITY_ROUTES
 * @const FACILITY_ROUTES
 *
 * @description
 * Organization-scoped facility workflows: the roots-only index at
 * `/organizations/:organizationId/facilities`, a map surface over every
 * located facility, a `create` redirect, one facility record, and that
 * record's dedicated 3D view. `map` is listed ahead of `:facilityId` so it
 * never matches as a facility id; `:facilityId/3d` needs no such ordering —
 * it is two segments against `:facilityId`'s one, so the two can never be
 * confused regardless of declaration order.
 *
 * The read permission guard sits on the pathless parent, as it does in
 * `EQUIPMENT_ROUTES`: it re-runs on an organization switch because the
 * params change, and guarding each child would leave the next one added
 * unprotected by omission. `create` is a functional redirect onto the list with
 * `?create=1` — the creation sheet lives on the list page, which gates the deep
 * link on the write permission itself.
 *
 * Each leaf provides its own {@link FacilityStore} rather than a shared
 * pathless parent — like equipment, facilities have no documented
 * list ↔ detail state-sharing requirement, so a fresh, independently-scoped
 * instance per page is the simpler default (`ARCHITECTURE.md` §10.11).
 *
 * `/:facilityId` seeds the record fetch through {@link facilityResolver}
 * without blocking activation — the page paints its skeleton from the store's
 * pending state, and redirects to the organization landing page itself if the
 * load fails. {@link facilityTitleResolver} titles the route synchronously
 * from the same state, falling back to a neutral section label until the
 * record lands.
 *
 * `:facilityId/3d` reuses both {@link facilityResolver} and
 * {@link facilityTitleResolver} unchanged, and additionally provides
 * `FacilityBuilding3dStore` for its own model fetch and view-local scene
 * state (`FEATURE.md` "Building 3D View").
 *
 * @since 1.0.0
 *
 * @type {Routes}
 */
export const FACILITY_ROUTES: Routes = [
  {
    path: '',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.FACILITIES_READ] }),
    ],
    data: { breadcrumb: $localize`:@@route.facilities:Facilities` },
    children: [
      {
        path: '',
        pathMatch: 'full',
        providers: [FacilityStore],
        loadComponent: () =>
          import('./ui/pages/facilities-page/facilities-page.component').then(
            (m) => m.FacilitiesPage,
          ),
        title: $localize`:@@route.facilities:Facilities`,
        data: { breadcrumb: false },
      },
      {
        path: 'map',
        loadComponent: () =>
          import('./ui/pages/facility-map-page/facility-map-page.component').then(
            (m) => m.FacilityMapPage,
          ),
        title: $localize`:@@route.facility.map:Facilities Map`,
        data: { breadcrumb: $localize`:@@route.facility.map:Facilities Map` },
      },
      {
        path: 'create',
        redirectTo: redirectToCreateSheet,
      },
      {
        path: ':facilityId',
        providers: [FacilityStore],
        resolve: { facilitySeeded: facilityResolver },
        title: facilityTitleResolver,
        loadComponent: () =>
          import('./ui/pages/facility-detail-page/facility-detail-page.component').then(
            (m) => m.FacilityDetailPage,
          ),
      },
      {
        path: ':facilityId/3d',
        providers: [FacilityStore, FacilityBuilding3dStore],
        resolve: { facilitySeeded: facilityResolver },
        title: facilityTitleResolver,
        loadComponent: () =>
          import('./ui/pages/facility-building-3d-page').then((m) => m.FacilityBuilding3dPage),
      },
    ],
  },
];
