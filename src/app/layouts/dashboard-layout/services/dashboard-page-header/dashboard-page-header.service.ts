import { inject, Injectable, type Signal, type Type } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import {
  PAGE_HEADER_SLOT,
  type PageHeaderContribution,
} from '@layouts/dashboard-layout/slots/page-header';

/**
 * Service DashboardPageHeaderService
 * @class DashboardPageHeaderService
 *
 * @description
 * Layout-scoped service backing the dashboard page header banner. It resolves
 * the active page title directly from the route's built-in `title` (kept in
 * sync with navigation events) and exposes the components contributed to the
 * page header action slot via the `PAGE_HEADER_SLOT` multi-provider token,
 * sorted by ascending `order` — mirroring {@link DashboardHeaderActionsService}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable()
export class DashboardPageHeaderService {
  //#region Properties
  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular Router used to track navigation events and inspect the active
   * route tree.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property title
   * @readonly
   *
   * @description
   * Active page title resolved from the deepest activated route's built-in
   * `title`, or `null` when none is defined (in which case the layout renders
   * no banner). Synchronised with navigation events.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  public readonly title: Signal<string | null> = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
      map((): string | null => this.resolveTitle(this.router.routerState.root)),
    ),
    { initialValue: null },
  );

  /**
   * Property actions
   * @readonly
   *
   * @description
   * Page header action components contributed through `PAGE_HEADER_SLOT`,
   * sorted by ascending `order` and ready to render via `NgComponentOutlet`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Type<unknown>[]}
   */
  public readonly actions: Type<unknown>[] = (inject(PAGE_HEADER_SLOT, { optional: true }) ?? [])
    .toSorted((a: PageHeaderContribution, b: PageHeaderContribution): number => a.order - b.order)
    .map((contribution: PageHeaderContribution): Type<unknown> => contribution.component);
  //#endregion

  //#region Methods
  /**
   * Method resolveTitle
   * @method resolveTitle
   *
   * @description
   * Walks the activated route tree and returns the deepest defined route
   * `title`, matching Angular's title resolution (the most specific route
   * wins).
   *
   * @access private
   * @since 1.0.0
   *
   * @param {ActivatedRoute | null | undefined} route - Root activated route.
   *
   * @returns {string | null} The resolved title or `null`.
   */
  private resolveTitle(route: ActivatedRoute | null | undefined): string | null {
    let current: ActivatedRoute | null | undefined = route;
    let title: string | null = null;

    while (current) {
      const snapshotTitle: string | undefined = current.snapshot?.title;
      if (typeof snapshotTitle === 'string' && snapshotTitle.trim()) {
        title = snapshotTitle;
      }
      current = current.firstChild;
    }

    return title;
  }
  //#endregion
}
