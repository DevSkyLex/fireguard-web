import type { ActivatedRouteSnapshot } from '@angular/router';

/**
 * Function readRouteParam
 * @function readRouteParam
 *
 * @description
 * Reads a route parameter from anywhere in the activated route subtree rooted
 * at the given snapshot. Organization stores use it to derive the active
 * organization from the URL, which is the source of truth: the store caches the
 * entity, the URL decides which one is open.
 *
 * @since 1.1.0
 *
 * @param {ActivatedRouteSnapshot} route - Snapshot to inspect, recursively into children.
 * @param {string} paramName - Route parameter name to look for.
 *
 * @returns {string | null} The parameter value, or `null` when absent from the whole subtree.
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function readRouteParam(route: ActivatedRouteSnapshot, paramName: string): string | null {
  const value: string | null = route.paramMap.get(paramName);

  if (value !== null) return value;

  for (const child of route.children) {
    const childValue: string | null = readRouteParam(child, paramName);

    if (childValue !== null) return childValue;
  }

  return null;
}
