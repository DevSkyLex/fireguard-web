import { inject } from '@angular/core';
import {
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  Router,
  type RouterStateSnapshot,
  type UrlTree,
} from '@angular/router';

/**
 * Guard notFoundRedirectGuard
 *
 * @description
 * Sends an unmatched URL to the not-found page, carrying the address that
 * failed as the `from` query parameter.
 *
 * A plain `redirectTo` cannot do this: it discards the attempted URL, which
 * leaves the not-found page with nothing to offer but "back to home" — the one
 * exit a member who mistyped a deep link does not want. With the address in
 * hand the page can name the organization and the collection the URL was
 * reaching for.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const notFoundRedirectGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
): UrlTree => {
  const router: Router = inject<Router>(Router);

  return router.createUrlTree(['/error/404'], { queryParams: { from: state.url } });
};
