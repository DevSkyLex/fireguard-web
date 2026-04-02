/**
 * Interface MoveFacilityInput
 * @interface MoveFacilityInput
 *
 * @description
 * Payload used to move a facility within the
 * organization hierarchy.
 */
export interface MoveFacilityInput {
  //#region Properties
  /**
   * Property parentFacilityId
   * @readonly
   *
   * @description
   * Identifier of the new parent facility, or null
   * to move the facility to the root level.
   *
   * @type {string | null}
   */
  readonly parentFacilityId: string | null;
  //#endregion
}
