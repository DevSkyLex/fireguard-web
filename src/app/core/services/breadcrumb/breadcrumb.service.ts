import { computed, inject, Injectable, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { filter, map, startWith } from 'rxjs';

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
@Injectable()
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
   * @type {Signal<MenuItem>}
   */
  public readonly home: Signal<MenuItem> = computed<MenuItem>(() => ({
    icon: 'pi pi-home',
    routerLink: '/',
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
      const path: string = (snapshot?.url ?? []).map((segment): string => segment.path).join('/');

      if (path) currentUrl = `${currentUrl}/${path}`;

      if (label) {
        items.push({
          label: label,
          routerLink: currentUrl || '/',
        });
      }

      currentRoute = currentRoute.firstChild;
    }

    // Last item = current page: non-clickable + darker text
    if (items.length > 0) {
      const lastItem: MenuItem = items[items.length - 1];
      delete lastItem.routerLink;
      lastItem.linkClass = 'text-surface-900 dark:text-surface-0 font-medium !cursor-default';
    }

    return items;
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

    // Explicitly suppressed
    if (config?.data?.['breadcrumb'] === false) return null;

    // Static or resolved breadcrumb label (Angular merges both into snapshot.data)
    const breadcrumb: unknown = snapshot?.data?.['breadcrumb'];
    if (typeof breadcrumb === 'string' && breadcrumb.trim()) return breadcrumb;

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
