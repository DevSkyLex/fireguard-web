import { inject } from '@angular/core';
import type { RedirectFunction, Routes } from '@angular/router';
import { Router } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { interventionTitleResolver } from './http/resolvers';
import { InterventionStore } from './state';
import { InterventionPlanningOptionsStore } from './state/intervention-planning-options';
import { InterventionStatisticsStore } from './state/intervention-statistics';

/**
 * Function redirectToInterventionView
 *
 * @description
 * Builds the `redirectTo` for the retired `/board` and `/calendar` segments:
 * `/interventions?view=board|calendar`, preserving every other query param
 * the incoming URL carried (a filter, `?q=`, …) — a functional `redirectTo`
 * rather than a string template, since it must merge params rather than
 * replace them. Reads `organizationId` off the redirect data's own
 * `paramMap`, inherited from the outer pathless parent
 * (`paramsInheritanceStrategy: 'always'`, `app.config.ts`).
 *
 * @since 11.0.0
 *
 * @param {'board' | 'calendar' | 'recurrences'} view - Which tab the route names.
 *
 * @returns {RedirectFunction} A redirect resolving to the merged `UrlTree`.
 */
function redirectToInterventionView(view: 'board' | 'calendar' | 'recurrences'): RedirectFunction {
  return (redirectData) => {
    const router: Router = inject(Router);
    const organizationId: string | null = redirectData.paramMap.get('organizationId');

    return router.createUrlTree(['/organizations', organizationId, 'interventions'], {
      queryParams: { ...redirectData.queryParams, view },
    });
  };
}

/**
 * Constant INTERVENTION_ROUTES
 * @const INTERVENTION_ROUTES
 *
 * @description
 * Organization-scoped intervention workflows: the index at
 * `/organizations/:organizationId/interventions` — the List/Board/Calendar
 * tabs `InterventionsPage` renders over `hlm-tabs` — and one intervention
 * under it.
 *
 * **One page, not a routed shell.** Earlier revisions nested three routed
 * leaves (`''`, `board`, `calendar`) under a second pathless parent
 * mounting `InterventionsShellPage`'s shared toolbar, coordinating the
 * List's own Display/Recurrences/Export controls through a `TemplateRef`
 * slot (`InterventionToolbarActions`). One physical `InterventionsPage`
 * replaced all of that: the tabs are `hlm-tabs`
 * (`@shared/ui/tabs`) over the `view` route-bound input rather than a
 * `<router-outlet />`, so the toolbar, the KPI strip and the eight-chip
 * filter bar are built once, and the List's own controls render inline,
 * gated on the active tab, with no slot indirection. `/board` and
 * `/calendar` still exist as addressable, bookmarkable URLs: each is a
 * functional `redirectTo` ({@link redirectToInterventionView}) onto
 * `/interventions?view=board|calendar`, preserving every other query param.
 * They are registered **before** `:interventionId` — a literal segment must
 * be matched ahead of the param route, or a visit to either would instead
 * resolve as a detail page for an intervention id of `"board"`/`"calendar"`.
 *
 * The three leaves share one pathless parent so `InterventionStore`,
 * `InterventionPlanningOptionsStore` (site/member/label options for the
 * filter bar) and `InterventionStatisticsStore` (the KPI strip), all bound
 * in its route-level `providers`, survive navigation across the index and
 * the detail page — the list, the board and the detail page's prev/next all
 * walk the same `orderedIds()`, with no second fetch, and the KPI figures
 * hold while switching tabs. The Calendar tab does **not** read
 * `InterventionStore`: it reads a bounded date window instead of one server
 * page, an incompatible shape for the same entity cache, so `InterventionsPage`
 * provides its own component-scoped `InterventionCalendarStore` instead
 * (`FEATURE.md`).
 *
 * Which of the filter bar's eight fields each tab actually applies is no
 * longer route `data` — with one page and no child routes to declare it on,
 * it is `INTERVENTION_VIEW_HONOURED_FILTER_KEYS`, a `Record` local to
 * `InterventionsPage` itself.
 *
 * The permission guard sits on the outer parent only, as it does in
 * `COLLABORATION_ROUTES`: it re-runs on an organization switch because the
 * params change, and guarding each child would leave the next one added
 * unprotected by omission.
 *
 * The outer parent carries the section breadcrumb so the detail page reads
 * `Org › Interventions › <name>` with a way back; the index suppresses its
 * own to avoid repeating that crumb.
 *
 * `interventionTitleResolver` is registered as `title` only. `BreadcrumbService`
 * falls through to `snapshot.title` when `title` is a `ResolveFn`, so one
 * invocation serves both the document title and the crumb — registering it
 * twice would run it twice, concurrently, with neither able to use the
 * other's cache. The resolver answers synchronously (cached name or neutral
 * label) while seeding the active-intervention fetch fire-and-forget, so
 * activation never waits on the network and the page paints its own
 * skeleton; once the workspace loads, the page re-sets the title through
 * `TitleService`.
 *
 * @since 2.1.0
 *
 * @type {Routes}
 */
export const INTERVENTION_ROUTES: Routes = [
  {
    path: '',
    providers: [InterventionStore, InterventionPlanningOptionsStore, InterventionStatisticsStore],
    canActivate: [
      organizationPermissionGuard({
        permissions: [ORGANIZATION_PERMISSION.INTERVENTIONS_READ],
      }),
    ],
    data: { breadcrumb: $localize`:@@route.interventions:Interventions` },
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./ui/pages/interventions-page/interventions-page.component').then(
            (m) => m.InterventionsPage,
          ),
        title: $localize`:@@route.interventions:Interventions`,
        data: { breadcrumb: false },
      },
      {
        path: 'board',
        redirectTo: redirectToInterventionView('board'),
      },
      {
        path: 'calendar',
        redirectTo: redirectToInterventionView('calendar'),
      },
      {
        path: 'recurrences',
        redirectTo: redirectToInterventionView('recurrences'),
      },
      {
        path: ':interventionId',
        loadComponent: () =>
          import('./ui/pages/intervention-detail-page/intervention-detail-page.component').then(
            (m) => m.InterventionDetailPage,
          ),
        title: interventionTitleResolver,
      },
    ],
  },
];
