import { computed, inject, Service, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { TitleService } from '@core/title';
import type { BreadcrumbItem } from '../../models';

/**
 * Interface BreadcrumbTrailNode
 *
 * @description
 * Internal trail node built per navigation, before the current-page item is
 * marked. `fromTitle` records that the label fell back to the route title,
 * which is what allows {@link BreadcrumbService.items} to follow the live
 * page title for the current page.
 *
 * @since 2.1.0
 */
interface BreadcrumbTrailNode {
  readonly label: string;
  readonly routerLink: string;
  readonly fromTitle: boolean;
}

/**
 * Service BreadcrumbService
 * @class BreadcrumbService
 *
 * @description
 * Builds breadcrumb items from the currently activated route tree.
 * Route labels are resolved from `data.breadcrumb` and fall back to the route
 * title. When the current page's label came from that title fallback, it
 * follows the live `TitleService.pageTitle` — so a detail page whose title
 * resolver returned a neutral label while its record was still loading gets
 * its real name in the trail as soon as the page re-sets the document title.
 *
 * @version 2.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service({ autoProvided: false })
export class BreadcrumbService {
  //#region Properties
  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular Router instance for navigation event
   * tracking and route inspection.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property titleService
   * @readonly
   *
   * @description
   * Live page title, mirrored into the current-page crumb when that crumb's
   * label fell back to the route title.
   *
   * @access private
   * @since 2.1.0
   *
   * @type {TitleService}
   */
  private readonly titleService: TitleService = inject<TitleService>(TitleService);

  /**
   * Property home
   * @readonly
   *
   * @description
   * Home breadcrumb item displayed before the
   * dynamic route breadcrumbs. Links to the
   * application root.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {Signal<BreadcrumbItem>}
   */
  public readonly home: Signal<BreadcrumbItem> = computed<BreadcrumbItem>(() => ({
    routerLink: '/',
    current: false,
  }));

  /**
   * Property navigationTrail
   * @readonly
   *
   * @description
   * Trail nodes rebuilt on every navigation end, before the live-title
   * overlay is applied.
   *
   * @access private
   * @since 2.1.0
   *
   * @type {Signal<BreadcrumbTrailNode[]>}
   */
  private readonly navigationTrail: Signal<BreadcrumbTrailNode[]> = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
      map((): BreadcrumbTrailNode[] => this.buildBreadcrumbs(this.router.routerState.root)),
    ),
    { initialValue: [] },
  );

  /**
   * Property items
   * @readonly
   *
   * @description
   * Dynamic breadcrumbs synchronized with navigation events. The last item
   * is the current page: it carries no link, and when its label came from
   * the route-title fallback it tracks the live page title.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<BreadcrumbItem[]>}
   */
  public readonly items: Signal<BreadcrumbItem[]> = computed<BreadcrumbItem[]>(() => {
    const trail: BreadcrumbTrailNode[] = this.navigationTrail();
    const pageTitle: string = this.titleService.pageTitle();
    const lastIndex: number = trail.length - 1;

    return trail.map((node: BreadcrumbTrailNode, index: number): BreadcrumbItem => {
      if (index !== lastIndex) {
        return { label: node.label, routerLink: node.routerLink, current: false };
      }

      return {
        label: node.fromTitle && pageTitle ? pageTitle : node.label,
        current: true,
      };
    });
  });
  //#endregion

  //#region Methods
  /**
   * Method buildBreadcrumbs
   * @method buildBreadcrumbs
   *
   * @description
   * Traverses the active route tree to create the labelled trail nodes.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {ActivatedRoute} route - Root activated route.
   *
   * @returns {BreadcrumbTrailNode[]} Generated trail nodes.
   */
  private buildBreadcrumbs(route: ActivatedRoute | null | undefined): BreadcrumbTrailNode[] {
    if (!route) return [];

    const trail: BreadcrumbTrailNode[] = [];
    let currentRoute: ActivatedRoute | null = route;
    let currentUrl: string = '';

    while (currentRoute) {
      const snapshot: ActivatedRouteSnapshot = currentRoute.snapshot;
      const resolved: { label: string; fromTitle: boolean } | null =
        this.resolveLabel(currentRoute);
      const path: string = (snapshot?.url ?? []).map((segment): string => segment.path).join('/');

      if (path) currentUrl = `${currentUrl}/${path}`;

      if (resolved) {
        trail.push({
          label: resolved.label,
          routerLink: currentUrl || '/',
          fromTitle: resolved.fromTitle,
        });
      }

      currentRoute = currentRoute.firstChild;
    }

    return trail;
  }

  /**
   * Method resolveLabel
   * @method resolveLabel
   *
   * @description
   * Resolves a breadcrumb label from route configuration, in order:
   * `data.breadcrumb === false` suppresses the node; route-local
   * `data.breadcrumb` then a `resolve.breadcrumb` result label it; the route
   * title (static string or resolved) is the last resort, flagged
   * `fromTitle` so {@link items} may overlay the live page title. Both
   * breadcrumb reads check own-property presence because Angular merges
   * parent `data` into `snapshot.data`, and an inherited label must not leak
   * into child routes.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {ActivatedRoute} route - Activated route node.
   *
   * @returns {{ label: string; fromTitle: boolean } | null} Label and its source when available.
   */
  private resolveLabel(route: ActivatedRoute): { label: string; fromTitle: boolean } | null {
    const config = route.routeConfig;
    const snapshot = route.snapshot;
    const routeData = config?.data ?? {};
    const hasOwnBreadcrumbData = Object.prototype.hasOwnProperty.call(routeData, 'breadcrumb');
    const hasOwnBreadcrumbResolver = Object.prototype.hasOwnProperty.call(
      config?.resolve ?? {},
      'breadcrumb',
    );

    if (routeData['breadcrumb'] === false) return null;

    if (hasOwnBreadcrumbData) {
      const breadcrumb: unknown = routeData['breadcrumb'];
      if (typeof breadcrumb === 'string' && breadcrumb.trim()) {
        return { label: breadcrumb, fromTitle: false };
      }
    }

    if (hasOwnBreadcrumbResolver) {
      const breadcrumb: unknown = snapshot?.data?.['breadcrumb'];
      if (typeof breadcrumb === 'string' && breadcrumb.trim()) {
        return { label: breadcrumb, fromTitle: false };
      }
    }

    const title: unknown = config?.title;
    if (typeof title === 'string' && title.trim()) return { label: title, fromTitle: true };
    if (title !== undefined && typeof snapshot?.title === 'string' && snapshot.title.trim()) {
      return { label: snapshot.title, fromTitle: true };
    }

    return null;
  }
  //#endregion
}
