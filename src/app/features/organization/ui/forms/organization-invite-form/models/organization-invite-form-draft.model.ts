/**
 * Interface OrganizationInviteFormDraft
 * @interface OrganizationInviteFormDraft
 *
 * @description
 * The invite form's own field shape: `roleId` is a plain string (the empty
 * string standing in for "no role picked yet") so Signal Forms has
 * something to bind, converted to `InviteOrganizationMemberInput.roleIds`
 * on submit.
 *
 * @since 1.0.0
 */
export interface OrganizationInviteFormDraft {
  /**
   * Property email
   * @readonly
   *
   * @description
   * Holds the invitee address before submission validation and transport mapping.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly email: string;

  /**
   * Property roleId
   * @readonly
   *
   * @description
   * Uses an empty string until a role is chosen, then maps to the invite input's role IDs.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly roleId: string;
}
