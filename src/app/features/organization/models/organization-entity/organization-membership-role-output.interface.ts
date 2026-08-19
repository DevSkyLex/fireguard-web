/**
 * Interface OrganizationMembershipRoleOutput
 * @interface OrganizationMembershipRoleOutput
 *
 * @description
 * One organization role assigned to the authenticated user's own membership,
 * as carried by `OrganizationOutput.roles` on the user's organization list.
 *
 * @since 1.0.0
 */
export interface OrganizationMembershipRoleOutput {
  //#region Properties
  /** @type {string} */
  readonly id: string;
  /** @type {string} */
  readonly label: string;
  //#endregion
}
