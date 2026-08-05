/**
 * Interface LoginFormValues
 *
 * @description
 * The shape the sign-in form edits. Distinct from `LoginInput`: this is what
 * the user types, the transport DTO is what the API receives, and the page
 * maps one to the other (`ARCHITECTURE.md` §10.4).
 *
 * @since 1.0.0
 */
export interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}
