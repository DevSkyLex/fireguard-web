import type { FormControl } from '@angular/forms';

/**
 * Interface AccountPasswordRequestFormData
 * @interface AccountPasswordRequestFormData
 *
 * @description
 * Controls of the password change request step.
 *
 * @since 1.0.0
 */
export interface AccountPasswordRequestFormData {
  /** Current password, verified before the OTP code is sent. */
  readonly currentPassword: FormControl<string>;
}

/**
 * Interface AccountPasswordConfirmFormData
 * @interface AccountPasswordConfirmFormData
 *
 * @description
 * Controls of the password change confirm step.
 *
 * @since 1.0.0
 */
export interface AccountPasswordConfirmFormData {
  /** One-time code received by email. */
  readonly code: FormControl<string>;

  /** New password. */
  readonly newPassword: FormControl<string>;

  /** New password confirmation. */
  readonly confirmPassword: FormControl<string>;
}

/**
 * Interface PasswordChangeConfirmation
 * @interface PasswordChangeConfirmation
 *
 * @description
 * Values emitted when the confirm step is submitted.
 *
 * @since 1.0.0
 */
export interface PasswordChangeConfirmation {
  /** One-time code received by email. */
  readonly code: string;

  /** New password. */
  readonly newPassword: string;
}
