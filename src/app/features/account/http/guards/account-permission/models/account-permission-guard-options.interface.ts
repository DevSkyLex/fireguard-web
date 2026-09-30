import type { AccountPermissionName } from '@features/account/models';

/**
 * Type AccountPermissionGuardMatch
 *
 * @description
 * Chooses whether a guarded route requires every listed permission or at least one.
 *
 * @access public
 * @since 0.1.0
 *
 * @type {'all' | 'any'}
 */
export type AccountPermissionGuardMatch = 'all' | 'any';

/**
 * Type AccountPermissionGuardRedirect
 *
 * @description
 * Defines a fixed or lazily computed route destination used when permission checks deny access.
 *
 * @access public
 * @since 0.1.0
 *
 * @type {ReadonlyArray<string> | (() => ReadonlyArray<string>)}
 */
export type AccountPermissionGuardRedirect = ReadonlyArray<string> | (() => ReadonlyArray<string>);

/**
 * Interface AccountPermissionGuardOptions
 * @interface AccountPermissionGuardOptions
 *
 * @description
 * Configures the permission checks and denied-access destination for the account route guard.
 *
 * @since 0.1.0
 */
export interface AccountPermissionGuardOptions {
  /**
   * Property permissions
   *
   * @description
   * Permission names evaluated by the guard against the current account.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {ReadonlyArray<AccountPermissionName>}
   */
  permissions: ReadonlyArray<AccountPermissionName>;

  /**
   * Property match
   *
   * @description
   * Selects whether the guard requires `all` permissions or accepts `any` one.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {AccountPermissionGuardMatch | undefined}
   */
  match?: AccountPermissionGuardMatch;

  /**
   * Property redirectTo
   *
   * @description
   * Route segments used after a denied check, supplied directly or computed when the guard runs.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {AccountPermissionGuardRedirect | undefined}
   */
  redirectTo?: AccountPermissionGuardRedirect;
}
