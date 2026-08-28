/**
 * Interface AddTeamMemberInput
 * @interface AddTeamMemberInput
 *
 * @description
 * Payload used to add an organization member to a team
 * (`POST /organizations/{organizationId}/teams/{teamId}/members`). `role` is
 * a free-form membership label (e.g. `"lead"`) — it is not an RBAC role.
 *
 * @since 1.0.0
 */
export interface AddTeamMemberInput {
  //#region Properties
  /** @type {string} */
  readonly memberId: string;
  /** Free-form membership label, e.g. `"lead"`. Not an RBAC role. */
  readonly role?: string;
  //#endregion
}
