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
  mode: OrganizationJoinMode;
  roleId?: string;
  roleLabel?: string;
  domains: OrganizationDomainOutput[];
  eligibleRoles: { id: string; label: string }[];
}
