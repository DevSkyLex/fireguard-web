import type { HydraItem } from '@core/api/models';

/**
 * Interface OrganizationDomainOutput
 * @interface OrganizationDomainOutput
 *
 * @description
 * Organization-owned domain challenge and verification status.
 *
 * @since 1.0.0
 */
export interface OrganizationDomainOutput extends HydraItem {
  /**
   * Property id
   *
   * @description
   * Identifier of this organization-owned domain record.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  id: string;

  /**
   * Property domain
   *
   * @description
   * Normalized domain being verified for the organization.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  domain: string;

  /**
   * Property status
   *
   * @description
   * Verification lifecycle state for the domain.
   *
   * @access public
   * @since unreleased
   *
   * @type {'pending' | 'verified' | 'suspended'}
   */
  status: 'pending' | 'verified' | 'suspended';

  /**
   * Property dnsName
   *
   * @description
   * DNS record name the domain owner must publish for verification.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  dnsName: string;

  /**
   * Property dnsValue
   *
   * @description
   * Expected DNS record value used to verify domain ownership.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  dnsValue: string;

  /**
   * Property verifiedAt
   *
   * @description
   * Timestamp of the successful ownership verification, when verified.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | undefined}
   */
  verifiedAt?: string;

  /**
   * Property lastCheckedAt
   *
   * @description
   * Timestamp when the backend last checked the DNS proof, when available.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | undefined}
   */
  lastCheckedAt?: string;
}
