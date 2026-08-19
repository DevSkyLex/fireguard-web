import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { interventionTitleResolver } from './http/resolvers';
import { InterventionStore } from './state';

/**
 * Constant INTERVENTION_ROUTES
 * @const INTERVENTION_ROUTES
 *
 * @description
 * Organization-scoped intervention workflows: the index at
 * `/organizations/:organizationId/interventions`, the Kanban board at
 * `/organizations/:organizationId/interventions/board`, and one intervention
 * under it.
 *
 * `board` is registered before `:interventionId` — a literal segment must be
 * matched ahead of the param route, or every board visit would instead
 * resolve as a detail page for an intervention id of `"board"`.
 *
 * The children share a pathless parent so `InterventionStore`, bound in its
 * route-level `providers`, survives navigation between the list, the board
 * and a detail page — the list and the board render the exact same loaded
 * dataset, and the detail page's prev/next walks the same `orderedIds()` the
 * list populated, with no second fetch.
 *
 * The permission guard sits on the parent only, as it does in
 * `COLLABORATION_ROUTES`: it re-runs on an organization switch because the
 * params change, and guarding each child would leave the next one added
 * unprotected by omission.
 *
 * The parent carries the section breadcrumb so the detail page reads
 * `Org › Interventions › <name>` with a way back; the index suppresses its own
 * to avoid repeating that crumb.
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
        loadComponent: () =>
          import('./ui/pages/interventions-board-page/interventions-board-page.component').then(
            (m) => m.InterventionsBoardPage,
          ),
        title: $localize`:@@route.interventionsBoard:Board`,
        data: { breadcrumb: $localize`:@@route.interventionsBoard:Board` },
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
