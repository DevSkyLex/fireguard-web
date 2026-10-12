import type { HydraItem } from '@core/api/models';

/**
 * Interface PasswordPolicyOutput
 * @interface PasswordPolicyOutput
 *
 * @description
 * Public project password requirements; contains no credentials or session information.
 */
export interface PasswordPolicyOutput extends HydraItem {
  /**
   * Property minimumLength
   *
   * @description
   * Minimum number of Unicode code points accepted for a new password.
   */
  readonly minimumLength: number;
  /**
   * Property maximumLength
   *
   * @description
   * Maximum number of Unicode code points accepted for a new password.
   */
  readonly maximumLength: number;
  /**
   * Property requireUppercase
   *
   * @description
   * Whether a new password requires an uppercase character.
   */
  readonly requireUppercase: boolean;
  /**
   * Property requireLowercase
   *
   * @description
   * Whether a new password requires a lowercase character.
   */
  readonly requireLowercase: boolean;
  /**
   * Property requireDigit
   *
   * @description
   * Whether a new password requires a digit.
   */
  readonly requireDigit: boolean;
  /**
   * Property specialCharacters
   *
   * @description
   * Allowed alphabet for the required special character, or empty when no special character is
   * required.
   */
  readonly specialCharacters: string;
  /**
   * Property allowedInitialCharacters
   *
   * @description
   * Allowed first-character alphabet, or null when there is no first-character restriction.
   */
  readonly allowedInitialCharacters?: string | null;
}
