import type { HydraItem } from '@core/api/models';
import type { OrganizationDomainOutput } from './organization-domain-output.interface';
import type { OrganizationJoinMode } from './organization-join-mode.type';

/**
 * Interface OrganizationAccessPolicyOutput
 * @interface OrganizationAccessPolicyOutput
 *
 * @description
 * Admission policy and roles eligible for immediate membership.
 *
 * @since 1.0.0
 */
export interface OrganizationAccessPolicyOutput extends HydraItem {
  /**
   * Property mode
   *
   * @description
   * Current admission mode returned by the organization policy endpoint.
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
   * Configured role identifier for automatic admission, when one is selected.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | undefined}
   */
  roleId?: string;

  /**
   * Property roleLabel
   *
   * @description
   * Display label for the configured automatic-admission role.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | undefined}
   */
  roleLabel?: string;

  /**
   * Property domains
   *
   * @description
   * Organization-owned domains used by the admission policy.
   *
   * @access public
   * @since unreleased
   *
   * @type {OrganizationDomainOutput[]}
   */
  domains: OrganizationDomainOutput[];

  /**
   * Property eligibleRoles
   *
   * @description
   * Roles the caller may assign when immediate admission is enabled.
   *
   * @access public
   * @since unreleased
   *
   * @type {{ id: string; label: string }[]}
   */
  eligibleRoles: { id: string; label: string }[];
}
