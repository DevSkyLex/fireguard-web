/**
 * Interface CreateOrganizationInput
 * @interface CreateOrganizationInput
 *
 * @description
 * Payload used to create an organization.
 */
export interface CreateOrganizationInput {
  //#region Properties
  /** @type {string} */
  readonly name: string;
  /** @type {string | null} */
  readonly slug?: string | null;
  //#endregion
}
