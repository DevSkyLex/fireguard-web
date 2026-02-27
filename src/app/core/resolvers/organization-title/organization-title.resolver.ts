import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type { MaybeAsync, ResolveFn } from '@angular/router';
import type { OrganizationOutput } from '@app/core/models';
import { OrganizationStore } from '@core/stores/organization';
import { filter, first, map, type Observable } from 'rxjs';

/**
 * Resolver organizationTitleResolver
 *
 * @description
 * Returns the organization name as the page title or breadcrumb label.
 * Waits for the selected organization to be available in {@link OrganizationStore},
 * which is populated by {@link organizationResolver}.
 *
 * Can be used as both a `title` resolver and a `breadcrumb` resolver.
 *
 * @version 1.2.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @returns {MaybeAsync<string>} The organization name, or 'Overview' as fallback.
 */
export const organizationTitleResolver: ResolveFn<string> = (): MaybeAsync<string> => {
  /**
   * Constant organizationStore
   * @const organizationStore
   *
   * @description
   * Organization store for accessing the currently selected organization
   * and retrieving its name for the title resolution.
   *
   * @var {OrganizationStore}
   */
  const organizationStore: OrganizationStore =
    inject<OrganizationStore>(OrganizationStore);

  /**
   * Constant organization
   * @const organization
   *
   * @description
   * The currently selected organization retrieved from the store. If already
   * available (e.g. when used on a child route after the parent resolver
   * has completed), the name is returned synchronously. Otherwise, we
   * wait for the store to be populated by the parallel organizationResolver.
   *
   * @var {OrganizationOutput | null}
   */
  const organization: OrganizationOutput | null = organizationStore.selectedOrganization();

  // If the organization is already loaded (child route case), return immediately.
  if (organization) return organization.name;

  // Otherwise, wait for the organizationResolver to populate the store.
  const organization$: Observable<string> = toObservable(organizationStore.selectedOrganization).pipe(
    filter((org: OrganizationOutput | null): org is OrganizationOutput => org !== null),
    map((org: OrganizationOutput) => org.name),
    first(),
  );

  return organization$;
};
