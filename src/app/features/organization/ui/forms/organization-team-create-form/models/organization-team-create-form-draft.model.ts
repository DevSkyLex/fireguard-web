/**
 * Interface OrganizationTeamCreateFormDraft
 * @interface OrganizationTeamCreateFormDraft
 *
 * @description
 * The create form's own field shape, converted to `CreateTeamInput` on
 * submit.
 *
 * @since 1.0.0
 */
export interface OrganizationTeamCreateFormDraft {
  /**
   * Property name
   * @readonly
   *
   * @description
   * Holds the name submitted for the new team.
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
   * Holds the team description as editable form text.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly description: string;
}
