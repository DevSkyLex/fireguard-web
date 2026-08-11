/**
 * Interface UpdateOrganizationRoleInput
 * @interface UpdateOrganizationRoleInput
 *
 * @description
 * Payload used to update a custom organization role.
 *
 * Only `name` and `description` are genuinely partial. `permissions` is
 * **always required**, even when the intent is a pure rename: the backend
 * validates it with `NotBlank` against a payload built from the request body
 * alone, so a rename that omits it is refused rather than merged with the
 * role's current set. Send the role's existing permissions back — projected
 * from `OrganizationRoleOutput.permissions` to their `.name` — alongside the
 * new name.
 *
 * System roles refuse the whole update, whichever field changed.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface UpdateOrganizationRoleInput {
  //#region Properties
  /**
   * New role name — accepted since backend 1.5.0 (P2.4). Constrained to
   * `^[a-z0-9_]{3,50}$`: lowercase letters, digits and underscores only, so
   * `site_manager` passes and `Site Manager` does not. Omit it to leave the
   * name untouched. Refused with 400 for a system role or a duplicate name.
   *
   * @type {string}
   */
  readonly name?: string;
  /** Capped at 500 characters. Omit to leave unchanged. @type {string | null} */
  readonly description?: string | null;
  /** The role's complete permission set, by name. Never empty. @type {ReadonlyArray<string>} */
  readonly permissions: ReadonlyArray<string>;
  //#endregion
}
