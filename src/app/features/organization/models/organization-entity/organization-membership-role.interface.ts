/**
 * Interface OrganizationMembershipRole
 * @interface OrganizationMembershipRole
 *
 * @description
 * One organization role assigned to the authenticated user's membership, as
 * carried per item by `GET /api/organizations` (`OrganizationOutput.roles`).
 */
export interface OrganizationMembershipRole {
  //#region Properties
  /** @type {string} */
  readonly id: string;
  /** Role display label (the organization role name). @type {string} */
  readonly label: string;
  //#endregion
}
