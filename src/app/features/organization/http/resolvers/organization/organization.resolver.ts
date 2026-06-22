import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  MaybeAsync,
  RedirectCommand,
  type ResolveFn,
  Router,
} from '@angular/router';
import { catchError, map, of, switchMap, type Observable } from 'rxjs';
import type { HydraCollection } from '@core/models/api';
import { OrganizationService } from '@features/organization/data-access';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';

/** Maximum OpenAPI-supported page size used by the resolver fallback. */
const ORGANIZATION_PAGE_SIZE = 30;

/**
 * Searches paginated accessible organizations when the detail endpoint is unavailable.
 */
function findAccessibleOrganization(
  organizationService: OrganizationService,
  organizationId: string,
  page: number = 1,
): Observable<OrganizationOutput | null> {
  return organizationService.list({ page, itemsPerPage: ORGANIZATION_PAGE_SIZE }).pipe(
    switchMap((collection: HydraCollection<OrganizationOutput>) => {
      const organization: OrganizationOutput | undefined = collection.member.find(
        (candidate: OrganizationOutput): boolean => candidate.id === organizationId,
      );

      if (organization) {
        return of(organization);
      }

      return page * ORGANIZATION_PAGE_SIZE < collection.totalItems
        ? findAccessibleOrganization(organizationService, organizationId, page + 1)
        : of(null);
    }),
  );
}

/**
 * Resolver organizationResolver
 *
 * @description
 * Fetches the organization matching the `:organizationId` route param
 * before the route activates. The resolved {@link OrganizationOutput}
 * is available in `ActivatedRoute.data['organization']`.
 *
 * On failure the user is redirected to `/` (which will trigger
 * {@link organizationGuard} to resolve the next best destination).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @param {ActivatedRouteSnapshot} route - The activated route snapshot containing the `:organizationId` parameter.
 *
 * @returns {Observable<OrganizationOutput>} An observable emitting the fetched organization, or EMPTY on failure.
 */
export const organizationResolver: ResolveFn<OrganizationOutput> = (
  route: ActivatedRouteSnapshot,
): MaybeAsync<OrganizationOutput | RedirectCommand> => {
  /**
   * Constant activeOrganizationStore
   * @const activeOrganizationStore
   *
   * @description
   * Active organization store for fetching the organization
   * data based on the route parameter.
   *
   * @var {ActiveOrganizationStore}
   */
  const activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);
  const organizationService: OrganizationService = inject<OrganizationService>(OrganizationService);

  /**
   * Constant router
   * @const router
   *
   * @description
   * Router for creating a redirection command in case the organization
   * cannot be resolved, ensuring the user is
   * redirected to a safe route.
   *
   * @var {Router}
   */
  const router: Router = inject<Router>(Router);

  // Extract organizationId from route parameters
  const organizationId: string | null = route.paramMap.get('organizationId');

  // If no organizationId is present, redirect immediately
  if (!organizationId) return new RedirectCommand(router.parseUrl('/'));

  // Attempt to resolve the organization, redirecting on failure
  return activeOrganizationStore.resolveOrganization(organizationId).pipe(
    catchError(() =>
      findAccessibleOrganization(organizationService, organizationId).pipe(
        map((organization: OrganizationOutput | null): OrganizationOutput | RedirectCommand => {
          if (!organization) {
            return new RedirectCommand(router.parseUrl('/'));
          }

          activeOrganizationStore.setOrganization(organization);
          return organization;
        }),
        catchError(() => of(new RedirectCommand(router.parseUrl('/')))),
      ),
    ),
  );
};
