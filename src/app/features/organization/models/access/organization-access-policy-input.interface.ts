import type { OrganizationJoinMode } from './organization-join-mode.type';

/**
 * Interface OrganizationAccessPolicyInput
 * @interface OrganizationAccessPolicyInput
 *
 * @description
 * Explicit admission policy update; immediate admission requires an eligible role.
 *
 * @since 1.0.0
 */
export interface OrganizationAccessPolicyInput {
  /**
   * Property mode
   *
   * @description
   * Controls whether matching members enter immediately or submit an admission request.
   *
   * @access public
   * @since unreleased
   *
   * @type {OrganizationJoinMode}
   */
  mode: OrganizationJoinMode;

  /**
   * Property roleId
   *
   * @description
   * Optional eligible role selected for immediate admission.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | undefined}
   */
  roleId?: string;
}
