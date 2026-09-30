import type { Signal } from '@angular/core';

/**
 * Interface UserAccessPort
 * @interface UserAccessPort
 *
 * @description
 * UserAccessPort
 * Account-owned contract publishing the resolved global roles and permissions
 * of the authenticated user to approved consumers.
 */
export interface UserAccessPort {
  /**
   * Property roles
   * @readonly
   *
   * @description
   * Resolved global roles assigned to the authenticated user.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {Signal<ReadonlyArray<string>>}
   */
  readonly roles: Signal<ReadonlyArray<string>>;

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Resolved global permission identifiers available to the user.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {Signal<ReadonlyArray<string>>}
   */
  readonly permissions: Signal<ReadonlyArray<string>>;
}
