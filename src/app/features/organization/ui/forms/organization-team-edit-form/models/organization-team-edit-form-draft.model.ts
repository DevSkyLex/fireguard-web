/**
 * Interface OrganizationTeamEditFormDraft
 * @interface OrganizationTeamEditFormDraft
 *
 * @description
 * The edit form's own field shape, converted to `UpdateTeamInput` on submit.
 *
 * @since 1.0.0
 */
export interface OrganizationTeamEditFormDraft {
  /**
   * Property name
   * @readonly
   *
   * @description
   * Holds the team's edited name for the update request.
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
   * Holds the team's edited description for the update request.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly description: string;
}
