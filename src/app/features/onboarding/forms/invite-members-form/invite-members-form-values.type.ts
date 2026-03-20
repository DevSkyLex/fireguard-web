/**
 * Interface InviteeRowValues
 *
 * @description
 * Shape of a single invitee row emitted
 * by the invite-members form.
 *
 * @since 1.0.0
 */
export interface InviteeRowValues {
  readonly email: string;
  readonly roleId: string | null;
}

/**
 * Type InviteMembersFormValues
 *
 * @description
 * Payload emitted by the invite-members
 * form on submit (list of invitees).
 *
 * @since 1.0.0
 */
export type InviteMembersFormValues = readonly InviteeRowValues[];
