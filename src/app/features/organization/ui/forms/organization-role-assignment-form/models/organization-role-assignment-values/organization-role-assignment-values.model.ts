/**
 * Interface OrganizationRoleAssignmentValues
 * @interface OrganizationRoleAssignmentValues
 *
 * @description
 * Values required to assign an organization role to a member.
 *
 * @since 1.0.0
 */
export interface OrganizationRoleAssignmentValues {
  readonly memberId: string;
  readonly roleId: string;
}
