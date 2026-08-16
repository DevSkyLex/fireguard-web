import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { facilityResolver, facilityTitleResolver } from './http/resolvers';
import { FacilityStore } from './state';

/**
 * Constant FACILITY_ROUTES
 * @const FACILITY_ROUTES
 *
 * @description
 * Organization-scoped facility workflows: the roots-only index at
 * `/organizations/:organizationId/facilities`, a map surface over every
 * located facility, a creation page, and one facility record under it. `map`
 * is listed ahead of `:facilityId` so it never matches as a facility id.
 *
 * The read permission guard sits on the pathless parent, as it does in
 * `EQUIPMENT_ROUTES`: it re-runs on an organization switch because the
 * params change, and guarding each child would leave the next one added
 * unprotected by omission. `create` carries an additional write-permission
 * guard, since registering a facility needs more than read access.
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
 * record lands. `/:facilityId/edit` is retired: the record itself is the edit
 * surface (`FEATURE.md` "The record is the edit surface"), so installed
 * applications and bookmarks are redirected onto it.
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
        providers: [FacilityStore],
        canActivate: [
          organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.FACILITIES_WRITE] }),
        ],
        loadComponent: () =>
          import('./ui/pages/facility-create-page/facility-create-page.component').then(
            (m) => m.FacilityCreatePage,
          ),
        title: $localize`:@@route.facility.create:Create Facility`,
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
        path: ':facilityId/edit',
        redirectTo: ':facilityId',
      },
    ],
  },
];
