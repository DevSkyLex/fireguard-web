/**
 * Interface OrganizationRoleCreateFormDraft
 * @interface OrganizationRoleCreateFormDraft
 *
 * @description
 * The create form's own field shape: `name` and `description` as plain
 * strings, `permissions` as the checked permission names, converted to
 * `CreateOrganizationRoleInput` on submit.
 *
 * @since 1.0.0
 */
export interface OrganizationRoleCreateFormDraft {
  /**
   * Property name
   * @readonly
   *
   * @description
   * Holds the role name submitted to the role-creation API.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Holds the optional role explanation as editable form text.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly description: string;

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Contains the permission names checked for the new role.
   *
   * @access public
   * @since unreleased
   *
   * @type {ReadonlyArray<string>}
   */
  readonly permissions: ReadonlyArray<string>;
}
