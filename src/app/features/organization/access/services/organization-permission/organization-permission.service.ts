import { computed, inject, Injectable, type Signal } from '@angular/core';
import type { OrganizationPermissionName } from '@features/organization/models';
import { OrganizationMemberAccessStore } from '@features/organization/state';
import type { StoreError } from '@core/state/request-state';

/**
 * Service OrganizationPermissionService
 * @class OrganizationPermissionService
 *
 * @description
 * Feature-owned helper service exposing ergonomic checks for the authenticated
 * user's effective permissions in the current active organization.
 *
 * Because this helper is owned and consumed inside the organization feature,
 * it reads the concrete `OrganizationMemberAccessStore` directly.
 *
 * The published `ORGANIZATION_MEMBER_ACCESS_PORT` remains the boundary for
 * external consumers such as sibling features, layouts, or shared UI.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class OrganizationPermissionService {
  //#region Properties
  /**
   * Property organizationMemberAccessStore
   * @readonly
   *
   * @description
   * Organization-owned store exposing the authenticated user's effective
   * access state in the currently active organization.
   *
   * @access private
   * @type {OrganizationMemberAccessStore}
   */
  private readonly organizationMemberAccessStore: OrganizationMemberAccessStore =
    inject<OrganizationMemberAccessStore>(OrganizationMemberAccessStore);

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Effective permission names currently granted to the authenticated user in
   * the active organization.
   *
   * @access public
   * @type {Signal<ReadonlyArray<string>>}
   */
  public readonly permissions: Signal<ReadonlyArray<string>> =
    this.organizationMemberAccessStore.permissions;

  /**
   * Property isLoadingPermissions
   * @readonly
   *
   * @description
   * Indicates whether the organization-scoped permission payload is currently
   * loading.
   *
   * @access public
   * @type {Signal<boolean>}
   */
  public readonly isLoadingPermissions: Signal<boolean> =
    this.organizationMemberAccessStore.isLoadingAccess;

  /**
   * Property permissionError
   * @readonly
   *
   * @description
    * Last organization-scoped permission loading error exposed by the
    * organization access store.
   *
   * @access public
   * @type {Signal<StoreError | null>}
   */
  public readonly permissionError: Signal<StoreError | null> =
    this.organizationMemberAccessStore.accessError;

  /**
   * Property permissionSet
   * @readonly
   *
   * @description
   * Internal computed set of effective permission names used to keep permission
   * checks constant-time while remaining fully reactive to signal updates.
   *
   * @access private
   * @type {Signal<ReadonlySet<string>>}
   */
  private readonly permissionSet: Signal<ReadonlySet<string>> = computed(
    (): ReadonlySet<string> => new Set(this.permissions()),
  );

  //#endregion

  //#region Methods
  /**
   * Method reload
   * @method reload
   *
   * @description
   * Forces the organization feature to reload the authenticated user's access
   * payload for the currently active organization.
   *
   * @access public
   * @returns {void}
   */
  public reload(): void {
    this.organizationMemberAccessStore.reload();
  }

  /**
   * Method hasPermission
   * @method hasPermission
   *
   * @description
   * Returns whether the authenticated user currently has the requested
   * organization-scoped permission.
   *
   * Blank and whitespace-only permission names are rejected.
   *
   * @access public
   * @param {string} permission - Permission name to check.
   * @returns {boolean} `true` when the permission is currently granted.
   */
  public hasPermission(permission: OrganizationPermissionName): boolean {
    const normalizedPermission: string | null = this.normalizePermission(permission);

    if (normalizedPermission === null) {
      return false;
    }

    return this.hasGrantedPermission(normalizedPermission);
  }

  /**
   * Method hasAnyPermission
   * @method hasAnyPermission
   *
   * @description
   * Returns whether at least one permission from the provided list is currently
   * granted in the active organization.
   *
   * @access public
   * @param {ReadonlyArray<string>} permissions - Permission names to evaluate.
   * @returns {boolean} `true` when any permission is currently granted.
   */
  public hasAnyPermission(permissions: ReadonlyArray<OrganizationPermissionName>): boolean {
    return permissions.some((permission: OrganizationPermissionName) => this.hasPermission(permission));
  }

  /**
   * Method hasAllPermissions
   * @method hasAllPermissions
   *
   * @description
   * Returns whether every permission from the provided list is currently
   * granted in the active organization.
   *
   * @access public
   * @param {ReadonlyArray<string>} permissions - Permission names to evaluate.
   * @returns {boolean} `true` when all permissions are currently granted.
   */
  public hasAllPermissions(permissions: ReadonlyArray<OrganizationPermissionName>): boolean {
    return permissions.every((permission: OrganizationPermissionName) => this.hasPermission(permission));
  }

  /**
   * Method canAccessOrganization
   * @method canAccessOrganization
   *
   * @description
   * Evaluates whether the authenticated user can access organization-scoped
   * navigation requiring the provided permissions.
   *
  * When the requested organization already matches the loaded access store and
  * the access payload is in a successful state, the check is resolved from the
  * current store synchronously.
  *
  * Preloading the target organization's access payload is handled upstream by
  * `organizationAccessGuard`, so this service remains read-only against the
  * shared organization access store.
   *
   * @access public
   * @param {string} organizationId - Target organization identifier.
   * @param {ReadonlyArray<string>} permissions - Required permission names.
   * @param {'all' | 'any'} [match='all'] - Matching strategy.
   * @returns {boolean} `true` when route access should be granted.
   */
  public canAccessOrganization(
    organizationId: string,
    permissions: ReadonlyArray<OrganizationPermissionName>,
    match: 'all' | 'any' = 'all',
  ): boolean {
    const normalizedPermissions: ReadonlyArray<string> = this.normalizePermissions(permissions);

    if (normalizedPermissions.length === 0) {
      return true;
    }

    if (!this.hasResolvedAccessForOrganization(organizationId)) {
      return false;
    }

    return this.matchesPermissions(normalizedPermissions, match);
  }

  /**
   * Method normalizePermission
   * @method normalizePermission
   *
   * @description
   * Trims a permission name and rejects empty values so that the public check
   * methods can remain strict and predictable.
   *
   * @access private
   * @param {string} permission - Raw permission value to normalize.
   * @returns {string | null} The trimmed permission or `null` when empty.
   */
  private normalizePermission(permission: string): string | null {
    const normalizedPermission: string = permission.trim();
    return normalizedPermission.length > 0 ? normalizedPermission : null;
  }

  /**
   * Method normalizePermissions
   * @method normalizePermissions
   *
   * @description
   * Trims permission names and removes blank values from a permission list.
   *
   * @access private
   * @param {ReadonlyArray<string>} permissions - Raw permission names.
   * @returns {ReadonlyArray<string>} Normalized non-empty permission names.
   */
  private normalizePermissions(
    permissions: ReadonlyArray<OrganizationPermissionName>,
  ): ReadonlyArray<string> {
    return permissions
      .map((permission: string) => this.normalizePermission(permission))
      .filter((permission: string | null): permission is string => permission !== null);
  }

  /**
   * Method matchesPermissions
   * @method matchesPermissions
   *
   * @description
   * Evaluates a granted permission set against a required permission list using
   * the provided matching strategy.
   *
   * @access private
   * @param {ReadonlyArray<string>} requiredPermissions - Required permission names.
   * @param {'all' | 'any'} match - Matching strategy.
   * @returns {boolean} `true` when the requirement is satisfied.
   */
  private matchesPermissions(
    requiredPermissions: ReadonlyArray<string>,
    match: 'all' | 'any',
  ): boolean {
    return match === 'any'
      ? requiredPermissions.some((permission: string) => this.hasGrantedPermission(permission))
      : requiredPermissions.every((permission: string) => this.hasGrantedPermission(permission));
  }

  /**
   * Method hasResolvedAccessForOrganization
   * @method hasResolvedAccessForOrganization
   *
   * @description
   * Returns whether the shared organization access store currently holds a
   * successful access payload for the requested organization.
   *
   * @access private
   * @param {string} organizationId - Organization identifier to validate.
   * @returns {boolean} `true` when the store is resolved for the target organization.
   */
  private hasResolvedAccessForOrganization(organizationId: string): boolean {
    return (
      this.organizationMemberAccessStore.currentOrganizationId() === organizationId &&
      this.organizationMemberAccessStore.accessCallState().status === 'success'
    );
  }

  /**
   * Method hasGrantedPermission
   * @method hasGrantedPermission
   *
   * @description
   * Returns whether the current granted permission set satisfies the provided
   * normalized permission name, including wildcard matches.
   *
   * @access private
   * @param {string} permission - Normalized permission name to evaluate.
   * @returns {boolean} `true` when the permission is granted.
   */
  private hasGrantedPermission(permission: string): boolean {
    const grantedPermissionSet: ReadonlySet<string> = this.permissionSet();

    if (grantedPermissionSet.has(permission)) {
      return true;
    }

    return Array.from(grantedPermissionSet).some((grantedPermission: string) =>
      this.matchesPermissionName(grantedPermission, permission),
    );
  }

  /**
   * Method matchesPermissionName
   * @method matchesPermissionName
   *
   * @description
   * Evaluates whether a granted permission name satisfies a required
   * permission name, including wildcard permissions such as `organization.*`.
   *
   * @access private
   * @param {string} grantedPermission - Granted permission name.
   * @param {string} requiredPermission - Required permission name.
   * @returns {boolean} `true` when the granted permission satisfies the requirement.
   */
  private matchesPermissionName(grantedPermission: string, requiredPermission: string): boolean {
    if (grantedPermission === requiredPermission) {
      return true;
    }

    if (!grantedPermission.endsWith('.*')) {
      return false;
    }

    return requiredPermission.startsWith(grantedPermission.slice(0, -1));
  }

  //#endregion
}
