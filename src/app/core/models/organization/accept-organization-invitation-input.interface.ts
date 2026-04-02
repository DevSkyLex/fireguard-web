/**
 * Interface AcceptOrganizationInvitationInput
 * @interface AcceptOrganizationInvitationInput
 *
 * @description
 * Payload used to accept an organization invitation.
 */
export interface AcceptOrganizationInvitationInput {
  //#region Properties
  /**
   * Property token
   * @readonly
   *
   * @description
   * Invitation token received by the invited user.
   *
   * @type {string}
   */
  readonly token: string;
  //#endregion
}
