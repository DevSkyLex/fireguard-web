import { computed, inject, Service, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import type { BreadcrumbItem } from '../../models';

/**
 * Service BreadcrumbService
 * @class BreadcrumbService
 *
 * @description
 * Builds breadcrumb items from the currently activated route tree.
 * Route labels are resolved from `data.breadcrumb` and fallback to route title.
 *
 * @version 2.0.0
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
   * Property items
   * @readonly
   *
   * @description
   * Dynamic breadcrumbs synchronized with navigation events.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<BreadcrumbItem[]>}
   */
  public readonly items: Signal<BreadcrumbItem[]> = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
      map((): BreadcrumbItem[] => this.buildBreadcrumbs(this.router.routerState.root)),
    ),
    { initialValue: [] },
  );
  //#endregion

  //#region Methods
  /**
   * Method buildBreadcrumbs
   * @method buildBreadcrumbs
   *
   * @description
   * Traverses the active route tree to create breadcrumb menu items.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {ActivatedRoute} route - Root activated route.
   *
   * @returns {BreadcrumbItem[]} Generated breadcrumb items.
   */
  private buildBreadcrumbs(route: ActivatedRoute | null | undefined): BreadcrumbItem[] {
    if (!route) return [];

    const trail: { label: string; routerLink: string }[] = [];
    let currentRoute: ActivatedRoute | null = route;
    let currentUrl: string = '';

    while (currentRoute) {
      const snapshot: ActivatedRouteSnapshot = currentRoute.snapshot;
      const label: string | null = this.resolveLabel(currentRoute);
      const path: string = (snapshot?.url ?? []).map((segment): string => segment.path).join('/');

      if (path) currentUrl = `${currentUrl}/${path}`;

      if (label) {
        trail.push({
          label: label,
          routerLink: currentUrl || '/',
        });
      }

      currentRoute = currentRoute.firstChild;
    }

    // The last node is the current page: it carries no link, and says so as
    // data rather than as a styling hint.
    const lastIndex: number = trail.length - 1;

    return trail.map((node, index): BreadcrumbItem => {
      const isCurrent: boolean = index === lastIndex;

      return isCurrent
        ? { label: node.label, current: true }
        : { label: node.label, routerLink: node.routerLink, current: false };
    });
  }

  /**
   * Method resolveLabel
   * @method resolveLabel
   *
   * @description
   * Resolves breadcrumb label from route configuration.
   *
   * Resolution order:
   * 1. `data.breadcrumb === false` → explicitly suppressed (returns `null`)
   * 2. `snapshot.data.breadcrumb` → static or resolved breadcrumb label
   * 3. Route title (string or resolved) → fallback
   *
   * @access private
   * @since 1.0.0
   *
   * @param {ActivatedRoute} route - Activated route node.
   *
   * @returns {string | null} Breadcrumb label when available.
   */
  private resolveLabel(route: ActivatedRoute): string | null {
    const config = route.routeConfig;
    const snapshot = route.snapshot;
    const routeData = config?.data ?? {};
    const hasOwnBreadcrumbData = Object.prototype.hasOwnProperty.call(routeData, 'breadcrumb');
    const hasOwnBreadcrumbResolver = Object.prototype.hasOwnProperty.call(
      config?.resolve ?? {},
      'breadcrumb',
    );

    // Explicitly suppressed
    if (routeData['breadcrumb'] === false) return null;

    // Prefer route-local breadcrumb data. Angular merges parent data into snapshot.data,
    // so we must guard against inherited labels leaking into child routes.
    if (hasOwnBreadcrumbData) {
      const breadcrumb: unknown = routeData['breadcrumb'];
      if (typeof breadcrumb === 'string' && breadcrumb.trim()) return breadcrumb;
    }

    if (hasOwnBreadcrumbResolver) {
      const breadcrumb: unknown = snapshot?.data?.['breadcrumb'];
      if (typeof breadcrumb === 'string' && breadcrumb.trim()) return breadcrumb;
    }

    // Fallback to route title (static string or resolved)
    const title: unknown = config?.title;
    if (typeof title === 'string' && title.trim()) return title;
    if (title !== undefined && typeof snapshot?.title === 'string' && snapshot.title.trim()) {
      return snapshot.title;
    }

    return null;
  }
  //#endregion
}
