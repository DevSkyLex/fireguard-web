import { inject, Service } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { OrganizationPermissionService } from '@features/organization/access';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { OrganizationMemberAccessStore } from '@features/organization/state';

/**
 * Class OrganizationLandingService
 * @class OrganizationLandingService
 *
 * @description
 * Resolves a target organization's default destination from API-confirmed permission grants.
 * Reuses the route access coordinator without changing the active organization.
 */
@Service()
export class OrganizationLandingService {
  //#region Properties
  /**
   * Property access
   * @readonly
   *
   * @description
   * Target-scoped access coordinator shared with route guards.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationMemberAccessStore}
   */
  private readonly access: OrganizationMemberAccessStore = inject(OrganizationMemberAccessStore);

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Checks effective grants only after resolving the exact target organization.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );
  //#endregion

  //#region Methods
  /**
   * Method defaultDestination
   * @method defaultDestination
   *
   * @description
   * Opens the fleet when facilities-read is granted, otherwise preserves the historical dashboard.
   * Explicit return URLs remain caller-owned and need not trigger this default lookup.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Server-authorized target organization.
   *
   * @returns {Observable<string>} Default local organization route.
   */
  public defaultDestination(organizationId: string): Observable<string> {
    const root: string = `/organizations/${encodeURIComponent(organizationId)}`;
    return this.access
      .ensureAccessResolved(organizationId)
      .pipe(
        map((resolved) =>
          resolved &&
          this.permissions.canAccessOrganization(organizationId, [
            ORGANIZATION_PERMISSION.FACILITIES_READ,
          ])
            ? `${root}/assets`
            : root,
        ),
      );
  }
  //#endregion
}
