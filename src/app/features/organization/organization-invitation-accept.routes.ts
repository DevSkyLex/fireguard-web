import type { Routes } from '@angular/router';

/**
 * Constant ORGANIZATION_INVITATION_ACCEPT_ROUTES
 *
 * @description
 * The invitation-acceptance page, on its own route file rather than inside
 * `organization.routes.ts` because it does not share that subtree's guard
 * chain: `organization.routes.ts` is mounted under the auth-guarded dashboard
 * shell and starts with `organizationGuard`, both of which assume a signed-in
 * member choosing among organizations they already belong to. This page must
 * stay reachable signed out, so `app.routes.ts` mounts it at the app root,
 * outside that chain, while the page itself still lives under this feature's
 * `ui/pages/`.
 *
 * @since 1.0.0
 *
 * @type {Routes}
 */
export const ORGANIZATION_INVITATION_ACCEPT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ui/pages/organization-invitation-accept-page/organization-invitation-accept-page.component').then(
        (m) => m.OrganizationInvitationAcceptPage,
      ),
    title: $localize`:@@route.invitationAccept:Join organization`,
  },
];
