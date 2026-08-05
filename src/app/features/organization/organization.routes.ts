import type { Routes } from '@angular/router';
import { organizationAccessGuard, organizationGuard } from './http/guards';
import { organizationResolver, organizationTitleResolver } from './http/resolvers';

/**
 * Constant ORGANIZATION_SCOPED_ROUTES
 *
 * @description
 * Everything served under one organization. Private to this file — external
 * consumers mount {@link ORGANIZATION_ROUTES}, which wraps these children with
 * the `:organizationId` segment that gates and resolves them.
 *
 * Only the landing page is mounted today; the remaining destinations named in
 * `FEATURE.md` return here one at a time as their pages are rebuilt, and the
 * sidebar navigation already lists them behind their permissions.
 *
 * @since 1.0.0
 */
const ORGANIZATION_SCOPED_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ui/pages/organization-today-page/organization-today-page.component').then(
        (m) => m.OrganizationTodayPage,
      ),
    title: $localize`:@@route.today:Today`,
    data: { breadcrumb: false },
  },
];

/**
 * Constant ORGANIZATION_ROUTES
 *
 * @description
 * The feature's route entry point.
 *
 * `/organizations` is redirect-only: `organizationGuard` forwards to the
 * default workspace — the last organization persisted in the cookie when it is
 * still accessible, else the first accessible one, else onboarding. There is no
 * organization list page; switching happens through the sidebar switcher.
 *
 * `/organizations/:organizationId` resolves organization context before any
 * child renders, so a page never has to reason about a half-known workspace.
 *
 * @since 1.0.0
 */
export const ORGANIZATION_ROUTES: Routes = [
  {
    path: '',
    canActivate: [organizationGuard],
    // The guard always redirects; the component is never constructed. Angular
    // still requires a terminal route here for the path to be matchable.
    children: [],
  },
  {
    path: ':organizationId',
    canActivate: [organizationAccessGuard],
    resolve: {
      organization: organizationResolver,
    },
    title: organizationTitleResolver,
    children: ORGANIZATION_SCOPED_ROUTES,
  },
];
