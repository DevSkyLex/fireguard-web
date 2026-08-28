/**
 * Interface CreateTeamInput
 * @interface CreateTeamInput
 *
 * @description
 * Payload used to create an organization team
 * (`POST /organizations/{organizationId}/teams`).
 *
 * @since 1.0.0
 */
export interface CreateTeamInput {
  //#region Properties
  /** @type {string} */
  readonly name: string;
  /** @type {string | null} */
  readonly description?: string | null;
  //#endregion
}
