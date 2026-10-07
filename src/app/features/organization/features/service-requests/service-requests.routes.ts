import type { Routes } from '@angular/router';
import { DASHBOARD_MOBILE_NAVIGATION_ROOT_DATA_KEY, type DashboardRouteData } from '@core/routing';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
/**
 * Constant SERVICE_REQUEST_ROUTES
 *
 * @description
 * Organization-scoped collection and request dossier with separate read/create route grants.
 *
 * @since unreleased
 */
export const SERVICE_REQUEST_ROUTES: Routes = [
  {
    path: '',
    canActivate: [
      organizationPermissionGuard({
        permissions: [
          ORGANIZATION_PERMISSION.SERVICE_REQUESTS_READ,
          ORGANIZATION_PERMISSION.SERVICE_REQUESTS_CREATE,
        ],
        match: 'any',
      }),
    ],
    loadComponent: () =>
      import('./ui/pages/service-requests-page/service-requests-page.component').then(
        (module) => module.ServiceRequestsPage,
      ),
    title: $localize`:@@route.serviceRequests:Repair requests`,
    data: {
      breadcrumb: $localize`:@@route.serviceRequests:Repair requests`,
      [DASHBOARD_MOBILE_NAVIGATION_ROOT_DATA_KEY]: true,
    } satisfies DashboardRouteData,
  },
  {
    path: ':requestId',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.SERVICE_REQUESTS_READ] }),
    ],
    loadComponent: () =>
      import('./ui/pages/service-request-detail-page/service-request-detail-page.component').then(
        (module) => module.ServiceRequestDetailPage,
      ),
    title: $localize`:@@serviceRequest.detail.title:Maintenance request`,
    data: {
      breadcrumb: $localize`:@@serviceRequest.detail.title:Maintenance request`,
    } satisfies DashboardRouteData,
  },
];
