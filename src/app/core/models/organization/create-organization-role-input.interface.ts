/**
 * Interface CreateOrganizationRoleInput
 * @interface CreateOrganizationRoleInput
 *
 * @description
 * Payload used to create a custom role inside an
 * organization.
 */
export interface CreateOrganizationRoleInput {
  //#region Properties
  /** @type {string} */
  readonly name: string;
  /** @type {string} */
  readonly description?: string;
  /** @type {ReadonlyArray<string>} */
  readonly permissions: ReadonlyArray<string>;
  //#endregion
}
