import { inject, Injectable, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { filter, map, startWith } from 'rxjs';

/**
 * Constant DEFAULT_HOME_ITEM
 * @const DEFAULT_HOME_ITEM
 *
 * @description
 * Default home breadcrumb item configuration.
 * Can be overridden by modifying the `home` property of the service.
 *
 * @var {Readonly<MenuItem>}
 */
const DEFAULT_HOME_ITEM: Readonly<MenuItem> = {
  icon: 'pi pi-home',
  routerLink: '/',
};

/**
 * Service DashboardBreadcrumbService
 * @class DashboardBreadcrumbService
 *
 * @description
 * Builds breadcrumb items from the currently activated route tree.
 * Route labels are resolved from `data.breadcrumb` and fallback to route title.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable()
export class DashboardBreadcrumbService {
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
  private readonly router: Router =
    inject<Router>(Router);

  /**
   * Property home
   * @readonly
   *
   * @description
   * Home breadcrumb item displayed before the
   * dynamic route breadcrumbs.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {MenuItem}
   */
  public readonly home: MenuItem = { ...DEFAULT_HOME_ITEM };

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
   * @type {Signal<MenuItem[]>}
   */
  public readonly items: Signal<MenuItem[]> = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
      map((): MenuItem[] => this.buildBreadcrumbs(this.router.routerState.root)),
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
   * @returns {MenuItem[]} Generated breadcrumb items.
   */
  private buildBreadcrumbs(route: ActivatedRoute | null | undefined): MenuItem[] {
    if (!route) return [];

    const items: MenuItem[] = [];
    let currentRoute: ActivatedRoute | null = route;
    let currentUrl: string = '';

    while (currentRoute) {
      const snapshot: ActivatedRouteSnapshot = currentRoute.snapshot;
      const label: string | null = this.resolveLabel(currentRoute);
      const path: string = (snapshot?.url ?? [])
        .map((segment): string => segment.path)
        .join('/');

      if (path) currentUrl = `${currentUrl}/${path}`;

      if (label) {
        items.push({
          label: label,
          routerLink: currentUrl || '/',
        });
      }

      currentRoute = currentRoute.firstChild;
    }

    return items;
  }

  /**
   * Method resolveLabel
   * @method resolveLabel
   *
   * @description
   * Resolves breadcrumb label from route data (`breadcrumb`) or title.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {ActivatedRoute} route - Activated route node.
   *
   * @returns {string | null} Breadcrumb label when available.
   */
  private resolveLabel(route: ActivatedRoute): string | null {
    const hasBreadcrumbResolver: boolean = route.routeConfig?.resolve?.['breadcrumb'] !== undefined;
    if (hasBreadcrumbResolver) {
      const resolvedBreadcrumbValue: unknown = route.snapshot?.data?.['breadcrumb'];
      if (typeof resolvedBreadcrumbValue === 'string' && resolvedBreadcrumbValue.trim().length > 0) {
        return resolvedBreadcrumbValue;
      }
    }

    const breadcrumbValue: unknown = route.routeConfig?.data?.['breadcrumb'];

    if (typeof breadcrumbValue === 'string' && breadcrumbValue.trim().length > 0) {
      return breadcrumbValue;
    }

    const routeTitle: unknown = route.routeConfig?.title;
    if (typeof routeTitle === 'string' && routeTitle.trim().length > 0) {
      return routeTitle;
    }

    if (routeTitle !== undefined) {
      const resolvedTitle: string | undefined = route.snapshot?.title;
      if (typeof resolvedTitle === 'string' && resolvedTitle.trim().length > 0) {
        return resolvedTitle;
      }
    }

    return null;
  }
  //#endregion
}
