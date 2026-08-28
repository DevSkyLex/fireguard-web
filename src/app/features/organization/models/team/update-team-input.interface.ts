/**
 * Interface UpdateTeamInput
 * @interface UpdateTeamInput
 *
 * @description
 * Payload used to rename a team or change its description
 * (`PATCH /organizations/{organizationId}/teams/{teamId}`). Every field is
 * optional — an omitted field leaves the current value unchanged.
 *
 * @since 1.0.0
 */
export interface UpdateTeamInput {
  //#region Properties
  /** @type {string} */
  readonly name?: string;
  /** @type {string | null} */
  readonly description?: string | null;
  //#endregion
}
