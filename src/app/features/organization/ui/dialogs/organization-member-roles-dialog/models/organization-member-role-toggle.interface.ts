/**
 * Interface OrganizationMemberRoleToggle
 *
 * @description
 * One checkbox change in the member-roles dialog: which role, and whether
 * it should now be assigned or removed.
 *
 * @since 1.0.0
 */
export interface OrganizationMemberRoleToggle {
  /** The role being toggled. */
  readonly roleId: string;

  /** `true` to assign the role, `false` to remove it. */
  readonly assign: boolean;
}
