/**
 * Interface CreateOrganizationInput
 * @interface CreateOrganizationInput
 *
 * @description
 * Payload used to create an organization.
 */
export interface CreateOrganizationInput {
  //#region Properties
  /**
   * Property name
   *
   * @type {string}
   */
  readonly name: string;
  /**
   * Property operatingProfile
   *
   * @description
   * Operational defaults; omission preserves the legacy operator profile.
   *
   * @property operatingProfile
   */
  readonly operatingProfile?: 'operator' | 'service_provider';
  /**
   * Property slug
   *
   * @type {string | null}
   */
  readonly slug?: string | null;
  //#endregion
}
