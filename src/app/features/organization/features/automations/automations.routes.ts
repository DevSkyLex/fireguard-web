import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';

/**
 * Constant AUTOMATION_ROUTES
 * @const AUTOMATION_ROUTES
 * @description Organization automation history entry point; management remains separately authorized.
 * @since 1.0.0
 * @type {Routes}
 */
export const AUTOMATION_ROUTES: Routes = [
  {
    path: '',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.AUTOMATION_READ] }),
    ],
    loadComponent: () =>
      import('./ui/pages/automations-page/automations-page.component').then(
        (m) => m.AutomationsPage,
      ),
    title: $localize`:@@route.automations:Automations`,
    data: { breadcrumb: false },
  },
];
