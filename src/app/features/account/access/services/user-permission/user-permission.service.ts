import { computed, inject, Injectable, type Signal } from '@angular/core';
import type { AccountPermissionName } from '@features/account/models';
import { UserStore } from '@features/account/state';
import type { StoreError } from '@core/state/request-state';

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
    const normalizedPermission: string = permission.trim();
    return normalizedPermission.length > 0 && this.permissionSet().has(normalizedPermission);
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
  //#endregion
}
