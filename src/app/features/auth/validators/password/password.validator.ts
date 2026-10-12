import { required, validate, type SchemaPath, type ValidationError } from '@angular/forms/signals';
import type { PasswordPolicyOutput } from '@features/auth/models';

/**
 * Function applyPasswordRules
 *
 * @description
 * Applies the currently published password creation policy to one field.
 * An unavailable policy blocks creation until it can be loaded. Registration,
 * reset, password change and first-password setup share these reactive rules.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {SchemaPath<string>} path - The password field.
 * @param {() => PasswordPolicyOutput | null} policy - Current published password creation policy.
 *
 * @returns {void}
 *
 * @function applyPasswordRules
 *
 * @example
 * ```typescript
 * form(this.model, (path) => {
 *   applyPasswordRules(path.password, () => this.passwordPolicy());
 * });
 * ```
 */
export function applyPasswordRules(
  path: SchemaPath<string>,
  policy: () => PasswordPolicyOutput | null,
): void {
  required(path, { message: $localize`:@@auth.password.required:Enter a password` });
  validate(path, ({ value }): ValidationError[] => {
    const current = policy();
    if (!current)
      return [
        {
          kind: 'policyUnavailable',
          message: $localize`:@@auth.password.policyUnavailable:Password requirements are unavailable`,
        },
      ];
    const password = value();
    if (!password) return [];
    const length = Array.from(password).length;
    const errors: ValidationError[] = [];
    if (length < current.minimumLength)
      errors.push({
        kind: 'minLength',
        message: $localize`:@@auth.password.minLength:Use at least ${current.minimumLength}:min: characters`,
      });
    if (length > current.maximumLength)
      errors.push({
        kind: 'maxLength',
        message: $localize`:@@auth.password.maxLength:Use at most ${current.maximumLength}:max: characters`,
      });
    if (current.requireUppercase && !/[A-Z]/.test(password))
      errors.push({
        kind: 'uppercase',
        message: $localize`:@@auth.password.requirements.uppercase:An upper case letter`,
      });
    if (current.requireLowercase && !/[a-z]/.test(password))
      errors.push({
        kind: 'lowercase',
        message: $localize`:@@auth.password.requirements.lowercase:A lower case letter`,
      });
    if (current.requireDigit && !/\d/.test(password))
      errors.push({
        kind: 'digit',
        message: $localize`:@@auth.password.requirements.digit:A digit`,
      });
    if (
      current.specialCharacters &&
      !Array.from(current.specialCharacters).some((character) => password.includes(character))
    )
      errors.push({
        kind: 'symbol',
        message: $localize`:@@auth.password.requirements.symbols:Include one of these symbols: ${current.specialCharacters}:SYMBOLS:`,
      });
    const first = Array.from(password)[0];
    if (
      current.allowedInitialCharacters &&
      first &&
      !current.allowedInitialCharacters.includes(first)
    )
      errors.push({
        kind: 'initialCharacter',
        message: $localize`:@@auth.password.initialCharacter:Start with one of these characters: ${current.allowedInitialCharacters}:CHARACTERS:`,
      });
    return errors;
  });
}

/**
 * Function applyPasswordConfirmation
 *
 * @description
 * Declares the cross-field rule that the confirmation must repeat the
 * password. It is a schema rule reading its sibling through `valueOf`, which is
 * the Signal Forms form of a cross-field validator — the retired `matchFields`
 * `ValidatorFn` expressed against the new mechanism (`ARCHITECTURE.md` §10.4).
 * The error lands on the confirmation field rather than on the parent, because
 * that is the input the user has to change.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {SchemaPath<string>} confirmationPath - The confirmation field.
 * @param {SchemaPath<string>} passwordPath - The password it must repeat.
 *
 * @returns {void}
 *
 * @function applyPasswordConfirmation
 */
export function applyPasswordConfirmation(
  confirmationPath: SchemaPath<string>,
  passwordPath: SchemaPath<string>,
): void {
  required(confirmationPath, {
    message: $localize`:@@auth.passwordConfirmation.required:Repeat the password`,
  });

  validate(confirmationPath, ({ value, valueOf }): ValidationError | null =>
    value() === valueOf(passwordPath)
      ? null
      : {
          kind: 'passwordMismatch',
          message: $localize`:@@auth.passwordConfirmation.mismatch:The two passwords do not match`,
        },
  );
}
