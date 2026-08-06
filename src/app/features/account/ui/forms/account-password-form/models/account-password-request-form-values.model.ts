/**
 * Interface AccountPasswordRequestFormValues
 *
 * @description
 * Step one of the password change: proving the current password before a code
 * is sent.
 *
 * @since 1.0.0
 */
export interface AccountPasswordRequestFormValues {
  currentPassword: string;
}
