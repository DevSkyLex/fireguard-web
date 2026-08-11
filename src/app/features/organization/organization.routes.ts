import type { Routes } from '@angular/router';
import { organizationAccessGuard, organizationGuard } from './http/guards';
import { organizationResolver, organizationTitleResolver } from './http/resolvers';

/**
 * Constant ORGANIZATION_ROUTES
 *
 * @description
 * The feature's route entry point, and everything served under one organization.
 *
 * `/organizations` is redirect-only: `organizationGuard` forwards to the
 * default workspace — the last organization persisted in the cookie when it is
 * still accessible, else the first accessible one, else onboarding. Its empty
 * `children` exists only to make the path matchable, since the guard always
 * redirects and no component is ever constructed. There is no organization list
 * page; switching happens through the sidebar switcher.
 *
 * `/organizations/:organizationId` resolves organization context before any
 * child renders, so a page never has to reason about a half-known workspace.
 *
 * The landing page, the direct messages and a member's profile are mounted
 * today; the remaining destinations named in `FEATURE.md` return under
 * `:organizationId` one at a time as their pages are rebuilt, and the sidebar
 * navigation already lists them behind their permissions.
 *
 * `messages` loads the collaboration subfeature's route file directly rather
 * than its barrel, which also exports the offline sync coordinator and would
 * pull it into this lazy chunk.
 *
 * @since 1.0.0
 */
export const ORGANIZATION_ROUTES: Routes = [
  {
    path: '',
    canActivate: [organizationGuard],
    children: [],
  },
  {
    path: ':organizationId',
    canActivate: [organizationAccessGuard],
    resolve: {
      organization: organizationResolver,
    },
    title: organizationTitleResolver,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./ui/pages/organization-today-page/organization-today-page.component').then(
            (m) => m.OrganizationTodayPage,
          ),
        title: $localize`:@@route.today:Today`,
        data: { breadcrumb: false },
      },
      {
        path: 'messages',
        loadChildren: () =>
          import('./features/collaboration/collaboration.routes').then(
            (m) => m.COLLABORATION_ROUTES,
          ),
      },
      {
        path: 'interventions',
        loadChildren: () =>
          import('./features/interventions/interventions.routes').then(
            (m) => m.INTERVENTION_ROUTES,
          ),
      },
      {
        path: 'equipments',
        loadChildren: () =>
          import('./features/equipments/equipments.routes').then((m) => m.EQUIPMENT_ROUTES),
      },
      {
        path: 'facilities',
        loadChildren: () =>
          import('./features/facilities/facilities.routes').then((m) => m.FACILITY_ROUTES),
      },
      {
        path: 'inspections',
        loadChildren: () =>
          import('./features/inspections/inspections.routes').then((m) => m.INSPECTION_ROUTES),
      },
      {
        path: 'calendar',
        loadChildren: () =>
          import('./features/calendar/calendar.routes').then((m) => m.CALENDAR_ROUTES),
      },
      {
        path: 'members/:memberId',
        loadComponent: () =>
          import('./ui/pages/organization-member-profile-page/organization-member-profile-page.component').then(
            (m) => m.OrganizationMemberProfilePage,
          ),
        title: $localize`:@@route.memberProfile:Profile`,
        data: { breadcrumb: $localize`:@@route.memberProfile:Profile` },
      },
    ],
  },
];
