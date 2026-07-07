import type { OrganizationMemberOutput } from '@features/organization/models';

/**
 * Interface OrganizationMemberRoleRemoval
 * @interface OrganizationMemberRoleRemoval
 *
 * @description
 * Describes a role removal requested from the member table: the affected member
 * and the role to detach. Emitted by the table for the parent page to confirm
 * and dispatch.
 *
 * @since 1.0.0
 */
export interface OrganizationMemberRoleRemoval {
  /** The member the role is being removed from. */
  readonly member: OrganizationMemberOutput;
  /** Identifier of the role to remove. */
  readonly roleId: string;
}
