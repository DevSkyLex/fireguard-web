/**
 * Interface InviteOrganizationMemberInput
 * @interface InviteOrganizationMemberInput
 *
 * @description
 * Payload used to invite a user by email to join
 * an organization.
 */
export interface InviteOrganizationMemberInput {
  //#region Properties
  /** @type {string} */
  readonly email: string;
  /** @type {ReadonlyArray<string | null>} */
  readonly roleIds?: ReadonlyArray<string | null>;
  //#endregion
}
