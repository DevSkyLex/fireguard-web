import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID, Service } from '@angular/core';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';

/**
 * Class MaintenanceCostAccessService
 * @class MaintenanceCostAccessService
 *
 * @description
 * Read-only access projection for browser-private finance and its independently granted actions.
 */
@Service()
export class MaintenanceCostAccessService {
  //#region Properties
  /**
   * Property platform
   * @readonly
   *
   * @description
   * Prevents private financial work during server rendering.
   *
   * @access private
   * @since unreleased
   *
   * @type {object}
   */
  private readonly platform: object = inject(PLATFORM_ID);

  /**
   * Property session
   * @readonly
   *
   * @description
   * Current authentication and generation remain reactive owner projections.
   *
   * @access private
   * @since unreleased
   *
   * @type {AuthSessionPort}
   */
  private readonly session: AuthSessionPort = inject(AUTH_SESSION_PORT);

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Uses the organization's effective grants without creating additional entitlements.
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
   * Method isReadable
   * @method isReadable
   *
   * @description
   * Financial reads require browser execution, authentication and the dedicated read grant.
   *
   * @access public
   * @since unreleased
   *
   * @returns {boolean} Whether private financial work is available.
   */
  public isReadable(): boolean {
    return (
      isPlatformBrowser(this.platform) &&
      this.session.isAuthenticated() &&
      this.permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ)
    );
  }

  /**
   * Method isSessionCurrent
   * @method isSessionCurrent
   *
   * @description
   * Compares the captured generation without changing the authentication owner.
   *
   * @access public
   * @since unreleased
   *
   * @param {number} revision - Generation captured by the financial workspace.
   *
   * @returns {boolean} Whether the workspace still belongs to the same session generation.
   */
  public isSessionCurrent(revision: number): boolean {
    return revision === this.session.sessionRevision();
  }

  /**
   * Method canReadMembers
   * @method canReadMembers
   *
   * @description
   * The optional member directory keeps its independent read permission.
   *
   * @access public
   * @since unreleased
   *
   * @returns {boolean} Whether named member choices may be read.
   */
  public canReadMembers(): boolean {
    return this.permissions.hasPermission(ORGANIZATION_PERMISSION.MEMBERS_READ);
  }

  /**
   * Method canManage
   * @method canManage
   *
   * @description
   * Projects the management grant; callers still enforce readable scope and account fences.
   *
   * @access public
   * @since unreleased
   *
   * @returns {boolean} Whether financial commands have their required management grant.
   */
  public canManage(): boolean {
    return this.permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE);
  }
  //#endregion
}
