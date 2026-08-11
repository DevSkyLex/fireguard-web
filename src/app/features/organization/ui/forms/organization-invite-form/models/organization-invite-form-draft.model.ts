/**
 * Type OrganizationInviteFormDraft
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
  readonly email: string;
  readonly roleId: string;
}
