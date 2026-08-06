/**
 * Interface AccountPasswordConfirmFormValues
 *
 * @description
 * Step two of the password change: the emailed code and the new password.
 *
 * `confirmPassword` never leaves the form — it exists so the cross-field rule
 * has something to compare against, and the component emits only what the API
 * accepts.
 *
 * @since 1.0.0
 */
export interface AccountPasswordConfirmFormValues {
  code: string;
  newPassword: string;
  confirmPassword: string;
}
