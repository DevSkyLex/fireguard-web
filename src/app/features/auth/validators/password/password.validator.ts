import {
  maxLength,
  minLength,
  pattern,
  required,
  validate,
  type SchemaPath,
  type ValidationError,
} from '@angular/forms/signals';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
} from '@features/auth/constants';

/**
 * Function applyPasswordRules
 * @function applyPasswordRules
 *
 * @description
 * Applies the API's password policy to one field: present, long enough, not
 * absurdly long, and matching the complexity pattern. Auth is the single
 * authority mirroring the backend constraints, so every surface that sets a
 * password — registration and password reset alike — applies this rather than
 * restating the rules.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {SchemaPath<string>} path - The password field.
 *
 * @returns {void}
 *
 * @example
 * ```typescript
 * form(this.model, (path) => {
 *   applyPasswordRules(path.password);
 * });
 * ```
 */
export function applyPasswordRules(path: SchemaPath<string>): void {
  required(path, { message: $localize`:@@auth.password.required:Enter a password` });
  minLength(path, PASSWORD_MIN_LENGTH, {
    message: $localize`:@@auth.password.minLength:Use at least ${PASSWORD_MIN_LENGTH}:min: characters`,
  });
  maxLength(path, PASSWORD_MAX_LENGTH, {
    message: $localize`:@@auth.password.maxLength:Use at most ${PASSWORD_MAX_LENGTH}:max: characters`,
  });
  pattern(path, PASSWORD_PATTERN, {
    message: $localize`:@@auth.password.pattern:Include an upper case letter, a lower case letter, a digit and a symbol`,
  });
}

/**
 * Function applyPasswordConfirmation
 * @function applyPasswordConfirmation
 *
 * @description
 * Declares the cross-field rule that the confirmation must repeat the
 * password. It is a schema rule reading its sibling through `valueOf`, which is
 * the Signal Forms form of a cross-field validator — the retired `matchFields`
 * `ValidatorFn` expressed against the new mechanism (`ARCHITECTURE.md` §10.4).
 *
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
