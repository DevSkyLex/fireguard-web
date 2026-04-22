import { computed, inject, Injectable, type Signal } from '@angular/core';
import type { StoreError } from '@core/state/request-state';
import type { AccountPermissionName } from '@features/account/models';
import { UserStore } from '@features/account/state';

/**
 * Service UserPermissionService
 * @class UserPermissionService
 *
 * @description
 * Feature-owned helper service exposing ergonomic checks for the authenticated
 * user's resolved global permissions.
 *
 * Because this helper is owned and consumed inside the account feature, it
 * reads the concrete `UserStore` directly.
 *
 * Published account ports remain the stable boundary for external consumers.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class UserPermissionService {
  //#region Properties
  /**
   * Property userStore
   * @readonly
   *
   * @description
   * Account-owned store exposing the authenticated user's resolved global
   * identity, roles, permissions, and load state.
   *
   * @access private
   * @type {UserStore}
   */
  private readonly userStore: UserStore = inject<UserStore>(UserStore);

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Effective global permission names currently granted to the authenticated
   * user through the account-owned `/api/me` payload.
   *
   * @access public
   * @type {Signal<ReadonlyArray<string>>}
   */
  public readonly permissions: Signal<ReadonlyArray<string>> = this.userStore.permissions;

  /**
   * Property isLoadingPermissions
   * @readonly
   *
   * @description
   * Indicates whether the current global permission payload is loading.
   *
   * @access public
   * @type {Signal<boolean>}
   */
  public readonly isLoadingPermissions: Signal<boolean> = this.userStore.isLoading;

  /**
   * Property isResolvedPermissions
   * @readonly
   *
   * @description
   * Indicates whether the current global permission payload has been loaded
   * successfully from the account-owned `/api/me` payload.
   *
   * @access public
   * @type {Signal<boolean>}
   */
  public readonly isResolvedPermissions: Signal<boolean> = this.userStore.isLoaded;

  /**
   * Property permissionError
   * @readonly
   *
   * @description
   * Last global permission loading error exposed by the account user store.
   *
   * @access public
   * @type {Signal<StoreError | null>}
   */
  public readonly permissionError: Signal<StoreError | null> = this.userStore.loadError;

  /**
   * Property permissionSet
   * @readonly
   *
   * @description
   * Internal computed set of effective permission names used to keep
   * permission checks constant-time while remaining fully reactive.
   *
   * @access private
   * @type {Signal<ReadonlySet<string>>}
   */
  private readonly permissionSet: Signal<ReadonlySet<string>> = computed<ReadonlySet<string>>(
    (): ReadonlySet<string> => new Set(this.permissions()),
  );
  //#endregion

  //#region Methods
  /**
   * Method reload
   * @method reload
   *
   * @description
   * Forces the account feature to reload the authenticated user's current
   * profile and therefore refresh the resolved global permissions.
   *
   * @access public
   * @returns {void}
   */
  public reload(): void {
    this.userStore.reload();
  }

  /**
   * Method hasPermission
   * @method hasPermission
   *
   * @description
   * Returns whether the authenticated user currently has the requested global
   * permission.
   *
   * Blank and whitespace-only permission names are rejected.
   *
   * @access public
   * @param {AccountPermissionName} permission - Permission name to check.
   * @returns {boolean} `true` when the permission is currently granted.
   */
  public hasPermission(permission: AccountPermissionName): boolean {
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
   * Returns whether at least one permission from the provided list is
   * currently granted to the authenticated user.
   *
   * @access public
   * @param {ReadonlyArray<AccountPermissionName>} permissions - Permission names to evaluate.
   * @returns {boolean} `true` when any permission is currently granted.
   */
  public hasAnyPermission(permissions: ReadonlyArray<AccountPermissionName>): boolean {
    return permissions.some((permission: AccountPermissionName) => this.hasPermission(permission));
  }

  /**
   * Method hasAllPermissions
   * @method hasAllPermissions
   *
   * @description
   * Returns whether every permission from the provided list is currently
   * granted to the authenticated user.
   *
   * @access public
   * @param {ReadonlyArray<AccountPermissionName>} permissions - Permission names to evaluate.
   * @returns {boolean} `true` when all permissions are currently granted.
   */
  public hasAllPermissions(permissions: ReadonlyArray<AccountPermissionName>): boolean {
    return permissions.every((permission: AccountPermissionName) => this.hasPermission(permission));
  }

  /**
   * Method canAccessGlobalPermissions
   * @method canAccessGlobalPermissions
   *
   * @description
   * Evaluates whether the authenticated user can access global functionality
   * requiring the provided permissions.
   *
   * The check is resolved synchronously from the account-owned `UserStore` and
   * therefore returns `false` until the `/api/me` payload has been loaded
   * successfully.
   *
   * @access public
   * @param {ReadonlyArray<AccountPermissionName>} permissions - Required permission names.
   * @param {'all' | 'any'} [match='all'] - Matching strategy.
   * @returns {boolean} `true` when access should be granted.
   */
  public canAccessGlobalPermissions(
    permissions: ReadonlyArray<AccountPermissionName>,
    match: 'all' | 'any' = 'all',
  ): boolean {
    const normalizedPermissions: ReadonlyArray<string> = this.normalizePermissions(permissions);

    if (normalizedPermissions.length === 0) {
      return true;
    }

    if (!this.isResolvedPermissions()) {
      return false;
    }

    return this.matchesPermissions(normalizedPermissions, match);
  }

  /**
   * Method normalizePermission
   * @method normalizePermission
   *
   * @description
   * Trims a permission name and rejects empty values so public checks remain
   * strict and predictable.
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
   * @param {ReadonlyArray<AccountPermissionName>} permissions - Raw permission names.
   * @returns {ReadonlyArray<string>} Normalized non-empty permission names.
   */
  private normalizePermissions(
    permissions: ReadonlyArray<AccountPermissionName>,
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
   * Evaluates the current granted permission set against a required permission
   * list using the provided matching strategy.
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
   * permission name, including wildcard permissions such as `users.*` or `*.*`.
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

    if (grantedPermission === '*.*') {
      return true;
    }

    if (!grantedPermission.endsWith('.*')) {
      return false;
    }

    return requiredPermission.startsWith(grantedPermission.slice(0, -1));
  }
  //#endregion
}
