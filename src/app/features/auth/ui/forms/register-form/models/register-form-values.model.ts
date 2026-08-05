/**
 * Interface RegisterFormValues
 *
 * @description
 * The shape the sign-up form edits. `confirmPassword` exists only here: the
 * API contract (`RegisterInput`) never carries it, so the page drops it when
 * mapping to transport.
 *
 * @since 1.0.0
 */
export interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}
