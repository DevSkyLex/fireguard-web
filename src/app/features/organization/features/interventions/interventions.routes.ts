import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { interventionTitleResolver } from './http/resolvers';
import type { InterventionFilterFieldKey } from './models';
import { InterventionStore } from './state';
import { InterventionPlanningOptionsStore } from './state/intervention-planning-options';
import { InterventionStatisticsStore } from './state/intervention-statistics';

/**
 * Constant INTERVENTION_ROUTES
 * @const INTERVENTION_ROUTES
 *
 * @description
 * Organization-scoped intervention workflows: the index at
 * `/organizations/:organizationId/interventions`, the Kanban board at
 * `/organizations/:organizationId/interventions/board`, the Calendar at
 * `/organizations/:organizationId/interventions/calendar`, and one
 * intervention under it.
 *
 * `board` and `calendar` are both registered before `:interventionId` — a
 * literal segment must be matched ahead of the param route, or every visit
 * to either would instead resolve as a detail page for an intervention id of
 * `"board"`/`"calendar"`.
 *
 * The four leaves share a pathless parent so `InterventionStore`, bound in
 * its route-level `providers`, survives navigation across all of them — the
 * list, the board and the detail page's prev/next all walk the same
 * `orderedIds()`, with no second fetch. The Calendar leaf does **not** read
 * `InterventionStore`: it reads a bounded date window instead of one server
 * page, an incompatible shape for the same entity cache, so it owns its own
 * component-scoped `InterventionCalendarStore` (`FEATURE.md`).
 *
 * The list, the board and the calendar additionally nest under their own
 * **second** pathless route, `component:`-mounting `InterventionsShellPage` —
 * the shared toolbar (search box, the List/Board/Calendar switcher, the
 * filter toggle and bar) that used to be built three times, once per leaf.
 * The detail page sits **outside** that inner route, as the outer parent's
 * other child: it renders its own tabbed workspace, not the collection
 * chrome, so nesting it under the shell too would wrap a detail page in a
 * search box and a view switcher it has no use for. Both children still
 * share the outer parent's `InterventionStore`, and the shell's own
 * `InterventionPlanningOptionsStore` (site/member/label options for the
 * filter bar's three IRI-valued chips) is scoped to the inner route alone,
 * so the detail page's separate, component-scoped instance of the same store
 * is unaffected.
 *
 * Each of the three collection leaves declares `data.honouredFilterKeys` —
 * which of the filter bar's eight fields it actually applies. The shell
 * reads it from the router's own snapshot (`InterventionsShellPage`) to
 * render an active-but-unhonoured chip as visibly inert rather than silently
 * dropped or silently misleading: the board ignores `status` (its columns
 * already narrow by status); the calendar honours only `status`, `type`,
 * `site` and `responsible` (`InterventionCalendarFilters` is a `Pick` of
 * exactly those four — the visible month is already the date filter, and
 * `priority`/`label` are not read by the store either).
 *
 * The permission guard sits on the outer parent only, as it does in
 * `COLLABORATION_ROUTES`: it re-runs on an organization switch because the
 * params change, and guarding each child would leave the next one added
 * unprotected by omission.
 *
 * The outer parent carries the section breadcrumb so the detail page reads
 * `Org › Interventions › <name>` with a way back; the index suppresses its own
 * to avoid repeating that crumb. The inner shell route carries no breadcrumb
 * of its own — it contributes no URL segment, so it has nothing to name.
 *
 * `interventionTitleResolver` is registered as `title` only. `BreadcrumbService`
 * falls through to `snapshot.title` when `title` is a `ResolveFn`, so one
 * invocation serves both the document title and the crumb — registering it
 * twice would run it twice, concurrently, with neither able to use the other's
 * cache. The resolver answers synchronously (cached name or neutral label)
 * while seeding the active-intervention fetch fire-and-forget, so activation
 * never waits on the network and the page paints its own skeleton; once the
 * workspace loads, the page re-sets the title through `TitleService`.
 *
 * @since 2.1.0
 *
 * @type {Routes}
 */
export const INTERVENTION_ROUTES: Routes = [
  {
    path: '',
    providers: [InterventionStore],
    canActivate: [
      organizationPermissionGuard({
        permissions: [ORGANIZATION_PERMISSION.INTERVENTIONS_READ],
      }),
    ],
    data: { breadcrumb: $localize`:@@route.interventions:Interventions` },
    children: [
      {
        path: '',
        providers: [InterventionPlanningOptionsStore, InterventionStatisticsStore],
        loadComponent: () =>
          import('./ui/pages/interventions-shell-page/interventions-shell-page.component').then(
            (m) => m.InterventionsShellPage,
          ),
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('./ui/pages/interventions-page/interventions-page.component').then(
                (m) => m.InterventionsPage,
              ),
            title: $localize`:@@route.interventions:Interventions`,
            data: {
              breadcrumb: false,
              honouredFilterKeys: [
                'status',
                'type',
                'priority',
                'site',
                'responsible',
                'label',
                'dueRange',
                'plannedStartRange',
              ] satisfies readonly InterventionFilterFieldKey[],
            },
          },
          {
            path: 'board',
            loadComponent: () =>
              import('./ui/pages/interventions-board-page/interventions-board-page.component').then(
                (m) => m.InterventionsBoardPage,
              ),
            title: $localize`:@@route.interventionsBoard:Board`,
            data: {
              breadcrumb: $localize`:@@route.interventionsBoard:Board`,
              honouredFilterKeys: [
                'type',
                'priority',
                'site',
                'responsible',
                'label',
                'dueRange',
                'plannedStartRange',
              ] satisfies readonly InterventionFilterFieldKey[],
            },
          },
          {
            path: 'calendar',
            loadComponent: () =>
              import('./ui/pages/interventions-calendar-page/interventions-calendar-page.component').then(
                (m) => m.InterventionsCalendarPage,
              ),
            title: $localize`:@@route.interventionsCalendar:Calendar`,
            data: {
              breadcrumb: $localize`:@@route.interventionsCalendar:Calendar`,
              honouredFilterKeys: [
                'status',
                'type',
                'site',
                'responsible',
              ] satisfies readonly InterventionFilterFieldKey[],
            },
          },
        ],
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
