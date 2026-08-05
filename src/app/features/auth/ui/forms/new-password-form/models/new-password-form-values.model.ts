/**
 * Interface NewPasswordFormValues
 *
 * @description
 * The shape the reset form edits. `confirmPassword` exists only here — the API
 * takes the new password alone.
 *
 * @since 1.0.0
 */
export interface NewPasswordFormValues {
  password: string;
  confirmPassword: string;
}
