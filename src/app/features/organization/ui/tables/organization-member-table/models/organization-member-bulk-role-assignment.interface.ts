import type { OrganizationMemberOutput } from '@features/organization/models';

/**
 * Interface OrganizationMemberBulkRoleAssignment
 * @interface OrganizationMemberBulkRoleAssignment
 *
 * @description
 * Describes a bulk role assignment requested from the member table: the role to
 * grant and the selected members it should be applied to. Emitted by the table
 * for the parent page to dispatch.
 *
 * @since 1.0.0
 */
export interface OrganizationMemberBulkRoleAssignment {
  /** Members the role is being assigned to. */
  readonly members: readonly OrganizationMemberOutput[];
  /** Identifier of the role to assign. */
  readonly roleId: string;
}
