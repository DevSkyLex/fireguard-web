/**
 * Interface AddOrganizationMemberInput
 * @interface AddOrganizationMemberInput
 *
 * @description
 * Payload used to add an existing user as a member
 * of an organization.
 */
export interface AddOrganizationMemberInput {
  //#region Properties
  /** @type {string} */
  readonly userId: string;
  /** @type {ReadonlyArray<string | null>} */
  readonly roleIds?: ReadonlyArray<string | null>;
  //#endregion
}
