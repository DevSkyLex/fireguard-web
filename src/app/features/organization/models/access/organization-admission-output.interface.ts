import type { HydraItem } from '@core/api/models';

/**
 * Interface OrganizationAdmissionOutput
 * @interface OrganizationAdmissionOutput
 *
 * @description
 * Organization destination after a confirmed membership admission.
 *
 * @since 1.0.0
 */
export interface OrganizationAdmissionOutput extends HydraItem {
  /**
   * Property organizationId
   *
   * @description
   * Organization the caller was admitted to and can open.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  organizationId: string;
}
