import type { ActivatedRouteSnapshot } from '@angular/router';

/**
 * Function routeTreeHasParam
 * @function routeTreeHasParam
 *
 * @description
 * Determines whether a route parameter exists anywhere in the activated route
 * subtree rooted at the given snapshot. Used by organization stores to detect,
 * on navigation, whether the current URL is still organization-scoped so they
 * can clear their state once the user leaves the organization context.
 *
 * @since 1.0.0
 *
 * @param {ActivatedRouteSnapshot} route - Snapshot to inspect, recursively into children.
 * @param {string} paramName - Route parameter name to look for.
 *
 * @returns {boolean} `true` when the parameter is present on the snapshot or any descendant.
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function routeTreeHasParam(route: ActivatedRouteSnapshot, paramName: string): boolean {
  return (
    route.paramMap.has(paramName) ||
    route.children.some((child: ActivatedRouteSnapshot) => routeTreeHasParam(child, paramName))
  );
}
