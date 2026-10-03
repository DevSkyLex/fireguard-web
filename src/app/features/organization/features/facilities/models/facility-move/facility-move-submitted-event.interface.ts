/**
 * Interface FacilityMoveSubmittedEvent
 * @interface FacilityMoveSubmittedEvent
 *
 * @description
 * The picked target for a pending `FacilityMoveRequest`, emitted by `FacilityMoveDialog`.
 */
export interface FacilityMoveSubmittedEvent {
  //#region Properties
  /**
   * Property facilityId
   *
   * @description
   * The facility being re-parented.
   */
  readonly facilityId: string;

  /**
   * Property parentFacilityId
   *
   * @description
   * Its new parent, or `null` to move it to the root level.
   */
  readonly parentFacilityId: string | null;
  //#endregion
}
