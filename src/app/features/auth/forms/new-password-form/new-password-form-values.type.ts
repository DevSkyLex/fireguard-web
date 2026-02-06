import type { PasswordResetVerifyInput } from '@core/models/password-reset';

/**
 * Type NewPasswordFormValues
 * @type NewPasswordFormValues
 *
 * @description
 * Submitted values from new password form.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type NewPasswordFormValues = Pick<PasswordResetVerifyInput, 'newPassword'>;
