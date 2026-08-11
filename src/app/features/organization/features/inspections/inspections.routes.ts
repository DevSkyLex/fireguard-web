import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { inspectionResolver, inspectionTitleResolver } from './http/resolvers';
import { InspectionStore } from './state';

/**
 * Constant INSPECTION_ROUTES
 *
 * @description
 * Organization-scoped inspection workflows: the index at
 * `/organizations/:organizationId/inspections`, a creation page, and one
 * inspection record under it.
 *
 * The read permission guard sits on the pathless parent, as it does in
 * `EQUIPMENT_ROUTES`/`FACILITY_ROUTES`: it re-runs on an organization switch
 * because the params change, and guarding each child would leave the next
 * one added unprotected by omission. `create` carries an additional
 * write-permission guard, since opening an inspection needs more than read
 * access.
 *
 * Each leaf provides its own {@link InspectionStore} rather than a shared
 * pathless parent — like equipment and facilities, inspections have no
 * documented list ↔ detail state-sharing requirement, so a fresh,
 * independently-scoped instance per page is the simpler default
 * (`ARCHITECTURE.md` §10.11).
 *
 * `/:inspectionId` resolves the record through {@link inspectionResolver}
 * (redirecting back to the index on failure) and reuses the same resolved
 * state for the document title via {@link inspectionTitleResolver}.
 * `/:inspectionId/edit` is retired: the record itself is the edit surface
 * (`FEATURE.md` "The record is the edit surface"), so installed
 * applications and bookmarks are redirected onto it.
 *
 * @since 1.0.0
 *
 * @type {Routes}
 */
export const INSPECTION_ROUTES: Routes = [
  {
    path: '',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.INSPECTION_READ] }),
    ],
    data: { breadcrumb: $localize`:@@route.inspections:Inspections` },
    children: [
      {
        path: '',
        pathMatch: 'full',
        providers: [InspectionStore],
        loadComponent: () =>
          import('./ui/pages/inspections-page/inspections-page.component').then(
            (m) => m.InspectionsPage,
          ),
        title: $localize`:@@route.inspections:Inspections`,
        data: { breadcrumb: false },
      },
      {
        path: 'create',
        providers: [InspectionStore],
        canActivate: [
          organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.INSPECTION_WRITE] }),
        ],
        loadComponent: () =>
          import('./ui/pages/inspection-create-page/inspection-create-page.component').then(
            (m) => m.InspectionCreatePage,
          ),
        title: $localize`:@@route.inspection.create:Create Inspection`,
      },
      {
        path: ':inspectionId',
        providers: [InspectionStore],
        resolve: { inspection: inspectionResolver },
        title: inspectionTitleResolver,
        loadComponent: () =>
          import('./ui/pages/inspection-detail-page/inspection-detail-page.component').then(
            (m) => m.InspectionDetailPage,
          ),
      },
      {
        path: ':inspectionId/edit',
        redirectTo: ':inspectionId',
      },
    ],
  },
];
