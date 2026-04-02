/**
 * Interface AssignToFacilityInput
 * @interface AssignToFacilityInput
 *
 * @description
 * Payload used to assign an equipment to a facility.
 */
export interface AssignToFacilityInput {
  //#region Properties
  /**
   * Property facilityId
   * @readonly
   *
   * @description
   * Identifier of the target facility.
   *
   * @type {string}
   */
  readonly facilityId: string;
  //#endregion
}
