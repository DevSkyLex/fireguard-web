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
  mode: OrganizationJoinMode;
  roleId?: string;
}
