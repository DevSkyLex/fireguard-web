/**
 * Interface ReplaceOrganizationMemberRolesInput
 * @interface ReplaceOrganizationMemberRolesInput
 *
 * @description
 * Payload for `PUT /api/organizations/{organizationId}/members/{memberId}/roles`,
 * which sets a member's role set to exactly `roleIds`.
 *
 * This is a replacement, not a delta: roles the member holds today and that
 * are absent from `roleIds` are revoked. An empty array strips every role.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ReplaceOrganizationMemberRolesInput {
  //#region Properties
  /** @type {ReadonlyArray<string>} */
  readonly roleIds: ReadonlyArray<string>;
  //#endregion
}
