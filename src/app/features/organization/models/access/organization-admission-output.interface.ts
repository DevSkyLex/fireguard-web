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
  organizationId: string;
}
