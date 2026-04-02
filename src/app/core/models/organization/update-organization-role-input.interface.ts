/**
 * Interface UpdateOrganizationRoleInput
 * @interface UpdateOrganizationRoleInput
 *
 * @description
 * Payload used to partially update an organization role.
 */
export interface UpdateOrganizationRoleInput {
  //#region Properties
  /** @type {string | null} */
  readonly description?: string | null;
  /** @type {ReadonlyArray<string | null>} */
  readonly permissions?: ReadonlyArray<string | null>;
  //#endregion
}
