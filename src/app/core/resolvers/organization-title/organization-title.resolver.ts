import { inject } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import { OrganizationOutput } from '@app/core/models';
import { OrganizationStore } from '@core/stores/organization';

/**
 * Resolver organizationTitleResolver
 *
 * @description
 * Returns the organization name as the page title or breadcrumb label.
 * Reads the selected organization from {@link OrganizationStore},
 * which is populated by {@link organizationResolver}.
 *
 * Can be used as both a `title` resolver and a `breadcrumb` resolver.
 *
 * @version 1.1.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @returns {string} The organization name, or 'Overview' as fallback.
 */
export const organizationTitleResolver: ResolveFn<string> = (): string => {
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
   * The currently selected organization retrieved from the store. If no organization
   * is selected, it means the user is on the organizations list page, and we return
   * a generic title 'Overview'.
   *
   * @var {OrganizationOutput | null}
   */
  const organization: OrganizationOutput | null = organizationStore.selectedOrganization();

  // Return the organization name as title, or 'Overview' if no organization is selected.
  return organization ? organization.name : 'Overview';
};
