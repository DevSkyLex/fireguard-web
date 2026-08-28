/**
 * Interface AccountEmailChangeFormValues
 *
 * @description
 * The email change request: the new address, and the current password the
 * backend verifies before emailing the confirmation link to it.
 *
 * @since 1.0.0
 */
export interface AccountEmailChangeFormValues {
  newEmail: string;
  currentPassword: string;
}
