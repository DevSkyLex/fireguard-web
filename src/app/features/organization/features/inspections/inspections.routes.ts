import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { unsavedChangesGuard } from '@shared/unsaved-changes';
import { inspectionResolver, inspectionTitleResolver } from './http/resolvers';
import { InspectionStore, NonConformityStatisticsStore } from './state';

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
 * `/:inspectionId` seeds the record fetch through {@link inspectionResolver}
 * without blocking activation — the page paints its skeleton from the store's
 * pending state, and redirects back to the index itself if the load fails.
 * {@link inspectionTitleResolver} titles the route synchronously from the
 * same state, falling back to a neutral section label until the record lands.
 * `create` also carries `unsavedChangesGuard`, confirming before the
 * operator loses an in-progress registration.
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
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./ui/pages/inspection-create-page/inspection-create-page.component').then(
            (m) => m.InspectionCreatePage,
          ),
        title: $localize`:@@route.inspection.create:Create Inspection`,
      },
      {
        path: 'analytics',
        providers: [NonConformityStatisticsStore],
        loadComponent: () =>
          import('./ui/pages/inspection-analytics-page/inspection-analytics-page.component').then(
            (m) => m.InspectionAnalyticsPage,
          ),
        title: $localize`:@@route.inspections.analytics:Non-conformity analytics`,
        data: { breadcrumb: $localize`:@@route.inspections.analytics:Non-conformity analytics` },
      },
      {
        path: ':inspectionId',
        providers: [InspectionStore],
        resolve: { inspectionSeeded: inspectionResolver },
        title: inspectionTitleResolver,
        loadComponent: () =>
          import('./ui/pages/inspection-detail-page/inspection-detail-page.component').then(
            (m) => m.InspectionDetailPage,
          ),
      },
    ],
  },
];
