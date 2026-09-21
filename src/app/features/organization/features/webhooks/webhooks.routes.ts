import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';

/**
 * Constant WEBHOOK_ROUTES
 * @const WEBHOOK_ROUTES
 * @description Read-gated organization integrations entry. Management is authorized separately.
 * @since 1.0.0
 */
export const WEBHOOK_ROUTES: Routes = [
  {
    path: '',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.WEBHOOKS_READ] }),
    ],
    loadComponent: () =>
      import('./ui/pages/webhooks-page/webhooks-page.component').then((m) => m.WebhooksPage),
    title: $localize`:@@route.webhooks:Webhooks`,
    data: { breadcrumb: false },
  },
];
