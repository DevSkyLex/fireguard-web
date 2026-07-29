import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type { ActivatedRouteSnapshot, MaybeAsync, ResolveFn } from '@angular/router';
import { filter, first, map, type Observable } from 'rxjs';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Resolver organizationTitleResolver
 *
 * @description
 * Returns the organization name as the page title or breadcrumb label.
 * Waits for the organization named by `:organizationId` to land in
 * {@link ActiveOrganizationStore}, which the parallel `organizationResolver`
 * populates.
 *
 * It deliberately reads the store's cached entity rather than its
 * `selectedOrganization` projection: that projection only publishes the
 * organization the **URL** designates, and the URL is not committed until the
 * navigation ends — which is what this resolver is holding up. Waiting on it
 * would deadlock the navigation against itself.
 *
 * Can be used as both a `title` resolver and a `breadcrumb` resolver.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @param {ActivatedRouteSnapshot} route - Snapshot carrying the `:organizationId` parameter.
 *
 * @returns {MaybeAsync<string>} The organization name.
 */
export const organizationTitleResolver: ResolveFn<string> = (
  route: ActivatedRouteSnapshot,
): MaybeAsync<string> => {
  /**
   * Constant activeOrganizationStore
   * @const activeOrganizationStore
   *
   * @description
   * Active organization store holding the resource the sibling resolver loads.
   *
   * @var {ActiveOrganizationStore}
   */
  const activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Constant organizationId
   * @const organizationId
   *
   * @description
   * Organization the route is navigating to, so a resource left over from the
   * previous one is not mistaken for the answer.
   *
   * @var {string | null}
   */
  const organizationId: string | null = route.paramMap.get('organizationId');

  const isTargetOrganization = (
    organization: OrganizationOutput | null,
  ): organization is OrganizationOutput =>
    organization !== null && (organizationId === null || organization.id === organizationId);

  const cached: OrganizationOutput | null = activeOrganizationStore.organizationEntity();

  // Already loaded (child route case, or a revisit): answer synchronously.
  if (isTargetOrganization(cached)) return cached.name;

  const organization$: Observable<string> = toObservable(
    activeOrganizationStore.organizationEntity,
  ).pipe(
    filter(isTargetOrganization),
    map((organization: OrganizationOutput): string => organization.name),
    first(),
  );

  return organization$;
};
